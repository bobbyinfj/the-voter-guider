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
# Public-meeting clips (kind meeting, origin government) come from a counciloris export
# (`transcribe export-person-clips`, schema counciloris.person-clips v1): start, end and the
# transcript link are taken from the export, which must be for this candidate by name.
# usage: python3 tools/video-approve.py <state>   (reads <state>-video-picks.txt)
import datetime, difflib, importlib.util, json, os, re, subprocess, sys, unicodedata, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
ROOT = HERE.parents[2]
# Saved, robots-checked copies of pages (comparison-builders/build.py)
_spec = importlib.util.spec_from_file_location('cb', HERE.parent / 'comparison-builders' / 'build.py')
cb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cb)
SLUGS = {'wa': 'wa-general-2026-11-03', 'co': 'co-general-2026-11-03', 'ca': 'ca-general-2026-11-03'}
YTDLP = os.environ.get('YTDLP', 'yt-dlp')
TODAY = datetime.date.today().isoformat()
MEETING_SINCE = '2025-10-01'  # same as build.py
STOP_WORDS = {'a', 'an', 'and', 'the', 'of', 'for', 'to', 'in', 'on', 'or', 'with', 'by', 'certain', 'that', 'from'}


def squash(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def measure_words(text):
    """'Proposition 1' and 'Prop. 1', 'Amdt 81' and 'Amendment 81', 'IP26-645' and 'I-645' read the same."""
    t = squash(text)
    t = re.sub(r'\bproposition\b', 'prop', t)
    # Washington: filed as IP26-645 / IL26-638, talked about as I-645 / Initiative 638
    t = re.sub(r'\b(?:i[pl]26|initiative)\s+0*(\d+)', r'i \1', t)
    return re.sub(r'\bamdt\b', 'amendment', t)


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
    measures = {m['id']: m.get('number') or m['title'] for m in bundle['measures']}
    measure_titles = {m['id']: m['title'] for m in bundle['measures']}
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
        if not (published >= MEETING_SINCE if kind == 'meeting' else published.startswith('2026')):
            errors.append(f'{where}: uploaded {published}, outside this cycle'); continue
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
            if origin == 'campaign' and o.get('source') and 'youtube.com' not in o['source'][0]:
                raw, fetched = cb.fetch(o['source'][0])
                if vid in raw.decode('utf-8', 'replace'):
                    return f"embedded on the campaign's site {o['source'][0]} (saved {fetched})"
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
        if group == 'measures':
            label = measure_words(measures[owner])
            # A quote names the measure by number, or uses two or more words of its official title
            # (reporters often say "the fentanyl proposal", not "Proposition 132")
            title_words = set(squash(measure_titles[owner]).split()) - STOP_WORDS
            quoted = [q for q in o.get('said', []) if (m := re.fullmatch(r'(\d+)\s+"(.+)"', q)) and said_at(vid, int(m[1]), m[2])
                      and (f' {label} ' in f' {measure_words(m[2])} ' or len(title_words & set(squash(m[2]).split())) >= 2)]
            if f' {label} ' in f' {measure_words(text)} ':
                checks.append(f'"{measures[owner]}" named in the title or description')
            elif quoted:
                checks.append(f'transcript: {quoted[0]}')
            else:
                errors.append(f'{where}: {measures[owner]} not named in the video or a checked quote'); continue
        if 'clips' in o:
            export = json.loads((HERE / o['clips'][0]).read_text())
            clip = next((c for c in export.get('clips', []) if c['youtubeId'] == vid), None)
            if export.get('schema') != 'counciloris.person-clips' or export.get('version') != 1 or not clip:
                errors.append(f'{where}: not in {o["clips"][0]}'); continue
            if squash(export['person']['name']) != squash(person.get(owner, '')):
                errors.append(f"{where}: export is for {export['person']['name']}, not {person.get(owner)}"); continue
            entry.update({'startSec': clip['startSec'], 'endSec': clip['endSec'], 'sourceUrl': clip['transcriptUrl'],
                          'sourceLabel': f"Transcript of the {clip['meetingDate']} meeting (counciloris.com)"})
            checks.append(f"counciloris export {o['clips'][0]}: {clip['meetingDate']} {clip['meetingTitle']}, "
                          f"called on just before: \"{clip['calledOn'][-80:]}\"; rule: {export['rule']}")
            checks.append(f"quote: \"{clip['quote']}\"")
        elif group == 'candidates':
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
        checks += o.get('note', [])
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
