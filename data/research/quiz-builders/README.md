# Quiz builders

These scripts generate `data/issues/*.json`, `data/stances/<slug>.json` and
`data/quizzes/<slug>.json` for each election. They are the source of truth for the quiz
content: edit a `*_quiz.py` spec and re-run it rather than editing the JSON by hand.

Each quiz question is one statement (an "issue axis"). A candidate's position on it
(-2 strongly disagrees … +2 strongly agrees) is included **only** when a source says so,
and every stance carries the verbatim quote that supports it. `quizgen.build()` refuses
to write anything if a quote isn't found word-for-word in the downloaded source text.
Leave a candidate out rather than infer a position.

## Re-running

The source pages aren't committed (they're copyrighted articles). Download each URL in a
spec's `S` dict as HTML into this folder, convert it, then run the spec:

Fetch with `fetch()` in `../comparison-builders/build.py`, which checks robots.txt first and
refuses a source that disallows Claude's user agents (never work around that), then save its
`norm(page_text(...))` as the `.txt` name in the spec:

```bash
cd data/research/quiz-builders
python3 -c "import importlib.util as u; s=u.spec_from_file_location('cb','../comparison-builders/build.py'); cb=u.module_from_spec(s); s.loader.exec_module(cb); open('calm-gov.txt','w').write(cb.norm(cb.page_text(cb.fetch('<url>')[0])))"
python3 ca_quiz.py
```

A stance counts toward a match only where every candidate in the race has one (see `lib/quiz/score.ts`),
so complete pairs before adding singletons, and never infer a position from general campaign
language: if the source doesn't state it, leave it out.

Washington uses text extracted from the state voters' pamphlet PDF (candidate statements),
saved as `wa-house.txt` / `wa-ld37.txt`.

Sources used for November 2026:
- California: CalMatters 2026 Voter Guide race pages; CalMatters' October 2026 insurance commissioner
  story; Voice of OC (Huntington Beach sanctuary-law suit); Times of San Diego (superintendent
  primary); the Gates and Romero campaign sites. EdSource is skipped (robots.txt unreadable).
- California local races (their own quiz modules): LAist's LACCD candidate survey (student housing:
  only answers that commit to building count; "connect students to resources" is left out), the
  sheriff candidates' campaign sites (Villanueva's via his site's own `wp-json` page API, since the
  pages render in JavaScript), and the county sample ballot's candidate statements for Monterey Park
  Council District 5 (`isb.lavote.gov`, saved from the bundle's `countyStatement`). Not usable:
  Mike Fong's site and leginfo.legislature.ca.gov block Claude, and an opponent's description of a
  candidate's votes is never used as that candidate's position. LAist's sheriff and Assembly guides
  state no positions.
- Colorado: CPR News 2026 voter guide candidate pages
- Washington: Washington State Voters' Pamphlet 2026 (candidate statements)
