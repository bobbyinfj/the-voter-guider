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
#
# California has no retention evaluation, so each justice gets their official court biography
# (kind "biography"): the Supreme Court's page, or the Second District Court of Appeal's, found through
# the court's own list of justices. Copied verbatim:
#   rating          the sentence quoting the State Bar's Judicial Nominees Evaluation Commission rating,
#                   when the biography has one (most recent appointees' do; older biographies don't)
#   role            the title, division and "Since <year>" lines (Court of Appeal)
#   ratingWords     the rating's own words from that sentence ("exceptionally well qualified")
#   appointed       the sentence about their appointment, nomination or confirmation to this court
#   paragraphs      the biography as printed
# Every text field must appear on the saved page (whitespace normalized), or the build stops.
# robots.txt is checked on every fetch (cb.fetch).
#
# Usage: python3 judges.py co|ca   (pages are cached in ../comparison-builders/cache/)
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

SLUGS = {'co': 'co-general-2026-11-03', 'ca': 'ca-general-2026-11-03'}
CO_LIST = 'https://judicialperformance.colorado.gov/2026-judicial-performance-evaluations-full-list'
CO_BY = 'Colorado Office of Judicial Performance Evaluation'
CA_LISTS = [
    ('https://supreme.courts.ca.gov/', r'/about-court/justices-court/(?:associate-|chief-)?justice-[a-z0-9-]+', 'Supreme Court of California'),
    ('https://appellate.courts.ca.gov/district-courts/2dca/justices', r'/district-courts/2dca/bio/[a-z0-9-]+', 'California Court of Appeal, Second Appellate District'),
]


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
        'kind': 'evaluation',
        'by': by,
        'publisher': CO_BY,
        'recommendation': rec,
        'finding': finding,
        'vote': re.search(r'vote of (\d+-\d+)', finding).group(1),
        'narrative': narrative,
        'reports': reports,
        'source': {'title': f"{lines[next(i for i, l in enumerate(lines) if l.endswith('2026 Evaluation'))]}", 'url': url, 'retrieved': retrieved},
    }


def ca_links():
    """Biography URLs from each court's own list, by (last name, first name) from the URL's words."""
    found = []
    for page, pattern, court in CA_LISTS:
        raw, _ = cb.fetch(page)
        for href in sorted(set(re.findall(f'href="({pattern})"', raw.decode('utf-8', 'replace')))):
            words = [w for w in href.rsplit('/', 1)[1].split('-') if w not in {'associate', 'chief', 'justice', 'jr', '0'} and len(w) > 1]
            found.append((words, urllib.parse.urljoin(page, href), court))
    return found


def ca_match(name, links):
    last, first = name_key(name)
    hits = [l for l in links if l[0][-1] == last]
    if len(hits) > 1:
        hits = [l for l in hits if l[0][0][:4] == first[:4]]
    return hits[0] if len(hits) == 1 else None


def sentences(paragraphs):
    return [x.strip() for p in paragraphs for x in re.split(r'(?<=[.”"])\s+(?=[A-Z])', p) if x.strip()]


def ca_biography(url, court):
    raw, retrieved = cb.fetch(url)
    text = cb.page_text(raw)
    lines = [ws(l) for l in text.split('\n') if ws(l)]
    if 'supreme.courts' in url:
        start = next(i for i, l in enumerate(lines) if i > 40 and l.startswith('Justice ') and len(l) > 60)
        end = next(i for i, l in enumerate(lines) if i > start and l == 'In this section')
    else:
        start = next(i for i, l in enumerate(lines) if l.startswith('Profile of ')) + 1
        end = next(i for i, l in enumerate(lines) if i > start and l == 'California Courts')
    paragraphs = lines[start:end]
    # Court of Appeal pages start with the title, division and "Since <year>" lines
    role = []
    while 'appellate.courts' in url and paragraphs and len(role) < 3 and len(paragraphs[0]) < 40:
        role.append(paragraphs.pop(0))
    said = sentences(paragraphs)
    rating = next((x for x in said if 'qualified' in x and 'Evaluation' in x), None)
    appointed = next((x for x in said if re.search(r'\b(nominated|appointed|confirmed)\b', x)
                      and re.search(r'Court of Appeal|Supreme Court|Division|this position|the position', x)
                      and 'Superior Court' not in x), None)
    page = ws(text)
    for field in [*role, *paragraphs, rating or '', appointed or '']:
        assert ws(field) in page, f'{url}: not on the saved page: {field[:80]}'
    title = ws(html.unescape(re.search(r'<title>(.*?)</title>', raw.decode('utf-8', 'replace'), re.S).group(1)))
    return {
        'kind': 'biography',
        'publisher': court,
        'role': role,
        'rating': rating,
        # The rating's own words, e.g. “exceptionally well qualified”
        'ratingWords': (re.search(r'[“"]([^”"]*qualified)[,”"]', rating).group(1) if rating else None),
        'appointed': appointed,
        'paragraphs': paragraphs,
        'source': {'title': title.split(' | ')[0], 'url': url, 'retrieved': retrieved},
    }


def build(state):
    bundle = json.loads((ROOT / 'data/elections' / f'{SLUGS[state]}.json').read_text())
    links = co_links() if state == 'co' else ca_links()
    out = {}
    for m in bundle['measures']:
        if m.get('type') != 'retention':
            continue
        name = re.match(r'Retain (?:Justice |Judge )?(.+?)\?', m['title']).group(1)
        if state == 'co':
            hit = links.get(name_key(name))
            if hit:
                out[m['id']] = co_evaluation(hit[0])
                print(f"  {name}: {out[m['id']]['recommendation']} ({hit[1]})")
        else:
            hit = ca_match(name, links)
            if hit:
                out[m['id']] = ca_biography(hit[1], hit[2])
                print(f"  {name}: {hit[1].rsplit('/', 1)[1]} · rating: {bool(out[m['id']]['rating'])} · appointed: {bool(out[m['id']]['appointed'])}")
        if not hit:
            print(f'  nothing found for {name}; left out')
    dest = HERE / f'{state}-judges.json'
    dest.write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
    print(f'{dest.name}: {len(out)} evaluations')


if __name__ == '__main__':
    build(sys.argv[1])
