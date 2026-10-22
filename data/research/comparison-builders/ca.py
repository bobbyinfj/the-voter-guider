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
]
