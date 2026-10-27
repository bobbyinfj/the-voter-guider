# Colorado (Fort Collins ballot). Exec'd by build.py.
SLUG = 'co-general-2026-11-03'
P = 'co26'

# ── Tom Cronin and Bob Loevy (Colorado Politics columnists) ─────────────────
# One column gives each writer's For / Against / Neutral on every statewide measure, plus the
# Front Range Passenger Rail District tax. Many verdicts are a bare "CRONIN: Against.", so
# cl_sections() splits the page by measure heading and checks each pick is in its own section.
# Neutral gets no pick. They are columnists, not an editorial board.
CL = 'https://www.coloradopolitics.com/2026/10/04/our-take-on-colorados-2026-ballot-measures-cronin-loevy-2/'
HEADS = {
    'Amendment 81': 'amendment-81', 'Amendment 82': 'amendment-82', 'Amendment 83': 'amendment-83',
    'Amendment 84': 'amendment-84', 'Amendment 85': 'amendment-85', 'Amendment 86': 'amendment-86',
    'Amendment 87': 'amendment-87', 'Proposition NN': 'proposition-nn', 'Proposition 132': 'proposition-132',
    'Proposition 133': 'proposition-133', 'Proposition 134': 'proposition-134', 'Proposition 135': 'proposition-135',
    'Proposition 136': 'proposition-136', 'Proposition 137': 'proposition-137',
    # The column's heading for the CoCo rail tax, the district measure on the Larimer ballot as 7A
    'Front Range Passenger Rail District': 'frprd-7a',
}
VERDICT = {'For': 'YES', 'Against': 'NO'}

cronin_said = {
    'amendment-81': 'CRONIN: Against: This should and probably will be defeated.',
    'amendment-82': 'CRONIN: Against. Not necessary.',
    'amendment-83': 'CRONIN: Against. Colorado is a hunting and fishing paradise',
    'amendment-84': 'CRONIN: Against. Not needed and would wrongly disenfranchise some legitimate voters.',
    'amendment-85': 'CRONIN: For. This will easily pass and should pass.',
    'amendment-86': 'CRONIN: Against.',
    'proposition-nn': 'CRONIN: For.',
    'proposition-132': 'CRONIN: For. Sadly, this is needed.',
    'proposition-133': 'CRONIN: Against. Right direction, but the penalty is too severe.',
    'proposition-134': 'CRONIN: For. This will and should pass.',
    'proposition-135': 'CRONIN: For. This will and should pass',
    'proposition-136': 'CRONIN: Against.',
    'proposition-137': 'CRONIN: Against.',
    'frprd-7a': 'CRONIN: Against. Too expensive for the return on investment.',
}  # Amendment 87: "CRONIN: Neutral", so no pick
loevy_said = {
    'amendment-81': 'LOEVY: Against. This issue should not be elevated into the Colorado state constitution.',
    'amendment-82': 'LOEVY: Against. Does not belong in state constitution.',
    'amendment-83': 'LOEVY: Against. Hunting and fishing in Colorado should be regulated by the state legislature and governor',
    'amendment-84': 'LOEVY: Against. Voting by mail is working well in Colorado as is and does not need to be changed.',
    'amendment-85': 'LOEVY: For. Keeping future ballot measures simple and readable is a good idea',
    'amendment-86': 'LOEVY: For. Colorado currently has excellent procedures for redistricting',
    'amendment-87': 'LOEVY: Against. The large tax increase is unfairly concentrated on too small a group of taxpayers',
    'proposition-nn': 'LOEVY: For. The need for money for public schools in Colorado is well known',
    'proposition-132': 'LOEVY: For. Fentanyl overdoses are killing too many Coloradans.',
    'proposition-133': 'LOEVY: Against. The new penalty of life in prison is too severe.',
    'proposition-134': 'LOEVY: For. People born as males should not participate in female sports.',
    'proposition-135': 'LOEVY: For. Minors are too young to decide on sex change operations.',
    'proposition-136': 'LOEVY: Against. The state legislature and governor should set taxes at rates',
    'proposition-137': 'LOEVY: Against. These are all worthwhile activities',
    'frprd-7a': 'LOEVY: For. The CoCo (Colorado Connector) rail passenger train will provide comfortable and frequent service',
}


def said(quotes):
    return [pick(f'{P}-m-{m}', VERDICT[re.match(r'[A-Z]+: (\w+)', q).group(1)], CL, q) for m, q in quotes.items()]


cronin, loevy = said(cronin_said), said(loevy_said)


def cl_sections(texts):
    lines = [norm(l) for l in page_text(texts[CL][0]).split('\n')]
    sections, current = {}, None
    for line in lines:
        head = re.match(r'(?:Constitutional )?(Amendment \d+|Proposition \w+):', line)
        if head or line == 'Front Range Passenger Rail District':
            current = HEADS[head.group(1) if head else line]
            assert current not in sections, f'two headings for {current}'
            sections[current] = ''
        elif current:
            sections[current] += ' ' + line
    assert set(sections) == set(HEADS.values()), f'column headings changed: {sorted(sections)}'
    for who, picks in (('CRONIN', cronin), ('LOEVY', loevy)):
        for m in HEADS.values():
            found = re.search(rf'{who}: (For|Against|Neutral)\b', sections[m])
            mine = [p for p in picks if p['ballot'] == f'{P}-m-{m}']
            assert found, f'{who} has no verdict on {m}'
            if found.group(1) == 'Neutral':
                assert not mine, f'{who} is neutral on {m}'
            else:
                assert mine and mine[0]['pick'] == VERDICT[found.group(1)], f'{who} on {m}: page says {found.group(1)}'
                assert norm(mine[0]['quote']) in sections[m], f'{who} quote for {m} is not in its section'


ABOUT = 'Colorado Politics columnist; one of two writers giving their own verdicts on each measure in a shared column ("news commentators who write about Colorado and national politics").'
GUIDES = [
    dict(id='co-cronin', name='Tom Cronin (Colorado Politics)', kind='columnist', url=CL, about=ABOUT,
         picks=cronin, checks=[cl_sections]),
    dict(id='co-loevy', name='Bob Loevy (Colorado Politics)', kind='columnist', url=CL, about=ABOUT,
         picks=loevy, checks=[cl_sections]),
]
