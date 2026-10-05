# Builds data/issues/<axis>.json, data/stances/<slug>.json and data/quizzes/<slug>.json
# from a spec. Every stance quote must appear verbatim in its downloaded source text.
import json, os, re, unicodedata
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
HERE = os.path.dirname(os.path.abspath(__file__))

def norm(s):
    s = unicodedata.normalize('NFKC', s).replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    return re.sub(r'\s+', ' ', s).strip()

_cache = {}
def source_text(path):
    if path not in _cache:
        _cache[path] = norm(open(os.path.join(HERE, path), encoding='utf-8', errors='ignore').read())
    return _cache[path]

OPTIONS = [("Strongly agree", 2), ("Somewhat agree", 1), ("Neutral / unsure", 0), ("Somewhat disagree", -1), ("Strongly disagree", -2)]

def build(slug, title, axes, sources):
    """axes: list of dict(slug, name, level, statement, help, stances=[(candidateId, position, summary, sourceKey, quote)])
       sources: sourceKey -> (url, title, localTextFile)"""
    stances, questions = [], []
    for i, ax in enumerate(axes, 1):
        issue = {"slug": ax["slug"], "name": ax["name"], "level": ax["level"], "summary": ax["statement"], "description": ax["help"]}
        with open(os.path.join(REPO, 'data', 'issues', ax["slug"] + '.json'), 'w') as f:
            json.dump(issue, f, indent=2, ensure_ascii=False); f.write('\n')
        for cand, pos, summary, skey, quote in ax["stances"]:
            url, stitle, local = sources[skey]
            assert norm(quote) in source_text(local), f"quote not found in {local}: {quote[:80]}"
            assert pos in (-2, -1, 0, 1, 2)
            stances.append({"candidateId": cand, "issueId": ax["slug"], "position": pos, "summary": summary,
                            "sources": [{"url": url, "title": stitle, "quote": quote}]})
        questions.append({"id": f"{slug}-q{i:02d}", "prompt": ax["statement"], "helpText": ax["help"], "order": i,
                          "issues": [{"issueId": ax["slug"], "weight": 1}],
                          "options": [{"label": l, "stanceValue": v, "order": n} for n, (l, v) in enumerate(OPTIONS, 1)]})
    for kind, payload in [("stances", {"electionSlug": slug, "stances": stances}),
                          ("quizzes", {"electionSlug": slug, "title": title, "questions": questions})]:
        os.makedirs(os.path.join(REPO, 'data', kind), exist_ok=True)
        with open(os.path.join(REPO, 'data', kind, slug + '.json'), 'w') as f:
            json.dump(payload, f, indent=2, ensure_ascii=False); f.write('\n')
    # every candidate id must exist in the election bundle
    bundle = json.load(open(os.path.join(REPO, 'data', 'elections', slug + '.json')))
    ids = {c["id"] for o in bundle["offices"] for c in o["candidates"]}
    missing = {s["candidateId"] for s in stances} - ids
    assert not missing, missing
    print(slug, len(axes), 'questions', len(stances), 'stances')
