# Turn line-range picks into endorser names: each name is a whole line of the saved page
# (cache/<state>/<id>[.static].txt), so nothing is retyped. One spec line per candidate:
#   <candidate-id> | [src:static ;] kind:1-5,8 ; kind/Regex:10-20 ; kind=Literal name: ; people:30-80 ; url:<override>
# kind is org | official | media | person. kind/Regex keeps matching lines (a capture group
# keeps just that part); kind=Name adds a name that must appear on the page (logo alt text,
# merged lines); people counts individual supporters (a number, or line ranges to count).
# usage: python3 tools/pick.py cache/wa wa-endorsement-picks.txt wa-endorsements.json
import json, sys, re, os
cache, spec_path, out_path = sys.argv[1:4]
out = json.load(open(out_path)) if os.path.exists(out_path) else {}
for raw in open(spec_path):
    raw = raw.strip()
    if not raw or raw.startswith('#'): continue
    cid, rest = [x.strip() for x in raw.split('|', 1)]
    static = 'src:static' in rest
    rest = rest.replace('src:static', '')
    lines = open(f'{cache}/{cid}{".static" if static else ""}.txt').read().split('\n')
    url = lines[0][4:]; retrieved = lines[2][10:]
    entry = {'url': url, 'retrieved': retrieved, 'endorsers': []}
    if static: entry['cacheSuffix'] = '.static'
    for part in [p.strip() for p in rest.split(';') if p.strip()]:
        kind, val = part.split(':', 1)
        only = None
        if '/' in kind: kind, only = kind.split('/', 1)  # kind/Regex:ranges keeps only matching lines
        if kind == 'url': entry['url'] = val; continue
        if kind == 'people':
            n = 0
            for r in val.split(','):
                if '-' in r:
                    a, b = map(int, r.split('-')); n += sum(1 for k in range(a, b + 1) if lines[k - 1].strip())
                else:
                    n += int(r)
            entry['individuals'] = entry.get('individuals', 0) + n; continue
        if '=' in kind:  # kind=Literal name, must appear verbatim on the page
            k, name = kind.split('=', 1); entry['endorsers'].append({'name': name.strip(), 'kind': k}); continue
        if kind == 'none': entry['note'] = val; continue
        for r in [x for x in val.split(',') if x.strip()]:
            a, b = (r.split('-') + [r])[:2] if '-' in r else (r, r)
            for n in range(int(a), int(b) + 1):
                l = ' '.join(lines[n - 1].split())
                if only and re.compile(only).groups:
                    m = re.search(only, l)
                    if not m: continue
                    l = m.group(1)
                if l and len(l) <= 150 and re.search(r'[A-Za-z]', l) and (not only or re.search(only, l) or re.compile(only).groups):
                    entry['endorsers'].append({'name': re.sub(r'\s+logo$', '', l, flags=re.I).rstrip(',;:'), 'kind': kind})
    seen = set(); uniq = []
    for e in entry['endorsers']:
        k = e['name'].lower()
        if k not in seen: seen.add(k); uniq.append(e)
    entry['endorsers'] = uniq
    out[cid] = entry
    print(cid, len(uniq), [e['name'] for e in uniq][:4], '...', [e['name'] for e in uniq][-2:])
json.dump(out, open(out_path, 'w'), indent=1, ensure_ascii=False)
