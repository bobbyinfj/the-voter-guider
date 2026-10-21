# Election bundle builders

`python3 build.py` regenerates `data/elections/*.json` from `wa.py`, `ca.py` and `co.py`.
Edit those specs (not the JSON) to change a ballot. Every fact in them comes from the
official sources listed in the matching `data/research/2026-general-*.md` fact sheet.

- `ca-props.json`: official summary, fiscal impact and "what your vote means" for each CA
  proposition, scraped verbatim from https://voterguide.sos.ca.gov/propositions/<n>/
- `co-measures.json`: "what your vote means", who placed it on the ballot and the vote
  needed, verbatim from the 2026 Colorado Blue Book
