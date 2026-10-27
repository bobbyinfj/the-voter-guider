# New-election playbook

How to build a ballot guide for a new election, distilled from the 2026 general (Seattle, Fort Collins,
Monterey Park/Montebello). It's ordered by what voters need most and what's cheapest to get right. The
rules are in `../../CLAUDE.md` (no made-up data, every fact sourced and shown with its source). The
builders' READMEs have the details.

**Start with `sources.json`**: every source we tried, what kind of data it gives, and whether our
fetcher may use it. Run `python3 data/research/tools/source-check.py` first, because access changes:
on 2026-10-27, CPR, the Colorado SOS and the Seattle Times had started blocking Claude's agents since
we last used them. For a new state, look for the same kinds of source (the `kinds` list) before
searching broadly.

## 0. Ground rules that save time

- **Use the honest fetcher, not WebFetch or curl, for anything that becomes data.**
  `comparison-builders/build.py fetch()` checks robots.txt, saves a copy (`cache/`) and records the
  date. Some official sites (Colorado's judicial performance office) 403 WebFetch but serve it.
  - If robots.txt blocks us, or a site refuses it, the source is out. Never switch user agents or
    impersonate a browser.
  - The rule refuses a source if any Claude agent is blocked, including the crawler agents
    (ClaudeBot, anthropic-ai), which is what most news sites block.
- **Search results and search summaries are never data.** Use WebSearch to find the official page,
  then fetch it. Its summaries got vote counts and URLs subtly wrong. One summary also gave a judge's
  evaluation URL (`ellison-katharine-jenny-2026-evaluation`) that doesn't exist; the real one is
  `ellison-katharine-j-…`.
- **Never build a URL from a pattern.** Find it on the source's own list page and parse it from there
  (`judges.py`, `kcba.py` do this).
- **Every builder checks its text against the saved page.** When a build refuses, the source changed:
  re-run that builder, don't hand-edit JSON. For example, a channel retitling a forum from 10/8 to
  10/7 fails `build.py`; re-run `video-approve.py`.
- **Timing.** County pamphlets and sample ballots go up about 3 weeks before election day, and they
  404 before that. Build statewide content first and schedule the county pass for that date.

## 1. The ballot (bundle-builders, sample-ballots)

1. State's certified candidate list → `bundle-builders/<st>.py`.
2. County sample ballot PDF → `sample-ballots/parse.py` (LA County: `lavote_isb.py`, its sample
   ballots are per voter). This fixes printed order and party labels, and catches races with no
   primary. Those only appear in the November county documents.
3. Districts: check 5–15 real addresses per city with the Census geocoder. Redistricting moves seats
   (Monterey Park went to CA-28 under Prop 50). Never infer district geography.

## 2. Measures

Official text and "what your vote means" come from the state guide (CA SOS proposition pages, the CO
Blue Book). For video explainers, look for one public-media or nonpartisan series that covers every
measure (CalMatters' YouTube, CPR's Purplish, Seattle Channel). A whole series in one pass is far
cheaper than one search per measure.

## 3. Candidates

In order of yield per hour:

1. **The official statement** (state/county pamphlet) → `pamphlet.py`. Covers almost everyone.
2. **A news voter guide that covers every race** and allows us (LAist/CalMatters in CA). One builder
   gets most candidates.
3. **Records:** PolitiFact (`politifact.py`, 10-second crawl delay), the State Bar (`calbar.py`),
   ethics fines (`fppc.py`). The CA ones are per-state; look for the equivalent agency elsewhere.
4. **Endorsements** from campaign sites (`crawl-*.mjs/py` → `pick.py`). Slow; do it last.

## 4. Judges (what voters say they're most lost on)

Look for these, in this order:

| Source kind | Example | Builder |
|---|---|---|
| An official retention evaluation | Colorado's Office of Judicial Performance Evaluation: a verdict, vote and narrative for every judge on the ballot | `judges.py co` |
| Bar association ratings | King County Bar (WA), LA County Bar (CA) | `kcba.py`, `laist.py` |
| The court's own biography | California appellate courts; recent appointees' bios quote the nominee rating | `judges.py ca` |

- Many states hold retention elections, and some publish official evaluations of the judges on the
  ballot (from memory, not yet verified here: Alaska, Arizona, Missouri, New Mexico, Utah, as well as
  Colorado). Check for one first, and add what you find to `sources.json`.
- Bar ratings usually cover only contested races, and many candidates don't seek one. Show N/A with
  the bar's own explanation, never as a rating.
- `profile.barRating` and `measures[id].evaluation` are generic: a new state's source plugs in through
  a new parser, with no UI work.

## 5. Videos (enrichment-builders/tools)

Ranked by yield, from the 2026 batches:

1. **Series that cover a whole race:** League of Women Voters forums, TVW and Seattle Channel video
   guides, a station's debate. Search for the series, then attach each candidate.
2. **Campaign-site scan:** curl each candidate's site, grep for YouTube embeds and channel links, then
   list that channel's 2026 uploads (`yt-dlp --flat-playlist <channel>/videos`). It's cheap and
   precise, and the label ("linked from its website") is provable.
3. **A known outlet's uploads list:** list the channel once, then match names. This found 5 videos in
   one call (Talking Downey, CrowdSourceCarrie). Per-candidate keyword search found none of them.
4. **Keyword `ytsearch`:** noisiest. Most "2026-looking" hits are from 2022 or 2024, or are someone
   else with the same name. Use it last, and always check `upload_date`.
5. **Public-meeting clips** (counciloris `export-person-clips`): officeholders only.

**Tooling:**
- Use yt-dlp from a venv with `yt-dlp[default,curl-cffi]`. Homebrew's yt-dlp lacks `--impersonate`.
- YouTube rate-limits caption downloads (429), so download audio and transcribe it with mlx_whisper
  (`whisper-large-v3-turbo`) before writing any `said=` quote.
- `video-discover.py` is too slow for per-candidate use.

**Videos that are out:** party, caucus or PAC channels, attack ads, anything not embeddable
(oEmbed 401), and pre-cycle uploads. Viewpoint outlets are allowed under their own origin, used where
a candidate has nothing else or where the host interviewed everyone in the race.

## 6. Ship

- Each PR: `npx tsc --noEmit --skipLibCheck`, `npm run lint`, `npm test`. Check it in a browser with
  Playwright against local Postgres (`voter-guider-pg` on :5433).
- Merging a change under `data/**` or `prisma/**` runs `.github/workflows/deploy-data.yml`: a backup,
  `migrate deploy`, then the seed, against prod. It needs the `PROD_DATABASE_URL` secret.

## What we'd do differently next time

- Start the registry check and the judges pass on day one; judges were the biggest gap voters felt.
- Pull county documents the day they're posted instead of re-checking a 404 URL.
- Batch videos by channel and series, not by candidate.
- Write each source's quirks into `sources.json` as soon as you find them, so they don't get
  rediscovered.
