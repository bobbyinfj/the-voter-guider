# Builds data/enrichment/<slug>.json: per-candidate extras shown as "Voter Guider extras"
# (never as ballot text). Everything is copied from a source and checked against it here:
#
#   summary       verbatim fields from the official voters' pamphlet statement
#   website       as printed in the pamphlet's contact block
#   videos        <state>-videos.json; each ID re-checked with YouTube oEmbed (title must match)
#   endorsements  <state>-endorsements.json, transcribed from each campaign's own endorsements
#                 page; every name must appear on the saved copy of that page in cache/
#
# Usage: python3 build.py wa [--offline]   (--offline skips the oEmbed check)
# The cache/ folder (pamphlet PDFs, saved campaign pages) is not committed; see README.md.
import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]

STATES = {
    'wa': {
        'slug': 'wa-general-2026-11-03',
        'pamphlets': {
            'state': {
                'file': 'pamphlet/state-04.pdf',
                'title': "Washington State Voters' Pamphlet, 2026 General Election, Edition 04 (King County: Seattle)",
                'url': 'https://www.sos.wa.gov/sites/default/files/2026-10/Voters%20Pamphlet%202026%20-%20Edition%2004%C2%A0-%20King%20-%20Seattle.pdf',
            },
            'local': {
                'file': 'pamphlet/kc-local.pdf',
                'title': "King County Local Voters' Pamphlet, November 3, 2026 General Election",
                'url': 'https://cdn.kingcounty.gov/-/media/king-county/depts/elections/how-to-vote/voters-pamphlets/2026/11/local-edition.pdf',
            },
        },
    },
}

SUMMARY_FIELDS = {
    'state': [('Elected Experience', 'Elected experience'), ('Legal/Judicial Experience', 'Legal/judicial experience'),
              ('Other Professional Experience', 'Professional experience'), ('Education', 'Education')],
    'local': [('Occupation', 'Occupation'), ('Education', 'Education')],
}
KINDS = {'org', 'official', 'media', 'person'}
VIDEO_KINDS = {'interview', 'statement', 'debate'}


def squash(s):
    s = unicodedata.normalize('NFKC', s).lower().replace('’', "'").replace('‘', "'")
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def first_sentences(text, limit=320):
    """Opening sentences of a statement, verbatim, cut at a sentence boundary."""
    out = ''
    for s in re.split(r'(?<=[.!?])\s+', text):
        if out and len(out) + len(s) + 1 > limit:
            break
        out = f'{out} {s}'.strip()
    return out


def oembed(video_id):
    url = 'https://www.youtube.com/oembed?format=json&url=' + urllib.parse.quote(f'https://www.youtube.com/watch?v={video_id}')
    with urllib.request.urlopen(url, timeout=20) as r:
        return json.load(r)


def build(state, offline=False):
    cfg = STATES[state]
    bundle = json.loads((ROOT / 'data/elections' / f"{cfg['slug']}.json").read_text())
    candidates = [c for o in bundle['offices'] for c in o['candidates']]
    ids = {c['id'] for c in candidates}
    cache = HERE / 'cache' / state
    errors = []

    sys.path.insert(0, str(HERE))
    from pamphlet import endorsement_text, parse_wa
    p = cfg['pamphlets']
    statements = parse_wa(cache / p['state']['file'], cache / p['local']['file'], candidates)

    endorsements = json.loads((HERE / f'{state}-endorsements.json').read_text())
    videos = json.loads((HERE / f'{state}-videos.json').read_text())
    for cid in set(endorsements) | set(videos):
        if cid not in ids:
            errors.append(f'{cid}: not a candidate in {cfg["slug"]}')

    out = {}
    for c in candidates:
        cid = c['id']
        entry = {}
        st = statements.get(cid)
        if st:
            src = p[st['pamphlet']]
            f = st['fields']
            entry['summary'] = {
                'source': {'title': src['title'], 'url': src['url'], 'page': st['page']},
                'fields': [{'label': label, 'text': f[key]} for key, label in SUMMARY_FIELDS[st['pamphlet']] if f.get(key)],
                'statement': first_sentences(f.get('Statement', '')) or None,
            }
            said = endorsement_text(f)
            if said:
                entry['pamphletEndorsements'] = said
            if st['website']:
                entry['website'] = st['website']

        e = endorsements.get(cid)
        if e and e['endorsers']:
            page = cache / f"{cid}{e.get('cacheSuffix', '')}.txt"
            text = squash(page.read_text()) if page.exists() else None
            if text is None:
                errors.append(f'{cid}: saved endorsements page {page.name} missing (fetch it, see README)')
            for item in e['endorsers']:
                if item['kind'] not in KINDS:
                    errors.append(f"{cid}: bad kind {item['kind']}")
                if text is not None and squash(item['name']) not in text:
                    errors.append(f"{cid}: '{item['name']}' not found on {e['url']}")
            entry['endorsements'] = {
                'source': {'url': e['url'], 'retrieved': e['retrieved']},
                'list': [{'name': i['name'], 'kind': i['kind']} for i in e['endorsers']],
                **({'individuals': e['individuals']} if e.get('individuals') else {}),
            }

        vids = videos.get(cid, [])
        for v in vids:
            if not re.fullmatch(r'[\w-]{11}', v['youtubeId']) or v['kind'] not in VIDEO_KINDS:
                errors.append(f"{cid}: bad video {v}")
            elif not offline:
                o = oembed(v['youtubeId'])
                if o['title'] != v['title'] or o['author_name'] != v['channel']:
                    errors.append(f"{cid}: video {v['youtubeId']} is now '{o['title']}' by {o['author_name']}")
        if vids:
            entry['videos'] = vids
        if entry:
            out[cid] = entry

    if errors:
        sys.exit('Refusing to write:\n  ' + '\n  '.join(errors))
    dest = ROOT / 'data/enrichment' / f"{cfg['slug']}.json"
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps({'slug': cfg['slug'], 'candidates': out}, indent=1, ensure_ascii=False) + '\n')
    n = len(candidates)
    count = lambda k: sum(1 for v in out.values() if k in v)
    print(f"{dest.relative_to(ROOT)}: {n} candidates; summary {count('summary')}, website {count('website')}, "
          f"videos {count('videos')}, endorsements {count('endorsements')}")


if __name__ == '__main__':
    build(sys.argv[1], offline='--offline' in sys.argv)
