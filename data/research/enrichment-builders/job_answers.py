# The "What's this job?" questions, answered per candidate in their own words (PRD S-2).
#
# Source (the same for every candidate): their statement in the Secretary of State's Official
# Voter Information Guide for November 3, 2026 (cache/ca/candidate-statements.pdf, downloaded
# 2026-10-20 and not re-fetched; the user decided on 2026-11-02 to keep using that copy, see
# sources.json ca-sos-vig-cdn). For each office's `ask` questions (data/glossary/offices.json),
# a person picked at most one sentence from each candidate's statement that speaks to it, or
# none. Rules:
#   - The sentence is copied verbatim; the build fails if it isn't in that candidate's statement.
#   - No sentence means "Not addressed in their statement", never a guess from elsewhere.
#   - A candidate with no statement in the guide gets that said, for every question.
#   - Same questions and same source for everyone in the race; a sentence answers one question.
# Writes data/answers/ca-general-2026-11-03.json (read by lib/jobAnswers.ts).
# Usage (needs pymupdf): python3 job_answers.py
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
from pamphlet import parse_ca  # noqa: E402

SLUG = 'ca-general-2026-11-03'
SOURCE = {
    'name': "California Secretary of State, Official Voter Information Guide, November 3, 2026: candidate statements",
    'url': 'https://vig.cdn.sos.ca.gov/2026/general/pdf/candidate-statements.pdf',
    'retrieved': '2026-10-20',
}

# office id → candidate id → one sentence per question, in the order of the office's `ask` (None: not addressed)
PICKS = {
    'ca26-boe-3': {
        'ca26-mike-gipson': [
            None,
            'Previously serving as Chief of Staff to the former Board of Equalization Chairman, Mike currently serves as Chair of the Assembly Revenue and Taxation Committee, which oversees the Board of Equalization.',
        ],
        'ca26-samuel-p-sukaton': 'no statement',
    },
    'ca26-insurance-commissioner': {
        'ca26-ben-allen': [
            "As Insurance Commissioner, I'll increase competition to bring down costs, protect consumers who are unfairly dropped, make insurers accountable and the process transparent, and expedite rebuilding.",
            'When fires ravaged my district, I helped hundreds of constituents who lost everything rebuild their homes and lives, holding insurance companies accountable to pay what they owed.',
            "That's why I authored laws requiring insurers to increase upfront payments for claims, creating low-interest loans for home improvements that reduce fire risk, and helping homeowners keep their coverage when they fix hazards on their property.",
        ],
        'ca26-jane-kim': [
            "I'll hold them accountable to make insurance more affordable and available and make sure our money works for us.",
            "I'll make claims fast and fair, cap excessive profits, and crack down on illegal price-fixing.",
            "I'm a civil rights attorney and consumer advocate, and I know how to take on big challenges and win.",
        ],
    },
    'ca26-treasurer': {
        'ca26-eleni-kounalakis': [
            "I'm running for state Treasurer to responsibly manage California's finances, strengthen our economy, and make smart investments that create opportunity.",
            'I built housing communities and financed infrastructure projects in the private sector.',
        ],
        'ca26-jennifer-hawks': [
            "I will advocate for responsible investing, greater accountability, and honest stewardship of the public's money.",
            "I'm a business professional who has spent my career managing budgets, improving operations, and demanding accountability.",
        ],
    },
    'ca26-controller': {
        'ca26-herb-w-morgan': [None, None],
        'ca26-malia-m-cohen': [
            None,
            "As California State Controller, Malia Cohen serves as the state's chief fiscal officer, safeguarding the finances of the world's fourth-largest economy.",
        ],
    },
    'ca26-secretary-of-state': {
        'ca26-shirley-n-weber': [
            'I will continue to fight to make sure that nothing stands between you and the ballot box.',
            None,
        ],
        'ca26-donald-p-don-wagner': [
            'As Secretary of State, I pledge to speed up vote counting, secure our elections, and remove the chief elections officer from partisan politics.',
            None,
        ],
    },
    'ca26-lt-governor': {
        'ca26-fiona-ma': [
            'Voters elected me to four public offices where I focus on accountability, transparency, fixing broken systems, cutting waste, and delivering results.',
            None,
        ],
        'ca26-gloria-romero': [
            'I served as California Senate Majority Leader, fought for transparency in government, authored landmark school-choice reforms to give parents and students trapped in failing schools real opportunities, and stood up for survivors of violence and sexual harassment.',
            None,
        ],
    },
    'ca26-superintendent': {
        'ca26-richard-barrera': [
            'As State Superintendent, Barrera will roll up his sleeves and work with the same energy and zeal to bring those reforms to every school in California.',
            'An 18-year veteran of the San Diego Unified School Board (and current President), Barrera brought parents, educators and the community together to cut waste/bureaucracy and invest in students and the classroom.',
        ],
        'ca26-sonja-shaw': [
            'My plan is simple: restore high academic standards in reading, writing, and math; protect Title IX, ensuring fairness and safety for girls; cut wasteful bureaucracy; and demand fiscal transparency to ensure money reaches classrooms where it belongs, supporting our students and our great teachers.',
            'As a mother of two daughters, I was elected President of the Chino Valley Unified School Board because parents demanded change.',
        ],
    },
}


def norm(s):
    s = s.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    return re.sub(r'\s+', ' ', s).strip()


def main():
    bundle = json.loads((ROOT / 'data' / 'elections' / f'{SLUG}.json').read_text())
    glossary = json.loads((ROOT / 'data' / 'glossary' / 'offices.json').read_text())['entries']
    offices = {o['id']: o for o in bundle['offices']}
    candidates = [c for oid in PICKS for c in offices[oid]['candidates']]
    statements = parse_ca(HERE / 'cache' / 'ca' / 'candidate-statements.pdf', candidates)
    out = {}
    for oid, picks in PICKS.items():
        office = offices[oid]
        ask = next(e for e in glossary if oid in e['offices'])['ask']
        assert ask, f'{oid}: no questions in the glossary'
        assert set(picks) == {c['id'] for c in office['candidates']}, f'{oid}: picks must cover every candidate, no one else'
        rows = {}
        for cid, sentences in picks.items():
            text = norm(((statements.get(cid) or {}).get('fields') or {}).get('Statement') or '')
            if sentences == 'no statement':
                assert not text or text.lower().startswith('no candidate statement'), f'{cid}: has a statement after all'
                rows[cid] = {'noStatement': True, 'answers': [None] * len(ask)}
                continue
            assert text and not text.lower().startswith('no candidate statement'), f'{cid}: no statement found'
            assert len(sentences) == len(ask), f'{cid}: {len(sentences)} picks for {len(ask)} questions'
            used = [s for s in sentences if s]
            assert len(used) == len(set(used)), f'{cid}: a sentence answers more than one question'
            for s in used:
                assert norm(s) in text, f'{cid}: not in their statement: {s[:70]}'
            rows[cid] = {'answers': sentences}
        out[oid] = {'questions': ask, 'candidates': rows}
    path = ROOT / 'data' / 'answers' / f'{SLUG}.json'
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps({'source': SOURCE, 'offices': out}, indent=1, ensure_ascii=False) + '\n')
    answered = sum(1 for o in out.values() for c in o['candidates'].values() for a in c['answers'] if a)
    total = sum(len(o['questions']) * len(o['candidates']) for o in out.values())
    print(f'wrote {path.relative_to(ROOT)}: {answered} of {total} answers found in statements')


if __name__ == '__main__':
    main()
