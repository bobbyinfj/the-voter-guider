# Builds data/measures/tax-rates.json: income tax brackets with and without a measure, for the
# "tax rates with and without" chart on the ballot (lib/taxRates.ts, components/ballot/TaxRates.tsx).
#
# Rules (CLAUDE.md "Transparency is the product"):
#   - Rates come from the official analysis (CA: Legislative Analyst's Office; CO: the Blue Book).
#     When the rate table is an image (LAO), the brackets are transcribed by hand and the build pins
#     the image's SHA-256, failing if it changes. When it's text (Blue Book `table`), the build checks
#     the table is on the page and that every bracket's rates appear in it, in order.
#   - Blue Book PDFs number their lines; `stripLineNumbers` drops those before quotes are checked.
#   - Brackets with no `joint` threshold mean one schedule for everyone (no single/joint toggle).
#   - The text claims shown beside the chart (revenue range, expiry) are quotes checked against
#     the saved LAO page.
#
# Usage: python3 tax_rates.py   (fetches via comparison-builders/build.py: robots-checked, cached)
import hashlib
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'comparison-builders'))
import build as cb  # noqa: E402

cb.CACHE = HERE / 'cache'
ROOT = HERE.parents[2]

K = 1000
MEASURES = {
    'ca26-m-prop-3': {
        'page': 'https://lao.ca.gov/BallotAnalysis/Proposition?number=3&year=2026',
        'sourceName': "Legislative Analyst's Office, Proposition 3 analysis (Figure 1)",
        'figure': 'https://lao.ca.gov/ballot/2026/prop3-fig1.png',
        'tax': 'California personal income tax',
        'labels': {'now': 'Now through 2030', 'yes': 'After 2030 if approved', 'no': 'After 2030 if rejected'},
        'quotes': [
            'Proposition 3 makes the higher income tax rates established by Proposition 30 permanent instead of letting them expire in 2031.',
            'In a weak year, the proposition might bring in around $5 billion in revenue to the state. In a strong year, the proposition might bring in $15 billion in revenue to the state.',
            'Roughly 40 percent of the funding would go to schools and community colleges.',
        ],
        # [single from, joint from, now, if approved, if rejected] (percent); LAO rounds to $1k
        'brackets': [
            [0, 0, 1.0, 1.0, 1.0],
            [11 * K, 22 * K, 2.0, 2.0, 2.0],
            [26 * K, 53 * K, 4.0, 4.0, 4.0],
            [41 * K, 83 * K, 6.0, 6.0, 6.0],
            [58 * K, 115 * K, 8.0, 8.0, 8.0],
            [73 * K, 145 * K, 9.3, 9.3, 9.3],
            [371 * K, 743 * K, 10.3, 10.3, 9.3],
            [446 * K, 892 * K, 11.3, 11.3, 9.3],
            [743 * K, 1500 * K, 12.3, 12.3, 9.3],
        ],
    },
    'co26-m-amendment-87': {
        'page': 'https://leg.colorado.gov/ballots/graduated-income-tax-2/files/blue-book',
        'sourceName': 'Colorado Legislative Council Staff, 2026 Blue Book analysis of Amendment 87 (Table 1)',
        'stripLineNumbers': True,
        'tax': 'Colorado income tax, individuals and businesses',
        'labels': {'now': 'Current law (flat rate)', 'yes': 'From 2027 if approved', 'no': 'If rejected'},
        'table': '$25,000 or less 4.4% 3.7% -0.7 $25,001 to $100,000 4.4% 4.2% -0.2 $100,001 to $500,000 4.4% 4.4% 0.0 $500,001 to $750,000 4.4% 7.4% +3.0 $750,001 to $1,000,000 4.4% 7.9% +3.5 More than $1,000,000 4.4% 8.4% +4.0',
        'quotes': [
            'Amendment 87 removes the constitutional requirement that income be taxed at a flat rate and creates a graduated income tax starting in 2027.',
            "Unlike the federal income tax, the new state income tax brackets are not adjusted for inflation, so more of taxpayers' incomes will fall into the higher brackets over time.",
            'Amendment 87 will decrease the amount of income tax owed by taxpayers with Colorado taxable income of less than $510,834 and increase the amount of income tax owed by taxpayers with Colorado taxable income of $510,834 and above.',
            'Amendment 87 is expected to increase state income tax revenue by an estimated $2 billion in the first full year and more in later years.',
        ],
        # [from, now, if approved, if rejected] (percent): one schedule for everyone
        'brackets': [
            [0, 4.4, 3.7, 4.4],
            [25 * K, 4.4, 4.2, 4.4],
            [100 * K, 4.4, 4.4, 4.4],
            [500 * K, 4.4, 7.4, 4.4],
            [750 * K, 4.4, 7.9, 4.4],
            [1000 * K, 4.4, 8.4, 4.4],
        ],
    },
}


def build():
    out_path = ROOT / 'data' / 'measures' / 'tax-rates.json'
    old = json.loads(out_path.read_text()) if out_path.exists() else {}
    out = {}
    for mid, m in MEASURES.items():
        raw, fetched = cb.fetch(m['page'])
        page = cb.norm(cb.page_text(raw))
        if m.get('stripLineNumbers'):
            # A bare 1-3 digit number between words is a line number, except a measure's own number
            page = re.sub(r'(?<= )(?<!Amendment )(?<!Proposition )\d{1,3} (?=\S)', '', page)
        for q in m['quotes']:
            assert cb.norm(q) in page, f'{mid}: quote not on {m["page"]}: {q[:70]}'
        source = {'url': m['page'], 'name': m['sourceName'], 'retrieved': fetched}
        if 'figure' in m:
            img, _ = cb.fetch(m['figure'])
            sha = hashlib.sha256(img).hexdigest()
            pinned = old.get(mid, {}).get('source', {}).get('figureSha256')
            assert not pinned or pinned == sha, f'{mid}: the figure changed; re-check the brackets against it, then delete the pinned hash'
            source.update(figure=m['figure'], figureSha256=sha)
        if 'table' in m:
            assert cb.norm(m['table']) in page, f'{mid}: rate table not on {m["page"]}'
            cells = re.findall(r'(\d+\.\d)%', m['table'])  # current, proposed per row
            assert cells == [f'{r:.1f}' for b in m['brackets'] for r in (b[-3], b[-2])], f'{mid}: brackets differ from the table'
        keys = ['single', 'joint', 'now', 'yes', 'no'] if len(m['brackets'][0]) == 5 else ['single', 'now', 'yes', 'no']
        out[mid] = {
            'tax': m['tax'],
            'labels': m['labels'],
            'brackets': [dict(zip(keys, b)) for b in m['brackets']],
            'quotes': m['quotes'],
            'source': source,
        }
    out_path.parent.mkdir(exist_ok=True)
    out_path.write_text(json.dumps(out, indent=1) + '\n')
    print(f'wrote {out_path.relative_to(ROOT)}: {len(out)} measures')


if __name__ == '__main__':
    build()
