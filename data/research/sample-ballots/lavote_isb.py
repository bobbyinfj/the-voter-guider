"""Turn Los Angeles County's official Interactive Sample Ballot data into an ordered contest list.

    python3 lavote_isb.py            # download (cached in lavote/) and write la.json
    python3 lavote_isb.py --offline  # rebuild la.json from the saved lavote/ files only

LA County's printed sample ballots are per voter (by address), so instead of a PDF this reads
the data the county's Interactive Sample Ballot (https://isb.lavote.gov) is built from: the
public JSON files under https://isb.lavote.gov/parsed/<election>/ — the ballot style for an
address (ballots/<style>.json, contests in printed order) and each contest's printed text
(contests/<id>.json: heading, "Vote For ONE", candidate names and ballot designations,
measure question text, response labels). Everything is copied verbatim (English); nothing
is inferred. lavote/ keeps an English-only copy of every file used, with its URL, for audits.

Monterey Park's ballot styles were found by looking up Monterey Park addresses in the ISB's
street-segment files (parsed/<election>/street-segments/<prefix>.json). The three below cover
almost all of the city: no council race, Council District 1 and Council District 5. A few
edge precincts get extra contests (Water Replenishment District Div. 4, Montebello USD Trustee
Area 2, City of LA Measure SC); those aren't in our bundle and la.json lists them as such.

Writes la.json in the same shape parse.py writes for PDF sample ballots.
"""
import html, json, os, re, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "lavote")
ELECTION = "4348"  # November 3, 2026 General Election (isb.lavote.gov/elections/list.json)
BASE = f"https://isb.lavote.gov/parsed/{ELECTION}"
# Monterey Park ballot styles, from the ISB's street-segment files
STYLES = {
    "2GL22": "Monterey Park, no council race (e.g. 320 W Newmark Ave, City Hall)",
    "2GF22": "Monterey Park, Council District 1",
    "2GJ22": "Monterey Park, Council District 5",
}
EDGE_STYLES = ["2GM22", "2GP22", "2GN22", "2GG22", "2GH22"]
OFFLINE = "--offline" in sys.argv


def en(v):
    """The English text of an ISB multilingual field ({"EN": ...} or [{"EN": ...}])."""
    if isinstance(v, list):
        v = v[0] if v else {}
    if isinstance(v, dict):
        return v.get("EN") or ""
    return v or ""


def text(s):
    """ISB strings carry a little HTML (<b>, <br>); keep the words and line breaks only."""
    s = re.sub(r"<br\s*/?>|</p>", "\n", s or "")
    s = html.unescape(re.sub(r"<[^>]+>", "", s))
    return "\n".join(re.sub(r"[ \t]+", " ", line).strip() for line in s.split("\n")).strip()


def fetch(path):
    """Download a parsed/ file once; keep an English-only copy (and its URL) in lavote/."""
    local = os.path.join(RAW, path)
    if os.path.exists(local):
        with open(local) as f:
            return json.load(f)["data"]
    assert not OFFLINE, f"{path} isn't saved in lavote/"
    url = f"{BASE}/{path}"
    req = urllib.request.Request(url, headers={"User-Agent": "the-voter-guider research (one-time download)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = json.load(r)
    data = english_only(data)
    os.makedirs(os.path.dirname(local), exist_ok=True)
    with open(local, "w") as f:
        json.dump({"url": url, "data": data}, f, indent=1, ensure_ascii=False)
        f.write("\n")
    return data


def english_only(o):
    if isinstance(o, dict):
        if "EN" in o and all(len(k) == 2 and k.isupper() for k in o):
            return {"EN": o["EN"]}
        return {k: english_only(v) for k, v in o.items()}
    if isinstance(o, list):
        return [english_only(v) for v in o]
    return o


def document(statement):
    """An official document from the county's sample ballot (impartial analysis, argument in
    favor, full text, candidate statement) as {title, text}: plain text with paragraph breaks,
    never HTML."""
    raw = en(statement.get("FullHTML")) or ""
    m = re.search(r"<h1[^>]*>(.*?)</h1>", raw, re.S)
    body = raw[m.end():] if m else raw
    body = re.sub(r"</(p|h\d|li|div|tr)>", "\n\n", body)
    text = re.sub(r"\n{3,}", "\n\n", text_of(body))
    title = text_of(m.group(1)) if m else ""
    if not title:  # e.g. Measure A's ordinance starts with its title as a paragraph
        title, _, text = text.partition("\n")
    return {"order": statement.get("SequenceOrder", 0), "title": title.strip(), "text": text.strip()}


def text_of(s):
    s = re.sub(r"<br\s*/?>", "\n", s or "")
    s = html.unescape(re.sub(r"<[^>]+>", "", s))
    return "\n".join(re.sub(r"[ \t\xa0]+", " ", line).strip() for line in s.split("\n")).strip()


def heading_lines(name):
    """'CITY OF MONTEREY PARK GENERAL MUNICIPAL ELECTION City Clerk' prints as two lines: the
    upper-case jurisdiction, then the office. Measures print 'JURISDICTION - MEASURE X'."""
    if " - " in name:
        return [p.strip() for p in name.split(" - ", 1)]
    m = re.match(r"^((?:[A-Z][A-Z.,'&]*\s+){2,}?[A-Z][A-Z.,'&]*)\s+([A-Z][a-z].*)$", name)
    return [m.group(1), m.group(2)] if m else [name]


def contest(cid, style_order):
    d = fetch(f"contests/{cid}.json")
    c = {
        "id": cid,
        "source": f"{BASE}/contests/{cid}.json",
        "title": heading_lines(en(d["name"])),
        "section": "",  # the ISB prints no section bars; jurisdiction is in the heading
        "instructions": [text(en(d["vote_for_text"]))],
    }
    people = sorted(d["candidates"], key=lambda x: style_order.get(x["id"], x.get("order", 0)))
    if d["contest_class"] == "candidate_class":
        c["candidates"] = []
        for p in people:
            if p.get("isWriteIn"):
                continue
            row = {"name": en(p["name"]), "designation": text(en(p.get("occupation")))}
            if not row["designation"]:
                del row["designation"]
            if p.get("statements"):
                row["statement"] = document(p["statements"][0])
            c["candidates"].append(row)
        c["writeIn"] = d["number_of_writeins"] > 0
    else:
        c["questions"] = [{"text": text(en(d["long_description"])), "responses": [en(p["name"]) for p in people]}]
        # Impartial analysis, fiscal impact, full text, and the arguments filed for/against
        docs = [document(x) for x in d.get("statements") or []]
        docs += [document(x) for p in people for x in p.get("statements") or []]
        if docs:
            # Reading order: what it does, what it costs, the arguments, then the full text
            rank = lambda x: next((i for i, k in enumerate(["IMPARTIAL", "FISCAL", "ARGUMENT IN FAVOR", "ARGUMENT AGAINST", "REBUTTAL"]) if k in x["title"].upper()), 9)
            c["documents"] = [{"title": x["title"], "text": x["text"]} for x in sorted(docs, key=lambda x: (rank(x), x["order"]))]
    return c


def main():
    fetch_list = lambda style: fetch(f"ballots/{style}.json")
    styles = {s: fetch_list(s) for s in STYLES}
    # One ordered list: 2GF22 (Council District 1) has every shared contest; District 5's
    # council race prints in the same place as District 1's.
    order = [x["contest_id"] for x in sorted(styles["2GF22"]["contests"], key=lambda x: x["order"])]
    d5 = next(x["contest_id"] for x in styles["2GJ22"]["contests"] if x["order"] == 0)
    order.insert(order.index("cc10490") + 1, d5)
    for s, b in styles.items():
        missing = [x["contest_id"] for x in b["contests"] if x["contest_id"] not in order]
        assert not missing, f"{s} has contests not in the merged order: {missing}"

    candidate_order = {}
    for b in styles.values():
        for x in b["contests"]:
            candidate_order[x["contest_id"]] = {p["candidate_id"]: p["order"] for p in x["candidates"]}

    contests = []
    for cid in order:
        c = contest(cid, candidate_order[cid])
        # Judicial retention: each judge is its own ISB contest, but consecutive ones share a
        # heading ("For Associate Justice of the Supreme Court"); keep them as one heading with
        # several yes/no questions, as layout.py expects
        last = contests[-1] if contests else None
        if cid.startswith("rc") and last and last["id"].startswith("rc") and last["title"] == c["title"]:
            last["questions"] += c["questions"]
            last["sources"].append(c["source"])
            continue
        if cid.startswith("rc"):
            c["sources"] = [c["source"]]
        contests.append(c)
    edge = []
    if not OFFLINE:
        for s in EDGE_STYLES:
            for x in fetch_list(s)["contests"]:
                if x["contest_id"] not in order and x["contest_id"] not in [e["id"] for e in edge]:
                    edge.append({"id": x["contest_id"], "title": en(fetch(f"contests/{x['contest_id']}.json")["name"]), "style": s})
    else:
        saved = os.path.join(HERE, "la.json")
        edge = json.load(open(saved))["edgeContests"] if os.path.exists(saved) else []

    election = fetch("election.json")
    out = {
        "county": "la",
        "source": "https://isb.lavote.gov/",
        "sourceName": "Los Angeles County's Interactive Sample Ballot",
        "election": text(en(election["title"])),
        "styles": STYLES,
        "style": {"party": "below", "responses": "stacked"},
        "sections": [""],
        "notices": [],
        "contests": contests,
        "edgeContests": edge,
    }
    with open(os.path.join(HERE, "la.json"), "w") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print(f"la.json: {len(contests)} contests; {len(edge)} edge-precinct contests not included")


if __name__ == "__main__":
    main()
