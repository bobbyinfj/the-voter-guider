# Builds <state>-fppc.json: fines California's Fair Political Practices Commission (the state's
# campaign-finance and ethics enforcer) imposed on a candidate, from its monthly "FPPC
# Enforcement Decisions" news releases (fppc.ca.gov/news-releases/<year>/fppc-enforcement-decisions-<month>-<year>).
# build.py merges it as `fines` on each profile; the Expanded view shows each one as a flag
# (lib/scorecard.ts, rule `ethics-fine`), with the release it came from.
#
# The FPPC has no search by name, so we read every monthly release from START on and look for
# "In the Matter of <candidate's name>". A match is only used after a manual check that the
# respondent is the candidate (CONFIRMED: candidate id → FPPC case numbers), since names repeat;
# unconfirmed matches are printed for review. Every candidate gets the same search, and the
# releases searched are recorded so the UI can say what was checked.
#
# robots.txt allows Claude's agents on fppc.ca.gov (checked again on every fetch). We wait 2 s
# between uncached fetches anyway.
#
# Usage: python3 fppc.py ca
import datetime
import hashlib
import importlib.util
import json
import re
import sys
import time
import urllib.error
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
_spec = importlib.util.spec_from_file_location('cb', HERE.parent / 'comparison-builders' / 'build.py')
cb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cb)

SLUG = 'ca-general-2026-11-03'
START = (2021, 1)
MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
# Releases are linked from the FPPC site under a few spellings; the first that exists is used
BASES = ['https://www.fppc.ca.gov/news-releases/{y}/fppc-enforcement-decisions-{m}-{y}/',
         'https://www.fppc.ca.gov/news-releases/{y}/fppc-enforcement-decisions-{m}-{y}']
# candidate id → FPPC case numbers checked by hand to be this candidate (not a same-named person)
# Each was checked against the release: the entry names the candidate's office or campaign committee.
CONFIRMED = {
    'ca26-rob-bonta': ['21/738'],  # "Bonta, in his capacity as a member of the Assembly"
    'ca26-michael-e-gates': ['26/208'],  # "Michael Gates, City Attorney for Huntington Beach"
    'ca26-fiona-ma': ['22/195'],  # "Fiona Ma for State Treasurer 2018"
    'ca26-mike-gipson': ['24/544'],  # "Mike Gipson, current State Assemblymember representing District 65"
    'ca26-alex-villanueva': ['18/1097'],  # "Villanueva for Los Angeles Sheriff 2018"
    'ca26-bob-j-archuleta': ['21/109'],  # "Bob Archuleta for Senate 2018"
}
# Months with no release at any spelling (so re-runs don't refetch 404s)
MISSING = HERE / 'cache-fppc-missing.json'


def get(url):
    cached = (cb.CACHE / hashlib.sha256(url.encode()).hexdigest()[:16]).exists()
    if not cached:
        time.sleep(2)
    try:
        return cb.fetch(url)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def releases():
    missing = set(json.loads(MISSING.read_text())) if MISSING.exists() else set()
    today = datetime.date.today()
    y, m = START
    out = []
    while (y, m) <= (today.year, today.month):
        key = f'{y}-{m:02d}'
        if key not in missing:
            for base in BASES:
                url = base.format(y=y, m=MONTHS[m - 1])
                got = get(url)
                if got:
                    out.append((key, url, *got))
                    break
            else:
                if (y, m) != (today.year, today.month):
                    missing.add(key)
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    MISSING.write_text(json.dumps(sorted(missing)))
    return out


def cases(text):
    """Each 'In the Matter of …' entry: respondent, case number, what it says, the fine."""
    for m in re.finditer(r'In the Matter of (.+?); FPPC (?:No\.|Case No\.) ?([\d/-]+)\.(.*?)(?=In the Matter of |$)', text, re.S):
        body = m.group(3)
        fine = re.search(r'Fine: \$([\d,]+)', body)
        yield {
            'respondent': m.group(1).strip(),
            'case': m.group(2),
            'fine': int(fine.group(1).replace(',', '')) if fine else None,
            'body': body,
        }


def summary(body, last):
    """The release's own sentence on what this candidate did: the first one naming them (or 'the
    Committee', their campaign) along with the violation; else the case's first violation."""
    sentences = [x.strip() for x in re.split(r'(?<=\.)\s+(?=[A-Z])', body) if re.search(r'in violation of', x)]
    # Best: they (or their committee) are the subject; next: named anywhere in the sentence
    L = re.escape(last)
    subject = [x for x in sentences if re.match(rf'(?:The Committee,? |\w+ )?{L}\b|The Committee\b', x) or re.search(rf', {L},| {L},? and ', x)]
    named = [x for x in sentences if re.search(rf'\b{L}\b', x)]
    return cb.norm((subject or named or sentences or [''])[0]) or None


def names(name):
    nicks = re.findall(r'\(([^)]*)\)', name)
    words = [w for w in re.findall(r"[A-Za-z][A-Za-z'.-]*", re.sub(r'\(.*?\)', ' ', name)) if w.lower() not in ('jr', 'jr.', 'sr', 'ii', 'iii')]
    words = [w for w in words if len(w.rstrip('.')) > 1]
    if len(words) < 2:
        return []
    return list(dict.fromkeys([f'{words[0]} {words[-1]}'] + [f'{n} {words[-1]}' for n in nicks]))


def build():
    bundle = json.loads((ROOT / f'data/elections/{SLUG}.json').read_text())
    found = releases()
    all_cases = []
    for key, url, raw, fetched in found:
        text = cb.norm(cb.page_text(raw))
        for c in cases(text):
            all_cases.append({**c, 'url': url, 'month': key, 'retrieved': fetched})
    out, review = {}, []
    for office in bundle['offices']:
        for cand in office['candidates']:
            for n in names(cand['name']):
                pat = re.compile(r'\b' + re.escape(n) + r'\b', re.I)
                for c in all_cases:
                    if not pat.search(c['respondent']):
                        continue
                    what = summary(c['body'], n.split()[-1])
                    if c['case'] in CONFIRMED.get(cand['id'], []):
                        if all(x['case'] != c['case'] for x in out.get(cand['id'], [])):
                            out.setdefault(cand['id'], []).append(
                                {k: v for k, v in c.items() if k != 'body'} | {'summary': what, 'shared': ',' in c['respondent'] or ' and ' in c['respondent']})
                    else:
                        review.append(f"{cand['id']} ({office['id']}): {c['respondent']} · {c['case']} · ${c['fine']} · {c['url']}\n      {what}")
    dest = HERE / 'ca-fppc.json'
    searched = {'from': found[0][0] if found else None, 'to': found[-1][0] if found else None, 'releases': len(found),
                'urls': [u for _, u, _, _ in found]}
    dest.write_text(json.dumps({'searched': searched, 'candidates': out}, indent=1, ensure_ascii=False) + '\n')
    print(f'{dest.name}: {len(found)} monthly releases ({searched["from"]} to {searched["to"]}), {len(all_cases)} cases; '
          f'{sum(len(v) for v in out.values())} confirmed fines on {len(out)} candidates')
    if review:
        print('Name matches to check by hand (add the case number to CONFIRMED if it is the candidate):\n  ' + '\n  '.join(review))


if __name__ == '__main__':
    build()
