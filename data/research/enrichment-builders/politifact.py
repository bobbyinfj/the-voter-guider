# Builds <state>-politifact.json: each candidate's PolitiFact Truth-O-Meter counts, copied from
# their PolitiFact page (politifact.com/personalities/<slug>/). build.py merges it into the
# enrichment file as `factCheck`; the Expanded view's 💩 meter is worked out from it
# (lib/scorecard.ts, explained at /how-we-score).
#
# robots.txt allows Claude's agents on politifact.com (checked again on every fetch) and asks
# for a 10-second crawl delay, which we keep.
#
# Who has a page: every PolitiFact page carries its "Any Speaker" menu, the full list of people
# PolitiFact has rated; a candidate is looked up there by first and last name (or nickname and
# last name). A page is only used when it's the same person: its bio line ("X is California's attorney
# general…") must name the state, or the candidate is listed in SAME_PERSON after a manual
# check. Pages that don't exist are skipped; nothing is inferred. Also recorded: the bio line
# and the year of the newest ruling (the page lists rulings newest first), so voters can see how
# old the record is.
#
# Usage: python3 politifact.py ca   (pages cached in ../comparison-builders/cache/)
import hashlib
import html
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


# Any PolitiFact page works as the source of the speaker menu
SPEAKER_MENU = BASE + 'xavier-becerra/'


def speakers():
    """PolitiFact's list of everyone it has rated: lowercased name → page slug"""
    raw, _ = get(SPEAKER_MENU)
    page = raw.decode('utf-8', 'replace')
    menu = page[page.find('Any Speaker'):]
    return {html.unescape(n).strip().lower(): v for v, n in re.findall(r'<option[^>]*value="([a-z0-9-]+)"[^>]*>([^<]+)</option>', menu)}


def slugs(name, menu):
    """'Donald P. (Don) Wagner' → slugs of speakers named 'donald wagner', 'don wagner' or 'donald p. wagner'"""
    nicks = re.findall(r'\(([^)]*)\)', name)
    plain = re.sub(r'\(.*?\)', ' ', name)
    words = [w for w in re.findall(r"[A-Za-z][A-Za-z'.-]*", plain) if w.lower().strip('.') not in ('jr', 'sr', 'ii', 'iii')]
    if len(words) < 2:
        return []
    tries = [f'{words[0]} {words[-1]}'] + [f'{n} {words[-1]}' for n in nicks] + [' '.join(words)]
    return list(dict.fromkeys(menu[t.lower()] for t in tries if t.lower() in menu))


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
    # "Judy Chu Congresswoman Judy Chu is a Democrat and represents …": the line after the heading
    # (between the heading and "<name> Website Scorecard"), cut to two sentences
    m = re.search(r'Join Now! ' + re.escape(name) + r' (.+?) (?:' + re.escape(name) + r' )?(?:Website )?Scorecard', text)
    # (a period after a single capital, as in "U.S.", doesn't end a sentence)
    bio = ' '.join(x.strip() for x in re.findall(r'.+?(?<!\b[A-Z])\.(?=\s+[A-Z]|$)', m.group(1))[:2]) if m and len(m.group(1)) < 1500 else ''
    years = [int(y) for y in re.findall(r' stated on [A-Z][a-z]+ \d{1,2}, (\d{4})', text.split('Latest Fact-Checks About')[0])]
    return counts, bio, years


def build(state):
    slug, state_name = STATES[state]
    bundle = json.loads((ROOT / f'data/elections/{slug}.json').read_text())
    menu = speakers()
    assert len(menu) > 1000, 'speaker menu not found (page layout changed?)'
    out, review = {}, []
    for office in bundle['offices']:
        for c in office['candidates']:
            tries = [SAME_PERSON[c['id']]] if c['id'] in SAME_PERSON else slugs(c['name'], menu)
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
