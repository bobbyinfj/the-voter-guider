"""Turn an official county sample-ballot PDF into an ordered list of contests.

    pip install pymupdf
    python3 parse.py king    <path/to/king-sample-ballot.pdf>
    python3 parse.py larimer <path/to/larimer-sample-ballot.pdf>

Writes <county>.json (sections, contests, candidates with printed party labels, question
text, response labels — all verbatim from the PDF) and <county>.txt (the raw text, column
by column, for auditing). Bundle builders read the JSON; see ../bundle-builders/layout.py.

Sample ballots are countywide supersets, so this records order and wording only — not
page or column breaks, which differ for every voter's ballot style.
"""
import json, os, re, sys
import pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))

# Per-county text styles, read off the PDFs: (size rounded to 0.1, bold, white text)
CONFIG = {
    "king": {
        "source": "https://cdn.kingcounty.gov/-/media/king-county/depts/elections/current-election/2026/11/sample-ballot.pdf",
        "columns": [0, 187, 358],
        "section": lambda s: s["white"] and s["bold"] and s["size"] == 11.1,
        "subsection": lambda s: s["bold"] and not s["white"] and s["size"] == 11.1 and s["color"] == 0,
        "title": lambda s: s["bold"] and s["size"] == 9.6 and s["color"] == 0,
        "body": lambda s: not s["bold"] and s["size"] == 9.6 and s["color"] == 0,
        "candidate": lambda s: s["bold"] and s["size"] == 8.6,
        "party": lambda s: not s["bold"] and s["size"] == 7.3,
        "table": lambda s: not s["bold"] and s["size"] in (8.2, 8.9),
        "skip_sections": {"Instructions", "Begin voting here", "Continue voting other", "side"},
        "skip_text": {"End of Ballot", "November 3, 2026"},
        "responses": {"Yes", "No", "Levy, Yes", "Levy, No", "Approved", "Rejected", "Bonds, Yes", "Bonds, No"},
        # Every candidate race on King County's ballot has a write-in line (drawn, not text)
        "write_in_default": True,
        # How the ballot prints things, for the replica: party under the name, Yes/No stacked
        "style": {"party": "below", "responses": "stacked"},
    },
    "larimer": {
        "source": "https://www.larimer.gov/sites/default/files/2026ge-larimer-county-sample-ballot.pdf",
        "columns": [55, 222, 388],
        "section": lambda s: s["white"] and s["bold"] and s["size"] == 11.0,
        "subsection": lambda s: False,
        "title": lambda s: s["bold"] and s["size"] == 10.0,
        "instruction": lambda s: not s["bold"] and s["size"] == 10.0,
        "body": lambda s: not s["bold"] and s["size"] == 9.0,
        "candidate": lambda s: not s["bold"] and s["size"] == 9.0,
        "party": lambda s: not s["bold"] and s["size"] == 7.5,
        "table": lambda s: s["size"] == 7.0 or (s["bold"] and s["size"] == 8.0 and s["page"] > 1),
        "skip_sections": set(),
        "skip_text": {"SAMPLE BALLOT", "Mark both sides of the ballot", "·"},
        "responses": {"YES", "NO", "YES/FOR", "NO/AGAINST"},
        "write_in_default": False,
        "style": {"party": "right", "responses": "inline"},
        "skip_before_y_page1": 290,  # header, statutory warning and marking instructions
    },
}

INSTRUCTION_RE = re.compile(
    r"^(\(.*\)|partisan office|nonpartisan office|vote for (one|up to \w+|no more than \w+)"
    r"|short and full term|short term|full term|(unexpired )?(\d+-year )?(unexpired )?term)$",
    re.I,
)


def lines_of(doc, cfg):
    cols = cfg["columns"]
    out = []
    for pno, page in enumerate(doc, 1):
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                text = "".join(s["text"] for s in line["spans"]).replace("\xa0", " ").strip()
                if not text:
                    continue
                s0 = line["spans"][0]
                x0, y0, x1 = line["bbox"][0], line["bbox"][1], line["bbox"][2]
                if pno == 1 and y0 < cfg.get("skip_before_y_page1", 0):
                    continue
                col = max(i for i, c in enumerate(cols) if x0 >= c - 2) if x0 >= cols[0] - 2 else 0
                out.append({
                    "page": pno, "col": col, "y": round(y0, 1), "x": round(x0 - cols[col], 1), "x1": round(x1 - cols[col], 1),
                    "size": round(s0["size"], 1), "bold": "Bold" in s0["font"],
                    "color": s0["color"], "white": s0["color"] == 0xFFFFFF, "text": text,
                })
    out.sort(key=lambda l: (l["page"], l["col"], l["y"], l["x"]))
    return out


def join(lines):
    return re.sub(r"\s+", " ", " ".join(lines)).strip()


def parse(county, pdf):
    cfg = CONFIG[county]
    doc = pymupdf.open(pdf)
    lines = lines_of(doc, cfg)
    for l in lines:
        l["page_gt1"] = l["page"] > 1

    with open(os.path.join(HERE, f"{county}.txt"), "w") as f:
        cur = None
        for l in lines:
            if (l["page"], l["col"]) != cur:
                cur = (l["page"], l["col"])
                f.write(f"\n=== page {l['page']} column {l['col'] + 1}\n")
            f.write(f"{'*' if l['bold'] else ' '}{'W' if l['white'] else ' '} {l['size']:4} {l['text']}\n")

    sections, contests = [], []
    section = subsection = None
    contest = question = None
    notice = None
    last_kind = None
    prev_line = None

    def style(l, kind):
        fn = cfg.get(kind)
        return bool(fn and fn(dict(l, page=l["page"])))

    def close_question():
        nonlocal question
        if question and question["lines"] and not question["responses"]:
            # Explanatory text printed between contests belongs to the next section
            notice_list.append({"section": None, "lines": question["lines"]})
        elif question and question["responses"]:
            question["text"] = join(question.pop("lines"))
            if question.get("after"):
                question["note"] = join(question.pop("after"))
            contest["questions"].append(question)
        question = None

    def new_contest(title, x):
        nonlocal contest, question
        close_question()
        contest = {
            "x": x,
            "section": section, "subsection": subsection, "title": [title], "instructions": [],
            "candidates": [], "questions": [], "table": [], "writeIn": False,
        }
        contests.append(contest)
        question = {"lines": [], "text": "", "responses": []}

    for i, l in enumerate(lines):
        t = l["text"]
        if t in cfg["skip_text"] or l["size"] >= 13:
            continue
        if style(l, "section"):
            if t in cfg["skip_sections"] or re.fullmatch(r"\d+ of \d+", t):
                continue
            # A heading that wraps onto a second line continues the same heading
            if last_kind == "section" and prev_line and prev_line["col"] == l["col"] and l["y"] - prev_line["y"] < 16 \
                    and t != section:
                section = sections[-1] = f"{section} {t}"
            elif t != section:
                section, subsection = t, None
                sections.append(t)
            close_question()
            question = {"lines": [], "text": "", "responses": []}
            for n in notice_list:
                if n["section"] is None:
                    n["section"] = section
            last_kind = "section"
            prev_line = l
            continue
        if style(l, "subsection"):
            subsection = t
            last_kind = "subsection"
            continue
        if t.startswith("READ:") or (last_kind == "notice" and style(l, "title")):
            if t.startswith("READ:"):
                notice = {"section": section, "lines": []}
                notice_list.append(notice)
            notice["lines"].append(t)
            last_kind = "notice"
            continue
        if t == "Write-in" and contest:
            contest["writeIn"] = True
            continue
        if t in cfg["responses"] and contest:
            question["responses"].append(t)
            last_kind = "response"
            continue
        if style(l, "table") and contest:
            contest["table"].append({"y": l["y"], "x": l["x"], "x1": l["x1"], "bold": l["bold"], "page": l["page"], "text": t})
            continue
        votes_for = contest is not None and any(re.search(r"vote for", s, re.I) for s in contest["instructions"])
        # Nonpartisan candidates share the title style but sit indented next to the oval
        indented_name = votes_for and style(l, "title") and l["x"] > contest["x"] + 8
        if style(l, "title") and not indented_name:
            if last_kind == "title" and contest and not contest["instructions"] and not contest["candidates"] \
                    and not question["lines"]:
                contest["title"].append(t)
            else:
                new_contest(t, l["x"])
            last_kind = "title"
            continue
        if contest is None:
            continue
        if style(l, "party"):
            # Party label sits beside (Larimer) or under (King) the candidate's name
            target = min(contest["candidates"], key=lambda c: abs(c["y"] - l["y"])) if contest["candidates"] else None
            if target is not None:
                target["party"] = t[1:-1] if t.startswith("(") and t.endswith(")") else t
            continue
        if (style(l, "instruction") or (style(l, "body") and INSTRUCTION_RE.match(t))) \
                and not contest["candidates"] and not question["lines"]:
            contest["instructions"].append(t)
            last_kind = "instruction"
            continue
        is_measure = any("YES or NO" in s for s in contest["instructions"]) or not any(
            re.search(r"vote for", s, re.I) for s in contest["instructions"])
        if not is_measure and (style(l, "candidate") or indented_name):
            prev = contest["candidates"][-1] if contest["candidates"] else None
            # Two-line names (Governor / Lt. Governor pairs) are ~11pt apart; candidates ~18+
            if prev and last_kind == "candidate" and 0 < l["y"] - prev["y_last"] < 13 and prev["name"].endswith(("/", "/ ")) \
                    or (prev and last_kind == "candidate" and 0 < l["y"] - prev["y_last"] < 13 and "/" in prev["name"] and "/" not in t):
                prev["name"] = join([prev["name"], t])
                prev["y_last"] = l["y"]
            else:
                contest["candidates"].append({"name": t, "y": l["y"], "y_last": l["y"]})
            last_kind = "candidate"
            continue
        if style(l, "body"):
            if question["responses"]:
                close_question()
                question = {"lines": [], "text": "", "responses": []}
            question.setdefault("after", []).append(t) if contest["table"] else question["lines"].append(t)
            last_kind = "body"
            continue

    close_question()
    for c in contests:
        c.pop("x")
        for cand in c["candidates"]:
            cand.pop("y", None), cand.pop("y_last", None)
        c["title"] = join(c["title"]) if county == "larimer" else c["title"]
        if cfg["write_in_default"] and c["candidates"]:
            c["writeIn"] = True
        c["table"] = build_table(c["table"])
        if not c["table"]:
            del c["table"]
        if not c["candidates"]:
            del c["candidates"]
            del c["writeIn"]
        if not c["questions"]:
            del c["questions"]
        if c["subsection"] is None:
            del c["subsection"]
    result = {
        "county": county, "source": cfg["source"], "style": cfg["style"], "sections": sections,
        "notices": [{"section": n["section"], "text": join(n["lines"])} for n in notice_list],
        "contests": contests,
    }
    with open(os.path.join(HERE, f"{county}.json"), "w") as f:
        json.dump(result, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print(county, len(contests), "contests,", len(sections), "sections")


def build_table(cells):
    """Rebuild a printed table from its text cells: column anchors come from the data rows
    (cells starting with a dollar amount), header lines stack above the first data row,
    and a wrapped first-column label joins the data row it sits beside."""
    if not cells:
        return None
    caption = [c["text"] for c in cells if c["bold"] and c["x1"] - c["x"] > 120]
    cells = [c for c in cells if not (c["bold"] and c["x1"] - c["x"] > 120)]
    money = re.compile(r"^[+-]?\$")
    data = [c for c in cells if money.match(c["text"])]
    anchors = []
    for x in sorted(c["x"] for c in data):
        if not anchors or x - anchors[-1] > 6:
            anchors.append(x)
    col_of = lambda c: min(range(len(anchors)), key=lambda i: abs(anchors[i] - c["x"]))
    first_y = min(c["y"] for c in data)
    header = [[] for _ in anchors]
    for c in sorted((c for c in cells if c["y"] < first_y - 1), key=lambda c: c["y"]):
        header[col_of(c)].append(c["text"])
    row_ys = sorted({c["y"] for c in data if col_of(c) > 0})
    rows = {y: [[] for _ in anchors] for y in row_ys}
    for c in sorted((c for c in cells if c["y"] >= first_y - 1), key=lambda c: c["y"]):
        y = min(row_ys, key=lambda ry: abs(ry - c["y"]))
        rows[y][col_of(c)].append(c["text"])
    return {
        "caption": join(caption) or None,
        "columns": [join(h) for h in header],
        "rows": [[join(cell) for cell in rows[y]] for y in row_ys],
    }


notice_list = []

if __name__ == "__main__":
    parse(sys.argv[1], sys.argv[2])
