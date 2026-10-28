# Builds wa-ratings.json: the King County Bar Association's ratings of Washington judicial candidates
# on the Seattle ballot, from its own list of 2026 contested judicial elections. build.py merges it
# into the enrichment file as `barRating` on each candidate it rates, and links each rated race to
# the list (whose note explains N/A: not rated by the committee within the last three years).
#
# The page is a table: a position heading, then per candidate four cells (name, rating, date of
# rating, voter's pamphlet link). Ratings are copied as printed; "N/A" is not a rating, so a
# candidate the list shows as N/A goes in `unrated` instead (the list's note explains it), letting
# the ballot say so beside them rather than show a rating for only one side of a race. Names match the bundle's candidate by first and last
# name (accents, case and middle initials aside), and every rating must appear on the saved page.
#
# Usage: python3 kcba.py   (the page is cached in ../comparison-builders/cache/)
import importlib.util
import json
import re
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
_spec = importlib.util.spec_from_file_location('cb', HERE.parent / 'comparison-builders' / 'build.py')
cb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cb)

URL = 'https://www.kcba.org/?pg=Rating-of-Candidates-in-2026-Election'
BY = 'King County Bar Association'
TITLE = 'KCBA Ratings of Candidates in 2026 Judicial Elections'
RATINGS = {'Exceptionally Well Qualified', 'Well Qualified', 'Qualified', 'Not Qualified', 'Refused to Cooperate'}


def squash(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def name_key(s):
    """First and last name: the list leaves out middle initials the ballot prints (Todd Bloom, Todd A. Bloom)."""
    words = [w for w in squash(s.replace("'", '')).split() if len(w) > 1]
    return words[0], words[-1]


def main():
    raw, retrieved = cb.fetch(URL)
    lines = [l for l in (re.sub(r'\s+', ' ', l).strip() for l in cb.page_text(raw).split('\n')) if l]
    updated = next(l for l in lines if l.startswith('Last updated '))
    rows = []
    i = lines.index('VOTER’S PAMPHLET LINK') + 1
    end = lines.index('More About KCBA Ratings')
    while i < end:
        if re.search(r'Position No\. \d+$', lines[i]):
            i += 1
            continue
        if i + 3 < end and (lines[i + 1] in RATINGS or lines[i + 1] == 'N/A'):
            rows.append((lines[i], lines[i + 1], lines[i + 2]))
            i += 4
        else:
            i += 1
    bundle = json.loads((ROOT / 'data/elections/wa-general-2026-11-03.json').read_text())
    by_name = {name_key(c['name']): (c['id'], o['id']) for o in bundle['offices'] for c in o['candidates']}
    note = re.sub(r'^\*?NOTE\s*-\s*', '', next(l for l in lines if 'N/A' in l and 'three years' in l))
    candidates, unrated, races = {}, {}, set()
    for name, rating, date in rows:
        hit = by_name.get(name_key(name))
        if not hit:
            continue
        races.add(hit[1])
        if rating == 'N/A':
            unrated[hit[0]] = {'by': BY, 'note': note,
                               'source': {'title': f'{TITLE} ({updated[0].lower()}{updated[1:]})', 'url': URL, 'retrieved': retrieved}}
            print(f'  {name}: N/A')
            continue
        assert rating in RATINGS and rating in raw.decode('utf-8', 'replace')
        candidates[hit[0]] = {'by': BY, 'value': rating, 'date': date,
                              'source': {'title': f'{TITLE} ({updated[0].lower()}{updated[1:]})', 'url': URL, 'retrieved': retrieved}}
        print(f'  {name}: {rating} ({date})')
    out = {'candidates': candidates, 'unrated': unrated, 'races': sorted(races), 'url': URL, 'title': TITLE}
    (HERE / 'wa-ratings.json').write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
    print(f'wa-ratings.json: {len(candidates)} ratings in {len(races)} races on the ballot ({updated})')


if __name__ == '__main__':
    main()
