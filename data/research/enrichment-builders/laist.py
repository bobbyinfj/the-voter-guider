# Builds ca-laist.json: what LAist's 2026 general-election voter guides say about each
# California candidate on the Monterey Park ballot. build.py merges it into the enrichment file
# as `guide` on each candidate's profile, and adds a link to each race's LAist guide.
#
# LAist (Southern California Public Radio) publishes a guide per race. The statewide ones are
# written by CalMatters and republished by LAist; the page's byline says which, and we credit it.
# robots.txt allows Claude's agents on laist.com (checked again on every fetch).
#
# Copied verbatim from the saved page, never retyped or summarized:
#   about            the guide's first paragraph about the candidate, cut to two sentences
#   keyEndorsements  the guide's "Key endorsements" / "Notable endorsements" names
#   website, endorsementsUrl, stateBarUrl   links as the guide gives them
#   rating           "LACBA rating: …" (judges): the L.A. County Bar Association's rating
#   answers          LACCD candidates: each "LAist asked: …" question and the first two
#                    sentences of the candidate's answer
# Every text field must appear on the saved page (whitespace and quotes normalized), or the
# build stops. A candidate the guide doesn't cover is left out; nothing is inferred.
#
# Usage: python3 laist.py   (pages are cached in ../comparison-builders/cache/)
import html
import importlib.util
import json
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
_spec = importlib.util.spec_from_file_location('cb', HERE.parent / 'comparison-builders' / 'build.py')
cb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cb)

BASE = 'https://laist.com/news/politics/voter-guides/'
# The bar association's own list of its November ratings: each rating LAist reports must match it,
# and the UI cites this, not LAist
LACBA = {'url': 'https://lacba.org/docDownload/3141411', 'name': 'Los Angeles County Bar Association',
         'title': 'General Election Judicial Candidate Ratings for LA County'}
# office id → (guide page, section heading the race is under on a page covering many races)
PAGES = {
    'ca26-governor': ('2026-election-california-general-governor', None),
    'ca26-lt-governor': ('2026-election-california-general-lieutenant-governor', None),
    'ca26-secretary-of-state': ('2026-election-california-general-secretary-of-state', None),
    'ca26-controller': ('2026-election-california-general-state-controller', None),
    'ca26-treasurer': ('2026-election-california-general-state-treasurer', None),
    'ca26-attorney-general': ('2026-election-california-general-attorney-general', None),
    'ca26-insurance-commissioner': ('2026-election-california-general-insurance-commissioner', None),
    'ca26-superintendent': ('2026-election-california-general-superintendent-of-public-instruction', None),
    'ca26-boe-3': ('2026-election-california-general-board-of-equalization-district-3', None),
    'ca26-assembly-49': ('2026-election-california-general-state-assembly', 'District 49'),
    'ca26-assembly-54': ('2026-election-california-general-state-assembly', 'District 54'),
    'ca26-state-senate-30': ('2026-election-california-general-california-state-senate', 'District 30'),
    'ca26-la-sheriff': ('2026-election-california-general-la-county-sheriff', None),
    'ca26-la-superior-64': ('2026-election-california-general-la-county-judges', 'Office No. 64'),
    'ca26-la-superior-65': ('2026-election-california-general-la-county-judges', 'Office No. 65'),
    'ca26-la-superior-87': ('2026-election-california-general-la-county-judges', 'Office No. 87'),
    'ca26-la-superior-131': ('2026-election-california-general-la-county-judges', 'Office No. 131'),
    'ca26-laccd-2': ('2026-general-election-laccd-board-of-trustees', 'Trustee Area 2'),
    'ca26-laccd-4': ('2026-general-election-laccd-board-of-trustees', 'Trustee Area 4'),
    'ca26-laccd-6': ('2026-general-election-laccd-board-of-trustees', 'Trustee Area 6'),
}
# Headings inside a candidate's section (everything else ends it)
SUBHEADING = re.compile(r'endorsement|own words|resources', re.I)
SKIP_PARA = re.compile(r'^(party:|sponsored message|laist asked|more voter resources|website:|endorsements?:|go deeper|listen\b|\()|courtesy|website:|did not respond', re.I)
P = r'<p(?:\s[^>]*)?>(.*?)</p>'  # not <picture>


def clean(x):
    x = re.sub(r'<(picture|ps-carousel|script|style|svg|noscript|figure)[^>]*>.*?</\1>', ' ', x, flags=re.S)
    return html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', x))).strip()


def two_sentences(text):
    parts = re.findall(r'.+?(?<!\b[A-Z])[.!?]["”’]?(?=\s+["“]?[A-Z]|$)', text)
    return ' '.join(p.strip() for p in parts[:2]) if parts else text


def name_key(name):
    """'Donald P. (Don) Wagner' / 'DONALD P. WAGNER' → ('donald', 'wagner')"""
    # "Briseño" on the page, "BRISENO" on the ballot: compare without accents
    n = unicodedata.normalize('NFKD', name.lower()).encode('ascii', 'ignore').decode()
    n = re.sub(r'\(.*?\)|“.*?”|".*?"', ' ', n)
    words = [w for w in re.findall(r"[a-z][a-z'-]+", n) if w not in ('jr', 'sr', 'ii', 'iii', 'incumbent')]
    return (words[0], words[-1]) if words else ('', '')


def byline(page):
    m = re.search(r'"author":\{[^}]*"name":"([^"]+)"', page)
    return m.group(1) if m else 'LAist'


def sections(page, candidates, within):
    """Each candidate's slice of the page: from their heading to the next heading that isn't
    one of their subheadings. `within` limits the search to one race's part of the page."""
    heads = [(m.start(), m.end(), clean(m.group(2)), m.group(1)) for m in re.finditer(r'<(h[234])[^>]*>(.*?)</\1>', page, re.S)]
    lo, hi = 0, len(page)
    if within:
        starts = [i for i, h in enumerate(heads) if h[3] == 'h2' and within.lower() in h[2].lower()]
        assert starts, f'no "{within}" heading'
        i = starts[0]
        lo = heads[i][0]
        nxt = [h for h in heads[i + 1:] if h[3] == 'h2']
        hi = nxt[0][0] if nxt else len(page)
    keys = {name_key(c['name']): c for c in candidates}
    out = {}
    for k, (start, end, text, tag) in enumerate(heads):
        if not lo <= start < hi or (tag == 'h2' and within):
            continue
        c = keys.get(name_key(text))
        if not c:
            continue
        stop = hi
        for nstart, _, ntext, ntag in heads[k + 1:]:
            if ntag == 'h2' or not SUBHEADING.search(ntext):
                stop = min(stop, nstart)
                break
        out[c['id']] = page[end:stop]
    return out


def links(seg):
    for m in re.finditer(r'<li(?:\s[^>]*)?>(.*?)</li>|' + P, seg, re.S):
        item = m.group(1) or m.group(2) or ''
        for a in re.finditer(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', item, re.S):
            # Classify by the bold label just before the link ("Website:", "Endorsements:") when
            # there is one, else by the whole item
            labels = re.findall(r'<b>(.*?)</b>', item[: a.start()], re.S)
            context = clean(labels[-1]) if labels else clean(item)
            yield context, html.unescape(a.group(1)), clean(a.group(2))


def extract(seg):
    info = {}
    paras = [clean(p) for p in re.findall(P, seg, re.S)]
    for p in paras:
        if len(p) >= 80 and not SKIP_PARA.search(p) and not p.startswith('“'):
            info['about'] = two_sentences(p)
            break
    for p in paras:
        if 'did not respond' in p:
            info['note'] = p
            break
    for item, href, label in links(seg):
        low = (item + ' ' + label).lower()
        if 'calbar.ca.gov' in href:
            info['stateBarUrl'] = href
        elif 'endorsement' in low or 'full list' in low:
            info.setdefault('endorsementsUrl', href)
        elif ('website' in low or ('.' in label and label.lower().rstrip('/') in href.lower())) and 'laist.com' not in href and 'calmatters' not in href:
            info.setdefault('website', href)
    m = re.search(r'LACBA rating:\s*</b>\s*([A-Za-z ]+?)\s*</li>', seg)
    if m:
        info['rating'] = {'by': 'Los Angeles County Bar Association', 'value': m.group(1).strip()}
    names = []
    block = re.search(r'Key endorsements</h\d>(.*?)(?:<h\d|More voter resources)', seg, re.S)
    if block:
        names = [clean(li) for li in re.findall(r'<li[^>]*>(.*?)</li>', block.group(1), re.S)]
    names = [n for n in names if n and len(n) < 90]
    if names:
        info['keyEndorsements'] = names
    # One line as written ("Notable endorsements: A, B, former L.A. County sheriff"): not split,
    # since commas also separate a name from its title
    m = re.search(r'Notable endorsements:\s*(.*?)</li>', seg, re.S)
    if m:
        info['endorsementsLine'] = clean(m.group(1))
    answers = []
    for q in re.finditer(r'<b>\s*LAist asked:\s*(.*?\?)', seg, re.S):
        # The answer is the next non-empty paragraph or list after the question
        rest = seg[q.end():]
        rest = rest[rest.find('</p>') + 4:]
        for el in re.finditer(r'<p[^>]*>(.*?)</p>|<ul[^>]*>(.*?)</ul>', rest, re.S):
            a = clean(el.group(1) if el.group(1) is not None else el.group(2))
            if a.startswith('LAist asked'):
                break
            if a:
                answers.append({'q': clean(q.group(1)), 'a': two_sentences(a)})
                break
    if answers:
        info['answers'] = answers
    return info


def build():
    bundle = json.loads((ROOT / 'data/elections/ca-general-2026-11-03.json').read_text())
    offices = {o['id']: o for o in bundle['offices']}
    out, races, missing = {}, {}, []
    for office_id, (slug, within) in PAGES.items():
        url = BASE + slug
        raw, fetched = cb.fetch(url)
        page = raw.decode('utf-8', 'replace')
        text = cb.norm(cb.page_text(raw))
        credit = byline(page)
        races[office_id] = {'label': f'{"LAist" if credit == "LAist" else credit + " via LAist"} voter guide to this race', 'url': url, 'retrieved': fetched}
        found = sections(page, offices[office_id]['candidates'], within)
        for c in offices[office_id]['candidates']:
            seg = found.get(c['id'])
            if seg is None:
                missing.append(f"{office_id}: {c['name']}")
                continue
            info = extract(seg)
            for field in ('about',):
                if field in info:
                    assert cb.norm(info[field]) in text, f"{c['name']}: {field} not on page"
            for a in info.get('answers', []):
                assert cb.norm(a['a']) in text and cb.norm(a['q']) in text, f"{c['name']}: answer not on page"
            for f in ('note', 'endorsementsLine'):
                if f in info:
                    assert cb.norm(info[f]) in text, f"{c['name']}: {f} not on page"
            for n in info.get('keyEndorsements', []):
                assert cb.norm(n) in text, f"{c['name']}: endorser {n!r} not on page"
            out[c['id']] = {'source': {'publisher': 'LAist', 'byline': credit, 'url': url, 'retrieved': fetched}, **info}
    raw, fetched = cb.fetch(LACBA['url'])
    ratings_text = unicodedata.normalize('NFKC', cb.norm(cb.page_text(raw)))
    for cid, info in out.items():
        r = info.get('rating')
        if not r:
            continue
        last = name_key(next(c['name'] for o in offices.values() for c in o['candidates'] if c['id'] == cid))[1]
        assert re.search(rf"{re.escape(last)}\s+{re.escape(r['value'])}\b", ratings_text, re.I), f'{cid}: LACBA list disagrees'
        info['rating'] = {'by': LACBA['name'], 'value': r['value'], 'source': {'title': LACBA['title'], 'url': LACBA['url'], 'retrieved': fetched}}
    dest = HERE / 'ca-laist.json'
    dest.write_text(json.dumps({'candidates': out, 'races': races}, indent=1, ensure_ascii=False) + '\n')
    print(f'{dest.name}: {len(out)} candidates, {len(races)} races')
    for k in ('about', 'note', 'website', 'keyEndorsements', 'endorsementsLine', 'rating', 'answers', 'stateBarUrl'):
        print(f'  {k}: {sum(1 for v in out.values() if k in v)}')
    if missing:
        print('  not covered by the guide:', '; '.join(missing))


if __name__ == '__main__':
    sys.exit(build())
