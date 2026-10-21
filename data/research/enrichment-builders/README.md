# Candidate enrichment builders

`build.py <state>` writes `data/enrichment/<slug>.json`: per-candidate extras that the site
shows as Voter Guider extras (never as ballot text). `npm run seed` loads them into
`Candidate.profile` (and the pamphlet website into `Candidate.website` when the bundle has none).

| Extra | Source | How it's checked |
|---|---|---|
| Summary ("in their own words") | Official voters' pamphlet statement, verbatim fields + opening sentences | Parsed straight from the PDF (`pamphlet.py`); page number recorded |
| Website | Pamphlet contact block | As printed; `https://` added when missing |
| Videos | `<state>-videos.json` | YouTube oEmbed title + channel must still match at build time |
| Endorsements | Each campaign's own endorsements page | Every name must appear on the saved copy of that page, or the build refuses |

## Rules (same for every candidate in a race)

- **No made-up data.** Names are lines copied from the page (`tools/pick.py`), never retyped.
  A name the page shows only in logo alt text or a merged line is added as a literal and
  still has to appear on the page.
- **One method per race.** Every campaign site gets the same crawl. If a campaign doesn't
  publish a readable list (logos without alt text, a form, or only an older cycle's list),
  it gets no endorsements; the UI never says "no endorsements".
- **Current cycle only.** 2024/2022 lists are skipped, and so is any list of candidates the
  candidate endorses.
- **Individuals are counted, not listed.** Organizations, news outlets, officials and named
  community leaders with titles get circles; long lists of private supporters become a count.
- **Videos come from nonpartisan series**, in this order: League of Women Voters interviews,
  then TVW / Seattle Channel video voters' guides, plus news-outlet debates that include
  every candidate in the race. 2026 uploads only. Not used: incumbent-only "legislator
  profile" clips, party-club endorsement interviews, personal channels.
- Endorsement quotes and logos aren't copied, only names.

## Re-running (Washington)

The cache isn't committed (copyrighted pages). Rebuild it into `cache/wa/`:

1. Pamphlets → `cache/wa/pamphlet/state-04.pdf` and `kc-local.pdf` (URLs in `build.py`).
2. Campaign sites (websites from the pamphlet), with Playwright's bundled Chromium installed
   outside the repo: `node tools/crawl-rendered.mjs sites.json cache/wa` (follows the
   site's endorsements link) and `python3 tools/crawl-static.py sites.json cache/wa` (plain
   HTML, for lists hidden in accordions). `tools/crawl-direct.mjs` fetches given URLs.
3. `python3 tools/view.py cache/wa/<id>.txt` prints numbered lines; record picks in
   `wa-endorsement-picks.txt`, then `python3 tools/pick.py cache/wa wa-endorsement-picks.txt wa-endorsements.json`.
   Line numbers refer to the saved copy, so re-check picks after re-crawling.
4. `python3 build.py wa` (needs `pymupdf`; `--offline` skips the YouTube check).

Retrieved 2026-10-20.
