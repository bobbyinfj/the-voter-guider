# Convert a downloaded article page (HTML) to plain text, one paragraph per line, for the
# quiz builders' quote checks. Inline tags (links, emphasis) are removed without breaking
# the sentence they sit in.
import re, html, sys
INLINE = r'a|em|strong|b|i|span|sup|sub|abbr|mark|u'
for f in sys.argv[1:]:
    t = open(f, encoding='utf-8', errors='ignore').read()
    t = re.sub(r'<(script|style|noscript)[^>]*>.*?</\1>', '', t, flags=re.S)
    t = re.sub(r'</?(?:' + INLINE + r')(?:\s[^>]*)?>', '', t)
    t = html.unescape(re.sub(r'<[^>]+>', '\n', t))
    lines = [re.sub(r'\s+', ' ', l).strip() for l in t.split('\n')]
    lines = [l for l in lines if len(l) > 40]
    out = f.rsplit('.', 1)[0] + '.txt'
    open(out, 'w').write('\n'.join(lines))
    print(out, len(lines))
