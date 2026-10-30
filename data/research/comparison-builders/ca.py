# California (Monterey Park ballot). Exec'd by build.py.
SLUG = 'ca-general-2026-11-03'
P = 'ca26'
prop = lambda n: f'{P}-m-prop-{n}'
race = lambda o: f'{P}-{o}-race'

# ── California Democratic Party ──────────────────────────────────────────────
# cadem.org's web pages refuse automated requests (403), so this uses the party's own
# proposition flyer (a PDF on cadem.org, allowed by its robots.txt) and the Riverside County
# Democratic Party's post relaying the CADEM slate.
CADEM_PDF = 'https://cadem.org/wp-content/uploads/2026/10/2026-Proposition-Endorsements-2.pdf'
RIVDEM = 'https://www.riversidecountydemocrats.org/cadem-announces-2026-general-election-endorsements/'
cadem_props = {
    '2': ('YES', "Strengthens California's rainy day fund to protect schools and healthcare 2 YES"),
    '3': ('YES', 'Protects schools and healthcare and stops a tax cut for the wealthiest top 2% 3 YES'),
    '4': ('YES', 'Empowers voters by allowing public campaign funding so elections are won, not bought 4 YES'),
    '5': ('YES', 'Protects the right to recall and ensures the majority picks the replacement 5 YES'),
    '37': ('YES', 'Lowers costs to make buying a home more affordable in CA - at zero cost to taxpayers 37 YES'),
    '38': ('YES', "Funds lifesaving immunology research threatened by Trump's medical research cuts 38 YES"),
    '39': ('NO', 'Rewrites voting rules to help Trump and makes it harder for you to vote 39 NO'),
    '40': ('YES', 'Makes billionaires pay their fair share to save healthcare 40 YES'),
    '41': ('NO', 'Creates red tape and seeks to prevent a tax on billionaires 41 NO'),
    '42': ('NO', 'Limits future revenue and seeks to prevent a tax on billionaires 42 NO'),
    '43': ('NO', "Limits voters' ability to fund essential local services like fire, roads and schools 43 NO"),
    '44': ('NO', 'Harms millions of patients by shutting down hundreds of community health clinics 44 NO'),
    '45': ('NO', 'Lets corporate polluters fast-track new data centers, gas pipelines & heavy industry 45 NO'),
}
cadem = [
    pick(race('governor'), 'Xavier Becerra', RIVDEM, 'Xavier Becerra for Governor'),
    pick(race('lt-governor'), 'Fiona Ma', RIVDEM, 'Fiona Ma for Lieutenant Governor'),
    pick(race('attorney-general'), 'Rob Bonta', RIVDEM, 'Rob Bonta for Attorney General'),
    # The flyer prints Prop 1's line apart from its "1 YES"; the relay states it plainly
    pick(prop(1), 'YES', RIVDEM, 'supporting Propositions 1, 2, 3, 4, 5, 37, 38, and 40, while opposing Propositions 39, 41, 42, 43, 44, and 45'),
] + [pick(prop(n), v, CADEM_PDF, q) for n, (v, q) in cadem_props.items()]

# ── California Republican Party ──────────────────────────────────────────────
CAGOP = 'https://cagop.org/endorsements'
cagop = [
    pick(race('governor'), 'Steve Hilton', CAGOP, 'Governor: Steve HIlton'),
    pick(race('lt-governor'), 'Gloria Romero', CAGOP, 'Lieutenant Governor: Gloria Romero'),
    pick(race('secretary-of-state'), 'Donald P. (Don) Wagner', CAGOP, 'Secretary of State: DOn Wagner', alias='ballot: DONALD P. (DON) WAGNER'),
    pick(race('controller'), 'Herb W Morgan', CAGOP, 'State Controller: Herb Morgan', alias='ballot: HERB W MORGAN'),
    pick(race('treasurer'), 'Jennifer Hawks', CAGOP, 'State Treasurer: Jennifer Hawks'),
    pick(race('attorney-general'), 'Michael E. Gates', CAGOP, 'Attorney General: MIchael Gates', alias='ballot: MICHAEL E. GATES'),
    pick(race('superintendent'), 'Sonja Shaw', CAGOP, 'State Superintendent for Public INstruction: Sonja Shaw'),
    pick(race('us-house-28'), 'April A. Verlato', CAGOP, 'CD 28: April Verlato', alias='ballot: APRIL A. VERLATO'),
    pick(race('assembly-49'), 'Long David Liu', CAGOP, 'AD 49: David Liu', alias='ballot: LONG DAVID LIU, the only Republican in AD 49'),
] + [
    pick(prop(n), v, CAGOP, q)
    for n, v, q in [
        ('2', 'NO', 'prop 2: oppose'), ('3', 'NO', 'Prop 3: oppose'), ('4', 'NO', 'Prop 4: oppose'),
        ('5', 'NO', 'Prop 5: Oppose'), ('38', 'YES', 'Prop 38: Support'), ('39', 'YES', 'Prop 39: support'),
        ('40', 'NO', 'Prop 40: oppose'), ('41', 'YES', 'Prop 41: Support'), ('42', 'YES', 'Prop 42: support'),
        ('43', 'YES', 'Prop 43: support'), ('44', 'NO', 'Prop 44: oppose'), ('45', 'YES', 'Prop 45: support'),
    ]
]  # Props 1 and 37: "Neutral", so no pick

# ── League of Women Voters of California ─────────────────────────────────────
# Each recommendation is a Support/Oppose/Neutral graphic; lwvc_icons() reads it from the page
# and checks it matches the pick. The quote is the League's own argument on that page.
LWVC = 'https://lwvc.org/ballot-recs'
lwvc = [
    pick(prop(n), v, LWVC, q)
    for n, v, q in [
        ('1', 'YES', 'The League of Women Voters of California has worked toward those goals for decades and supports Prop 1'),
        ('2', 'YES', 'Proposition 2 will allow California to save more money during strong economic years so it can protect schools and other essential services when revenues fall.'),
        ('3', 'YES', "The League strongly supports the measure because it protects vital services, helps California weather economic downturns, and keeps the state's tax system fair."),
        ('4', 'YES', 'Prop 4 gives every California community the freedom to build elections where voters have more power and wealthy donors and special interests have less.'),
        ('5', 'YES', 'Prop 5 restores the recall to its proper purpose: deciding whether an official should remain in office.'),
        ('37', 'NO', 'California needs homeownership programs that lower families\' total costs, confront racial barriers to building wealth, and support strong communities. Prop 37 does not meet that test.'),
        ('38', 'NO', 'Medical research can save lives, but Prop 38 is the wrong way to fund it.'),
        ('39', 'NO', "Prop 39 is a partisan power grab to further President Trump's voter suppression efforts."),
        ('41', 'NO', "Prop 41 would put revenue from new state taxes under the Gann Limit's rigid constitutional spending cap, making it harder to fund essential services and respond to changing needs."),
        ('42', 'NO', "Prop 42 would lock broad new restrictions on state taxing power into the California Constitution, limiting California's ability to respond to future needs."),
        ('43', 'NO', 'Prop 43 would make it harder for communities to raise revenue for public services by allowing a minority of voters to block local tax measures.'),
        ('44', 'NO', 'A rule intended to direct more money to patient care should not put the safety net itself at risk.'),
        ('45', 'NO', 'Statutory exemptions and expedited processes are in place, some of which the League supported, making Proposition 45 unnecessary'),
    ]
]  # Prop 40: "the League takes a neutral position", so no pick


# ── Los Angeles Times editorial board ────────────────────────────────────────
# The only 2026 ballot editorial linked from latimes.com/opinion or its editorials list
# (latimes.com/topic/editorials) as of 2026-10-27. Its other picks, if any, aren't linked there.
LAT_40 = 'https://www.latimes.com/opinion/story/2026-09-06/editorial-vote-no-on-proposition-40'
latimes = [pick(prop(40), 'NO', LAT_40, 'Vote no on Prop. 40. It ignores education, housing and safety')]

# ── Nikkei Progressives (left) ───────────────────────────────────────────────
# A handwritten, collaged guide (8 pages, scanned to PDF) shared on Google Drive. drive.google.com
# allows Claude-User on /file/ view pages but disallows the download endpoints, so the guide was
# read in the Drive viewer and each row transcribed from pages 4–6 by hand (build.py `transcribed`).
# The newsletter that links it (mailchi.mp) disallows all agents. Prop 37: "No recommendation".
NP = 'https://drive.google.com/file/d/1Gz61OLtvvaw3SieepOQPIPZf8pm18Gdj/view'
np_props = [
    ('1', 'YES', 4, '1 Affordable housing bond YES'),
    ('2', 'YES', 4, '2 Rainy day fund YES'),
    ('3', 'YES', 4, '3 Permanent high-earner income tax YES'),
    ('4', 'YES', 4, '4 Public campaign financing YES* … *For too long wealthy donors have been using their money and power to corrupt our democracy. Prop 4 will allow Californians to fight back by allowing for the creation of public financing systems to help qualified candidates compete against big money and special interests.'),
    ('5', 'YES', 4, '5 Recall election reform YES'),
    ('38', 'NO', 5, '38 Immunology research bond NO† … †Too shady, too much money!'),
    ('39', 'NO', 5, "39 Voter ID NO* … *Prop 39 aims to make it harder for Californians to vote. It uses language that is purposefully misleading in order to confuse the electorate - don't let this slippery slope get started!"),
    ('40', 'YES', 5, '40 Billionaire tax YES'),
    ('41', 'NO', 6, '41 Audit new tax spending NO'),
    ('42', 'NO', 6, '42 Prohibit new personal property tax & retroactive taxes NO'),
    ('43', 'NO', 6, '43 Higher threshold for local special taxes NO'),
    ('44', 'NO', 6, '44 Clinic funding NO* … *On the surface Prop 44 seems positive. It mandates that healthcare clinics serving low-income communities spend 90% of funding on patient care; yet, if passed, Prop 44 could force a number of clinics to scale back services or even close due to sizable penalties.'),
    ('45', 'NO', 6, '45 Expedited environmental review NO'),
]
nikkei = [pick(prop(n), v, NP, q, page=pg) for n, v, pg, q in np_props]

# ── Howard Jarvis Taxpayers Association (right) ──────────────────────────────
# Its 2026 voting guide page; candidate picks are HJTA-PAC's. It names two Court of Appeal
# justices (Tamzarian, Mori) it disagrees with but makes no retention recommendation, so no pick.
HJTA = 'https://www.hjta.org/2026votingguide/'
hjta = [
    pick(prop(n), v, HJTA, q)
    for n, v, q in [
        ('1', 'NO', 'NO on Prop. 1 Called the "Veterans and Affordable Housing Bond Act of 2026,"'),
        ('2', 'NO', 'NO on Prop. 2 This measure makes changes to the Gann Limit'),
        ('3', 'NO', 'NO on Prop. 3 Remember the "temporary" income tax rate hike'),
        ('4', 'NO', 'NO on Prop. 4 Existing law, the Political Reform Act of 1974'),
        ('5', 'NO', 'NO on Prop. 5 This measure alters the constitutional right to recall'),
        ('37', 'NO', 'NO on Prop. 37 This measure authorizes $25 billion in bonds'),
        ('38', 'NO', 'NO on Prop. 38 Another bond measure, Proposition 38 authorizes'),
        ('39', 'YES', 'YES on Prop. 39 Proposition 39 is the Voter ID initiative.'),
        ('40', 'NO', 'NO on Prop. 40 This is the "wealth tax,"'),
        ('41', 'YES', 'YES on Prop. 41 This measure requires pre-election audits'),
        ('42', 'YES', 'YES on Prop. 42 In direct opposition to the "wealth tax,"'),
        ('43', 'YES', 'YES on Prop. 43 Proposition 43 is the Local Taxpayer Protection Act to Save Proposition 13'),
        ('44', 'NO', 'NO on Prop. 44 This measure requires community clinics'),
        ('45', 'YES', 'YES on Prop. 45 Few things have impeded rational housing policy'),
    ]
] + [
    pick(race('governor'), 'Steve Hilton', HJTA, 'Governor Steve Hilton'),
    pick(race('controller'), 'Herb W Morgan', HJTA, 'State Controller Herb Morgan', alias='ballot: HERB W MORGAN'),
    pick(race('secretary-of-state'), 'Donald P. (Don) Wagner', HJTA, 'Secretary of State Don Wagner', alias='ballot: DONALD P. (DON) WAGNER'),
    pick(race('attorney-general'), 'Michael E. Gates', HJTA, 'Attorney General Michael Gates', alias='ballot: MICHAEL E. GATES'),
    pick(race('superintendent'), 'Sonja Shaw', HJTA, 'Superintendent Sonja Shaw'),
    pick(race('treasurer'), 'Jennifer Hawks', HJTA, 'Treasurer Jennifer Hawks'),
    pick(race('assembly-54'), 'ALEXANDRA BRISENO', HJTA, 'Alexandra Briseno Assembly District 54'),
    pick(race('laccd-2'), 'KRISTINA IRWIN', HJTA, 'Kristina Irwin Los Angeles Community College District, Board of Trustees - Seat 2'),
    pick(race('laccd-4'), 'ELAINE ALANIZ', HJTA, 'Elaine Alaniz Los Angeles Community College District, Board of Trustees - Seat 4'),
    pick(race('laccd-6'), 'TONIA AREY', HJTA, 'Tonia Arey Los Angeles Community College District, Board of Trustees - Seat 6'),
]


def lwvc_icons(texts):
    raw = texts[LWVC][0].decode('utf-8', 'replace')
    heads = [(m.start(), m.group(1)) for m in re.finditer(r'>\s*Proposition (\d+)\s*<', raw)]
    found = {}
    for i, (at, n) in enumerate(heads):
        end = heads[i + 1][0] if i + 1 < len(heads) else len(raw)
        icon = re.search(r'/(Support|OPPOSE|Neutral)\.svg', raw[at:end])
        found[n] = {'Support': 'YES', 'OPPOSE': 'NO', 'Neutral': None}[icon.group(1)] if icon else '?'
    for p in lwvc:
        n = p['ballot'].rsplit('-', 1)[1]
        assert found.get(n) == p['pick'], f'LWVC Prop {n}: page shows {found.get(n)}, spec says {p["pick"]}'
    assert found.get('40') is None, 'LWVC Prop 40 is no longer neutral'


GUIDES = [
    dict(id='ca-democratic-party', name='California Democratic Party', kind='party', lean='left', url=CADEM_PDF,
         about="The state party's official positions on the propositions and its statewide endorsements (as relayed by the Riverside County Democratic Party).",
         picks=cadem),
    dict(id='ca-republican-party', name='California Republican Party', kind='party', lean='right', url=CAGOP,
         about="The state party's 2026 endorsements and proposition positions.", picks=cagop),
    dict(id='lwv-california', name='League of Women Voters of California', kind='lwv', url=LWVC,
         about='Nonpartisan; recommends on statewide propositions only, never candidates.', picks=lwvc, checks=[lwvc_icons]),
    dict(id='la-times', name='Los Angeles Times editorial board', kind='editorial', url=LAT_40,
         about='The one 2026 ballot editorial we found linked from the paper\'s opinion pages: Prop 40.', picks=latimes),
    dict(id='nikkei-progressives', name='Nikkei Progressives', kind='advocacy', lean='left', url=NP,
         about='Little Tokyo grassroots community group; positions on statewide propositions only, voted by its members on Sept. 15, 2026. '
               'The guide is handwritten, so each quote is Voter Guider\'s transcription of its page.',
         picks=nikkei, transcribed={'title': '2026 NP Voter Guide Printable'}),
    dict(id='hjta', name='Howard Jarvis Taxpayers Association', kind='advocacy', lean='right', url=HJTA,
         about='Taxpayer group behind Prop 13; its 2026 voting guide on the propositions, with HJTA-PAC candidate endorsements.',
         picks=hjta),
]
