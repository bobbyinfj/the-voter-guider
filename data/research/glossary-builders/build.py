# Builds data/glossary/offices.json: what each office on the ballot does, in plain English, for
# voters who have no idea (lib/glossary.ts describes the format; the ballot and /glossary show it).
#
# Rules (CLAUDE.md "Transparency is the product"):
#   - `plain` is our own wording (shown as a Voter Guider summary) and says nothing the quotes
#     don't. Every quote must appear on the saved copy of its source, or the build fails. What a
#     job is comes from an official page (the office's own site, the state's voter guide); `facts`
#     (context such as retention history) each carry their own source, official or a credited
#     news guide.
#   - An entry applies to offices (`offices`) or, for questions like judicial retention, to every
#     measure of one type in one state's bundle (`measures`, filled in here). Retention context is
#     California's only: other states' judges have their own systems.
#   - Fetches identify as Claude-User and obey robots.txt (comparison-builders/build.py fetch).
#     The current CA voter guide (voterguide.sos.ca.gov) blocks Claude-User; the Secretary of
#     State's own archive (vigarchive.sos.ca.gov) allows it, so CA statewide offices quote the
#     archived June 2010 guide, labeled with its date.
#   - `ask` are questions to put to every candidate alike, about the job's powers. They never
#     assume a position or state a current-events fact. Judges get none (they can't campaign on
#     issues).
#   - An office with no official page describing the job gets no entry (no placeholder).
#
# Usage: python3 build.py
# cache/ (saved pages) is not committed; delete a file there to re-fetch it.
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'comparison-builders'))
import build as cb  # noqa: E402

cb.CACHE = HERE / 'cache'
ROOT = HERE.parents[2]

ASSEMBLY_ACA8 = (
    'https://aelc.assembly.ca.gov/system/files/2025-07/aca-8-pellerin-175252940213150.pdf',
    'California Assembly Elections Committee, analysis of ACA 8 (2025)',
)

WA_COURTS = ('https://www.courts.wa.gov/newsinfo/content/pdf/CourtGuide2011.pdf', 'Washington Courts, A Guide to Washington State Courts (2011)')
WA_LEG = ('https://capaa.wa.gov/node/150', 'Washington State Commission on Asian Pacific American Affairs, About the Legislature')
CA_GUIDE = (
    'https://vigarchive.sos.ca.gov/2010/primary/voter-info/statewide-elective-office-desc.htm',
    "California Secretary of State, Official Voter Information Guide (June 2010, archived)",
)

ENTRIES = [
    {
        'key': 'ca-governor', 'title': 'Governor', 'state': 'CA', 'offices': ['ca26-governor'],
        'plain': "Runs California's state government. Signs or vetoes the bills the Legislature passes, writes the state budget proposal each year, appoints judges, and directs the state's response to emergencies.",
        'source': CA_GUIDE,
        'quotes': ["As the state's chief executive officer, oversees most state departments and agencies and appoints judges. Proposes new laws and approves or vetoes legislation. Prepares and submits the annual state budget. Mobilizes and directs state resources during emergencies."],
        'ask': [
            'What would they put first in the state budget, and what would they cut?',
            'Which kinds of bills would they sign, and which would they veto?',
            'How would they choose judges and the people who run state agencies?',
        ],
    },
    {
        'key': 'ca-lt-governor', 'title': 'Lieutenant Governor', 'state': 'CA', 'offices': ['ca26-lt-governor'],
        'plain': "Takes over if the governor can't serve, and presides over the State Senate, where they can cast a tie-breaking vote.",
        'source': CA_GUIDE,
        'quotes': ['Assumes the office and duties of Governor in the case of impeachment, death, resignation, removal from office, or absence from the state. Serves as president of the State Senate and has a tie-breaking vote.'],
        'ask': [
            'Are they ready to step in as governor?',
            'How would they use a tie-breaking vote in the State Senate?',
        ],
    },
    {
        'key': 'ca-secretary-of-state', 'title': 'Secretary of State', 'state': 'CA', 'offices': ['ca26-secretary-of-state'],
        'plain': "Runs statewide elections, makes campaign and lobbying money public, and registers businesses and trademarks.",
        'source': CA_GUIDE,
        'quotes': ["As the state's chief elections officer, oversees statewide elections and provides public access to campaign and lobbying financial information. Supports California business by registering and authenticating certain types of businesses and trademarks"],
        'ask': [
            'How would they run elections that are both secure and easy to vote in?',
            'How would they make campaign and lobbying money easier to follow?',
        ],
    },
    {
        'key': 'ca-controller', 'title': 'Controller', 'state': 'CA', 'offices': ['ca26-controller'],
        'plain': "The state's accountant. Keeps the books for all public money, runs the state payroll, handles unclaimed property, and audits state operations.",
        'source': CA_GUIDE,
        'quotes': ["As the state's chief fiscal officer, serves as the state's accountant and bookkeeper of all public funds. Administers the state payroll system and unclaimed property laws.", 'Conducts audits and reviews of state operations.'],
        'ask': [
            'What would they audit first, and why?',
            'What experience do they have with accounting, auditing or managing large budgets?',
        ],
    },
    {
        'key': 'ca-treasurer', 'title': 'Treasurer', 'state': 'CA', 'offices': ['ca26-treasurer'],
        'plain': "The state's banker. Invests state money and sells the state's bonds (how California borrows).",
        'source': CA_GUIDE,
        'quotes': ["As the state's banker, manages the state's investments. Administers the sale of state bonds and notes, and is the investment officer for most state funds."],
        'ask': [
            'How would they balance safety and returns when investing state money?',
            'What experience do they have with investing or public finance?',
        ],
    },
    {
        'key': 'ca-attorney-general', 'title': 'Attorney General', 'state': 'CA', 'offices': ['ca26-attorney-general'],
        'plain': "The state's top lawyer. Runs the Department of Justice, represents California in court, and oversees law enforcement, including district attorneys and sheriffs.",
        'source': CA_GUIDE,
        'quotes': ["As the state's chief law officer, ensures that the laws of the state are uniformly and adequately enforced. Heads the Department of Justice, which is responsible for providing state legal services and support for local law enforcement. Acts as the chief legal counsel in state litigation. Oversees law enforcement agencies, including county district attorneys and sheriffs."],
        'ask': [
            'Which kinds of cases would they make a priority?',
            'When would they take someone to court on the state\'s behalf?',
            'How would they oversee local law enforcement?',
        ],
    },
    {
        'key': 'ca-insurance-commissioner', 'title': 'Insurance Commissioner', 'state': 'CA', 'offices': ['ca26-insurance-commissioner'],
        'plain': "Regulates the insurance companies that sell in California: licenses and examines them, enforces insurance laws and writes the rules under them, and answers people's complaints about insurers. Runs the state Department of Insurance.",
        'source': CA_GUIDE,
        'quotes': ['Oversees and directs all functions of the Department of Insurance. Licenses, regulates, and examines insurance companies. Answers public questions and complaints regarding the insurance industry. Enforces California insurance laws and adopts regulations to implement the laws.'],
        'ask': [
            'How strictly would they regulate insurance companies, and what would that mean for prices and coverage?',
            'What would they do for people with complaints about their insurer?',
            'What experience do they have with insurance or consumer protection?',
        ],
    },
    {
        'key': 'ca-superintendent', 'title': 'Superintendent of Public Instruction', 'state': 'CA', 'offices': ['ca26-superintendent'],
        'plain': "California's top public-schools official. Runs the state Department of Education, carries out the State Board of Education's policies, and gives direction to local school districts.",
        'source': CA_GUIDE,
        'quotes': ["As the state's chief public schools official, provides education policy and direction to local school districts. Directs all functions of the Department of Education and executes policies set by the State Board of Education."],
        'ask': [
            'What would they change about how the state supports local schools?',
            'What experience do they have in education?',
        ],
    },
    {
        'key': 'ca-board-of-equalization', 'title': 'Board of Equalization', 'state': 'CA', 'offices': ['ca26-boe-3'],
        'plain': "An elected state board that oversees California's property tax system, keeping it consistent from county to county, plus the state taxes on alcohol and on insurance companies.",
        'source': ('https://www.boe.ca.gov/info/about.htm', 'California State Board of Equalization, About BOE'),
        'quotes': [
            "Today, the BOE is constitutionally and statutorily responsible for overseeing California's property tax system, as well as the Alcoholic Beverage Tax and Tax on Insurers.",
            "Each of the BOE's constitutional and statutory duties is critical to promoting a consistent and uniform property tax system throughout the state.",
        ],
        'ask': [
            'How would they keep property taxes assessed the same way in every county?',
            'What experience do they have with taxes or property assessment?',
        ],
    },
    {
        'key': 'wa-king-prosecutor', 'title': 'King County Prosecuting Attorney', 'state': 'WA', 'offices': ['wa26-king-prosecutor'],
        'plain': "Leads the county's prosecutors, who bring charges for every felony in King County and for misdemeanors outside city limits. Also the county government's lawyer in civil cases.",
        'source': ('https://kingcounty.gov/en/dept/pao', "King County Prosecuting Attorney's Office"),
        'quotes': [
            "The Prosecuting Attorney's Office represents the state and county in both criminal and civil legal matters.",
            'We are responsible for prosecuting all felonies in King County and all misdemeanors in unincorporated areas of King County.',
            "We are also the County's law firm.",
        ],
        'ask': [
            'Which crimes would they make a priority?',
            'When would they seek jail, and when other options?',
            'What experience do they have as a prosecutor or in court?',
        ],
    },
    {
        'key': 'co-cu-regent', 'title': 'CU Regent', 'state': 'CO', 'offices': ['co26-cu-regent-2'],
        'plain': "A member of the elected board that runs the University of Colorado. The board supervises the university and controls its money.",
        'source': ('https://www.cu.edu/regents', 'University of Colorado Board of Regents'),
        'quotes': ['The board is charged constitutionally with the general supervision of the university and the exclusive control and direction of all funds of and appropriations to the university, unless otherwise provided by law.'],
        'ask': [
            'How would they handle tuition and what students pay?',
            'What would they want the university to spend more, or less, on?',
        ],
    },
    {
        'key': 'co-larimer-assessor', 'title': 'Larimer County Assessor', 'state': 'CO', 'offices': ['co26-larimer-assessor'],
        'plain': "Sets the value of every property in the county (homes, businesses, farmland) for property taxes. If you disagree with your value, you can protest it with the Assessor in May.",
        'source': ('https://www.larimer.gov/assessor', 'Larimer County Assessor'),
        'quotes': [
            'The County Assessor is responsible for valuing all real and personal property, including mobile homes, residential and commercial properties and agricultural land for property tax purposes.',
            'The Assessor determines the equitable value of property to ensure that each taxpayer pays only their fair share of the taxes.',
            'Anyone who disagrees with changes in the actual value of real property can object or file a protest with the Assessor in May .',
        ],
        'ask': [
            'How would they keep property values accurate and easy to understand?',
            'How would they handle protests from property owners?',
        ],
    },
    {
        'key': 'co-larimer-treasurer', 'title': 'Larimer County Treasurer', 'state': 'CO', 'offices': ['co26-larimer-treasurer'],
        'plain': "Collects the county's property taxes. Doesn't decide how much tax you owe; ask the Assessor about your property's value.",
        'source': ('https://www.larimer.gov/treasurer', 'Larimer County Treasurer & Public Trustee'),
        'quotes': [
            'The Treasurer does NOT determine the amount of tax to be collected.',
            "For more information on the value of your property or the amount of the taxes collected, please contact the Larimer County Assessor's Office .",
        ],
        'ask': [
            'How would they make paying property taxes easier?',
            'What experience do they have managing public money?',
        ],
    },
    {
        'key': 'co-larimer-surveyor', 'title': 'Larimer County Surveyor', 'state': 'CO', 'offices': ['co26-larimer-surveyor'],
        'plain': "A professional land surveyor who represents the county in property-line (boundary) disputes and, when the county commissioners ask, surveys county land such as road rights-of-way.",
        'source': ('https://www.larimer.gov/surveyor', 'Larimer County Surveyor'),
        'quotes': [
            'The Larimer County Surveyor is a professional land surveyor and is responsible for representing the county in boundary disputes.',
            'When authorized by the Board of County Commissioners, the Surveyor conducts surveys of county property including rights-of-way.',
        ],
        'ask': ['What surveying experience and credentials do they have?'],
    },
    {
        'key': 'co-larimer-coroner', 'title': 'Larimer County Coroner', 'state': 'CO', 'offices': ['co26-larimer-coroner'],
        'plain': "Investigates sudden or unexpected deaths in the county, including traffic deaths, homicides and suicides, and determines the cause and manner of each death.",
        'source': ('https://www.larimer.gov/coroner', 'Larimer County Coroner'),
        'quotes': [
            'The Office of the Larimer County Coroner/Medical Examiner is responsible for investigating all sudden and/or unexpected deaths throughout the county.',
            'Through an investigation, a determination is made as to the cause and manner of death.',
            'This includes death while a person is in custody or within 24 hours of being admitted to a hospital, as well as all fatal traffic deaths, homicides, and suicides.',
        ],
        'ask': [
            'What medical or death-investigation training do they have?',
            'How would they work with families and with law enforcement?',
        ],
    },
    {
        'key': 'us-house', 'title': 'U.S. Representative', 'state': 'US',
        'offices': ['ca26-us-house-28', 'ca26-us-house-38', 'co26-us-house-2', 'wa26-us-house-7', 'wa26-us-house-9'],
        'plain': "Your member of the U.S. House of Representatives: one of up to 435 who write and pass federal laws, elected every two years to represent your congressional district.",
        'source': ('https://www.house.gov/the-house-explained', 'U.S. House of Representatives, The House Explained'),
        'quotes': ['House of Representatives makes and passes federal laws.', 'The number of voting representatives in the House is fixed by law at no more than 435, proportionally representing the population of the 50 states.', 'Also referred to as a congressman or congresswoman, each representative is elected to a two-year term serving the people of a specific congressional district.'],
        'ask': ['Which federal laws would they work to pass, or to block?', 'How would they serve people in this district?'],
    },
    {
        'key': 'ca-superior-court', 'title': 'Superior Court judge', 'state': 'CA',
        'offices': ['ca26-la-superior-64', 'ca26-la-superior-65', 'ca26-la-superior-87', 'ca26-la-superior-131'],
        'plain': "A trial judge on the county's Superior Court, where most California cases start: criminal and civil cases, plus family, probate, juvenile and traffic cases. The judge (sometimes with a jury) hears the evidence and decides by applying the law.",
        'source': ('https://www.courts.ca.gov/2113.htm', 'Judicial Branch of California, California Judicial System'),
        'quotes': ['Most cases in California start in one of the 58 superior courts, or trial courts, handling both civil and criminal cases, such as family, probate, mental health, juvenile, and traffic cases.'],
        'facts': [{'plain': 'In a trial, a judge (and sometimes a jury) hears testimony and evidence and decides the case by applying the law to the facts.', 'source': ('https://courts.ca.gov/courts/superior-courts', 'Judicial Branch of California, Superior Courts'), 'quotes': ["In trial (superior) courts, a judge and sometimes a jury hears witnesses' testimony and other evidence and decides cases by applying the relevant law to the relevant facts."]}],
        'ask': [],
    },
    {
        'key': 'ca-wrd', 'title': 'Water Replenishment District director', 'state': 'CA', 'offices': ['ca26-wrd-4'],
        'plain': "A director of the water district that manages the groundwater basins under southern Los Angeles County, which supply about four million people in 43 cities. Voters created it in 1959 to stop over-pumping. Its board sets the district's replenishment charge.",
        'source': ('https://wrdca.specialdistrict.org/files/76f533418/Annual+Comprehensive+Financial+Report+2022.pdf', 'Water Replenishment District of Southern California, Annual Comprehensive Financial Report 2022'),
        'quotes': ['The WRD is a special water District that was established in 1959 by popular vote to counteract the effects of over pumping of groundwater from two major groundwater basins in Los Angeles County.', 'WRD manages the Central and West Coast groundwater basin (collectively, the "Basins") which provide groundwater for approximately four million residents in 43 cities of southern Los Angeles County (County).', 'WRD Board of Directors voted to increase the Fiscal Year 2022 Replenishment Assessment to $394.00 per acre-foot.'],
        'ask': ['How would they keep groundwater clean and plentiful?', "How would they decide the district's charges?"],
    },
    {
        'key': 'ca-monterey-park-clerk', 'title': 'Monterey Park City Clerk', 'state': 'CA', 'offices': ['ca26-mp-clerk'],
        'plain': "A part-time elected official who runs the City Clerk's office. The office is where candidates file campaign finance statements and officials file conflict-of-interest statements.",
        'source': ('https://www.montereypark.ca.gov/131/City-Clerk', "City of Monterey Park, City Clerk's Office"),
        'quotes': ['As a part time elected official, the City Clerk is responsible for establishing policies, guidelines and procedures for the operation of the City Clerk\'s office.', 'The City Clerk serves as the filing officer for candidate campaign finance statements and conflict of interest statements by elected, appointed officials and key city employees.'],
        'ask': ['How would they make campaign and conflict-of-interest filings easy for the public to see?', 'What experience do they have running an office?'],
    },
    {
        'key': 'wa-king-council', 'title': 'King County Council', 'state': 'WA', 'offices': ['wa26-king-council-2', 'wa26-king-council-4', 'wa26-king-council-8'],
        'plain': "One of nine councilmembers who make King County's laws and policies and adopt its budget. Each represents a district of over 260,000 people, elected without party labels for four years.",
        'source': ('https://kingcounty.gov/en/dept/council', 'Metropolitan King County Council'),
        'quotes': ['As the legislative branch of county government, the Council sets policies, enacts laws, and adopts budgets that guide an array of services for county residents.', "The Council's nine councilmembers are elected on a non-partisan basis and serve four-year terms.", 'Each councilmember represents a geographical district of over 260,000 residents.'],
        'ask': ['What would they fund first, or cut, in the county budget?', 'Which county services would they change, and how?'],
    },
    {
        'key': 'wa-king-elections', 'title': 'King County Director of Elections', 'state': 'WA', 'offices': ['wa26-king-elections-director'],
        'plain': "Leads King County Elections, which serves a third of Washington's voters by mail: getting voters registered and their ballots cast and counted.",
        'source': ('https://kingcounty.gov/en/dept/elections/about-us', 'King County Elections, About us'),
        'quotes': ["Home to one-third of Washington State's voters, King County was the largest vote-by-mail jurisdiction in the world for many years prior to more widespread adoption in 2020.", 'the team at KCE is committed to ensuring all King County voters can get registered, cast their ballot, and make their voices heard.'],
        'ask': ['How would they keep elections accurate and secure?', 'How would they make voting easier for everyone?'],
    },
    {
        'key': 'wa-king-assessor', 'title': 'King County Assessor', 'state': 'WA', 'offices': ['wa26-king-assessor'],
        'plain': "Runs the office that values property in King County for property taxes, hears appeals of those values, and runs the property tax relief programs.",
        'source': ('https://kingcounty.gov/en/dept/assessor', 'King County Assessor'),
        'quotes': ['we hope this site will help you with issues regarding property values, and the tax relief programs we administer.', "You can also find information on your property's value, details and data on our property tax system, how to appeal your property value, and information on our office."],
        'ask': ['How would they keep property values accurate and fair?', 'How would they make appeals and tax relief easier to use?'],
    },
    {
        'key': 'wa-seattle-municipal-court', 'title': 'Seattle Municipal Court judge', 'state': 'WA',
        'offices': ['wa26-seattle-muni-1', 'wa26-seattle-muni-2', 'wa26-seattle-muni-3', 'wa26-seattle-muni-4', 'wa26-seattle-muni-5', 'wa26-seattle-muni-6', 'wa26-seattle-muni-7'],
        'plain': "One of seven elected judges on Seattle's city court, the busiest of its kind in the state. It hears misdemeanor crimes (such as DUI, domestic violence, theft and trespass) and civil infractions.",
        'source': ('https://www.seattle.gov/courts/about', 'Seattle Municipal Court, About us'),
        'quotes': ['Seattle Municipal Court is the largest limited jurisdiction court by case volume in Washington State with seven elected judges and five appointed magistrates .', 'Seattle Municipal Court handles all misdemeanor and gross misdemeanor crimes, civil infractions, and other offenses authorized under the Seattle Municipal Code and certain Revised Code of Washington Statutes.', 'Gross Misdemeanors: Crimes that carry a maximum sentence of 364 days in jail and a $5,000 fine, including offenses such as driving under the influence (DUI), domestic violence, theft, and trespass.'],
        'ask': [],
    },
    {
        'key': 'wa-king-district-court', 'title': 'King County District Court judge', 'state': 'WA',
        'offices': ['wa26-kc-district-west-1', 'wa26-kc-district-west-2', 'wa26-kc-district-west-3', 'wa26-kc-district-west-4', 'wa26-kc-district-west-5'],
        'plain': "A judge on the county's District Court, which hears misdemeanor crimes (such as DUI, reckless driving and fourth-degree assault) and smaller civil cases.",
        'source': WA_COURTS,
        'quotes': ['District courts are county courts and serve defined territories, both incorporated and unincorporated, within the counties.', 'District courts have jurisdiction over both criminal and civil cases. Criminal jurisdiction includes misdemeanors and gross misdemeanors cases that involve traffic or non-traffic offenses.', "Examples include: Driving while under the influence of intoxicating liquor or drugs (DUI), reckless driving, driving with a suspended driver's license and assault in the fourth degree."],
        'ask': [],
    },
    {
        'key': 'wa-supreme-court', 'title': 'Washington Supreme Court justice', 'state': 'WA',
        'offices': ['wa26-supreme-1', 'wa26-supreme-3', 'wa26-supreme-4', 'wa26-supreme-5', 'wa26-supreme-7'],
        'plain': "One of nine justices on Washington's highest court. Its decisions become state law that every other court follows, and it sets the rules for all of the state's courts.",
        'source': WA_COURTS,
        'quotes': ["The Supreme Court is the state's highest court. Its opinions are published, become the law of the state, and set precedent for subsequent cases decided in Washington.", 'All nine justices hear and dispose of cases argued on the appeal calendar.', "The Supreme Court is the final rule-making authority for all of the state's courts."],
        'ask': [],
    },
    {
        'key': 'wa-court-of-appeals', 'title': 'Washington Court of Appeals judge', 'state': 'WA', 'offices': ['wa26-appeals-1-1-5', 'wa26-appeals-1-1-6'],
        'plain': "A judge on the court that hears most appeals from the county superior courts. It must take every appeal filed, and can uphold, overturn, change or send back a lower court's decision.",
        'source': WA_COURTS,
        'quotes': ['Most cases appealed from superior courts go directly to the Court of Appeals. It is a non-discretionary appellate court--it must accept all appeals filed with it. The Court of Appeals has authority to reverse (overrule), remand (send back to the lower court), modify, or affirm the decision of the lower court.'],
        'ask': [],
    },
    {
        'key': 'wa-legislator', 'title': 'Washington State Senator or Representative', 'state': 'WA',
        'offices': ['wa26-ld32-sen', 'wa26-ld34-sen', 'wa26-ld36-sen', 'wa26-ld37-sen', 'wa26-ld43-sen', 'wa26-ld46-sen', 'wa26-ld11-rep1', 'wa26-ld11-rep2', 'wa26-ld32-rep1', 'wa26-ld32-rep2', 'wa26-ld34-rep1', 'wa26-ld34-rep2', 'wa26-ld36-rep1', 'wa26-ld36-rep2', 'wa26-ld37-rep1', 'wa26-ld37-rep2', 'wa26-ld43-rep1', 'wa26-ld43-rep2', 'wa26-ld46-rep1', 'wa26-ld46-rep2'],
        'plain': "Each legislative district elects one state senator (four-year term) and two state representatives (two-year terms). They vote on the bills that become state law, and on the state budget.",
        'source': WA_LEG,
        'quotes': ['Each district is served by one Senator and two House members.', 'Members of the Senate are elected to four-year terms, and House members are elected to two-year terms.', 'If a bill passes all of these steps, it then moves to the opposite chamber .', 'In odd-numbered years-the budget year-the Legislature meets for 105 days.'],
        'ask': ['Which state laws would they work to pass or change?', 'What would they put first in the state budget?'],
    },
    {
        'key': 'co-attorney-general', 'title': 'Attorney General', 'state': 'CO', 'offices': ['co26-attorney-general'],
        'plain': "Colorado's top lawyer, elected statewide. Runs the Department of Law, which upholds the U.S. and Colorado constitutions, defends state laws and officials when they're challenged in court, and works with law enforcement.",
        'source': ('https://coag.gov/about-us/', 'Colorado Attorney General, About us'),
        'quotes': ['The Colorado Attorney General is one of four independently elected statewide offices in Colorado and was established by the State Constitution upon statehood in 1876.', 'Upholding the United States and Colorado Constitutions.', 'Defending the laws and officers of the State of Colorado from legal challenge.', 'Advocating for policies that help law enforcement improve community safety.'],
        'ask': ['Which kinds of cases would they make a priority?', "When would they take someone to court on the state's behalf?"],
    },
    {
        'key': 'co-secretary-of-state', 'title': 'Secretary of State', 'state': 'CO', 'offices': ['co26-secretary-of-state'],
        'plain': "Oversees Colorado's elections (the statewide voter list, checking petition signatures for ballot measures, campaign finance rules) and registers businesses and other public records.",
        'source': ('https://coloradosos.gov/pubs/info_center/about.html', 'Colorado Secretary of State, About the office'),
        'quotes': ['These varied duties are divided primarily between the Business & Licensing and Elections Divisions.', 'The basic mission of the Department of State is to collect, secure, and make accessible a wide variety of public records, ensure the integrity of elections, and enhance commerce.', 'Supervises elections, maintains statewide voter registration file, verifies initiative petition signatures, and administers the Campaign Finance Laws'],
        'ask': ['How would they run elections that are both secure and easy to vote in?', 'How would they make campaign money easier to follow?'],
    },
    {
        'key': 'co-larimer-commissioner', 'title': 'Larimer County Commissioner', 'state': 'CO', 'offices': ['co26-larimer-commissioner-1'],
        'plain': "One of three commissioners who make policy for Larimer County. Each is elected countywide, from one of three districts, for a four-year term.",
        'source': ('https://www.larimer.gov/bocc', 'Larimer County Board of County Commissioners'),
        'quotes': ["Larimer's three-member Board of County Commissioners is the main policy-making body in the County and works to represent the interest of the citizens of Larimer County at local, state and national levels.", 'Commissioners are elected at large from one of three geographic districts for four-year staggered terms.'],
        'ask': ['What would they change about county services or the county budget?', 'Which county issues would they put first?'],
    },
    {
        # Keyed to every CA retention question in the bundle (filled in by build()), not an office
        'key': 'ca-justice-retention', 'title': 'Keeping a justice (retention)', 'state': 'CA', 'offices': [],
        'measuresOfType': ('ca', 'retention'),
        'plain': "Supreme Court and Court of Appeal justices aren't picked in a race. The governor appoints them, a state commission confirms them, and then voters answer Yes or No on keeping each one: at the next governor's election, and again whenever they want another term.",
        'source': ('https://laist.com/news/politics/voter-guides/2026-election-california-general-courts-appeal-justice-la-orange-county', "LAist, 2026 voter guide to Court of Appeal justices"),
        'quotes': ['In California, appellate court justices are first appointed by the governor and then subject to approval by the Commission on Judicial Appointments. Newly confirmed justices have to face voters at the next gubernatorial election and when they want another term.'],
        'ask': [],
        'facts': [
            {
                'plain': 'Since retention votes began in 1934, justices have kept their seats in 794 of 797 votes. No Court of Appeal justice has ever lost one; the three who lost were all on the Supreme Court, in 1986.',
                'source': ASSEMBLY_ACA8,
                'quotes': ["Since the state's retention election process was created in 1934, no Court of Appeals justice has ever been defeated in a retention election, while three Supreme Court justices were defeated (all in 1986). In all, justices were retained in 794 of the 797 retention elections held in the state's history (99.6%)."],
            },
            {
                'plain': 'Many voters leave these blank: regularly more than 25% of ballots, and over 40% in some recent elections, compared with 2% to 6% for statewide offices.',
                'source': ASSEMBLY_ACA8,
                'quotes': ['The percentage of ballots that are left blank (commonly referred to as "drop-off") in retention elections regularly exceeds 25%, and has been more than 40% in some recent retention elections. By contrast, drop-off in elections for statewide office during the same time period typically has ranged from 2%-6%'],
            },
            {
                'plain': "LAist: \u201cyour vote here is largely about sending a signal on whether you support what they've done.\u201d",
                'source': ('https://laist.com/news/politics/voter-guides/2026-election-california-general-courts-appeal-justice-la-orange-county', "LAist, 2026 voter guide to Court of Appeal justices"),
                'quotes': ["It's rare for a justice to lose a seat, so your vote here is largely about sending a signal on whether you support what they've done."],
            },
            {
                'plain': 'Leaving a question blank doesn\u2019t affect the rest of your ballot: everything you do vote on still counts.',
                'source': ('https://laist.com/news/politics/california-general-election-2024-undervoting-los-angeles-orange-county-propositions-senate', 'LAist, on undervoting'),
                'quotes': ["even if you've undervoted, the things you do vote on still count."],
            },
        ],
        'links': [
            {'label': 'Read their recent opinions (the courts\u2019 own lists)', 'url': 'https://courts.ca.gov/opinions'},
        ],
    },
]


def bundle_offices():
    ids = set()
    for f in (ROOT / 'data' / 'elections').glob('*.json'):
        ids |= {o['id'] for o in json.loads(f.read_text())['offices']}
    return ids


def bundle_measures(state, kind):
    """Ids of a state's measures of one type (e.g. every CA retention question)."""
    out = []
    for f in sorted((ROOT / 'data' / 'elections').glob(f'{state}-*.json')):
        out += [m['id'] for m in json.loads(f.read_text()).get('measures', []) if m.get('type') == kind]
    return out


def sourced(url, name, quotes, key):
    raw, fetched = cb.fetch(url)
    page = cb.norm(cb.page_text(raw))
    for q in quotes:
        assert cb.norm(q) in page, f"{key}: quote not on {url}: {q[:80]}"
    return {'url': url, 'name': name, 'retrieved': fetched}


def build():
    known = bundle_offices()
    out = []
    for e in ENTRIES:
        e = dict(e)
        e['source'] = sourced(*e['source'], e['quotes'], e['key'])
        for office in e['offices']:
            assert office in known, f"{e['key']}: no office {office} in data/elections"
        if 'measuresOfType' in e:
            e['measures'] = bundle_measures(*e.pop('measuresOfType'))
            assert e['measures'], f"{e['key']}: no matching measures"
        e['facts'] = [{**f, 'source': sourced(*f['source'], f['quotes'], e['key'])} for f in e.get('facts', [])]
        out.append(e)
    path = ROOT / 'data' / 'glossary' / 'offices.json'
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps({'entries': out}, indent=1, ensure_ascii=False) + '\n')
    print(f'wrote {path.relative_to(ROOT)}: {len(out)} entries')


if __name__ == '__main__':
    build()
