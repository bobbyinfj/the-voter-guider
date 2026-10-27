# Re-checks access for every source in ../sources.json with the same rule the builders use
# (comparison-builders/build.py robots_allow: robots.txt must allow Claude's agents; unreadable
# robots.txt other than a 404 counts as a block) and prints any entry whose recorded `access`
# no longer matches. Run it at the start of each new election, and after adding sources.
#
# usage: python3 data/research/tools/source-check.py [--write]   (--write records today's result)
import datetime, importlib.util, json, sys, urllib.error, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location('cb', HERE / 'comparison-builders' / 'build.py')
cb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cb)


def status(url):
    if not cb.robots_allow(url):
        try:
            u = urllib.parse.urlsplit(url)
            urllib.request.urlopen(urllib.request.Request(f'{u.scheme}://{u.netloc}/robots.txt', headers={'User-Agent': cb.UA}), timeout=30)
            return 'robots-disallow'
        except urllib.error.HTTPError as e:
            return 'robots-403' if e.code != 404 else 'robots-disallow'
        except Exception:
            return 'robots-403'
    try:
        urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': cb.UA}), timeout=30)
        return 'ok'
    except urllib.error.HTTPError as e:
        return 'http-403' if e.code in (401, 403, 429) else f'http-{e.code}'
    except Exception as e:
        return f'error: {type(e).__name__}'


def main():
    path = HERE / 'sources.json'
    reg = json.loads(path.read_text())
    changed = 0
    for s in reg['sources']:
        now = status(s['url'])
        mark = '  ' if now == s['access'] else '!!'
        changed += mark == '!!'
        print(f"{mark} {s['id']:<22} recorded {s['access']:<16} now {now}")
        if '--write' in sys.argv:
            s['access'] = now
            s['checked'] = datetime.date.today().isoformat()
    if '--write' in sys.argv:
        path.write_text(json.dumps(reg, indent=1, ensure_ascii=False) + '\n')
    print(f'{changed} differ')


if __name__ == '__main__':
    import urllib.parse
    main()
