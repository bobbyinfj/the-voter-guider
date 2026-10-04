# The Voter Guider — Product Requirements Document

## Vision
Help voters make confident, informed decisions by surfacing who actually matches their values — not just who has the most name recognition.

## Problem
Most voter information tools are either too shallow (candidate bios) or too overwhelming (full policy documents). Voters in contested races — especially down-ballot — often skip candidates they don't recognize, or vote on party alone.

## Target user
A California voter in or near ZIP 91755 (Monterey Park / Rosemead, LA County) preparing for the **June 2, 2026 California Primary**. Generalizes to any US voter with sufficient data.

---

## Core features

### 1. Voter Quiz (Decision Support)
**Goal:** Help a user discover which candidates match their values across ALL races on their ballot.

- Dynamic length: users answer as many questions as they want; results update live.
- Confidence-based stop suggestions: "Quick" (5q), "Confident" (12q / gap ≥ 0.25), "Thorough" (all / gap ≥ 0.8).
- Adaptive question ordering: next question chosen by expected information gain (stance variance × office uncertainty).
- Per-question importance weighting (0 = doesn't matter → 3 = very important).
- Fully transparent scoring: every point is traceable to (question → issue → candidate stance → weight × importance × agreement).
- Results show ranked candidates per office with an expandable breakdown table.

### 2. Candidate Review Pages
- Full profile: bio, party, incumbent status, photo, website.
- All stances with source citations.
- Links to their office page and the quiz.

### 3. Office Comparison Pages
- All candidates for a single office side-by-side.
- Stance grid: row = issue, column = candidate, cell = badge + 1-sentence summary.
- Quick-link to individual candidate profiles and back to the election.

### 4. Issue Pages
- Policy topic explainer (summary + longer description).
- All candidates across active elections ranked by stance.
- Visual spectrum from "Strongly Opposes" to "Strongly Supports".
- Source links for every stance.

### 5. Election Overview Page
- Date, jurisdiction, official site.
- All offices and their candidates.
- All ballot measures.
- Quiz CTA and issues sidebar.

### 6. Original Guide Builder (retained)
- Users can still manually track YES/NO/candidate picks with notes.
- Share guides via URL with a token.

---

## Data model highlights
See `CLAUDE.md` for the full schema. Key normalized tables: `Office`, `Candidate`, `Issue`, `CandidateStance`, `Source`, `Quiz`, `Question`, `QuestionIssue`, `QuestionOption`, `UserAnswer`.

### Generalization
The system is election-agnostic. Adding a new location requires only:
1. `data/elections/<slug>.json` — offices + candidates
2. `data/stances/<slug>.json` — stance data with sources
3. `data/quizzes/<slug>.json` — quiz questions
4. Re-running `npm run seed`

No code changes needed for new locations.

---

## June 2, 2026 California Primary — v1 Scope

### Statewide races (all ZIP codes in CA)
- Governor
- Lieutenant Governor
- Attorney General
- Secretary of State
- State Controller
- US Senator

### Local races (ZIP 91755 — Monterey Park / Rosemead, LA County)
- US Representative, 37th District
- State Assembly, District 49
- Monterey Park City Council

### Issues covered (18 quiz questions across 9 topics)
housing · climate · public-safety · economy · healthcare · immigration · education · water · transportation

---

## Stance authoring
Stances are curated JSON in `data/stances/` with source citations. A future admin UI (`/admin/stances`) is reserved but not built in v1.

Sources: Ballotpedia, candidate websites, League of Women Voters, CalMatters, official government sites.

---

## Scoring algorithm
```
For each candidate C in office O:
  score = Σ over answered questions Q:
    Σ over (issue I, weight W) linked to Q:
      if C has stance on I:
        agreement = 4 - |userStance - candidateStance|  // 0..4
        contribution = agreement × W × importance
        score += contribution
  normalized = score / maxPossible  // 0..1
```

Confidence per office:
```
gap = top_normalized - second_normalized
depthFactor = min(answeredCount / 10, 1)
confidence = min(gap × 2.5 × depthFactor, 1)
```

---

## Not in scope (v1)
- User authentication (sessions are anonymous cookies)
- Admin UI for stance editing
- Additional locations beyond CA + ZIP 91755
- Automated stance extraction from news/documents
- Google Civic ballot structure ingestion for the new Office/Candidate schema (manual curation for v1)
- Real-time election results / ballot tracking
- Mobile app

---

## Future roadmap
1. **Admin UI** for curating stances (with auth)
2. **More CA locations** (LA City, San Francisco, San Jose)
3. **2026 General Election** (November 2026)
4. **Other states** using the same JSON-bundle import system
5. **Automated ingestion** from Ballotpedia API / VIP data feeds
6. **Sharing quiz results** with breakdown (public URL)
7. **Endorsement integration** (LWV, labor unions, newspapers)
