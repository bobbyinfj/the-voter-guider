# Numbered compact view of a cached page: line numbers index the raw file's lines
import sys, re
for path in sys.argv[1:]:
    lines = open(path).read().split('\n')
    print('#####', path.split('/')[-1], lines[0], lines[1])
    out = []
    for n, l in enumerate(lines[3:], 4):
        l = l.strip()
        if not l or len(l) > 150: continue
        if l.startswith('=== IMAGE ALT'): out.append(f'{n}:<<IMG ALTS>>'); continue
        out.append(f'{n}:{l}')
    print(' | '.join(out))
