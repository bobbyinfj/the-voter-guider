P = "ca26"
D, R, NP = "Democratic", "Republican", "Nonpartisan"
CERT = "https://elections.cdn.sos.ca.gov/statewide-elections/2026-general/cert-list-candidates.pdf"
MEAS = "https://www.sos.ca.gov/elections/ballot-measures/qualified-ballot-measures"
MP = "https://www.montereypark.ca.gov/1738/2026-General-Election-Information"
# (name, party, incumbent, ballot designation) — designations are verbatim from the certified list
state_races = [
  ("governor", "Governor", [("Xavier Becerra", D, False, "Voting Rights Attorney"), ("Steve Hilton", R, False, "Small Business Owner")], "Chief executive of California. 4-year term; Gavin Newsom is term-limited."),
  ("lt-governor", "Lieutenant Governor", [("Fiona Ma", D, False, "State Treasurer/CPA"), ("Gloria Romero", R, False, "Educator/Businesswoman")], "4-year term."),
  ("secretary-of-state", "Secretary of State", [("Shirley N. Weber", D, True, "California Secretary of State"), ("Donald P. (Don) Wagner", R, False, "Orange County Supervisor")], "Chief elections officer. 4-year term."),
  ("controller", "Controller", [("Malia M. Cohen", D, True, "State Controller/Mother"), ("Herb W Morgan", R, False, "Chief Investment Officer")], "4-year term."),
  ("treasurer", "Treasurer", [("Eleni Kounalakis", D, False, "Lieutenant Governor of California"), ("Jennifer Hawks", R, False, "Retired Business Executive")], "4-year term."),
  ("attorney-general", "Attorney General", [("Rob Bonta", D, True, "California Attorney General"), ("Michael E. Gates", R, False, "Deputy United States Attorney")], "4-year term."),
  ("insurance-commissioner", "Insurance Commissioner", [("Ben Allen", D, False, "California State Senator"), ("Jane Kim", D, False, "Attorney/Consumer Advocate")], "4-year term."),
  ("superintendent", "Superintendent of Public Instruction", [("Richard Barrera", NP, False, "State Superintendent Advisor"), ("Sonja Shaw", NP, False, "School District President")], "Nonpartisan. 4-year term."),
  ("boe-3", "Board of Equalization, District 3", [("Mike Gipson", D, False, "State Assemblymember/Father"), ("Samuel P. Sukaton", D, False, "Labor Union Organizer")], "District 3 is all of Los Angeles County. 4-year term."),
]
offices = [
  office(P, "us-house-28", "U.S. Representative, District 28", "federal", "06", 10,
         [("Judy Chu", D, True, "United States Representative"), ("April A. Verlato", R, False, "Small Business Owner")],
         desc="2-year term. Monterey Park is entirely in District 28 under the Proposition 50 (2025) congressional map.", term=2),
]
for i, (oid, title, cands, desc) in enumerate(state_races):
    offices.append(office(P, oid, title, "state", "06", 20 + i, [(n, p, inc, bio) for n, p, inc, bio in cands], desc=desc))
offices += [
  office(P, "assembly-49", "State Assembly, District 49", "state", "06", 40,
         [("Mike Fong", D, True, "California State Assemblymember"), ("Long David Liu", R, False, "Attorney/Father")],
         desc="2-year term. Monterey Park is in Assembly District 49. (Its State Senate seat, District 25, is not up in 2026.)", term=2),
  office(P, "la-sheriff", "Los Angeles County Sheriff", "county", "06037", 60, [("Robert Luna", None, True), "Alex Villanueva"],
         desc="Nonpartisan runoff; no candidate won a majority in the June 2 primary. A rematch of 2022."),
  office(P, "mp-council-1", "Monterey Park City Council, District 1", "city", "0648914", 70,
         [("Thomas Wong", None, True, "Monterey Park City Councilmember")],
         desc="4-year term. Unopposed.", district="Council District 1", dtype="city-council", dcode="1", term=4),
  office(P, "mp-council-5", "Monterey Park City Council, District 5", "city", "0648914", 71,
         [("Steven Kung", None, False, "Filmmaker/Community Organizer"), ("Vinh T. Ngo", None, True, "Monterey Park City Councilmember")],
         desc="4-year term.", district="Council District 5", dtype="city-council", dcode="5", term=4),
  office(P, "mp-clerk", "Monterey Park City Clerk", "city", "0648914", 72, [("Dora Leung", None, False, "Mother/Realtor/Entrepreneur")], desc="At-large. 4-year term. Unopposed.", term=4),
  office(P, "mp-treasurer", "Monterey Park City Treasurer", "city", "0648914", 73, [("Amy Lee", None, True, "City Treasurer/Attorney")], desc="At-large. 4-year term. Unopposed.", term=4),
]
props = [
  ("1", "Authorizes Bonds for Housing Affordability Programs", "Legislative statute."),
  ("2", "Increases State's Rainy Day Fund", "Legislative constitutional amendment."),
  ("3", "Provides Permanent Funding for Schools and Health Care by Extending Existing Tax on High Incomes", "Initiative constitutional amendment."),
  ("4", "Repeals Prohibition Against Public Funding of Election Campaigns", "Legislative statute."),
  ("5", "Changes Recall Election Process for Statewide Officers", "Legislative constitutional amendment."),
  ("37", "Creates Loan Program for Middle-Income Buyers of Qualified New Homes", "Initiative statute."),
  ("38", "Authorizes Bonds for Immunology Medical Research", "Initiative statute."),
  ("39", "Prohibits Citizens from Voting Unless They Present Government-Issued Identification", "Initiative constitutional amendment."),
  ("40", "Imposes One-Time Tax on Certain Taxpayers", "Initiative constitutional amendment and statute."),
  ("41", "Prohibits New State Taxes That Exclude Revenues from State Spending Limit. Requires Audits for New State Special Taxes", "Initiative constitutional amendment."),
  ("42", "Prohibits New State Personal Property Taxes and Certain Retroactive State Taxes", "Initiative constitutional amendment."),
  ("43", "Limits Voters' Ability to Raise Revenues for Local Government Services", "Legislative constitutional amendment."),
  ("44", "Requires Community Health Clinics Spend 90% of Revenue on Program Services", "Initiative statute."),
  ("45", "Modifies Environmental Review for Certain Projects", "Initiative statute."),
]
import json as _json, os as _os
OFFICIAL = _json.load(open(_os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "ca-props.json")))
VIG = "https://voterguide.sos.ca.gov/propositions/{}/"
measures = [measure(P, f"prop-{n}", f"Prop {n}", t, "state", OFFICIAL[n]["summary"], VIG.format(n), "proposition",
                    yesMeans=OFFICIAL[n]["yes"], noMeans=OFFICIAL[n]["no"], fiscalImpact=OFFICIAL[n]["fiscalImpact"],
                    placedBy=OFFICIAL[n]["placedBy"], passes=None)
            for n, t, d in props]
LAC = "https://content.lavote.gov/docs/rrcc/documents/measures-appearing-on-the-ballot---november-3-2026-rev-8-14-2026-v-4.pdf"
measures += [
  measure(P, "la-a", "Measure A", "Los Angeles County Charter Amendment: Good-Faith Negotiation and Binding Arbitration for Public Safety Employee Disputes", "county",
          "Would amend the County Charter to prohibit strikes by district attorney investigators, medical examiners, lifeguards, their supervisors, and non-administrative civilian employees of the Fire, Sheriff's and Medical Examiner departments; restate existing good-faith negotiation obligations; and set up impartial binding arbitration for labor disputes with certified public safety employee organizations. Majority vote.", LAC),
  measure(P, "la-e", "Measure E", "County of Los Angeles Ethics Commission and Community Investment Budget Allocation Charter Amendment", "county",
          "Would amend the County Charter to give the county Ethics Commission, Office of Ethics Compliance and Ethics Compliance Officer more independence and structure (appointments, qualifications, terms, duties), and continue the county's commitment to community investment and alternatives to incarceration. Majority vote.", LAC),
]
measures += [
  measure(P, "mp-hom", "Measure HOM", "Create HOME Housing Overlays in Monterey Park", "city",
          "Would amend the city's Land Use Element to create a Housing Overlay Mixed Environments (HOME) designation allowing housing (multifamily, townhomes, condos, mixed use) in identified commercial and industrial areas. It would not approve any project by itself, would not apply in R-1 or R-2 zones, and keeps the city's ban on data centers.", MP),
  measure(P, "mp-aaa", "Measure AAA", "Transient Occupancy Tax", "city",
          "Would raise the hotel/motel guest tax from 13% to 14% and set a 16% rate for short-term rental guests, raising about $600,000 a year for city services until ended by voters.", MP),
]
write("ca-general-2026-11-03", {
  "slug": "ca-general-2026-11-03",
  "electionId": "ca-general-2026",
  "title": "2026 General Election — Monterey Park, CA",
  "electionDate": "2026-11-03T00:00:00.000Z",
  "type": "general",
  "status": "upcoming",
  "description": "California's November 3 general election as it appears on Monterey Park ballots: Governor and the other statewide offices, U.S. House District 28, Assembly District 49, the Los Angeles County Sheriff runoff, Monterey Park city races, 14 statewide propositions, two county charter amendments and two city measures. School and special-district measures are not included. California has no U.S. Senate race in 2026. Candidates and ballot designations are from the Secretary of State's certified list (Aug 27, 2026).",
  "officialUrl": "https://www.sos.ca.gov/elections/upcoming-elections/general-election-november-3-2026",
  "districtLookupUrl": "https://www.montereypark.ca.gov/1223/District-Elections",
  "jurisdiction": {"name": "California", "state": "CA", "type": "state", "fipsCode": "06"},
  "localJurisdictions": [
    {"id": "la-county", "name": "Los Angeles County", "state": "CA", "countyName": "Los Angeles", "type": "county", "fipsCode": "06037"},
    {"id": "monterey-park", "name": "Monterey Park", "state": "CA", "countyName": "Los Angeles", "type": "city", "fipsCode": "0648914"},
  ],
  "offices": offices,
  "measures": measures,
})
