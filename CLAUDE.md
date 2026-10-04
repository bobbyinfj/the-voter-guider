# The Voter Guider — Claude Code Guide

## Stack
- **Framework**: Next.js 16 App Router (React 19, TypeScript 5)
- **Database**: PostgreSQL (Neon) via Prisma 6
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
  issues/       # one JSON per issue (slug, name, summary, description, level)
  elections/    # ca-primary-2026-06-02.json — offices + candidates
  stances/      # ca-primary-2026-06-02.json — candidateId × issueId → position + sources
  quizzes/      # ca-primary-2026-06-02.json — questions, options, issue links
```
Seed reads these files in `seedCAPrimary2026()` inside `prisma/seed.ts`.
To add a new location: drop a new bundle under `data/elections/<slug>.json` + matching stances/quiz files and re-seed.

## Running locally
```bash
cp .env.local.example .env.local   # add DATABASE_URL
npx prisma migrate dev             # apply schema
npm run seed                       # seed data including CA 2026
npm run dev
```
Real ballot data (structure only, not stances): set `GOOGLE_CIVIC_API_KEY` and run `npm run data:populate-ballots`.

## Important paths
| Route | Purpose |
|---|---|
| `/` | Home — map, jurisdiction picker, featured CA 2026 banner |
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
