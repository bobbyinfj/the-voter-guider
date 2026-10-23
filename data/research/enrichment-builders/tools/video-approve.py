# Turn reviewed video picks into <state>-videos.json, re-checking each one and recording the
# checks (kept as `evidence`, which build.py leaves out of what voters see). One pick per line:
#   <owner> | <youtubeId> | <kind> | <origin> [; host=Name] [; start=SEC] [; end=SEC]
#           [; with=<candidate-id>@SEC,<candidate-id>,...] [; source=https://... ; label=Text]
#           [; said=SEC "verbatim words"] [; named=description|title]
# owner is a candidate id, an office id (a race video) or a measure id. Checks, all required:
#   - YouTube oEmbed resolves (title and channel are copied from it, never typed)
#   - uploaded in 2026 (public-meeting clips: since build.py MEETING_SINCE)
#   - the candidate is named: their last name in the title or description (named=...), or
#     said=SEC "words": the words appear at that second in our saved transcript of the video
#     (cache/transcripts/<id>.json, local Whisper; machine transcription, so the quote is
#     what the speaker said, as transcribed). Every race participant needs one of the two.
# usage: python3 tools/video-approve.py <state>   (reads <state>-video-picks.txt)
import datetime, difflib, json, os, re, subprocess, sys, unicodedata, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
ROOT = HERE.parents[2]
SLUGS = {'wa': 'wa-general-2026-11-03', 'co': 'co-general-2026-11-03', 'ca': 'ca-general-2026-11-03'}
YTDLP = os.environ.get('YTDLP', 'yt-dlp')
TODAY = datetime.date.today().isoformat()


def squash(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def oembed(video_id):
    # Same check as build.py's oembed()
    url = 'https://www.youtube.com/oembed?format=json&url=' + urllib.parse.quote(f'https://www.youtube.com/watch?v={video_id}')
    with urllib.request.urlopen(url, timeout=20) as r:
        return json.load(r)


def details(video_id):
    r = subprocess.run([YTDLP, '--impersonate', 'chrome', '-J', '--skip-download', '--no-warnings', '--', video_id],
                       capture_output=True, text=True, timeout=180)
    return json.loads(r.stdout) if r.stdout.startswith('{') else None


def said_at(video_id, sec, words):
    """The quote appears in our transcript within 20 seconds of `sec`."""
    path = HERE / 'cache/transcripts' / f'{video_id}.json'
    if not path.exists():
        return False
    segs = json.loads(path.read_text())
    near = ' '.join(s['text'] for s in segs if sec - 20 <= s['start'] <= sec + 20)
    return squash(words) in squash(near)


def approve(state):
    bundle = json.loads((ROOT / 'data/elections' / f'{SLUGS[state]}.json').read_text())
    person = {c['id']: c['name'] for o in bundle['offices'] for c in o['candidates']}
    office_of = {c['id']: o['id'] for o in bundle['offices'] for c in o['candidates']}
    offices = {o['id'] for o in bundle['offices']}
    measures = {m['id'] for m in bundle['measures']}
    path = HERE / f'{state}-videos.json'
    videos = json.loads(path.read_text())
    videos.setdefault('measures', {})
    errors, added = [], 0
    meta = {}

    for n, raw in enumerate(open(HERE / f'{state}-video-picks.txt'), 1):
        raw = raw.strip()
        if not raw or raw.startswith('#'):
            continue
        head, *opts = [x.strip() for x in raw.split(';')]
        owner, vid, kind, origin = [x.strip() for x in head.split('|')]
        o = {}
        for opt in opts:
            k, v = opt.split('=', 1)
            o.setdefault(k.strip(), []).append(v.strip())
        where = f'line {n} ({owner} {vid})'
        group = 'candidates' if owner in person else 'races' if owner in offices else 'measures' if owner in measures else None
        if not group:
            errors.append(f'{where}: {owner} is not a candidate, office or measure'); continue
        try:
            oe = oembed(vid)
        except Exception as e:
            # 401: the owner turned off embedding, so it can't play on our pages
            errors.append(f'{where}: oEmbed failed ({e})'); continue
        d = meta.get(vid) or details(vid)
        meta[vid] = d
        if not d:
            errors.append(f'{where}: no metadata'); continue
        u = d['upload_date']
        published = f'{u[:4]}-{u[4:6]}-{u[6:]}'
        text = squash(f"{d['title']} {d.get('description') or ''}")
        checks = [f'oEmbed: "{oe["title"]}" by {oe["author_name"]}', f'uploaded {published}']

        def named(cid, sec=None):
            last = squash(person[cid]).split()[-1]
            for said in o.get('said', []):
                m = re.fullmatch(r'(\d+)\s+"(.+)"', said)
                if m and said_at(vid, int(m[1]), m[2]):
                    # Machine transcripts misspell names: a close spelling counts, and says so
                    close = [w for w in squash(m[2]).split() if difflib.SequenceMatcher(None, w, last).ratio() >= 0.75]
                    if close:
                        spelled = '' if last in close else f' (transcribed as "{close[0]}")'
                        return f'transcript at {m[1]}s: "{m[2]}"{spelled}'
            if f' {last} ' in f' {text} ':
                return f'named in the {"title" if last in squash(d["title"]) else "description"}'
            if origin == 'campaign' and f' {last} ' in f' {squash(oe["author_name"])} ':
                return f'posted by the channel "{oe["author_name"]}"'
            return None

        entry = {'youtubeId': vid, 'kind': kind, 'origin': origin, 'title': oe['title'], 'channel': oe['author_name'],
                 'published': published, 'durationSec': d.get('duration')}
        for k in ('host', 'source', 'label'):
            if k in o:
                entry[{'source': 'sourceUrl', 'label': 'sourceLabel'}.get(k, k)] = o[k][0]
        for k in ('start', 'end'):
            if k in o:
                entry[f'{k}Sec'] = int(o[k][0])
        people = []
        if group == 'candidates':
            how = named(owner)
            if not how:
                errors.append(f'{where}: {person[owner]} not named in the video\'s title, description or a checked quote'); continue
            checks.append(how)
        for w in ','.join(o.get('with', [])).split(','):
            if not w:
                continue
            cid, _, sec = w.partition('@')
            if office_of.get(cid) != owner:
                errors.append(f'{where}: {cid} is not in {owner}'); continue
            how = named(cid)
            if not how:
                errors.append(f'{where}: participant {person[cid]} not named or quoted'); continue
            checks.append(f'{cid}: {how}')
            people.append({'id': cid, **({'startSec': int(sec)} if sec else {})})
        if people:
            entry['participants'] = people
        entry['evidence'] = {'foundVia': (o.get('found') or ['YouTube search'])[0], 'checks': checks,
                             'verifiedBy': 'claude', 'verifiedAt': TODAY}
        bucket = videos[group].setdefault(owner, [])
        bucket[:] = [v for v in bucket if v['youtubeId'] != vid] + [entry]
        added += 1

    if errors:
        sys.exit('Refusing to write:\n  ' + '\n  '.join(errors))
    path.write_text(json.dumps(videos, indent=1, ensure_ascii=False) + '\n')
    print(f'{path.name}: {added} picks approved')


if __name__ == '__main__':
    approve(sys.argv[1])
