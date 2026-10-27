# Comparison guide builders

`python3 build.py ca|wa|co` writes `data/comparisons/<slug>.json` from `<state>.py`: published
voter guides people can compare their picks with. `npm run seed` loads them as read-only public
template guides; `npm test` re-checks them against the election bundle.

Rules: every pick has a source URL and a verbatim quote that must be on the saved page
(`cache/`, not committed). Sources whose robots.txt disallows Claude-User (or can't be
read, other than a 404) are not used. Party and advocacy guides only as left/right pairs. Leave a
contest out rather than infer a pick. PDF sources need `pip install pymupdf`.

## Status (2026-10-27)

Fetches identify as Claude-User and follow robots.txt for that agent (crawler-only blocks don't apply).

| Election | Seeded | Not used, and why |
|---|---|---|
| CA (Monterey Park) | California Democratic Party (party PDF + Riverside County Democratic Party relay; cadem.org's pages return 403 to automated requests), California Republican Party, League of Women Voters of California, LA Times editorial board (Prop 40 only: the one 2026 ballot editorial linked from its opinion pages) | SF Chronicle, Press Democrat, Mercury News, SCNG (Daily News, SGV Tribune, Register): robots.txt disallows Claude-User. Sacramento Bee: robots.txt 403. CalMatters: refuses Claude-User. LA County Democratic Party: 403 |
| WA (Seattle) | — | Washington State Republican Party and King County GOP: robots.txt 403, so no fair party pair. Seattle Times and The Stranger: refuse Claude-User (robots.txt 403). LWV Washington and KUOW allow it; no 2026 general recommendations found from either yet |
| CO (Fort Collins) | Tom Cronin and Bob Loevy, Colorado Politics columnists (kind `columnist`; each writer's verdict on every statewide measure and the rail tax, from one shared column) | Denver Post, Colorado Sun, Coloradoan, LWV Colorado: robots.txt blocks or 403. State parties allow it but publish no 2026 ballot positions we found |
