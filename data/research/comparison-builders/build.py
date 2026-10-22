# Builds data/comparisons/<slug>.json: published voter guides (party slates, newspaper
# editorial boards, the League of Women Voters, advocacy guides) that people can compare their
# picks with. lib/comparisons.ts describes the format; prisma/seed.ts loads it.
#
# Rules (CLAUDE.md "Transparency is the product"):
#   - Every pick has a source URL and a quote copied from that source. The quote must appear on
#     the saved copy of the page (whitespace and curly quotes normalized), or the build fails.
#   - We only use sources whose robots.txt allows Claude's user agents; a source that blocks
#     them (or whose robots.txt we can't read, other than a 404) is skipped, never worked around.
#   - Candidate picks use the bundle's candidate name; when the source spells the name
#     differently, the quote shows the source's spelling and `alias` records why it's the same
#     person.
#   - Party and advocacy guides are only published in left/right pairs (checked again at seed).
#   - We leave a contest out rather than infer a pick.
#
# Usage: python3 build.py ca|wa|co
# cache/ (saved pages) is not committed; delete a file there to re-fetch it.
import datetime
import hashlib
import html
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CACHE = HERE / 'cache'
UA = 'Mozilla/5.0 (compatible; the-voter-guider research; one-time fetch of a public voter guide)'
CLAUDE_AGENTS = ['Claude-User', 'ClaudeBot', 'anthropic-ai', 'claude-web']


def robots_allow(url):
    u = urllib.parse.urlsplit(url)
    rp = urllib.robotparser.RobotFileParser()
    try:
        req = urllib.request.Request(f'{u.scheme}://{u.netloc}/robots.txt', headers={'User-Agent': UA})
        rp.parse(urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'replace').splitlines())
    except urllib.error.HTTPError as e:
        return e.code == 404
    except Exception:
        return False
    return all(rp.can_fetch(a, url) for a in CLAUDE_AGENTS)


def fetch(url):
    """Saved copy of a source (bytes) and the date it was fetched."""
    CACHE.mkdir(exist_ok=True)
    key = hashlib.sha256(url.encode()).hexdigest()[:16]
    body, meta = CACHE / key, CACHE / f'{key}.json'
    if not body.exists():
        assert robots_allow(url), f"robots.txt doesn't allow Claude to fetch {url}; don't use this source"
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            body.write_bytes(r.read())
        meta.write_text(json.dumps({'url': url, 'fetched': datetime.date.today().isoformat()}))
    return body.read_bytes(), json.loads(meta.read_text())['fetched']


def page_text(raw):
    if raw[:5] == b'%PDF-':
        import pymupdf  # pip install pymupdf

        return '\n'.join(p.get_text() for p in pymupdf.open(stream=raw, filetype='pdf'))
    s = raw.decode('utf-8', 'replace')
    s = re.sub(r'(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>', ' ', s)
    s = re.sub(r'(?i)<br\s*/?>|</(p|div|li|h\d|tr|td|th)>', '\n', s)
    return html.unescape(re.sub(r'<[^>]+>', ' ', s))


def norm(s):
    s = s.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    s = s.replace('–', '-').replace('—', '-').replace('\xa0', ' ')
    return re.sub(r'\s+', ' ', s).strip()


def pick(ballot, choice, source, quote, alias=None):
    return {'ballot': ballot, 'pick': choice, 'source': source, 'quote': quote, **({'alias': alias} if alias else {})}


def build(state):
    spec = {'pick': pick, 'fetch': fetch, 'page_text': page_text, 'norm': norm, 're': re}
    exec((HERE / f'{state}.py').read_text(), spec)
    slug = spec['SLUG']
    bundle = json.loads((ROOT / 'data' / 'elections' / f'{slug}.json').read_text())
    options = {f"{o['id']}-race": [c['name'] for c in o['candidates']] for o in bundle['offices']}
    measures = {m['id'] for m in bundle.get('measures', [])}

    guides = []
    for g in spec['GUIDES']:
        texts = {}
        retrieved = []
        for p in g['picks']:
            if p['source'] not in texts:
                raw, fetched = fetch(p['source'])
                texts[p['source']] = (raw, norm(page_text(raw)))
                retrieved.append(fetched)
            raw, text = texts[p['source']]
            assert norm(p['quote']) in text, f"{g['id']}: quote not on {p['source']}: {p['quote']!r}"
            if p['ballot'] in options:
                assert p['pick'] in options[p['ballot']], f"{g['id']}: {p['pick']!r} isn't running in {p['ballot']}"
            else:
                assert p['ballot'] in measures and p['pick'] in ('YES', 'NO'), f"{g['id']}: bad pick {p}"
        for check in g.get('checks', []):
            check(texts)
        guides.append({
            'id': g['id'], 'name': g['name'], 'kind': g['kind'], **({'lean': g['lean']} if g.get('lean') else {}),
            'url': g['url'], 'retrieved': min(retrieved), 'about': g['about'],
            'picks': [{k: v for k, v in p.items() if k != 'alias'} for p in g['picks']],
        })
        print(f"{g['id']}: {len(g['picks'])} picks verified")
    out = ROOT / 'data' / 'comparisons' / f'{slug}.json'
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps({'electionSlug': slug, 'guides': guides}, indent=2, ensure_ascii=False) + '\n')
    print(f'wrote {out.relative_to(ROOT)}')


if __name__ == '__main__':
    build(sys.argv[1])
