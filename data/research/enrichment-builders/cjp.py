# Checks every California justice on a retention question against the Commission on Judicial
# Performance's index of public decisions by judge's name (PRD J-4). Writes data/judges/ca-cjp.json,
# read by lib/cjp.ts and stated once above the retention questions.
#
# It's a check that ran, never a clean bill of health: we say which list was searched, when, and
# what turned up. A row counts as this justice only when both the surname and the first name match;
# a surname-only match (another judge) is recorded in `surnameOnly` for the curator, not shown.
#
# cjp.ca.gov allows Claude-User with a 10-second crawl delay; this makes one fetch (cb.fetch caches it).
# Usage: python3 cjp.py
import html
import importlib.util
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
_spec = importlib.util.spec_from_file_location('cb', HERE.parent / 'comparison-builders' / 'build.py')
cb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cb)

INDEX = 'https://cjp.ca.gov/decisions_by_judges/'
NAME = "Commission on Judicial Performance, Decisions by Judge’s Name"
SLUG = 'ca-general-2026-11-03'


def index_rows(raw):
    text = re.sub(r'(?is)<(script|style).*?</\1>', ' ', raw.decode('utf-8', 'replace'))
    text = html.unescape(re.sub(r'<[^>]+>', ' ', text))
    text = re.sub(r'\s+', ' ', text)
    assert 'Decisions by Judge' in text, 'not the CJP index page'
    # "SURNAME , First M. – Court, Disposition (Year)"
    rows = re.findall(r"\b([A-Z][A-Z'\-]+(?: [A-Z][A-Z'\-]+)*)\s*,\s*([A-Z][^–]{0,60}?)\s+–\s+([^()]{3,160}?\(\d{4}\))", text)
    assert len(rows) > 200, f'only {len(rows)} rows parsed; has the page changed?'
    return rows, text


def main():
    raw, fetched = cb.fetch(INDEX)
    rows, text = index_rows(raw)
    bundle = json.loads((ROOT / 'data' / 'elections' / f'{SLUG}.json').read_text())
    checks = []
    for m in bundle['measures']:
        hit = re.match(r'Retain (.+?)\?', m['title'])
        if not hit:
            continue
        parts = hit.group(1).split()
        surname, first = parts[-1].upper(), parts[0].lower()
        same = [r for r in rows if r[0] == surname]
        # Some rows don't parse; never let that hide a justice: the surname may appear on the page
        # only as often as the rows we parsed for it
        # (the index prints surnames in capitals; case titles such as "Adams v. Commission on Judicial
        # Performance" are listed apart, under "Other Cases", and kept for the curator)
        anywhere = len(re.findall(rf'\b{re.escape(surname)}\b', text))
        assert anywhere == len(same), f'{surname} appears {anywhere}x on the page but {len(same)} rows parsed; check by hand'
        cases = re.findall(rf"\b{re.escape(surname.title())} v\. [^()]{{3,80}}\(\d{{4}}\)", text)
        found = [f'{r[0]}, {r[1].strip()} – {r[2].strip()}' for r in same if r[1].lower().startswith(first)]
        checks.append({
            'measure': m['id'],
            'name': hit.group(1),
            'found': found,
            'surnameOnly': [f'{r[0]}, {r[1].strip()}' for r in same if not r[1].lower().startswith(first)] + cases,
        })
    assert len(checks) == 20, f'expected 20 retention questions, got {len(checks)}'
    out = ROOT / 'data' / 'judges' / 'ca-cjp.json'
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps({'source': {'url': INDEX, 'name': NAME, 'retrieved': fetched}, 'rows': len(rows), 'checks': checks}, indent=1, ensure_ascii=False) + '\n')
    print(f'wrote {out.relative_to(ROOT)}: {len(rows)} index rows, {sum(bool(c["found"]) for c in checks)} of {len(checks)} justices found')


if __name__ == '__main__':
    main()
