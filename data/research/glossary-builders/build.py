# Builds data/glossary/offices.json: what each office on the ballot does, in plain English, for
# voters who have no idea (lib/glossary.ts describes the format; the ballot and /glossary show it).
#
# Rules (CLAUDE.md "Transparency is the product"):
#   - `plain` is our own wording (shown as a Voter Guider summary) and says nothing the quotes
#     don't. Every quote must appear on the saved copy of an official page (the office's own site,
#     or the state's voter guide), or the build fails.
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
]


def bundle_offices():
    ids = set()
    for f in (ROOT / 'data' / 'elections').glob('*.json'):
        ids |= {o['id'] for o in json.loads(f.read_text())['offices']}
    return ids


def build():
    known = bundle_offices()
    out = []
    for e in ENTRIES:
        url, name = e['source']
        raw, fetched = cb.fetch(url)
        page = cb.norm(cb.page_text(raw))
        for q in e['quotes']:
            assert cb.norm(q) in page, f"{e['key']}: quote not on {url}: {q[:80]}"
        for office in e['offices']:
            assert office in known, f"{e['key']}: no office {office} in data/elections"
        out.append({**e, 'source': {'url': url, 'name': name, 'retrieved': fetched}})
    path = ROOT / 'data' / 'glossary' / 'offices.json'
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps({'entries': out}, indent=1, ensure_ascii=False) + '\n')
    print(f'wrote {path.relative_to(ROOT)}: {len(out)} offices')


if __name__ == '__main__':
    build()
