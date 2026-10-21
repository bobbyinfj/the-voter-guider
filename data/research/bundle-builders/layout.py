# Attach the printed ballot layout (from ../sample-ballots/<county>.json, parsed from the
# county's official sample ballot) to bundle offices and measures. Exec'd by build.py.
#
# Each mapped item gets a "ballot" object: its position on the sample ballot, the section
# and heading text exactly as printed, instruction lines, and for races the candidates in
# printed order with their printed labels; for measures the question text and response
# labels. Builds fail if a candidate list or name doesn't match the ballot, so the bundle
# can't drift from what voters actually see.

SAMPLES = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'sample-ballots'))


def load_sample(county):
    with open(os.path.join(SAMPLES, county + ".json")) as f:
        sample = json.load(f)
    for i, c in enumerate(sample["contests"]):
        c["order"] = i
        c["key"] = c["title"] if isinstance(c["title"], str) else " | ".join(c["title"])
        c["heading"] = [c["title"]] if isinstance(c["title"], str) else c["title"]
    return sample


def _norm(name):
    return re.sub(r"[^a-z0-9]", "", name.lower())


def _contest(sample, key):
    # "Section::Title" disambiguates repeated titles (e.g. "Judge Position No. 5")
    section, _, title = key.rpartition("::")
    found = [c for c in sample["contests"] if c["key"] == title and (not section or c["section"] == section)]
    assert len(found) == 1, f"{sample['county']}: {len(found)} contests titled {key!r}"
    return found[0]


def _base(sample, c, notice):
    b = {
        "source": sample["source"],
        "style": sample["style"],
        "order": c["order"] * 100,
        "section": c["section"],
        "heading": c["heading"],
        "instructions": c["instructions"],
    }
    if c.get("subsection"):
        b["subsection"] = c["subsection"]
    if notice:
        b["notice"] = notice
    return b


def attach_race(sample, office_, key, notice=None):
    c = _contest(sample, key)
    printed = c.get("candidates")
    assert printed, f"{key!r} has no candidates on the sample ballot"
    by_norm = {_norm(cd["name"]): cd for cd in office_["candidates"]}
    ordered, labels = [], []
    for p in printed:
        # Ticket races print "Governor / Lt. Governor"; the bundle keys on the first name
        cd = by_norm.get(_norm(p["name"])) or by_norm.get(_norm(p["name"].split(" / ")[0]))
        assert cd, f"{office_['id']}: {p['name']!r} is on the ballot but not in the bundle"
        ordered.append(cd)
        label = {"name": cd["name"], "label": p["name"]}
        if p.get("party"):
            label["party"] = p["party"]
            cd["party"] = p["party"]
        labels.append(label)
    extra = [cd["name"] for cd in office_["candidates"] if cd not in ordered]
    assert not extra, f"{office_['id']}: {extra} are in the bundle but not on the ballot"
    office_["candidates"] = ordered
    b = _base(sample, c, notice)
    b["candidates"] = labels
    b["writeIn"] = bool(c.get("writeIn"))
    office_["ballot"] = b
    return office_


def attach_measure(sample, measure_, key, question=0):
    c = _contest(sample, key)
    qs = c.get("questions") or []
    assert len(qs) > question, f"{key!r} has no question #{question}"
    q = qs[question]
    b = _base(sample, c, None)
    b["order"] += question
    b["question"] = q["text"]
    b["responses"] = q["responses"]
    if q.get("note"):
        b["note"] = q["note"]
    if len(qs) > 1:
        b["group"] = c["key"]  # several questions printed under one heading (judicial retention)
    if c.get("table"):
        b["table"] = c["table"]
    measure_["ballot"] = b
    return measure_


def retention_questions(sample, key):
    """(index, question text) for each yes/no question printed under a retention heading."""
    return [(i, q["text"]) for i, q in enumerate(_contest(sample, key)["questions"])]


def report_unmapped(sample, items, relevant_sections):
    mapped = {i["ballot"]["order"] // 100 for i in items if "ballot" in i}
    missing = [i["id"] for i in items if "ballot" not in i]
    assert not missing, f"no sample-ballot layout for {missing}"
    for c in sample["contests"]:
        if c["order"] not in mapped and c["section"] in relevant_sections:
            print(f"   not in bundle: [{c['section']}] {c['key']}")
