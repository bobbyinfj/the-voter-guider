# The VoTer GuidEr

**Know your whole ballot.** Every race and measure on your ballot, from Congress down to
city council, sourced from official election offices — plus a quiz that compares you with
what candidates have actually said, and a guide to record and share your picks.

Currently covers the **November 3, 2026 general election** for Seattle (WA), Fort Collins
(CO) and Monterey Park (CA).

## What's in it

- **Election pages** — every office and candidate, every statewide/county/city measure,
  with official "what a YES/NO vote means" text where the state publishes it.
- **District picker** — pick your congressional, legislative and local districts to see
  only the races on your ballot. Choices live in the URL, so links are shareable.
- **Quiz** — each question is one statement; candidates are placed on it only when they
  (or a cited source) have said so, with the quote shown. Scores say how many stated
  positions they rest on; candidates with no stated positions are shown as "no data".
- **Voter guides** — record a pick and notes for every contest, download as text, and share
  a read-only link (or keep it private). No account needed: guides are tied to an
  anonymous, httpOnly session cookie.

## No made-up data

All ballot content lives in `data/` and is generated from official sources:

| Path | What |
|---|---|
| `data/elections/*.json` | Offices, candidates and measures (built by `data/research/bundle-builders/`) |
| `data/quizzes/`, `data/stances/`, `data/issues/` | Quiz statements and sourced positions (built by `data/research/quiz-builders/`) |
| `data/research/*.md` | Fact sheets listing the source for every ballot fact |

`npm run seed` loads the bundles (and prunes anything removed from them).
`npm run data:cleanup` (dry run unless `--execute`) removes database rows that no bundle
backs. See `CLAUDE.md` for the rules.

## Stack

Next.js 16 (App Router, React 19), TypeScript, Prisma 7 with PostgreSQL (Neon), Tailwind
CSS 4, hosted on Vercel.

## Running locally

```bash
cp .env.example .env.local          # set DATABASE_URL
npx prisma migrate deploy           # apply migrations
npm run seed                        # load the election bundles
npm run dev
```

A throwaway local database works fine:

```bash
docker run -d --name voter-guider-pg -e POSTGRES_PASSWORD=localdev -e POSTGRES_DB=voter_guider -p 5433:5432 postgres:17
DATABASE_URL=postgresql://postgres:localdev@localhost:5433/voter_guider npx prisma migrate deploy
```

## Checks

```bash
npx tsc --noEmit --skipLibCheck
npm run lint
npm run build
```
