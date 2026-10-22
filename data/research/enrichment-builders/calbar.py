# Builds <state>-calbar.json: the State Bar of California's public record for each candidate who
# is a lawyer: license status and any public discipline, copied from their State Bar profile
# (apps.calbar.ca.gov/attorney/Licensee/Detail/<number>). build.py merges it as `bar` on each
# profile; public discipline shows as a red flag (lib/scorecard.ts, rule `bar-discipline`).
#
# Who is checked (the same for everyone the rule covers):
#   - every candidate for an office that requires a California law license (judges, Attorney General)
#   - every candidate whose ballot designation says they practice law (attorney, counsel,
#     district attorney, public defender, law professor)
# Which profile: the one a news voter guide links (LAist links the judicial candidates'), else a
# State Bar name search with exactly one match on first and last name. Anything else is left
# for a manual check (KNOWN: candidate id → bar number, confirmed by hand).
#
# robots.txt allows Claude's agents on apps.calbar.ca.gov (checked again on every fetch); we wait
# 3 s between uncached fetches.
#
# Usage: python3 calbar.py   (California only)
import hashlib
import html
import importlib.util
import json
import re
import sys
import time
import urllib.parse
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
_spec = importlib.util.spec_from_file_location('cb', HERE.parent / 'comparison-builders' / 'build.py')
cb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cb)

SLUG = 'ca-general-2026-11-03'
LICENSE_OFFICES = re.compile(r'^ca26-(la-superior-\d+|attorney-general)$')
LAWYER = re.compile(r'attorney|counsel|public defender|law professor|lawyer', re.I)
DETAIL = 'https://apps.calbar.ca.gov/attorney/Licensee/Detail/{}'
SEARCH = 'https://apps.calbar.ca.gov/attorney/LicenseeSearch/QuickSearch?FreeText={}'
# candidate id → bar number, for names the search can't settle on its own (checked by hand)
KNOWN = {}


def get(url):
    if not (cb.CACHE / hashlib.sha256(url.encode()).hexdigest()[:16]).exists():
        time.sleep(3)
    return cb.fetch(url)


def name_parts(name):
    """'Michael E. Gates' → ('michael', 'gates', [], 'e'): first, last, nicknames, middle initial"""
    nicks = re.findall(r'\(([^)]*)\)', name)
    words = [w.strip('.') for w in re.findall(r"[A-Za-z][A-Za-z'.-]*", re.sub(r'\(.*?\)', ' ', name))]
    words = [w for w in words if w.lower() not in ('jr', 'sr', 'ii', 'iii')]
    middle = words[1][0].lower() if len(words) > 2 else None
    words = [w for w in words if len(w) > 1]
    return words[0].lower(), words[-1].lower(), [n.lower().replace('.', '') for n in nicks], middle


def search(name):
    first, last, nicks, middle = name_parts(name)
    raw, _ = get(SEARCH.format(urllib.parse.quote_plus(f'{first} {last}')))
    page = raw.decode('utf-8', 'replace')
    hits = []
    for m in re.finditer(r'href="/attorney/Licensee/Detail/(\d+)"[^>]*>\s*([^<]+?)\s*</a>', page):
        number, shown = m.group(1), html.unescape(m.group(2))
        sl, _, sf = shown.partition(',')
        given = sf.strip().lower().split()
        # "Bonta, Robert Andres" matches Rob Bonta: same last name, and one first name starts the other
        if sl.strip().lower() == last and given and any(g.startswith(f) or f.startswith(g) for g in given[:1] for f in [first, *nicks]):
            # With a middle initial on the ballot, the record's middle name must start with it
            if middle and not (len(given) > 1 and given[1][0] == middle):
                continue
            hits.append((number, shown))
    return hits


def parse(raw):
    page = raw.decode('utf-8', 'replace')
    m = re.search(r'License Status:\s*(?:<[^>]+>\s*)*([A-Za-z ]+?)\s*<', page)
    status = m.group(1).strip() if m else None
    table = re.search(r'License Status, Disciplinary and Administrative History.*?<tbody>(.*?)</tbody>', page, re.S)
    history, discipline = [], []
    for row in re.findall(r'<tr[^>]*>(.*?)</tr>', table.group(1) if table else '', re.S):
        cells = [cb.norm(html.unescape(re.sub(r'<[^>]+>', ' ', c))) for c in re.findall(r'<td[^>]*>(.*?)</td>', row, re.S)]
        if not cells:
            continue
        history.append(cells)
        # A discipline entry: something in the Discipline column, or a disciplinary status change
        if (len(cells) >= 3 and cells[2]) or re.search(r'disbar|suspend|reprov|probation|resigned with charges', ' '.join(cells[1:]), re.I):
            if not re.search(r'admin|fee|mcle|not eligible.*fee', ' '.join(cells[1:]), re.I):
                discipline.append(' · '.join(c for c in cells if c))
    shown = re.search(r'Attorney Profile\s*</[^>]+>\s*(?:<[^>]+>\s*)*([^<#]+?)\s*#(\d+)', page)
    return {'status': status, 'discipline': discipline, 'admitted': next((h[0] for h in history if len(h) > 1 and 'Admitted' in h[1]), None),
            'shownName': cb.norm(shown.group(1)) if shown else None}


def build():
    bundle = json.loads((ROOT / f'data/elections/{SLUG}.json').read_text())
    laist = json.loads((HERE / 'ca-laist.json').read_text())['candidates']
    out, review, covered, unmatched = {}, [], [], {}
    for office in bundle['offices']:
        printed = {c['name']: c for c in office.get('ballot', {}).get('candidates', [])}
        for c in office['candidates']:
            designation = printed.get(c['name'], {}).get('designation') or ''
            if not (LICENSE_OFFICES.match(office['id']) or LAWYER.search(designation)):
                continue
            covered.append(c['id'])
            url = laist.get(c['id'], {}).get('stateBarUrl')
            how = 'linked from the LAist voter guide'
            if c['id'] in KNOWN:
                url, how = DETAIL.format(KNOWN[c['id']]), 'matched by hand'
            if not url:
                hits = search(c['name'])
                if len(hits) != 1:
                    # Why there's no record: no lawyer by that name, or several
                    unmatched[c['id']] = 'none' if not hits else 'several'
                    review.append(f"{c['id']} ({designation}): {len(hits)} matches {hits[:6]}")
                    continue
                url, how = DETAIL.format(hits[0][0]), 'the only State Bar match for the name'
            url = url.replace('http://', 'https://')
            raw, fetched = get(url)
            rec = parse(raw)
            if not rec['status']:
                sys.exit(f'{url}: no license status (page layout changed?)')
            out[c['id']] = {'publisher': 'State Bar of California', 'url': url, 'retrieved': fetched, 'matched': how,
                            'status': rec['status'], 'discipline': rec['discipline'],
                            **({'admitted': rec['admitted']} if rec['admitted'] else {}),
                            **({'shownName': rec['shownName']} if rec['shownName'] else {})}
    dest = HERE / 'ca-calbar.json'
    dest.write_text(json.dumps({'covered': covered, 'unmatched': unmatched, 'candidates': out}, indent=1, ensure_ascii=False) + '\n')
    print(f'{dest.name}: {len(covered)} candidates covered, {len(out)} profiles read')
    for cid, v in out.items():
        print(f"  {cid}: {v.get('shownName')} · {v['status']} · admitted {v.get('admitted')} · discipline {v['discipline'] or 'none'} ({v['matched']})")
    if review:
        print('Check by hand (add to KNOWN):\n  ' + '\n  '.join(review))


if __name__ == '__main__':
    build()
