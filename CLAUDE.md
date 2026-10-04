# The Voter Guider — Claude Code Guide

## Stack
- **Framework**: Next.js 16 App Router (React 19, TypeScript 5)
- **Database**: PostgreSQL (Neon) via Prisma 7 (driver adapter `@prisma/adapter-pg`)
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss"` — no `tailwind.config.js`)
- **Auth**: None. Anonymous sessions via httpOnly cookie `voter-guide-session` (UUID). See `lib/session.ts`.

## Key conventions
- Prisma client: named export `{ prisma }` from `lib/prisma.ts` — NOT a default export.
- Server components for all data-fetching pages. Client components only when state/interactivity is needed (`"use client"` at top).
- API routes in `app/api/*/route.ts`. Use `handleApiError` from `lib/errors.ts` for consistent error responses.
- No auth yet — use `getSessionId()` to scope data to the current anonymous session.

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
Adaptive question ordering in `lib/quiz/nextQuestion.ts` (maximises stance variance in uncertain races).
Shared DB helpers in `lib/quiz/db.ts`.

## Data files (curated ballot content)
```
data/
  issues/       # one JSON per issue (slug, name, summary, description, level) — keep state-neutral
  elections/    # <slug>.json — offices + candidates + measures (e.g. wa-general-2026-11-03.json)
  stances/      # <slug>.json — optional; candidateId × issueId → position + sources
  quizzes/      # <slug>.json — optional; questions, options, issue links
  research/     # sourced fact sheets the election bundles were built from
```
`seedElectionBundles()` in `prisma/seed.ts` seeds every `data/elections/*.json`, plus the
stances/quiz files with the same slug when they exist. To add a location, add a bundle and re-seed.

Every ballot fact (candidate, party, measure) must come from an official source (SOS
certified list, voters' pamphlet, county sample ballot) recorded in `data/research/`.
Stances need a fetched source URL; leave a stance out rather than guess.

### Districts
Offices and measures can carry `districtType` + `districtCode` (types in `lib/districts.ts`).
Unscoped items are on every ballot. The election page's district picker filters by URL
params (`?congressional=7&legislative=43`); the quiz copies them into `Guide.metadata.districts`
and only scores matching offices.

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
| `/guide/new` | Original guide creation flow |
| `/guide/[id]` | View/edit a guide (BallotTracker) |

## API routes
| Route | Method | Purpose |
|---|---|---|
| `/api/elections?id=` | GET | Single election lookup |
| `/api/quiz/answer` | POST | Submit answer → returns updated results + next question |
| `/api/quiz/results?guideId=` | GET | Full quiz results for a guide |
| `/api/quiz/next?guideId=` | GET | Next recommended question |

## Schema migrations
Use `prisma migrate dev` (not `db push`) for all schema changes. The Neon DB uses PostgreSQL 17.
`prisma/migrations/0_init` is a baseline of the pre-quiz schema (as of main before the quiz work).
For a database that already has tables (e.g. Neon), first confirm it matches the baseline:
`prisma migrate diff --from-config-datasource --to-migrations prisma/migrations/0_init ...`
(or diff against `0_init/migration.sql`). Only if it matches, run
`prisma migrate resolve --applied 0_init`, then `prisma migrate deploy`.
Merging is not deploying: the Vercel build only runs `prisma generate && next build`.
Never run `launch.sh` against a shared DB — it does `prisma db push --accept-data-loss`.
After schema changes, run `npx prisma generate` to regenerate the client.

## Linting / type-check
```bash
npx tsc --noEmit --skipLibCheck   # type-check
npm run lint                       # eslint
```

## Security

Before committing each iteration, check and improve security:
- Never commit secrets or API keys — use `.env.local` (gitignored); reference `DATABASE_URL`, `GOOGLE_CIVIC_API_KEY`, etc. via `process.env`
- Always use Prisma's query API — never raw SQL with string interpolation — to prevent SQL injection
- Validate and sanitize all user inputs at API route boundaries (`app/api/*/route.ts`)
- Session cookie `voter-guide-session` is httpOnly — never expose session IDs in API responses or logs
- Avoid `dangerouslySetInnerHTML` with any user-controlled content
- Run `npm audit` before shipping; address critical and high severity findings
