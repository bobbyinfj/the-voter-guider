# Builds <state>-judges.json: the official evaluation of each judge on a retention question, for
# voters who otherwise have nothing to go on. build.py merges it into the enrichment file as
# `evaluation` on the retention question (seeded into the ballot item's metadata.extras).
#
# Colorado: the Office of Judicial Performance Evaluation's 2026 page for each judge, found through
# its full list (never built from the URL pattern). Copied verbatim from the saved page:
#   recommendation  "Recommendation: …" (Meets / Does Not Meet Performance Standards)
#   finding         the sentence where the commission states its finding and vote
#   vote            the vote as that sentence gives it ("9-0")
#   narrative       the commission's paragraphs after that, as printed
#   reports         the survey report PDFs the page links
# Every text field must appear on the saved page (whitespace normalized), or the build stops.
# robots.txt allows Claude's agents on judicialperformance.colorado.gov (checked on every fetch).
#
# Usage: python3 judges.py co   (pages are cached in ../comparison-builders/cache/)
import html
import importlib.util
import json
import re
import sys
import unicodedata
import urllib.parse
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
_spec = importlib.util.spec_from_file_location('cb', HERE.parent / 'comparison-builders' / 'build.py')
cb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cb)

SLUGS = {'co': 'co-general-2026-11-03'}
CO_LIST = 'https://judicialperformance.colorado.gov/2026-judicial-performance-evaluations-full-list'
CO_BY = 'Colorado Office of Judicial Performance Evaluation'


def squash(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def ws(s):
    return re.sub(r'\s+', ' ', s).strip()


def name_key(name):
    """'Justice William W. Hood, III' and 'Honorable William W. Hood, III' → ('hood', 'william')."""
    words = [w for w in squash(re.sub(r'"[^"]*"', ' ', name)).split() if len(w) > 1 and w not in {'iii', 'ii', 'jr', 'sr'}]
    return words[-1], words[0]


def co_links():
    raw, _ = cb.fetch(CO_LIST)
    found = {}
    for href, text in re.findall(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', raw.decode('utf-8', 'replace'), re.S):
        label = ws(html.unescape(re.sub(r'<[^>]+>', '', text)))
        if label.startswith('Honorable ') and href.endswith('-2026-evaluation'):
            found.setdefault(name_key(label[len('Honorable '):]), (urllib.parse.urljoin(CO_LIST, href), label))
    return found


def co_evaluation(url):
    raw, retrieved = cb.fetch(url)
    text = cb.page_text(raw)
    lines = [ws(l) for l in text.split('\n') if ws(l)]
    rec = next(l for l in lines if l.startswith('Recommendation:'))[len('Recommendation:'):].strip()
    start = next(i for i, l in enumerate(lines) if ' finds ' in l and 'PERFORMANCE STANDARDS' in l)
    end = next(i for i, l in enumerate(lines) if l.startswith('Ralph L. Carr'))
    para = lines[start]
    finding = re.match(r'(.*?PERFORMANCE STANDARDS[^.]*\.)', para).group(1)
    by = re.match(r'The (.*?Commission on Judicial Performance[^,]*?) (?:unanimously )?finds', finding).group(1)
    narrative = [p for p in [para[len(finding):].strip()] + lines[start + 1:end] if p]
    reports = [
        {'label': ws(html.unescape(re.sub(r'<[^>]+>', '', t))), 'url': urllib.parse.urljoin(url, h)}
        for h, t in re.findall(r'<a[^>]+href="([^"]+Survey%20Report[^"]*\.pdf)"[^>]*>(.*?)</a>', raw.decode('utf-8', 'replace'), re.S)
    ]
    page = ws(text)
    for field in [rec, finding, *narrative, *[r['label'] for r in reports]]:
        assert ws(field) in page, f'{url}: not on the saved page: {field[:80]}'
    return {
        'by': by,
        'publisher': CO_BY,
        'recommendation': rec,
        'finding': finding,
        'vote': re.search(r'vote of (\d+-\d+)', finding).group(1),
        'narrative': narrative,
        'reports': reports,
        'source': {'title': f"{lines[next(i for i, l in enumerate(lines) if l.endswith('2026 Evaluation'))]}", 'url': url, 'retrieved': retrieved},
    }


def build(state):
    bundle = json.loads((ROOT / 'data/elections' / f'{SLUGS[state]}.json').read_text())
    links = co_links()
    out = {}
    for m in bundle['measures']:
        if m.get('type') != 'retention':
            continue
        name = re.match(r'Retain (?:Justice |Judge )?(.+?)\?', m['title']).group(1)
        hit = links.get(name_key(name))
        if not hit:
            print(f'  no evaluation found for {name}; left out')
            continue
        out[m['id']] = co_evaluation(hit[0])
        print(f"  {name}: {out[m['id']]['recommendation']} ({hit[1]})")
    dest = HERE / f'{state}-judges.json'
    dest.write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
    print(f'{dest.name}: {len(out)} evaluations')


if __name__ == '__main__':
    build(sys.argv[1])
