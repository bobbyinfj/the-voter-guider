import re,html,sys
for f in sys.argv[1:]:
    t=open(f,encoding='utf-8',errors='ignore').read()
    t=re.sub(r'<(script|style)[^>]*>.*?</\1>','',t,flags=re.S)
    txt=html.unescape(re.sub(r'<[^>]+>','\n',t)); lines=[l.strip() for l in txt.split('\n') if len(l.strip())>60]
    out=f.replace('.html','.txt'); open(out,'w').write('\n'.join(lines))
    print('=====',f,len(lines))
    for l in lines:
        if re.search(r'CalMatters is|donat|gift|magic link|Candidates raise|outside groups|spin-free|journalists',l): continue
        print('-',l)
