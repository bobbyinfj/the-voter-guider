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
import importlib.util
import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
# Saved, robots-checked copies of sources (comparison-builders/build.py)
_spec = importlib.util.spec_from_file_location('cb', HERE.parent / 'comparison-builders' / 'build.py')
cb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cb)
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
VIDEO_KINDS = {'interview', 'statement', 'debate', 'forum', 'explainer', 'meeting'}
# Who made it (lib/profile.ts VIDEO_ORIGINS); campaign and meeting videos also need the page they came from
ORIGINS = {'independent', 'civic', 'viewpoint', 'government', 'campaign'}
# Public-meeting clips may come from the past year; everything else is from this cycle
MEETING_SINCE = '2025-10-01'
# Kept in the videos JSON for review, not shown to voters
REVIEW_ONLY = ('evidence',)


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


def shown(video):
    return {k: v for k, v in video.items() if k not in REVIEW_ONLY}


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

    def check_videos(owner, vids, people=()):
        for v in vids:
            dated = v['published'] >= MEETING_SINCE if v['kind'] == 'meeting' else v['published'].startswith('2026')
            needs_page = v['kind'] == 'meeting' or v.get('origin') == 'campaign'
            if (not re.fullmatch(r'[\w-]{11}', v['youtubeId']) or v['kind'] not in VIDEO_KINDS or v.get('origin') not in ORIGINS
                    or not dated or (needs_page and not str(v.get('sourceUrl', '')).startswith('https://'))):
                errors.append(f'{owner}: bad video {v}')
            elif not offline:
                o = checked.get(v['youtubeId']) or oembed(v['youtubeId'])
                checked[v['youtubeId']] = o
                if o['title'] != v['title'] or o['author_name'] != v['channel']:
                    errors.append(f"{owner}: video {v['youtubeId']} is now '{o['title']}' by {o['author_name']}")
            for p in v.get('participants', []):
                if p['id'] not in people:
                    errors.append(f"{owner}: video {v['youtubeId']} participant {p['id']} isn't in the race")

    statements = cfg['statements'](cache, candidates) if 'statements' in cfg else {}
    endorsements = load(f'{state}-endorsements.json', {})
    # A news organization's voter guide per race (laist.py builds ca-laist.json)
    guides = load(f'{state}-laist.json', {'candidates': {}, 'races': {}})
    videos = load(f'{state}-videos.json', {'candidates': {}, 'races': {}})
    # PolitiFact Truth-O-Meter counts (politifact.py builds <state>-politifact.json)
    factchecks = load(f'{state}-politifact.json', {'candidates': {}})
    # State Bar records for candidates who are lawyers (calbar.py), and FPPC fines (fppc.py)
    bar = load(f'{state}-calbar.json', {'covered': [], 'candidates': {}})
    fines = load(f'{state}-fppc.json', None)
    # News fact-checks' claims and verdicts, verbatim (<state>-factchecks.json, curated by hand)
    claims = {}
    for art in load(f'{state}-factchecks.json', {'articles': []})['articles']:
        raw, fetched = cb.fetch(art['url'])
        page = cb.norm(cb.page_text(raw))
        for c in art['claims']:
            for k in ('claim', 'verdict'):
                for part in c[k].split(' … '):
                    if cb.norm(part) not in page:
                        errors.append(f"{c['candidate']}: {k} not on {art['url']}: {part[:60]}")
            claims.setdefault(c['candidate'], []).append(
                {'publisher': art['publisher'], 'title': art['title'], 'url': art['url'], 'retrieved': fetched, 'claim': c['claim'], 'verdict': c['verdict']})
    for cid in set(endorsements) | set(videos['candidates']) | set(guides['candidates']) | set(factchecks['candidates']) | set(bar['candidates']) | set(bar['covered']) | set((fines or {}).get('candidates', {})):
        if cid not in ids:
            errors.append(f'{cid}: not a candidate in {cfg["slug"]}')

    office_of = {c['id']: o['id'] for o in bundle['offices'] for c in o['candidates']}
    race_videos = videos['races']
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

        fc = factchecks['candidates'].get(cid)
        if fc:
            entry['factCheck'] = fc
        if cid in claims:
            entry['claims'] = claims[cid]
        if cid in bar['candidates']:
            entry['bar'] = bar['candidates'][cid]
        elif cid in bar['covered']:
            # A lawyer we couldn't match to exactly one State Bar profile: checked, nothing shown
            entry['bar'] = {'publisher': 'State Bar of California', 'unmatched': bar.get('unmatched', {}).get(cid, 'several')}
        if fines is not None:
            # Everyone was searched; an empty list means no fines in the releases searched
            s = fines['searched']
            entry['ethics'] = {'publisher': 'Fair Political Practices Commission', 'from': s['from'], 'to': s['to'],
                               'releases': s['releases'], 'fines': fines['candidates'].get(cid, [])}

        vids = videos['candidates'].get(cid, [])
        check_videos(cid, vids)
        # Race forums and debates they're in, from where they first speak when we know it
        in_race = [{**{k: x for k, x in shown(v).items() if k != 'participants'}, **({'startSec': p['startSec']} if 'startSec' in p else {})}
                   for v in race_videos.get(office_of[cid], []) for p in v.get('participants', []) if p['id'] == cid]
        # The race copy (host, start) wins over the same video listed for them alone
        vids = [v for v in vids if v['youtubeId'] not in {r['youtubeId'] for r in in_race}] + in_race
        if vids:
            entry['videos'] = [shown(v) for v in vids]
        if entry:
            out[cid] = entry

    races = {}
    for office_id, vids in videos['races'].items():
        if office_id not in office_ids:
            errors.append(f'{office_id}: not an office in {cfg["slug"]}')
        check_videos(office_id, vids, {cid for cid, o in office_of.items() if o == office_id})
        races.setdefault(office_id, {})['videos'] = [shown(v) for v in vids]
    # Measures and retentions: explainers, forums, and each side's own videos
    measure_ids = {m['id'] for m in bundle['measures']}
    measures = {}
    for measure_id, vids in videos.get('measures', {}).items():
        if measure_id not in measure_ids:
            errors.append(f'{measure_id}: not a measure in {cfg["slug"]}')
        check_videos(measure_id, vids)
        measures[measure_id] = {'videos': [shown(v) for v in vids]}
    # Retention questions: the official evaluation of the judge (judges.py builds <state>-judges.json)
    for measure_id, evaluation in load(f'{state}-judges.json', {}).items():
        if measure_id not in measure_ids:
            errors.append(f'{measure_id}: not a measure in {cfg["slug"]}')
        measures.setdefault(measure_id, {})['evaluation'] = evaluation
    if state in RACE_LINKS:
        file, label = RACE_LINKS[state]
        for office_id, url in load(file, {}).items():
            if office_id not in office_ids or not url.startswith('https://'):
                errors.append(f'{office_id}: bad race link {url}')
            races.setdefault(office_id, {})['links'] = [{'label': label, 'url': url}]

    # The King County Bar Association's ratings (kcba.py): on each candidate it rates, and its list on each
    # race it covers, since that's where an unrated opponent's N/A is explained
    ratings = load(f'{state}-ratings.json', None)
    if ratings:
        for cid, rating in ratings['candidates'].items():
            if cid not in ids:
                errors.append(f'{cid}: not a candidate in {cfg["slug"]}')
            out.setdefault(cid, {})['barRating'] = rating
        for office_id in ratings['races']:
            races.setdefault(office_id, {}).setdefault('links', []).append(
                {'label': "King County Bar Association's ratings for this race (N/A: not rated within the last three years)", 'url': ratings['url']})

    for office_id, link in guides['races'].items():
        if office_id not in office_ids:
            errors.append(f'{office_id}: not an office in {cfg["slug"]}')
        races.setdefault(office_id, {}).setdefault('links', []).append({'label': link['label'], 'url': link['url']})

    if errors:
        sys.exit('Refusing to write:\n  ' + '\n  '.join(errors))
    dest = ROOT / 'data/enrichment' / f"{cfg['slug']}.json"
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps({'slug': cfg['slug'], 'candidates': out, 'races': races, 'measures': measures}, indent=1, ensure_ascii=False) + '\n')
    count = lambda k: sum(1 for v in out.values() if k in v)
    print(f"{dest.relative_to(ROOT)}: {len(candidates)} candidates; summary {count('summary')}, website {count('website')}, "
          f"videos {count('videos')} (+{sum('videos' in m for m in measures.values())} measures), judge evaluations {sum('evaluation' in m for m in measures.values())}, endorsements {count('endorsements')}, guide {count('guide')}, factCheck {count('factCheck')}; races with extras {len(races)}")


if __name__ == '__main__':
    for state in [a for a in sys.argv[1:] if not a.startswith('--')]:
        build(state, offline='--offline' in sys.argv)
