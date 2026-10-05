import json, re, os
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'elections'))

def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def cand(prefix, name, party=None, inc=False, bio=None, web=None):
    c = {"id": f"{prefix}-{slug(name)}", "name": name}
    if party: c["party"] = party
    c["incumbent"] = inc
    if bio: c["shortBio"] = bio
    if web: c["website"] = web
    return c

def office(prefix, oid, title, level, fips, order, cands, desc=None, district=None, dtype=None, dcode=None, term=None):
    o = {"id": f"{prefix}-{oid}", "title": title, "level": level, "jurisdictionFips": fips, "sortOrder": order}
    if desc: o["description"] = desc
    if district: o["district"] = district
    if dtype: o["districtType"] = dtype; o["districtCode"] = dcode
    if term: o["termYears"] = term
    o["candidates"] = [cand(prefix, *c) if isinstance(c, tuple) else cand(prefix, c) for c in cands]
    return o

def measure(prefix, mid, number, title, level, desc=None, src=None, mtype="measure", **official):
    m = {"id": f"{prefix}-m-{slug(mid)}", "number": number, "title": title, "level": level, "type": mtype}
    if desc: m["description"] = desc
    if src: m["sourceUrl"] = src
    # Official explanations, verbatim: yesMeans, noMeans, fiscalImpact, placedBy, passes
    for k, v in official.items():
        if v: m[k] = v
    return m

def write(name, d):
    # Candidate ids must be unique within a bundle (they are global DB ids)
    ids = [c["id"] for o in d["offices"] for c in o["candidates"]]
    dup = {i for i in ids if ids.count(i) > 1}
    assert not dup, dup
    with open(os.path.join(OUT, name + ".json"), "w") as f:
        json.dump(d, f, indent=2, ensure_ascii=False); f.write("\n")
    print(name, len(d["offices"]), "offices", len(ids), "candidates", len(d.get("measures", [])), "measures")

exec(open(os.path.join(os.path.dirname(__file__), 'wa.py')).read())
exec(open(os.path.join(os.path.dirname(__file__), 'ca.py')).read())
exec(open(os.path.join(os.path.dirname(__file__), 'co.py')).read())
