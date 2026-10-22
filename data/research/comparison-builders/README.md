# Comparison guide builders

`python3 build.py ca|wa|co` writes `data/comparisons/<slug>.json` from `<state>.py`: published
voter guides people can compare their picks with. `npm run seed` loads them as read-only public
template guides; `npm test` re-checks them against the election bundle.

Rules: every pick has a source URL and a verbatim quote that must be on the saved page
(`cache/`, not committed). Sources whose robots.txt disallows Claude's user agents (or can't be
read, other than a 404) are not used. Party and advocacy guides only as left/right pairs. Leave a
contest out rather than infer a pick. PDF sources need `pip install pymupdf`.

## Status (2026-10-21)

| Election | Seeded | Not used, and why |
|---|---|---|
| CA (Monterey Park) | California Democratic Party (party PDF + Riverside County Democratic Party relay; cadem.org's pages return 403 to automated requests), California Republican Party, League of Women Voters of California | LA Times, SF Chronicle, Press Democrat, Mercury News, SCNG (Daily News, SGV Tribune, Register): robots.txt disallows Claude. Sacramento Bee: robots.txt 403. LA County Democratic Party: 403 |
| WA (Seattle) | — | Washington State Republican Party and King County GOP: robots.txt 403, so no fair party pair. Seattle Times and LWV Washington allow it but no 2026 general list found yet; The Stranger allowed but needs a right-leaning counterpart |
| CO (Fort Collins) | — | Denver Post, Colorado Sun: robots.txt disallows Claude. Coloradoan, LWV Colorado: robots.txt 403. State parties allow it but publish no 2026 ballot positions we found |
