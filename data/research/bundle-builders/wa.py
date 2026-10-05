P = "wa26"
D, R, I, N = "Prefers Democratic Party", "Prefers Republican Party", "Prefers Independent Party", "States No Party Preference"
PAMPHLET = "https://www.sos.wa.gov/sites/default/files/2026-10/Voters%20Pamphlet%202026%20-%20Edition%2006%20-%20King%20-%20South%20and%20Southeast.pdf"
offices = [
  office(P, "us-house-7", "U.S. Representative, District 7", "federal", "53", 10,
         [("Pramila Jayapal", D, True, None, "https://www.pramilaforcongress.com"), ("Nirav Sheth", R, False, None, "https://www.shethforcongress.com")],
         desc="2-year term. Covers most of Seattle.", district="WA-7", dtype="congressional", dcode="7", term=2),
  office(P, "us-house-9", "U.S. Representative, District 9", "federal", "53", 11,
         [("Adam Smith", D, True, None, "https://www.electadamsmith.com"), ("Doug Basler", R, False, None, "https://dougbasler.com")],
         desc="2-year term. Covers southeast Seattle and south King County.", district="WA-9", dtype="congressional", dcode="9", term=2),
]
leg = {  # district: (senate or None, rep1, rep2); each race = list of (name, party, incumbent)
  "11": (None, [("David Hackney", D, False), ("Ashley Fedan", D, False)], [("Steve Bergquist", D, False)]),
  "32": ([("Cindy Ryu", D, False), ("Jesse Salomon", D, True)], [("Keith Scully", D, False), ("Danica Noble", D, False)], [("Lauren Davis", D, False), ("Imraan Siddiqi", D, False)]),
  "34": ([("Emily Alvarado", None, False)], [("Brianna K. Thomas", None, False)], [("Joe Fitzgibbon", D, True), ("Mary Anito", D, False)]),
  "36": ([("Noel C. Frame", D, True), ("Jillian England", R, False)], [("Julia Grant Reed", None, False)], [("Liz Berry", None, False)]),
  "37": ([("Chipalo Street", D, False), ("Tatiana Brown", D, False)], [("Sharon Tomiko Santos", D, False), ("Kelabe Tewolde", D, False)], [("Jaelynn Scott", D, False), ("Evon McCorkle", I, False)]),
  "43": ([("Jamie Pedersen", D, True), ("Hannah Sabio-Howell", D, False)], [("Nicole Macri", D, True), ("Alby Clendennin", D, False)], [("Shaun Scott", None, False)]),
  "46": ([("Javier Valdez", D, True), ("Sandra Stephens", R, False)], [("Gerry Pollet", D, True), ("Will Dreher", D, False)], [("Darya Farivar", D, True), ("Rodney 'Star' Thornley", N, False)]),
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
  ("appeals-1-1-5", "Court of Appeals Judge, Division 1, District 1, Position 5", ["David S. Mann", "Bill A. Bowman"], "6-year term. Nonpartisan. District 1 is King County."),
]
for i, (oid, title, names, desc) in enumerate(judicial):
    offices.append(office(P, oid, title, "state", "53", 80 + i, [(n, "Nonpartisan") for n in names], desc=desc))
offices += [
  office(P, "king-assessor", "King County Assessor", "county", "53033", 100, ["Rob Foxcurran", "Dominique M. Scarimbolo"], desc="Countywide. Nonpartisan."),
  office(P, "king-council-2", "King County Council, District 2", "county", "53033", 101, ["Rebecca Saldaña", "Toshiko Grace Hasegawa"],
         desc="Nonpartisan. VoteWA lists this seat as a short and full term: the winner also serves the rest of the current term.", district="County Council District 2", dtype="county-council", dcode="2"),
  office(P, "king-council-8", "King County Council, District 8", "county", "53033", 102, [("Teresa Mosqueda", None, True), "Nick Duda"],
         desc="Nonpartisan. Includes West Seattle.", district="County Council District 8", dtype="county-council", dcode="8"),
  office(P, "seattle-council-5", "Seattle City Council, District 5", "city", "5363000", 110, ["Nilu Jenks", "Julie Kang"],
         desc="Nonpartisan. North Seattle.", district="Seattle District 5", dtype="city-council", dcode="5"),
  office(P, "seattle-muni-5", "Seattle Municipal Court Judge, Position 5", "city", "5363000", 111, ["Gabe Rothstein", "Garmon Newsom"],
         desc="Citywide. Nonpartisan."),
]
measures = [
  measure(P, "ip26-645", "IP26-645", "Initiative concerning state and local taxes", "state",
          "Would repeal the 9.9% tax on annual individual income over $1,000,000, prohibit taxes measured by or on individual income, and define \"income.\" The state's fiscal statement says it would decrease funding for K-12 and higher education and human services (primarily healthcare).", PAMPHLET, "initiative"),
  measure(P, "il26-001", "IL26-001", "Initiative concerning parental rights relating to their children in public school", "state",
          "Would restore the parents' rights law (RCW 28A.605.005) as the Legislature passed it in 2024 and repeal the 2025 amendments. It lists rights of parents and guardians of public-school children, such as reviewing school records, receiving notifications, and opting their child out of certain activities.", PAMPHLET, "initiative"),
  measure(P, "il26-638", "IL26-638", "Initiative concerning participation in athletics at K-12 schools", "state",
          "Would prohibit students it defines as \"biologically male\" from competing in certain school athletic activities intended for female students only, with biological sex verified by students' healthcare providers.", PAMPHLET, "initiative"),
]
write("wa-general-2026-11-03", {
  "slug": "wa-general-2026-11-03",
  "electionId": "wa-general-2026",
  "title": "2026 General Election — Seattle, WA",
  "electionDate": "2026-11-03T00:00:00.000Z",
  "type": "general",
  "status": "upcoming",
  "description": "Washington's November 3 general election as it appears on Seattle ballots: two U.S. House seats, the state legislature, the state Supreme Court, King County and City of Seattle races, and three statewide initiatives. Washington has no U.S. Senate or statewide executive races in 2026. Party labels are each candidate's stated party preference, as printed on the ballot. Ballots are mailed by October 16. Not yet listed: races with one or two candidates skipped the August primary, and King County has not yet published its November local pamphlet. These include King County Council District 4 (northwest Seattle), Prosecuting Attorney, Director of Elections, Seattle Municipal Court positions other than 5, and King County District Court and Superior Court seats. They will be added once they are confirmed.",
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
