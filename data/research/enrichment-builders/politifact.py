# Builds <state>-politifact.json: each candidate's PolitiFact Truth-O-Meter counts, copied from
# their PolitiFact page (politifact.com/personalities/<slug>/). build.py merges it into the
# enrichment file as `factCheck`; the Expanded view's 💩 meter is worked out from it
# (lib/scorecard.ts, explained at /how-we-score).
#
# robots.txt allows Claude's agents on politifact.com (checked again on every fetch) and asks
# for a 10-second crawl delay, which we keep.
#
# A page is only used when it's the same person: its bio line ("X is California's attorney
# general…") must name the state, or the candidate is listed in SAME_PERSON after a manual
# check. Pages that don't exist are skipped; nothing is inferred. Also recorded: the bio line
# and the year of the newest ruling (the page lists rulings newest first), so voters can see how
# old the record is.
#
# Usage: python3 politifact.py ca   (pages cached in ../comparison-builders/cache/)
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

STATES = {
    'ca': ('ca-general-2026-11-03', 'California'),
    'wa': ('wa-general-2026-11-03', 'Washington'),
    'co': ('co-general-2026-11-03', 'Colorado'),
}
BASE = 'https://www.politifact.com/personalities/'
LABELS = {
    'true': 'true',
    'mostly true': 'mostly-true',
    'half true': 'half-true',
    'mostly false': 'mostly-false',
    'false': 'false',
    'pants on fire': 'pants-fire',
}
# candidate id → PolitiFact slug, for pages checked by hand: the bio doesn't name the state but
# the rulings are clearly this candidate's. None: a same-named page that is someone else.
SAME_PERSON = {}


def slugs(name):
    """'Donald P. (Don) Wagner' → ['donald-wagner', 'don-wagner', 'donald-p-wagner']"""
    nicks = re.findall(r'\(([^)]*)\)', name)
    words = [w for w in re.findall(r"[A-Za-z][A-Za-z'-]*", re.sub(r'\(.*?\)', ' ', name))
             if len(w) > 1 and w.lower() not in ('jr', 'sr', 'ii', 'iii')]
    if not words:
        return []
    out = [f'{words[0]}-{words[-1]}'] + [f'{n}-{words[-1]}' for n in nicks] + ['-'.join(words)]
    return list(dict.fromkeys(s.lower().replace("'", '') for s in out))


def get(url):
    cached = (cb.CACHE / hashlib.sha256(url.encode()).hexdigest()[:16]).exists()
    if not cached:
        time.sleep(10)  # robots.txt Crawl-delay
    try:
        try:
            return cb.fetch(url)
        except AssertionError:
            # robots.txt unreadable for a moment (rate limited); try once more, then give up
            time.sleep(30)
            return cb.fetch(url)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def parse(raw, name):
    page = raw.decode('utf-8', 'replace')
    counts = {}
    for label, n in re.findall(r'pf-scorecard-label[^>]*>\s*([^<]+?)\s*</h5>.*?pf-scorecard-count[^>]*>\s*(\d+) Checks', page, re.S):
        key = LABELS.get(label.strip().lower())
        if key:
            counts[key] = int(n)
    text = cb.norm(cb.page_text(raw))
    m = re.search(re.escape(name) + r' (' + re.escape(name.split()[0]) + r'[^.]*? is [^.]*\.(?: [^.]*\.)?)', text)
    bio = m.group(1).strip() if m else ''
    years = [int(y) for y in re.findall(r' stated on [A-Z][a-z]+ \d{1,2}, (\d{4})', text.split('Latest Fact-Checks About')[0])]
    return counts, bio, years


def build(state):
    slug, state_name = STATES[state]
    bundle = json.loads((ROOT / f'data/elections/{slug}.json').read_text())
    out, review = {}, []
    for office in bundle['offices']:
        for c in office['candidates']:
            tries = [SAME_PERSON[c['id']]] if c['id'] in SAME_PERSON else slugs(c['name'])
            for s in tries:
                if s is None:
                    break
                url = f'{BASE}{s}/'
                got = get(url)
                if not got:
                    continue
                raw, fetched = got
                title = re.search(r'<title>(.*?) [–-] PolitiFact</title>', raw.decode('utf-8', 'replace'))
                shown = title.group(1).strip() if title else c['name']
                counts, bio, years = parse(raw, shown)
                if set(counts) != set(LABELS.values()):
                    sys.exit(f'{url}: scorecard not found (page layout changed?)')
                if c['id'] not in SAME_PERSON and state_name not in bio:
                    review.append(f"{c['id']}: {url} bio doesn't name {state_name}: {bio!r}")
                    break
                out[c['id']] = {
                    'publisher': 'PolitiFact',
                    'url': url,
                    'retrieved': fetched,
                    'counts': counts,
                    **({'bio': bio} if bio else {}),
                    **({'latestYear': max(years)} if years else {}),
                }
                break
    dest = HERE / f'{state}-politifact.json'
    dest.write_text(json.dumps({'candidates': out}, indent=1, ensure_ascii=False) + '\n')
    print(f'{dest.name}: {len(out)} candidates with a PolitiFact record')
    for cid, v in out.items():
        print(f"  {cid}: {sum(v['counts'].values())} rulings latest {v.get('latestYear')}  {v.get('bio', '')[:90]}")
    if review:
        print('Not used (check by hand; add to SAME_PERSON if it is them):\n  ' + '\n  '.join(review))


if __name__ == '__main__':
    build(sys.argv[1])
