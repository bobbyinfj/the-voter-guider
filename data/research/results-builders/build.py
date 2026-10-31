# Builds data/results/<slug>.json: how each race on the November ballot went in this year's primary,
# from the official certified results, shown beside the contest (lib/results.ts). A fact about who
# voted then, never a prediction.
#
#   CA  Secretary of State, Statement of Vote, June 2, 2026 (csv-voter-nominated.xlsx, by county)
#   WA  Secretary of State results feed for the August 4, 2026 primary
#
# A contest is used only when every November candidate is found in it by name, so a same-named
# contest elsewhere can't slip in. Colorado's June primaries were party primaries, not one contest,
# and LA County's results site blocks automated access: neither is used.
#
# Usage: python3 build.py ca|wa   (needs openpyxl; saves downloads to cache/, which isn't committed)
import datetime, json, re, sys, unicodedata, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CACHE = HERE / 'cache'
UA = {'User-Agent': 'Claude-User (+https://claude.ai)'}
TODAY = datetime.date.today().isoformat()
SOURCES = {
    'ca': {'slug': 'ca-general-2026-11-03', 'election': 'June 2 primary', 'publisher': 'California Secretary of State, Statement of Vote',
           'url': 'https://elections.cdn.sos.ca.gov/sov/2026-primary/sov/csv-voter-nominated.xlsx', 'file': 'ca-2026-primary.xlsx'},
    'wa': {'slug': 'wa-general-2026-11-03', 'election': 'August 4 primary', 'publisher': 'Washington Secretary of State',
           'url': 'https://results.votewa.gov/results/public/api/elections/washington/20260804/data', 'file': 'wa-2026-primary.json',
           'page': 'https://results.votewa.gov/results/public/washington/elections/20260804'},
}
SUFFIX = {'jr', 'sr', 'ii', 'iii', 'iv'}


def fetch(src):
    CACHE.mkdir(exist_ok=True)
    path = CACHE / src['file']
    if not path.exists():
        path.write_bytes(urllib.request.urlopen(urllib.request.Request(src['url'], headers=UA), timeout=90).read())
    return path


def words(name):
    plain = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()
    plain = re.sub(r'\(.*?\)|".*?"', ' ', plain)
    return [w for w in re.findall(r"[a-z']+", plain) if w not in SUFFIX and len(w) > 1]


def same_person(a, b):
    x, y = words(a), words(b)
    return bool(x and y) and x[-1] == y[-1] and x[0][0] == y[0][0]


def california(src):
    import openpyxl
    rows = openpyxl.load_workbook(fetch(src), read_only=True).worksheets[0].iter_rows(values_only=True)
    head = next(rows)
    at = {name: i for i, name in enumerate(head)}
    contests = {}
    for r in rows:
        if not r[at['Contest ID']]:
            continue
        c = contests.setdefault(r[at['Contest ID']], {'name': r[at['Contest Name']], 'votes': {}})
        key = r[at['Candidate Name']]
        c['votes'][key] = c['votes'].get(key, 0) + int(r[at['Vote Total']] or 0)
    return list(contests.values())


def washington(src):
    data = json.loads(fetch(src).read_text())
    contests = []
    for item in data['ballotItems']:
        options = (item.get('summaryResults') or {}).get('ballotOptions') or []
        votes = {o['name'][0]['text']: o.get('voteCount') or 0 for o in options if o.get('name')}
        contests.append({'name': item['name'][0]['text'], 'votes': votes})
    return contests


def build(state):
    src = SOURCES[state]
    bundle = json.loads((ROOT / 'data/elections' / f"{src['slug']}.json").read_text())
    contests = california(src) if state == 'ca' else washington(src)
    out = {}
    for office in bundle['offices']:
        names = [c['name'] for c in office.get('candidates', [])]
        if len(names) < 2:
            continue
        for contest in contests:
            found = {n: next((k for k in contest['votes'] if same_person(n, k)), None) for n in names}
            if not all(found.values()):
                continue
            total = sum(contest['votes'].values())
            if not total:
                continue
            rows = [{'name': n, 'votes': contest['votes'][k]} for n, k in found.items()]
            rows.sort(key=lambda r: -r['votes'])
            out[office['id']] = {'contest': contest['name'], 'total': total, 'candidates': rows, 'others': total - sum(r['votes'] for r in rows)}
            break
    path = ROOT / 'data/results' / f"{src['slug']}.json"
    path.write_text(json.dumps({'election': src['election'], 'publisher': src['publisher'], 'url': src.get('page', src['url']),
                                'retrieved': TODAY, 'races': out}, indent=1, ensure_ascii=False) + '\n')
    print(f"{path.name}: {len(out)} of {sum(len(o.get('candidates', [])) > 1 for o in bundle['offices'])} contested races")


for state in sys.argv[1:]:
    build(state)
