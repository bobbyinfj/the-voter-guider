P = "wa26"
D, R, I, N = "Prefers Democratic Party", "Prefers Republican Party", "Prefers Independent Party", "States No Party Preference"
KING_SAMPLE = load_sample("king")
PAMPHLET = "https://www.sos.wa.gov/sites/default/files/2026-10/Voters%20Pamphlet%202026%20-%20Edition%2006%20-%20King%20-%20South%20and%20Southeast.pdf"
offices = [
  office(P, "us-house-7", "U.S. Representative, District 7", "federal", "53", 10,
         [("Pramila Jayapal", D, True, None, "https://www.pramilaforcongress.com"), ("Nirav Sheth", R, False, None, "https://www.shethforcongress.com")],
         desc="2-year term.", district="WA-7", dtype="congressional", dcode="7", term=2),
  office(P, "us-house-9", "U.S. Representative, District 9", "federal", "53", 11,
         [("Adam Smith", D, True, None, "https://www.electadamsmith.com"), ("Doug Basler", R, False, None, "https://dougbasler.com")],
         desc="2-year term.", district="WA-9", dtype="congressional", dcode="9", term=2),
]
leg = {  # district: (senate or None, rep1, rep2); each race = list of (name, party, incumbent)
  "11": (None, [("David Hackney", D, False), ("Ashley Fedan", D, False)], [("Steve Bergquist", D, False)]),
  "32": ([("Cindy Ryu", D, False), ("Jesse Salomon", D, True)], [("Keith Scully", D, False), ("Danica Noble", D, False)], [("Lauren Davis", D, False), ("Imraan Siddiqi", D, False)]),
  "34": ([("Emily Alvarado", D, False)], [("Brianna K. Thomas", D, False)], [("Joe Fitzgibbon", D, True), ("Mary Anito", D, False)]),
  "36": ([("Noel C. Frame", D, True), ("Jillian England", R, False)], [("Julia Grant Reed", D, False)], [("Liz Berry", D, False)]),
  "37": ([("Chipalo Street", D, False), ("Tatiana Brown", D, False)], [("Sharon Tomiko Santos", D, False), ("Kelabe Tewolde", D, False)], [("Jaelynn Scott", D, False), ("Evon McCorkle", I, False)]),
  "43": ([("Jamie Pedersen", D, True), ("Hannah Sabio-Howell", D, False)], [("Nicole Macri", D, True), ("Alby Clendennin", D, False)], [("Shaun Scott", D, False)]),
  "46": ([("Javier Valdez", D, True), ("Sandra Stephens", R, False)], [("Gerry Pollet", D, True), ("Will Dreher", D, False)], [("Darya Farivar", D, True), ("Rodney 'Star' Thornley", I, False)]),
}
order = 30
for ld, (sen, r1, r2) in leg.items():
    label = f"Legislative District {ld}"
    for kind, title, race, term in [("sen", "State Senator", sen, 4), ("rep1", "State Representative, Position 1", r1, 2), ("rep2", "State Representative, Position 2", r2, 2)]:
        if race is None: continue
        unopposed = " Unopposed on the general election ballot." if len(race) == 1 else ""
        offices.append(office(P, f"ld{ld}-{kind}", f"{title}, LD {ld}", "state", "53", order, race,
                              desc=f"{term}-year term.{unopposed}", district=label, dtype="legislative", dcode=ld, term=term))
        order += 1
judicial = [
  ("supreme-1", "Supreme Court Justice, Position 1", ["Colleen Melody", "Scott Edwards"], "2-year unexpired term. Nonpartisan."),
  ("supreme-3", "Supreme Court Justice, Position 3", ["David Stevens", "Jaime Michelle Hawk"], "6-year term. Nonpartisan."),
  ("supreme-4", "Supreme Court Justice, Position 4", ["Ian Birk", "Sean O'Donnell"], "6-year term. Nonpartisan."),
  ("supreme-5", "Supreme Court Justice, Position 5", ["Theo Angelis", "Dave Larson"], "2-year unexpired term. Nonpartisan."),
  ("supreme-7", "Supreme Court Justice, Position 7", ["Debra L. Stephens", "Todd A. Bloom"], "6-year term. Nonpartisan."),
  ("appeals-1-1-5", "Court of Appeals Judge, Division 1, District 1, Position 5", ["David S. Mann"], "6-year term. Nonpartisan. District 1 is King County. Unopposed."),
  ("appeals-1-1-6", "Court of Appeals Judge, Division 1, District 1, Position 6", ["Bill A. Bowman"], "6-year term. Nonpartisan. District 1 is King County. Unopposed."),
]
for i, (oid, title, names, desc) in enumerate(judicial):
    offices.append(office(P, oid, title, "state", "53", 80 + i, [(n, "Nonpartisan") for n in names], desc=desc))
offices += [
  office(P, "king-prosecutor", "King County Prosecuting Attorney", "county", "53033", 99, [("Leesa Manion", None, True)], desc="Countywide. Nonpartisan. Unopposed."),
  office(P, "king-assessor", "King County Assessor", "county", "53033", 100, ["Rob Foxcurran", "Dominique M. Scarimbolo"], desc="Countywide. Nonpartisan."),
  office(P, "king-elections-director", "King County Director of Elections", "county", "53033", 100, [("Julie Wise", None, True)], desc="Countywide. Nonpartisan. Unopposed."),
  office(P, "king-council-2", "King County Council, District 2", "county", "53033", 101, ["Rebecca Saldaña", "Toshiko Grace Hasegawa"],
         desc="Nonpartisan. VoteWA lists this seat as a short and full term: the winner also serves the rest of the current term.", district="County Council District 2", dtype="county-council", dcode="2"),
  office(P, "king-council-4", "King County Council, District 4", "county", "53033", 102, [("Jorge L. Barón", None, True)],
         desc="Nonpartisan. Northwest Seattle. Unopposed.", district="County Council District 4", dtype="county-council", dcode="4"),
  office(P, "king-council-8", "King County Council, District 8", "county", "53033", 102, [("Teresa Mosqueda", None, True), "Nick Duda"],
         desc="Nonpartisan. Includes West Seattle.", district="County Council District 8", dtype="county-council", dcode="8"),
  office(P, "seattle-council-5", "Seattle City Council, District 5", "city", "5363000", 110, ["Nilu Jenks", "Julie Kang"],
         desc="Nonpartisan. Unexpired 1-year term.", district="Seattle District 5", dtype="city-council", dcode="5"),
]
# King County District Court's West electoral district is all of Seattle (K.C.C. 1.12.050, Ordinance 19937)
west = {1: ["Bardi Martin", "Nyjat Rose-Akins"], 2: ["Kuljinder K. Dhillon"], 3: ["Rebecca Robertson"], 4: ["Yvonne Chin"], 5: ["Kristin Shotwell"]}
for pos, names in west.items():
    offices.append(office(P, f"kc-district-west-{pos}", f"King County District Court Judge, West Electoral District, Position {pos}", "county", "53033", 103 + pos, names,
                          desc="Seattle. Nonpartisan." + (" Unopposed." if len(names) == 1 else "")))
muni = {1: ["Cat McDowall"], 2: ["Katharine Edwards"], 3: ["Pooja Vaddadi"], 4: ["Anita Crawford-Willis"], 5: ["Gabe Rothstein", "Garmon Newsom"],
        6: ["Shantrice Anderson"], 7: ["Damon Shadid"]}
for pos, names in muni.items():
    offices.append(office(P, f"seattle-muni-{pos}", f"Seattle Municipal Court Judge, Position {pos}", "city", "5363000", 110 + pos, names,
                          desc="Citywide. Nonpartisan." + (" Unopposed." if len(names) == 1 else "")))
measures = [
  measure(P, "ip26-645", "IP26-645", "Initiative concerning state and local taxes", "state",
          "Would repeal the 9.9% tax on annual individual income over $1,000,000, prohibit taxes measured by or on individual income, and define \"income.\" The state's fiscal statement says it would decrease funding for K-12 and higher education and human services (primarily healthcare).", PAMPHLET, "initiative"),
  measure(P, "il26-001", "IL26-001", "Initiative concerning parental rights relating to their children in public school", "state",
          "Would restore the parents' rights law (RCW 28A.605.005) as the Legislature passed it in 2024 and repeal the 2025 amendments. It lists rights of parents and guardians of public-school children, such as reviewing school records, receiving notifications, and opting their child out of certain activities.", PAMPHLET, "initiative"),
  measure(P, "seattle-prop-1", "Seattle Prop 1", "Seattle Transit Measure", "city", None, KING_SAMPLE["source"], "proposition"),
  measure(P, "il26-638", "IL26-638", "Initiative concerning participation in athletics at K-12 schools", "state",
          "Would prohibit students it defines as \"biologically male\" from competing in certain school athletic activities intended for female students only, with biological sex verified by students' healthcare providers.", PAMPHLET, "initiative"),
]
# Printed ballot layout, from King County's sample ballot
PARTISAN = KING_SAMPLE["notices"][0]["text"]
k = lambda oid: next(o for o in offices if o["id"] == f"{P}-{oid}")
attach_race(KING_SAMPLE, k("us-house-7"), "United States Representative | Congressional District No. 7", PARTISAN)
attach_race(KING_SAMPLE, k("us-house-9"), "United States Representative | Congressional District No. 9", PARTISAN)
for ld in leg:
    for kind, line in [("sen", "State Senator"), ("rep1", "Representative Position No. 1"), ("rep2", "Representative Position No. 2")]:
        if any(o["id"] == f"{P}-ld{ld}-{kind}" for o in offices):
            attach_race(KING_SAMPLE, k(f"ld{ld}-{kind}"), f"Legislative District No. {ld} | {line}", PARTISAN)
for n in (1, 3, 4, 5, 7):
    attach_race(KING_SAMPLE, k(f"supreme-{n}"), f"Justice Position No. {n}")
for n in (5, 6):
    attach_race(KING_SAMPLE, k(f"appeals-1-1-{n}"), f"Court of Appeals, Division No. 1, District No. 1::Judge Position No. {n}")
attach_race(KING_SAMPLE, k("king-prosecutor"), "Prosecuting Attorney")
attach_race(KING_SAMPLE, k("king-assessor"), "Assessor")
attach_race(KING_SAMPLE, k("king-elections-director"), "Director of Elections")
for n in (2, 4, 8):
    attach_race(KING_SAMPLE, k(f"king-council-{n}"), f"Metropolitan King County | Council District No. {n}")
for pos in west:
    attach_race(KING_SAMPLE, k(f"kc-district-west-{pos}"), f"West Electoral District::Judge Position No. {pos}")
attach_race(KING_SAMPLE, k("seattle-council-5"), "City of Seattle | Council District No. 5")
for pos in muni:
    attach_race(KING_SAMPLE, k(f"seattle-muni-{pos}"), f"Seattle Municipal Court::Judge Position No. {pos}")
for m in measures:
    key = "City of Seattle | Proposition No. 1 | Seattle Transit Measure" if m["number"] == "Seattle Prop 1" else f"Initiative Measure No. {m['number']}"
    attach_measure(KING_SAMPLE, m, key)
report_unmapped(KING_SAMPLE, offices + measures, {"State Supreme Court", "Seattle Municipal Court", "West Electoral District"})

write("wa-general-2026-11-03", {
  "slug": "wa-general-2026-11-03",
  "electionId": "wa-general-2026",
  "title": "2026 General Election — Seattle, WA",
  "electionDate": "2026-11-03T00:00:00.000Z",
  "type": "general",
  "status": "upcoming",
  "description": "Washington's November 3 general election as it appears on Seattle ballots: two U.S. House seats, the state legislature, the state Supreme Court, King County and City of Seattle races, and three statewide initiatives. Washington has no U.S. Senate or statewide executive races in 2026. Party labels are each candidate's stated party preference, as printed on the ballot. Ballots are mailed by October 16. Contest order, headings and wording follow King County's official sample ballot.",
  "officialUrl": "https://www.sos.wa.gov/elections",
  "districtLookupUrl": "https://voter.votewa.gov/",
  "jurisdiction": {"name": "Washington", "state": "WA", "type": "state", "fipsCode": "53"},
  "localJurisdictions": [
    {"id": "king-county", "name": "King County", "state": "WA", "countyName": "King", "type": "county", "fipsCode": "53033"},
    {"id": "seattle", "name": "Seattle", "state": "WA", "countyName": "King", "type": "city", "fipsCode": "5363000"},
  ],
  "offices": offices,
  "measures": measures,
})
