# Which ballot choices have a video: every candidate, measure and retention in each bundle.
# A candidate is covered by their own video, or by a race video that lists them in
# `participants`; a race video without `participants` is counted apart ("race only").
# usage: python3 tools/video-coverage.py [wa co ca] [--gaps]
import json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
ROOT = HERE.parents[2]
SLUGS = {'wa': 'wa-general-2026-11-03', 'co': 'co-general-2026-11-03', 'ca': 'ca-general-2026-11-03'}
# Shown first: the races this cycle leans on
FOCUS = ('Monterey Park', 'Fort Collins', 'Larimer')

states = [a for a in sys.argv[1:] if not a.startswith('--')] or list(SLUGS)
gaps = '--gaps' in sys.argv
for st in states:
    bundle = json.loads((ROOT / 'data/elections' / f'{SLUGS[st]}.json').read_text())
    path = HERE / f'{st}-videos.json'
    videos = json.loads(path.read_text()) if path.exists() else {}
    own, races, measures = videos.get('candidates', {}), videos.get('races', {}), videos.get('measures', {})
    rows = []
    for o in bundle['offices']:
        rv = races.get(o['id'], [])
        listed = {p['id'] for v in rv for p in v.get('participants', [])}
        for c in o['candidates']:
            n = len(own.get(c['id'], [])) + sum(1 for v in rv if any(p['id'] == c['id'] for p in v.get('participants', [])))
            status = 'covered' if n else ('race only' if rv and c['id'] not in listed else 'none')
            rows.append((o['title'], c['name'], status, n))
    m_rows = [(m.get('type', 'measure'), f"{m.get('number') or ''} {m['title']}".strip(), len(measures.get(m['id'], [])))
              for m in bundle['measures']]

    cand = len(rows)
    covered = sum(1 for r in rows if r[2] == 'covered')
    race_only = sum(1 for r in rows if r[2] == 'race only')
    by_type = {}
    for t, _, n in m_rows:
        k = 'retention' if t == 'retention' else 'measure'
        tot, got = by_type.get(k, (0, 0))
        by_type[k] = (tot + 1, got + (1 if n else 0))
    print(f'== {st.upper()}: candidates {covered}/{cand} covered (+{race_only} race only)'
          + ''.join(f'; {k}s {g}/{t}' for k, (t, g) in sorted(by_type.items())))
    focus = [r for r in rows if any(f in r[0] for f in FOCUS)]
    if focus:
        print('   focus:', '; '.join(f'{r[1]} ({r[2]})' for r in focus))
    if gaps:
        for r in rows:
            if r[2] != 'covered':
                print(f'   - {r[0]}: {r[1]} [{r[2]}]')
        for t, title, n in m_rows:
            if not n:
                print(f'   - {t}: {title}')
