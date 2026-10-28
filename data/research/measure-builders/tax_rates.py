# Builds data/measures/tax-rates.json: income tax brackets with and without a measure, for the
# "tax rates with and without" chart on the ballot (lib/taxRates.ts, components/ballot/TaxRates.tsx).
#
# Rules (CLAUDE.md "Transparency is the product"):
#   - Rates come from the Legislative Analyst's Office analysis. Its rate table is an image, so the
#     brackets below are transcribed from it by hand; the build records the image's SHA-256 and
#     fails if LAO changes the figure, so the transcription gets re-checked.
#   - The text claims shown beside the chart (revenue range, expiry) are quotes checked against
#     the saved LAO page.
#
# Usage: python3 tax_rates.py   (fetches via comparison-builders/build.py: robots-checked, cached)
import hashlib
import json
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
}


def build():
    out_path = ROOT / 'data' / 'measures' / 'tax-rates.json'
    old = json.loads(out_path.read_text()) if out_path.exists() else {}
    out = {}
    for mid, m in MEASURES.items():
        raw, fetched = cb.fetch(m['page'])
        page = cb.norm(cb.page_text(raw))
        for q in m['quotes']:
            assert cb.norm(q) in page, f'{mid}: quote not on {m["page"]}: {q[:70]}'
        img, _ = cb.fetch(m['figure'])
        sha = hashlib.sha256(img).hexdigest()
        pinned = old.get(mid, {}).get('source', {}).get('figureSha256')
        assert not pinned or pinned == sha, f'{mid}: LAO changed the figure; re-check the brackets against it, then delete the pinned hash'
        out[mid] = {
            'tax': m['tax'],
            'labels': m['labels'],
            'brackets': [dict(zip(['single', 'joint', 'now', 'yes', 'no'], b)) for b in m['brackets']],
            'quotes': m['quotes'],
            'source': {'url': m['page'], 'name': m['sourceName'], 'figure': m['figure'], 'figureSha256': sha, 'retrieved': fetched},
        }
    out_path.parent.mkdir(exist_ok=True)
    out_path.write_text(json.dumps(out, indent=1) + '\n')
    print(f'wrote {out_path.relative_to(ROOT)}: {len(out)} measures')


if __name__ == '__main__':
    build()
