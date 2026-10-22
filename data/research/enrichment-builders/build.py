# Builds data/enrichment/<slug>.json: per-candidate and per-race extras shown as "Voter
# Guider extras" (never as ballot text). Everything is copied from a source and checked
# against it here:
#
#   summary       verbatim from the official voters' pamphlet / voter guide statement
#   website       as printed in that statement or its contact block
#   videos        <state>-videos.json (per candidate, and per race for multi-candidate
#                 debates and forums); each ID re-checked with YouTube oEmbed
#   endorsements  <state>-endorsements.json, transcribed from each campaign's own endorsements
#                 page; every name must appear on the saved copy of that page in cache/
#   race links    e.g. the race's page on the League of Women Voters' VOTE411 (link only)
#
# Usage: python3 build.py wa|co|ca [--offline]   (--offline skips the oEmbed check)
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
sys.path.insert(0, str(HERE))

from pamphlet import endorsement_text, parse_ca, parse_wa  # noqa: E402

WA_PAMPHLETS = {
    'state': {
        'title': "Washington State Voters' Pamphlet, 2026 General Election, Edition 04 (King County: Seattle)",
        'url': 'https://www.sos.wa.gov/sites/default/files/2026-10/Voters%20Pamphlet%202026%20-%20Edition%2004%C2%A0-%20King%20-%20Seattle.pdf',
        'fields': [('Elected Experience', 'Elected experience'), ('Legal/Judicial Experience', 'Legal/judicial experience'),
                   ('Other Professional Experience', 'Professional experience'), ('Education', 'Education')],
    },
    'local': {
        'title': "King County Local Voters' Pamphlet, November 3, 2026 General Election",
        'url': 'https://cdn.kingcounty.gov/-/media/king-county/depts/elections/how-to-vote/voters-pamphlets/2026/11/local-edition.pdf',
        'fields': [('Occupation', 'Occupation'), ('Education', 'Education')],
    },
}
CA_GUIDE = {
    'state': {
        'title': 'California Official Voter Information Guide, November 3, 2026 General Election: Candidate Statements',
        'url': 'https://vig.cdn.sos.ca.gov/2026/general/pdf/candidate-statements.pdf',
        'fields': [],
    },
}

STATES = {
    'wa': {
        'slug': 'wa-general-2026-11-03',
        'statements': lambda cache, cands: parse_wa(cache / 'pamphlet/state-04.pdf', cache / 'pamphlet/kc-local.pdf', cands),
        'sources': WA_PAMPHLETS,
    },
    'co': {'slug': 'co-general-2026-11-03'},
    'ca': {
        'slug': 'ca-general-2026-11-03',
        'statements': lambda cache, cands: parse_ca(cache / 'candidate-statements.pdf', cands),
        'sources': CA_GUIDE,
    },
}
RACE_LINKS = {
    'co': ('co-vote411-races.json', "Every candidate's answers to the League of Women Voters questionnaire (VOTE411)"),
}
KINDS = {'org', 'official', 'media', 'person'}
VIDEO_KINDS = {'interview', 'statement', 'debate', 'forum'}


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


def load(name, default):
    path = HERE / name
    return json.loads(path.read_text()) if path.exists() else default


def build(state, offline=False):
    cfg = STATES[state]
    bundle = json.loads((ROOT / 'data/elections' / f"{cfg['slug']}.json").read_text())
    candidates = [c for o in bundle['offices'] for c in o['candidates']]
    ids = {c['id'] for c in candidates}
    office_ids = {o['id'] for o in bundle['offices']}
    cache = HERE / 'cache' / state
    errors = []
    checked = {}

    def check_videos(owner, vids):
        for v in vids:
            if not re.fullmatch(r'[\w-]{11}', v['youtubeId']) or v['kind'] not in VIDEO_KINDS or not v['published'].startswith('2026'):
                errors.append(f'{owner}: bad video {v}')
            elif not offline:
                o = checked.get(v['youtubeId']) or oembed(v['youtubeId'])
                checked[v['youtubeId']] = o
                if o['title'] != v['title'] or o['author_name'] != v['channel']:
                    errors.append(f"{owner}: video {v['youtubeId']} is now '{o['title']}' by {o['author_name']}")

    statements = cfg['statements'](cache, candidates) if 'statements' in cfg else {}
    endorsements = load(f'{state}-endorsements.json', {})
    # A news organization's voter guide per race (laist.py builds ca-laist.json)
    guides = load(f'{state}-laist.json', {'candidates': {}, 'races': {}})
    videos = load(f'{state}-videos.json', {'candidates': {}, 'races': {}})
    for cid in set(endorsements) | set(videos['candidates']) | set(guides['candidates']):
        if cid not in ids:
            errors.append(f'{cid}: not a candidate in {cfg["slug"]}')

    out = {}
    for c in candidates:
        cid = c['id']
        entry = {}
        st = statements.get(cid)
        if st:
            src = cfg['sources'][st['pamphlet']]
            f = st['fields']
            entry['summary'] = {
                'source': {'title': src['title'], 'url': src['url'], 'page': st['page']},
                'fields': [{'label': label, 'text': f[key]} for key, label in src['fields'] if f.get(key)],
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

        g = guides['candidates'].get(cid)
        if g:
            entry['guide'] = g
            if g.get('website') and 'website' not in entry:
                entry['website'] = g['website']

        vids = videos['candidates'].get(cid, [])
        check_videos(cid, vids)
        if vids:
            entry['videos'] = vids
        if entry:
            out[cid] = entry

    races = {}
    for office_id, vids in videos['races'].items():
        if office_id not in office_ids:
            errors.append(f'{office_id}: not an office in {cfg["slug"]}')
        check_videos(office_id, vids)
        races.setdefault(office_id, {})['videos'] = vids
    if state in RACE_LINKS:
        file, label = RACE_LINKS[state]
        for office_id, url in load(file, {}).items():
            if office_id not in office_ids or not url.startswith('https://'):
                errors.append(f'{office_id}: bad race link {url}')
            races.setdefault(office_id, {})['links'] = [{'label': label, 'url': url}]

    for office_id, link in guides['races'].items():
        if office_id not in office_ids:
            errors.append(f'{office_id}: not an office in {cfg["slug"]}')
        races.setdefault(office_id, {}).setdefault('links', []).append({'label': link['label'], 'url': link['url']})

    if errors:
        sys.exit('Refusing to write:\n  ' + '\n  '.join(errors))
    dest = ROOT / 'data/enrichment' / f"{cfg['slug']}.json"
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps({'slug': cfg['slug'], 'candidates': out, 'races': races}, indent=1, ensure_ascii=False) + '\n')
    count = lambda k: sum(1 for v in out.values() if k in v)
    print(f"{dest.relative_to(ROOT)}: {len(candidates)} candidates; summary {count('summary')}, website {count('website')}, "
          f"videos {count('videos')}, endorsements {count('endorsements')}, guide {count('guide')}; races with extras {len(races)}")


if __name__ == '__main__':
    for state in [a for a in sys.argv[1:] if not a.startswith('--')]:
        build(state, offline='--offline' in sys.argv)
