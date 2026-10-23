# Propose videos for every candidate and measure; nothing here is shown to voters. A person (or
# Claude, recording each check) reviews <state>-video-proposals.json and copies approved entries
# into <state>-videos.json, where build.py re-checks them against YouTube.
# Finders, the same for every candidate in a race:
#   search    YouTube search for the name with the office, and within each channel in CHANNELS
#   campaign  YouTube embeds and links on the candidate's own website (robots.txt respected)
# Only metadata is read (yt-dlp, no downloads). A result is kept only when its title or
# description names the candidate (last name plus first name or office words) and it was
# uploaded in 2026.
# usage: python3 tools/video-discover.py <state> [--only <id prefix>] [--measures] [--no-campaign]
import importlib.util, json, os, re, subprocess, sys, time, unicodedata, urllib.parse
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
ROOT = HERE.parents[2]
_spec = importlib.util.spec_from_file_location('cb', HERE.parent / 'comparison-builders' / 'build.py')
cb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cb)

SLUGS = {'wa': 'wa-general-2026-11-03', 'co': 'co-general-2026-11-03', 'ca': 'ca-general-2026-11-03'}
# Channels searched for every candidate in the state, with the origin they're labeled with
# Channel ids (stable, unlike handles), resolved from videos already in <state>-videos.json or
# by name; the origin is only a hint, decided per video in review (a city channel can carry a
# League forum or a council meeting)
CHANNELS = {
    'co': {
        'UC9yI7q_1fhS4KpfQp74mokQ': 'City of Fort Collins', 'UCaXsK6jf0AddIiYEjYmzVWw': 'Rocky Mountain PBS',
        'UCNYM60lQ7kPHtRJfwHtpDZg': 'Colorado Public Radio', 'UCgkeiaMrDM4yqxIRLY82rEw': 'The Colorado Sun',
        'UCoEzcOKpqu__u2EgQxLs2mQ': 'Gazette Visuals', 'UCUknL1K-YGAa5sIss9t0_ug': 'KOAA 5',
    },
    'ca': {
        'UC8fqZ2c0yKiFhqlDiw6nI6w': 'City of Montebello', 'UC-BSVXejMFhhml4V_VyoGxg': 'KCRA 3',
        'UCSWoppsVL0TLxFQ2qP_DLqQ': 'NBCLA', 'UC9xCeMuB9TmzrPxWzoBOMfw': 'EdSource',
    },
    'wa': {
        'UC3a9f2smuVCryVXFnPyzudA': 'LWV Washington', 'UCOsaesH-ZMVJFwFaCjGCIaw': 'LWV of Seattle King County',
        'UCJfdBErVr7q8xoeYanwdniA': 'TVW', 'UCu2IUja1ASnGIr_ORrtLReg': 'Seattle Channel', 'UCbAzV-QAfHd1ckMfwU1d0Eg': 'KUOW',
    },
}
# Searched by handle (resolved 2026-10-23)
HANDLES = {'co': ['@kuncnews', '@coloradoan', '@9NEWS', '@Denver7'], 'ca': ['@cityofmontereypark', '@LAist', '@CalMatters'], 'wa': []}
YTDLP = os.environ.get('YTDLP', 'yt-dlp')  # needs curl_cffi for --impersonate: pip install 'yt-dlp[default,curl-cffi]'
PAUSE = 2.0


def squash(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def ytdlp(*args):
    time.sleep(PAUSE)
    r = subprocess.run([YTDLP, '--impersonate', 'chrome', '--skip-download', '--ignore-errors', '--no-warnings', *args],
                       capture_output=True, text=True, timeout=180)
    return [json.loads(line) for line in r.stdout.splitlines() if line.startswith('{')]


def search(query, n=15):
    return ytdlp('--flat-playlist', '-J', f'ytsearch{n}:{query}')[0].get('entries', []) if query else []


def channel_search(channel, query):
    path = channel if channel.startswith('@') else f'channel/{channel}'
    out = ytdlp('--flat-playlist', '-J', '--playlist-end', '15', f'https://www.youtube.com/{path}/search?query={urllib.parse.quote(query)}')
    return out[0].get('entries', []) if out else []


def details(video_id):
    out = ytdlp('-J', f'https://www.youtube.com/watch?v={video_id}')
    return out[0] if out else None


def names(person):
    """Words that must appear: the last name, plus the first name (or a nickname in quotes)."""
    parts = squash(re.sub(r'"([^"]+)"', r'\1', person)).split()
    suffixes = {'jr', 'sr', 'ii', 'iii', 'iv'}
    parts = [p for p in parts if p not in suffixes and len(p) > 1]
    nick = re.findall(r'"([^"]+)"', person)
    return parts[-1], {parts[0], *(squash(n) for n in nick)}


def office_words(title):
    words = squash(re.sub(r'\(.*?\)', '', title)).split()
    stop = {'of', 'the', 'and', 'district', 'position', 'seat', 'no', 'office', 'u', 's', 'state', 'county', 'city'}
    return {w for w in words if w not in stop and not w.isdigit() and len(w) > 2}


def matches(text, person, office_title):
    t = f' {squash(text)} '
    last, firsts = names(person)
    if f' {last} ' not in t:
        return None
    if any(f' {f} ' in t for f in firsts):
        return 'name'
    if office_words(office_title) & set(t.split()):
        return 'last name + office'
    return None


def campaign_videos(url):
    """(video ids, channel urls) embedded in or linked from a campaign site's home page."""
    if not url or not cb.robots_allow(url):
        return set(), set(), None
    try:
        raw, fetched = cb.fetch(url)
    except Exception as e:  # dead campaign sites are common; not an error
        return set(), set(), f'fetch failed: {e}'
    page = raw.decode('utf-8', 'replace')
    ids = set(re.findall(r'(?:youtube(?:-nocookie)?\.com/(?:embed/|watch\?v=|shorts/)|youtu\.be/)([\w-]{11})', page))
    chans = set(re.findall(r'https?://(?:www\.)?youtube\.com/(@[\w.-]+|channel/[\w-]+)', page))
    return ids, chans, fetched


def propose(state, only=None, with_measures=False, with_campaign=True):
    bundle = json.loads((ROOT / 'data/elections' / f'{SLUGS[state]}.json').read_text())
    enrichment_path = ROOT / 'data/enrichment' / f'{SLUGS[state]}.json'
    enrichment = json.loads(enrichment_path.read_text())['candidates'] if enrichment_path.exists() else {}
    have = json.loads((HERE / f'{state}-videos.json').read_text())
    known = {v['youtubeId'] for g in ('candidates', 'races', 'measures') for vs in have.get(g, {}).values() for v in vs}
    out_path = HERE / f'{state}-video-proposals.json'
    out = json.loads(out_path.read_text()) if out_path.exists() else {'candidates': {}, 'measures': {}}
    seen_details = {}

    def consider(owner, e, person, office_title, found_via, origin_hint):
        vid = e.get('id')
        if not vid or vid in known:
            return
        if not matches(f"{e.get('title', '')} {e.get('description') or ''}", person, office_title):
            d = seen_details.get(vid) or details(vid)
            seen_details[vid] = d
            if not d or not matches(f"{d.get('title', '')} {d.get('description') or ''}", person, office_title):
                return
        d = seen_details.get(vid) or details(vid)
        seen_details[vid] = d
        if not d or not str(d.get('upload_date', '')).startswith('2026'):
            return
        how = matches(f"{d['title']} {d.get('description') or ''}", person, office_title)
        entries = out['candidates'].setdefault(owner, [])
        if any(p['youtubeId'] == vid for p in entries):
            return
        u = d['upload_date']
        entries.append({
            'youtubeId': vid, 'title': d['title'], 'channel': d.get('channel') or d.get('uploader'),
            'channelUrl': d.get('channel_url'), 'published': f'{u[:4]}-{u[4:6]}-{u[6:]}', 'durationSec': d.get('duration'),
            'originHint': origin_hint, 'match': how, 'foundVia': found_via,
            'description': (d.get('description') or '')[:600],
        })

    for o in bundle['offices']:
        if only and not o['id'].startswith(only):
            continue
        for c in o['candidates']:
            cid, person = c['id'], c['name']
            plain = re.sub(r'"[^"]+"\s*', '', person).title() if person.isupper() else person
            q = f'{plain} {o["title"]} 2026'
            print(f'{cid}: {q}', file=sys.stderr)
            for e in search(q):
                consider(cid, e, person, o['title'], f'search: {q}', 'check channel')
            for ch in [*CHANNELS.get(state, {}), *HANDLES.get(state, [])]:
                for e in channel_search(ch, plain):
                    consider(cid, e, person, o['title'], f'channel search: {CHANNELS.get(state, {}).get(ch, ch)} "{plain}"', 'check channel')
            site = c.get('website') or enrichment.get(cid, {}).get('website')
            if with_campaign and site:
                ids, chans, fetched = campaign_videos(site)
                for vid in ids:
                    d = details(vid)
                    if d:
                        seen_details[vid] = d
                        consider(cid, {'id': vid, 'title': d['title'], 'description': f"{person} {o['title']}"}, person, o['title'],
                                 f'campaign site: {site} (retrieved {fetched})', 'campaign')
                for ch in chans:
                    out['candidates'].setdefault(cid, [])
                    out.setdefault('campaignChannels', {})[cid] = sorted({*out.get('campaignChannels', {}).get(cid, []), f'https://www.youtube.com/{ch}'})
            out_path.write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n')

    if with_measures:
        for m in bundle['measures']:
            if only and not m['id'].startswith(only):
                continue
            label = f"{m.get('number') or ''} {m['title']}".strip()
            q = f'{label} 2026 ballot'
            print(f"{m['id']}: {q}", file=sys.stderr)
            for e in search(q, 10):
                vid = e.get('id')
                if not vid or vid in known or any(p['youtubeId'] == vid for p in out['measures'].get(m['id'], [])):
                    continue
                d = details(vid)
                if d and str(d.get('upload_date', '')).startswith('2026'):
                    u = d['upload_date']
                    out['measures'].setdefault(m['id'], []).append({
                        'youtubeId': vid, 'title': d['title'], 'channel': d.get('channel') or d.get('uploader'),
                        'channelUrl': d.get('channel_url'), 'published': f'{u[:4]}-{u[4:6]}-{u[6:]}',
                        'durationSec': d.get('duration'), 'foundVia': f'search: {q}', 'description': (d.get('description') or '')[:600],
                    })
            out_path.write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
    n = sum(len(v) for v in out['candidates'].values())
    print(f'{out_path.name}: {n} candidate proposals for {sum(1 for v in out["candidates"].values() if v)} candidates; '
          f'{sum(len(v) for v in out["measures"].values())} measure proposals')


if __name__ == '__main__':
    args = sys.argv[1:]
    only = args[args.index('--only') + 1] if '--only' in args else None
    propose(args[0], only, '--measures' in args, '--no-campaign' not in args)
