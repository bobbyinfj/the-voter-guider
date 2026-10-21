# For each candidate site, find its endorsements page and save its text as <id>.static.txt
# (no JavaScript; catches lists the rendered page hides in accordions)
# usage: python3 tools/crawl-static.py sites.json cache/wa   (sites.json: {candidate_id: url})
import json, re, sys, urllib.request, urllib.parse, html
from html.parser import HTMLParser
import datetime
sites_json, outdir = sys.argv[1], sys.argv[2]
TODAY = datetime.date.today().isoformat()
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'}

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.geturl(), r.read(3_000_000).decode('utf-8', 'replace')

class Text(HTMLParser):
    BLOCK = {'p', 'li', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'tr', 'td', 'section', 'article', 'figcaption', 'span', 'a', 'strong', 'em', 'img'}
    def __init__(self):
        super().__init__(); self.out = []; self.skip = 0; self.links = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'style', 'noscript', 'svg'): self.skip += 1
        if tag == 'a' and a.get('href'): self.links.append(a['href'])
        if tag == 'img' and a.get('alt'): self.out.append('\n[img] ' + a['alt'] + '\n')
        if tag in self.BLOCK and tag not in ('span', 'a', 'strong', 'em'): self.out.append('\n')
    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript', 'svg'): self.skip = max(0, self.skip - 1)
        if tag in self.BLOCK and tag not in ('span', 'a', 'strong', 'em'): self.out.append('\n')
    def handle_data(self, d):
        if not self.skip: self.out.append(d)

def parse(body):
    t = Text(); t.feed(body)
    lines = [re.sub(r'\s+', ' ', l).strip() for l in ''.join(t.out).split('\n')]
    return [l for l in lines if l], t.links

sites = json.load(open(sites_json))
for cid, site in sites.items():
    out = f'{outdir}/{cid}.static.txt'
    try:
        base = site if site.startswith('http') else 'https://' + site
        final, body = get(base)
        lines, links = parse(body)
        cands = []
        for href in links:
            full = urllib.parse.urljoin(final, href)
            if 'endorse' in full.lower() and urllib.parse.urlparse(full).netloc.split('.')[-2:] == urllib.parse.urlparse(final).netloc.split('.')[-2:]:
                cands.append(full.split('#')[0])
        cands = list(dict.fromkeys(cands))
        if cands:
            page, body2 = get(cands[0])
            lines2, _ = parse(body2)
            open(out, 'w').write(f'URL {page}\nHOME {final}\nRETRIEVED {TODAY}\n' + '\n'.join(lines2))
            print(cid, 'endorsements page', page, len(lines2))
        else:
            hits = [l for l in lines if re.search(r'endors', l, re.I)]
            open(out, 'w').write(f'URL none\nHOME {final}\nRETRIEVED {TODAY}\n' + '\n'.join(lines))
            print(cid, 'no endorsements page; home mentions:', len(hits))
    except Exception as e:
        print(cid, 'ERROR', site, str(e)[:80])
