# The Voter Guider — Claude Code Guide

## Stack
- **Framework**: Next.js 16 App Router (React 19, TypeScript 5)
- **Database**: PostgreSQL (Neon) via Prisma 7 (driver adapter `@prisma/adapter-pg`)
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss"` — no `tailwind.config.js`)
- **Auth**: Optional. Everyone gets an anonymous httpOnly session cookie `voter-guide-session` (UUID), issued by `proxy.ts` on a visitor's first request (so concurrent first requests can't mint two sessions; see `lib/session.ts`). Signing in by emailed magic link (`lib/auth.ts`, nodemailer in `lib/mail.ts`) adds a `voter-guide-auth` cookie and moves that browser's guides to the account.

## Key conventions
- Prisma client: named export `{ prisma }` from `lib/prisma.ts` — NOT a default export.
- Server components for all data-fetching pages. Client components only when state/interactivity is needed (`"use client"` at top).
- API routes in `app/api/*/route.ts`. Use `handleApiError` from `lib/errors.ts` for consistent error responses.
- Guide ownership: always `getViewer()` + `ownedBy(viewer)` / `isOwner()` from `lib/owner.ts` (pure parts in `lib/ownership.ts`). Never filter guides by `sessionId` alone or by `{ userId: null }`.

## Data model overview
The schema has two layers:

**Original (ballot tracking):** `Jurisdiction → Election → Ballot → Choice ← Guide`
- `Ballot` stores both measures (YES/NO) and candidate races (flat options array).
- `Guide` = one user's selections for one election.

**New (quiz / decision support):** `Election → Office → Candidate → CandidateStance → Issue`
- `Election → Quiz → Question → QuestionOption`
- `Question ↔ Issue` via `QuestionIssue` (weight)
- `Guide → UserAnswer` (per quiz question)

## Quiz scoring
Pure function in `lib/quiz/score.ts`. Never writes to DB — always recomputed from answers.
Per race, candidates are only compared on answered questions where *every* candidate has a sourced
stance; each race gets one verdict (`match`, `too-close`, `not-enough` below
`MIN_SHARED_QUESTIONS`). We say "not enough sourced positions" rather than infer a match.
`lib/quiz/verdict.ts` words it for the quiz panel, results page and ballot alike. The election page
shows each race's verdict under the contest (`lib/quiz/ballot.ts`); a clear match can be put on
the ballot as a `?` (unsure) pick by the voter, never automatically.
Quiz modules (`lib/quiz/modules.ts`): a question belongs to the levels (`Office.level`: federal, state,
county, city, school) of the races on the voter's ballot where some candidate has a stance on it, worked
out at runtime, never tagged by hand. The quiz page shows a chip per module (all on); `?modules=county,city`
limits which questions are asked (scoring still uses every answer), and questions no race on the ballot
has a stance on are never asked. Judges get no questions (judicial candidates can't campaign on issues).
Adaptive question ordering in `lib/quiz/nextQuestion.ts` (maximises stance variance in uncertain races).
Shared DB helpers in `lib/quiz/db.ts`.

## Data files (curated ballot content)
```
data/
  issues/       # one JSON per issue (slug, name, summary, description, level) — keep state-neutral
  elections/    # <slug>.json — offices + candidates + measures (e.g. wa-general-2026-11-03.json)
  stances/      # <slug>.json — optional; candidateId × issueId → position + sources
  enrichment/   # <slug>.json — optional; candidate summaries, videos, endorsements (built, sourced)
  quizzes/      # <slug>.json — optional; questions, options, issue links
  research/     # sourced fact sheets the election bundles were built from
    sample-ballots/  # official county sample ballots parsed to JSON (parse.py; needs pymupdf)
```
`seedElectionBundles()` in `prisma/seed.ts` seeds every `data/elections/*.json`, plus the
stances/quiz files with the same slug when they exist. To add a location, add a bundle and re-seed.

### Doing a new election
Start with `data/research/PLAYBOOK.md` (steps in order of value and cost) and `data/research/sources.json`
(every source tried, with its access status). Re-check access first with `python3 data/research/tools/source-check.py`.
Record each new source and its quirks there as you go.

### Transparency is the product
Sourcing where information comes from is paramount. Every fact, summary, endorsement, pick,
video or tally shown to a voter must say where it came from, visibly and next to the thing
itself (a "Source" link or a named publisher, plus the date it was retrieved when it can change),
not only in `data/research/`. Store the source URL with the data (bundle, enrichment, seeded
guide) so the UI can show it; if a piece of information has no source we can show, leave it
out. Ballot text says it's ballot text; anything we add is marked as a Voter Guider extra;
crowd-sourced numbers say they're from Voter Guider users, not a poll. When we pull in more
information per race or measure, pull it in *with* its source.

No made-up data, ever. Every ballot fact (candidate, party, measure) must come from an
official source (SOS certified list, voters' pamphlet, county sample ballot) recorded in
`data/research/`. Quiz content is generated by `data/research/quiz-builders/*_quiz.py`:
each question is one statement, and a candidate's position on it is included only with a
verbatim supporting quote (the builder checks the quote against the downloaded source).
Leave a stance out rather than infer it. `npm run data:cleanup` (dry run by default)
removes anything in a database that isn't backed by a bundle.

### Guide flow
The election page's ballot *is* your guide: the first box you check creates your default guide
for that election (`Guide.defaultKey` = `<owner>:<electionId>`, unique, via `getOrCreateDefaultGuide`),
and every change autosaves (`components/guide/useGuideEditor.ts`); there are no save buttons. Each
pick is `unsure` (? in the oval), `possible` (~), `tentative` (leaning, hatched) or `decided` (`Choice.status`); clicking
an oval steps it empty → leaning → decided → possibly → not sure → empty (`stepMark` in `components/ballot/ballot.ts`).
The three soft labels can sit on several options at once (`Choice.marks`, stored only with two or more;
`selection`/`status` are then the strongest, so tallies and filters read them as before); deciding one clears the
rest, and adding a label while one is decided demotes it to leaning. Possibly, like not sure, is still to go.
The ? on a contest stores the special selection `UNSURE` ("no clue yet"); clearing a pick that has
notes stores `NOTES` (no pick, notes kept). `isPick` / `isSettled` / `isUnsure` in `ballot.ts` say
what counts: ?s are still to go, and only settled real picks reach the community tally. The quiz writes to the
same default guide. Extra guides for an election live at `/guide/[id]`. **Copy for an AI** (toolbar; `helpRequestText` in `components/ballot/export.ts`) copies the ballot with "no clue yet" and ? contests first, their choices and the voter's notes, under a neutral request (explain, cite sources, don't say how to vote) to paste into Claude or another AI. Quiz questions have an "Ask Claude about it" link (`lib/quiz/ask.ts`), labeled as Claude's answer, not ours. After the first pick a
skippable prompt offers a magic-link sign-in so the guide follows you to other devices. Views:
**Expanded view** (the default every visit: ballot on the left third, a scorecard beside each candidate on the right two-thirds;
stacked on a phone; prints as the 3-column ballot without the extras) and
**Ballot view** (`basic`: 3-column replica; heading link/? icons show on hover), toggled at the top of the ballot with a ? explainer. The choice lasts for the browser tab (sessionStorage).
A button in each contest's info panel goes to Expanded.
The table of contents (`components/ballot/BallotNav.tsx`) draws a Yes/No pick's icon like its ballot oval (`VoteMark`):
green ✓ for Yes or red ✕ for No, solid once decided, striped while leaning, a dashed ring while possibly or not sure
(candidate races keep the decided/leaning/not-sure icons) and, under each state measure's number, a topic of a word or
two (`lib/measureTopics.ts`) built only from words in the official title (a test checks), with that title on hover.
**Scorecard** (`components/ballot/Scorecard.tsx`, rules in `lib/scorecard.ts`, explained to voters at
`/how-we-score`). Their video (if any) across the whole column with the one-line summary under it, then a row of its own with a 40px icon tile per column (🚩 / 💩 / 🏅, value in a corner marker, a short label beside it, details in the
hover title); clicking an icon opens just that column's card below the row, clicking it again closes it. Nothing nests: a card's contents are all shown, and Expanded has no per-contest open/close. No video means no video slot (never a "no video" placeholder).
Videos follow bite / snack / meal (`videoTier`, `videoLadder` in `lib/profile.ts`): a bite is up to 2 min, a snack up to 10, a meal longer (or a
forum part with no known end). Videos are visible by default, as thumbnails that load nothing until clicked: the most independent bite or snack leads (`leadRung`: a 1-minute meeting clip doesn't beat a 10-minute interview), else the shortest meal, with its length on the thumbnail; buttons step to the other lengths, and a whole-race debate shows in the same way. Most people spend under an hour on their whole ballot.
A measure or race with several videos shows them as a carousel (`components/candidate/VideoCarousel.tsx`, order
`shortestFirst`): one player, arrows, and a chip per video (Quick look / Short / Go deep, length, kind, who made it).
A part of a long show (`start`/`end` from the uploader's chapters, or a forum participant's own turn, `with=id@START-END` in the picks, read from the transcript) counts as its own length. Video picks are fetched
with yt-dlp's plain request; `video-approve.py` impersonates a browser only with `YTDLP_IMPERSONATE=1`.
The right-hand column is labeled once per contest ("Voter Guider extras · not on your ballot"); "Where they stand" is a chip per topic, with one topic's quotes shown at a time. The 🚩 icon takes the worst finding's color (red, yellow, green when checks ran clean, gray when nothing was checked) with the flag count in its bubble (no bubble when green: the flag says it). Columns: an interview video (debates with everyone in the race show once above, "Watch them
together"), 🚩 flags (written rules applied to everyone a source covers; the card lists the checks that
ran, so "none found" is never a clean bill of health), the 💩 meter (share of PolitiFact rulings Mostly
False or worse; no % under `FACTCHECK_MIN` rulings, and a race shows % only when every candidate qualifies; below that the icon shows the raw count, e.g. "1/5"; a race where nobody has PolitiFact rulings or fact-checked claims gets no 💩 tile at all, `raceHasAnyFactChecks`)
and 🏅 badges (published guides' picks from the comparison templates via `badgesFrom`, bar ratings, news
guides' key endorsements, campaign-site endorsements; the 🏅 tile counts badges plus endorsements, e.g. "1 badge · 105 endorsements"). Measures get "Say Yes / Say No" badges.
Every part of the ballot is linkable: `#laccd-2` (contest: ballot id minus the election prefix),
`#laccd-2--roy-payan` (candidate row), `#los-angeles-community-college-district` (every contest under
one printed jurisdiction line), old `#contest-<ballot id>` links too (`resolveAnchor` in `ballot.ts`).
The link icon on a contest heading copies one; landing on one clears filters and highlights it.
Under each candidate the Basic view shows one sentence from their own statement (state voter guide,
else county booklet), labeled with its source, or nothing (`openingSentence`).
Judges' records sit right on the ballot (`components/ballot/JudgeEvaluation.tsx`, pure parts `judgeRecord` /
`biographyLine` in `ballot.ts`): a ⚖ line under each judicial candidate with their bar association's rating
(LACBA via LAist, KCBA), or "Not rated (N/A)" when that list names them as N/A (`barUnrated`, kcba.py), so a
covered race never shows a rating for one side only; and under each retention question's ovals, the
commission's finding (CO) or the court biography's rating, title and since-year, or opening sentence (CA).
Each credit links to its source; `tests/profile.test.ts` checks every judge gets one.

### Offices explained (glossary)
`data/glossary/offices.json` (built by `data/research/glossary-builders/build.py`, read through `lib/glossary.ts`)
says what an office does in plain English, keyed by bundle office id. Each entry: our summary (`plain`, labeled
a Voter Guider summary, claiming nothing the quotes don't), verbatim `quotes` from an official page (the build
fails if a quote isn't on the saved page), the source with its retrieval date, and `ask`: questions to put to
every candidate alike about the job's powers (never assuming a position or stating current events; none for
judges). No official description, no entry, no placeholder. Shown by the "What's this job?" popover on a contest
heading (`components/ballot/OfficeExplainer.tsx`, Ballot view), at the top of the contest's info panel (Ballot view), as a `brief` summary with its source above the candidates, beside any debate (Expanded view, `ContestIntro`), and in full on `/glossary` (anchor per entry, plus "How to
choose between candidates"). Static file: no seed needed. California retention questions share one entry
(`ca-justice-retention`, keyed to every CA retention measure id): how justices get there, retention history and
drop-off, each fact with its own source; it shows only as the heading's "What is this vote?" popover, since
headings repeat per Court of Appeal division. Colorado's have their own (`co-judge-retention`: merit selection,
terms, the evaluation commissions and their retention record, from the state's judicial performance office).
Where no official page describes a job (Montebello City Treasurer: the city lists only who holds it), it has no entry.

### Tax measures: rates with and without
`data/measures/tax-rates.json` (built by `data/research/measure-builders/tax_rates.py`, read through
`lib/taxRates.ts`) holds a tax measure's brackets now / if approved / if rejected, from the official analysis
(CA Prop 3: LAO; CO Amendment 87: the Blue Book). An image table (LAO) is transcribed by hand with the image's
SHA-256 pinned (the build fails if it changes); a text table (Blue Book) is checked against the page bracket by
bracket. Quotes shown beside the chart are checked too. No `joint` brackets means one schedule for every filer.
Tests check the math against the official worked examples. The measure's info
panel shows "Tax rates with and without …" (`components/ballot/TaxRates.tsx`): a step chart of the
marginal rate by income (hover for any income), a box for your income (our math, labeled, no deductions), and
the table. Static file: no seed needed.

### Comparison guides and the community tally
`data/comparisons/<slug>.json` (built by `data/research/comparison-builders/build.py <state>`) holds
published guides — party slates, newspaper editorial boards, League of Women Voters, advocacy
guides — seeded as public template guides (`Guide.isTemplate`, id `cmp-…`). Every pick stores its
source URL and a verbatim quote; the build checks the quote against the saved page and skips any
source whose robots.txt disallows Claude-User, the agent the fetcher identifies as (never work
around a block; crawler-only blocks on ClaudeBot/anthropic-ai don't apply to these user-requested
fetches). Party and
advocacy guides are only published as left/right pairs (`comparisonProblems` in
`lib/comparisons.ts`; seed and `npm test` enforce it). `/api/compare` also returns the community
tally: anonymous totals from guides whose owner ticked "Count my picks", shown per contest only
once 5+ people shared (write-ins counted together, never named).

### Ballot replica
Guides render like the voter's real ballot. `data/research/sample-ballots/parse.py` turns a county's
official sample-ballot PDF into `<county>.json` (section headings, contest headings, instruction
lines, candidates in printed order with printed party labels, measure question text, response
labels, tables). `bundle-builders/layout.py` attaches that to each office/measure as `ballot`
(seeded into `Ballot.metadata.ballot`) and fails the build if names or candidate lists differ.
`npm test` re-checks every bundle against the parsed sample ballot. LA County's sample ballots are
per voter, so `sample-ballots/lavote_isb.py` reads the county's Interactive Sample Ballot data
(isb.lavote.gov) for Monterey Park's ballot styles into `la.json` instead. Elections without
either fall back to our own order with a notice.
Everything not printed on the ballot is drawn as a sky-blue "Voter Guider extra".

### Candidate extras (enrichment)
`data/enrichment/<slug>.json` (built by `data/research/enrichment-builders/build.py`) is seeded
into `Candidate.profile`: pamphlet statement fields verbatim, videos labeled by who made them
(independent → civic forum → government → campaign; oEmbed-checked, rules in
`enrichment-builders/README.md`, "Who made this" badge in `components/candidate/OriginBadge.tsx`), and endorsements copied line-by-line from each campaign's own page (the build
refuses any name not on the saved page). Same method for every candidate in a race; never show
"no endorsements". `factCheck` per candidate comes from `enrichment-builders/politifact.py` (PolitiFact pages, used only
when the bio names the state; 10-second crawl delay). California also has `guide` per candidate: what LAist's voter guide for the race
says (`enrichment-builders/laist.py`; judges' ratings verified against the L.A. County Bar
Association's own list), shown credited (`components/candidate/NewsGuide.tsx`). Users can keep
notes per candidate (`Choice.candidateNotes`, validated against the ballot item's options). Ballot views get a trimmed `snippet()` (lib/profile.ts), not full lists.
UI: `components/candidate/` (circle badges, click-to-load YouTube facade on youtube-nocookie).

### Ballot look (design system)
Each election's pages take its county ballot's fonts and colors (`lib/ballot-theme.ts`, tokens
in `app/globals.css`: `bg-ballot-bar`, `bg-ballot-head`, `font-ballot`, ...). Building blocks in
`components/ballot/Paper.tsx`. Text sizes are rem only (no `text-[Npx]`), so the root size in
`globals.css` (112.5% on screen, 100% in print) scales the whole site in one place. Layout grammar only: no seals, signatures or "official" wording.

### Ranked choice (not supported yet)
The ballot handles vote-for-one and Yes/No only. Fort Collins city races (odd years, from 2025) and Seattle city
primaries (from Aug 2027) are ranked-choice. `tests/rankedChoice.test.ts` fails on any contest whose printed
heading/instructions ask voters to rank (or `votingMethod: "ranked"`), so add ranking support (ordered picks,
validation, export, tally) before adding those elections.

### Districts
Offices and measures can carry `districtType` + `districtCode` (types in `lib/districts.ts`), plus more
scopes in `scope` (seeded to `Ballot.metadata.scope`, read by `scopesOf`), e.g. `{ "city": "montebello" }`: an
item shows only when every scope the voter picked matches. The CA election covers Monterey Park and Montebello
this way, each as its own page (`?city=<id>`, title and text from the bundle's `cities`, seeded to
`Election.metadata.cities`; the bare election URL asks which city). A city page's picker offers only that
city's districts, and a guide saved without a city takes the one city its picks belong to. The home page has a card per city.
Unscoped items are on every ballot. The election page's district picker filters by URL
params (`?congressional=7&legislative=43`); the quiz copies them into `Guide.metadata.districts`
and only scores matching offices. Under the picker, "See the district maps" draws each district type
around the city (`components/DistrictMap.tsx`; tapping a district picks it) from `data/maps/<slug>.json`,
built by `data/research/map-builders/districts.py` from the Census Bureau's TIGERweb and seeded to
`Election.metadata.maps`; the source and retrieval date show under the maps.

## Running locally
```bash
cp .env.local.example .env.local   # add DATABASE_URL
npx prisma migrate dev             # apply schema
npm run seed                       # legacy sample data + every data/elections bundle
npm run dev
```
Real ballot data (structure only, not stances): set `GOOGLE_CIVIC_API_KEY` and run `npm run data:populate-ballots`.

## Important paths
| Route | Purpose |
|---|---|
| `/` | Home — map, jurisdiction picker, featured Nov 2026 general elections |
| `/elections/[id]` | Election overview — offices, quiz CTA, issues |
| `/elections/[id]/quiz` | Dynamic quiz with live results panel |
| `/elections/[id]/quiz/results` | Full results with transparent score breakdown |
| `/elections/[id]/offices/[officeId]` | Side-by-side candidate comparison |
| `/candidates/[id]` | Candidate profile + all stances with sources |
| `/issues/[slug]` | Issue explainer + all candidates' stances |
| `/glossary` | What each office does (plain English, official source) + how to choose |
| `/guide/new` | Redirects to the election page (its ballot is your guide) |
| `/guide/[id]` | A guide's own page: name, notes, sharing, community opt-in |
| `/signin`, `/signin/verify` | Magic-link sign-in (the link page signs in on a button press) |

## API routes
| Route | Method | Purpose |
|---|---|---|
| `/api/elections?id=` | GET | Single election lookup |
| `/api/quiz/answer` | POST | Submit answer → returns updated results + next question |
| `/api/quiz/results?guideId=` | GET | Full quiz results for a guide |
| `/api/quiz/next?guideId=` | GET | Next recommended question |
| `/api/guides/default` | POST | Get or create your default guide for an election |
| `/api/compare?electionId=` | GET | Comparison guides + community tally |
| `/api/auth/request` · `/verify` · `/me` · `/signout` | POST/GET | Magic-link sign-in |

## Schema migrations
Use `prisma migrate dev` (not `db push`) for all schema changes. The Neon DB uses PostgreSQL 17.
**Neon is migration-tracked as of 2026-10-20** (both migrations resolved, schema verified identical), so
schema changes there are just `prisma migrate deploy`; the baseline steps below are only for some other
database that already has tables.
`prisma/migrations/0_init` is a baseline of the pre-quiz schema (as of main before the quiz work).
For a database that already has tables (e.g. Neon), first confirm it matches the baseline —
this must print an empty migration:
`git show 79b9d8f:prisma/schema.prisma > /tmp/main.prisma && npx prisma migrate diff --from-config-datasource --to-schema /tmp/main.prisma --script`
Only then run `prisma migrate resolve --applied 0_init`, then `prisma migrate deploy`.
Vercel Preview and Production share one DATABASE_URL, so a PR preview reads/writes prod data.
Merging is not deploying: the Vercel build only runs `prisma generate && next build`.
Never run `launch.sh` against a shared DB — it does `prisma db push --accept-data-loss`.
After schema changes, run `npx prisma generate` to regenerate the client.

## Linting / type-check / tests
```bash
npx tsc --noEmit --skipLibCheck   # type-check
npm run lint                       # eslint
npm test                           # node:test via tsx (tests/*.test.ts), incl. bundle ↔ sample-ballot checks
```
Browser checks: Playwright with its bundled Chromium, installed outside the repo, against a local
Postgres (see README), never the shared Neon DB.

## Working with main (several developers)
Several people and agents merge to `main`, often several times a day. Always work from the latest `main`:
- **Starting work:** `git fetch` and `git pull --ff-only` on `main`, then branch from it. Never start from a stale checkout.
- **While working:** `git fetch` at intervals (at least before each new step, and whenever you've been away);
  if `origin/main` moved, merge or rebase it into your branch and re-run the checks before going on.
- **Before pushing and before opening a PR:** fetch, bring `origin/main` into the branch, resolve conflicts, and
  re-run `tsc`, lint and `npm test` on the result.
- **Before merging:** fetch again. If `main` moved since your last check, update the branch and re-run the checks
  first (`gh pr view --json mergeStateStatus` shows when it's behind). After merging, `git pull --ff-only` on `main`.
- Never force-push `main` or rewrite history others have pulled. Never merge a schema change before its Neon
  migration is applied (see Deploying): another dev's deploy would run your code against the old schema.

## Deploying
Updates ship to production by default. Merge to `main`: Vercel deploys the code, and
`.github/workflows/deploy-data.yml` backs up Neon, runs `prisma migrate deploy` and `npm run seed` on every
push to `main` that touches the schema or a file the seed reads (the workflow's `paths` list; keep it in
step with `prisma/seed.ts`). No hand-run dump, migrate or seed is needed.
Neon is shared by Preview and Production, and Vercel can go live before the workflow finishes, so for a
schema change run the workflow from the branch first (`gh workflow run deploy-data.yml --ref <branch>
-f status_only=false`), wait for it to pass, then merge. Keep migrations additive so the old code still
works against the new schema. Then smoke-test the live site.

## Security

Before committing each iteration, check and improve security:
- Never commit secrets or API keys — use `.env.local` (gitignored); reference `DATABASE_URL`, `GOOGLE_CIVIC_API_KEY`, etc. via `process.env`
- Always use Prisma's query API — never raw SQL with string interpolation — to prevent SQL injection
- Validate and sanitize all user inputs at API route boundaries (`app/api/*/route.ts`)
- Session cookie `voter-guide-session` is httpOnly — never expose session IDs in API responses or logs
- Avoid `dangerouslySetInnerHTML` with any user-controlled content
- Run `npm audit` before shipping; address critical and high severity findings
