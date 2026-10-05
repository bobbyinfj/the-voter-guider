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

```bash
cd data/research/quiz-builders
curl -sL -A "Mozilla/5.0" "<url>" -o calm-gov.html   # filename = the .txt name in the spec, as .html
python3 extract.py calm-gov.html                       # writes calm-gov.txt
python3 ca_quiz.py
```

Washington uses text extracted from the state voters' pamphlet PDF (candidate statements),
saved as `wa-house.txt` / `wa-ld37.txt`.

Sources used for November 2026:
- California: CalMatters 2026 Voter Guide race pages
- Colorado: CPR News 2026 voter guide candidate pages
- Washington: Washington State Voters' Pamphlet 2026 (candidate statements)
