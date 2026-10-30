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
- **Videos say who made them** (`origin`, shown as a "Who made this" badge with an explainer),
  most independent first:
  1. `independent`: news outlets and nonpartisan series (League of Women Voters, TVW / Seattle
     Channel video voters' guides, public media). Debates and forums list their `participants`,
     named by the publisher or quoted from our transcript, with where each first speaks.
  2. `civic`: forums by community groups (chambers, neighborhood councils, PTAs) that invited
     every candidate in the race.
  3. `viewpoint`: commentators and outlets with a point of view (podcasts, opinion sites, faith
     programs), named by `host`. Allowed since 2026-10-27 (the user's call), ranked below civic forums.
  4. `government`: public-meeting clips (counciloris), picked by a fixed rule, with the
     transcript link. They only exist for officeholders and people who spoke at a meeting.
  5. `campaign`: the campaign's own videos, only when embedded or linked on its website or
     posted by a channel named for the candidate; `sourceUrl` says which.
  2026 uploads only (meeting clips: the past year). Never used: party or PAC videos, third-party
  attack ads, or anything with embedding turned off. Same searches for every candidate in a race
  (`tools/video-discover.py`); measures get an explainer, and a campaign's Yes or No video only
  after the other side was searched too.
- Endorsement quotes and logos aren't copied, only names.

## Colorado and California

- **California:** summaries are the Secretary of State's official candidate statements
  (`cache/ca/candidate-statements.pdf`, statewide offices only; "No candidate statement." is
  shown as printed). Videos: KCRA 3 "California Politics 360" interviews where every candidate
  in the race has one (not Treasurer: only one does), plus two-candidate debates.
- **Colorado:** Colorado publishes no candidate statements. The League of Women Voters' VOTE411
  has a questionnaire for every candidate, but its terms forbid automated access and copying,
  so we only link to each race's VOTE411 page (`co-vote411-races.json`). Multi-candidate
  debates and the League's Larimer County forum are attached to the race, not to candidates.
- **California, news voter guides:** `laist.py` → `ca-laist.json`, merged as `guide` on each
  profile. LAist's 2026 general-election guide for every race on the Monterey Park ballot that it
  covers (statewide offices are CalMatters' guides, republished by LAist; credited that way):
  the guide's description (two sentences), key endorsements, campaign site, endorsement-list link,
  State Bar profile, and the LACCD candidates' survey answers (question + two sentences). Judges'
  ratings come from the L.A. County Bar Association's own list (`lacba.org/docDownload/3141411`);
  every rating LAist reports must match it. Every text field is checked against the saved page.
  Coverage (2026-10-22): 46 of 53 candidates. Not covered by LAist: U.S. House 28, Monterey Park
  city races. The 7 LACCD candidates who didn't answer LAist's survey show LAist's note saying so.
- **Fact-check records:** `politifact.py <state>` → `<state>-politifact.json`, merged as `factCheck`.
  Each candidate's Truth-O-Meter counts from their PolitiFact page (`/personalities/<slug>/`), its bio
  line and the year of the newest ruling. A page is used only when its bio names the state (or the
  candidate is in `SAME_PERSON` after a manual check); missing pages are skipped. robots.txt allows
  Claude; its 10-second crawl delay is kept. Feeds the Expanded view's 💩 meter (`lib/scorecard.ts`).
- **Judges on retention questions:** `judges.py <state>` → `<state>-judges.json`, merged as `evaluation` on the
  retention question. Colorado: each judge's 2026 page from the Office of Judicial Performance Evaluation
  (found through its full list, never built from the URL pattern): the recommendation, the commission's
  finding sentence and vote, its narrative paragraphs and survey report links, all verbatim from the saved page.
  Shown under the ovals (finding + vote) and in the info panel ("How to decide").
  California (no retention evaluation found): each justice's biography from their court's own site (Supreme
  Court, Second District Court of Appeal), found through the court's list of justices. The sentence quoting
  the Judicial Nominees Evaluation Commission's rating when the biography has one (10 of 18 appellate
  justices; older biographies and the Supreme Court's don't), the appointment sentence, and the biography.
- **Washington bar ratings:** `kcba.py` → `wa-ratings.json`, merged as `barRating` on each candidate the King County
  Bar Association rates (its 2026 contested-elections list), plus a link to that list on each race it covers. The
  list's note explains its N/A ("not rated … within the last three years"); N/A is never shown as a rating.
- Endorsements for CO are not done yet; for CA, only the LA County Sheriff race so far. Ballotpedia blocks automated access, so it isn't used.

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

Videos: `python3 tools/video-discover.py <state> [--measures]` writes `<state>-video-proposals.json`
(metadata only, via yt-dlp). Review each one, transcribing long forums locally into
`cache/transcripts/<id>.json` to quote who speaks when, record the decision in
`<state>-video-picks.txt`, then run `python3 tools/video-approve.py <state>`. It re-checks every pick
(embeddable, 2026, the candidate named or quoted) and writes `<state>-videos.json` with the checks
as `evidence`. `python3 tools/video-coverage.py [--gaps]` shows which choices still have none.

Retrieved 2026-10-20.
