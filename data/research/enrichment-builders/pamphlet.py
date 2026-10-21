# Candidate statements from official voters' pamphlets (PDF), per candidate, verbatim.
#
#   entries = parse_wa(state_pdf, local_pdf, candidates)  ->  {candidate_id: entry}
#
# The Washington state pamphlet prints each statement as labelled blocks on their own line
# ("Elected Experience", "Other Professional Experience", "Education", "Statement",
# "Contact"); King County's local pamphlet uses inline labels ("Occupation: ...") with the
# phone/email/website lines under the name. Pages are two columns, read one column at a
# time. Needs pymupdf (pip install pymupdf).
import re
import unicodedata

import pymupdf


def norm(s):
    s = re.sub(r'([ﬀ-ﬄ])\s+', r'\1', s)  # "ﬁ rst" -> "first"
    s = unicodedata.normalize('NFKC', s).replace('­', '').replace('’', "'").replace('‘', "'")
    s = re.sub(r'(ffi|ffl|fi|fl|ff) {2,}(?=[a-z])', r'\1', s)  # "offi  ce" -> "office"
    return re.sub(r'\s+', ' ', s).strip()


NOISE = re.compile(r'^(\d{1,3}|continue|end|Use a drop box.*|.*King County Elections does not correct.*|grammar, or fact check.*)$')


def lines_with_pages(pdf_path, ncol=2):
    """[(page_number, line)] reading each page column by column."""
    out = []
    for i, page in enumerate(pymupdf.open(pdf_path)):
        w = page.rect.width
        blocks = [b for b in page.get_text('blocks') if b[6] == 0]
        for c in range(ncol):
            col = sorted((b for b in blocks if c * w / ncol <= b[0] < (c + 1) * w / ncol), key=lambda b: (b[1], b[0]))
            for b in col:
                for raw in b[4].split('\n'):
                    line = norm(raw)
                    if line and not NOISE.match(line):
                        out.append((i + 1, line))
    return out


def name_key(name):
    parts = re.sub(r"['\".,]", '', norm(name)).lower().replace('star ', '').split()
    return parts[0], parts[-1]


def head_start(lines, i, skip_contact):
    # Walk back from the first field label over the entry heading: name lines,
    # "(Prefers ...)", and (local pamphlet) phone/email/website lines
    j = i
    while j > 0 and i - j < 7:
        line = lines[j - 1][1]
        contact = re.search(r'@|\(\d{3}\)|^\S+\.(com|org|net|us|vote|law)(/\S*)?$', line)
        name_like = re.match(r"^[A-Z][\w'.-]*( [A-Z(\"'][\w'.)\"-]*){0,3}$", line)
        if (contact and skip_contact) or line.startswith(('(Prefers', '(States No', '(Nonpartisan')) or (name_like and not contact):
            j -= 1
        else:
            break
    return j


def find_entries(lines, start_re, candidates, skip_contact=False):
    starts = [i for i, (_, line) in enumerate(lines) if start_re.match(line)]
    starts = [i for n, i in enumerate(starts) if n == 0 or i - starts[n - 1] > 2]
    heads = [head_start(lines, i, skip_contact) for i in starts]
    found = []
    for n, (i, h) in enumerate(zip(starts, heads)):
        window = re.sub(r"['\".,]", '', ' '.join(line for _, line in lines[h:i]).lower())
        hits = [c for c in candidates if all(re.search(r'\b' + re.escape(p) + r'\b', window) for p in name_key(c['name']))]
        end = heads[n + 1] if n + 1 < len(heads) else len(lines)
        if len(hits) == 1:
            found.append((hits[0], h, i, end))
    return found


def website(text):
    sites = re.findall(r'((?:https?://)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|us|vote|law|info|co)(?:/[\w/-]*)?)\b', text, re.I)
    sites = [s for s in sites if re.search(r'(?<![@\w.])' + re.escape(s), text) and 'facebook.com' not in s.lower()]
    if not sites:
        return None
    s = sites[-1]
    return s if s.lower().startswith('http') else 'https://' + s.lower()


def endorsement_text(fields):
    """What the candidate wrote about endorsements: an endorsements field, else sentences
    of the statement that mention being endorsed."""
    for label in ('Endorsements', 'Endorsed by', 'Endorsed', 'Supported by'):
        if fields.get(label):
            return f'{label}: {fields[label]}'
    sentences = re.split(r'(?<=[.!?])\s+', fields.get('Statement', ''))
    hits = [s for s in sentences if re.search(r'\bendors', s, re.I)]
    return ' '.join(hits) or None


STATE_LABELS = ['Elected Experience', 'Other Professional Experience', 'Legal/Judicial Experience', 'Education', 'Community Service', 'Statement', 'Contact']
LOCAL_LABEL = re.compile(r'^(Education|Occupation|Statement|Endorsements|Endorsed by|Endorsed|Supported by):\s*(.*)')


def parse_wa(state_pdf, local_pdf, candidates):
    result = {}
    lines = lines_with_pages(state_pdf)
    for c, h, i, end in find_entries(lines, re.compile(r'^(Elected Experience|Legal/Judicial Experience)$'), candidates):
        fields, cur = {}, None
        for _, line in lines[i:end]:
            if line in STATE_LABELS:
                cur = line
                fields[cur] = []
            elif cur:
                fields[cur].append(line)
        f = {k: norm(' '.join(v)) for k, v in fields.items()}
        result[c['id']] = {'pamphlet': 'state', 'page': lines[i][0], 'fields': f, 'website': website(f.get('Contact', ''))}

    lines = lines_with_pages(local_pdf)
    for c, h, i, end in find_entries(lines, re.compile(r'^(Education|Occupation):|^No statement submitted'), candidates, skip_contact=True):
        if c['id'] in result:
            continue
        fields, cur = {}, None
        for _, line in lines[i:end]:
            m = LOCAL_LABEL.match(line)
            if m:
                cur = m.group(1)
                fields[cur] = [m.group(2)]
            elif cur:
                fields[cur].append(line)
            elif line.startswith('No statement submitted'):
                fields['Statement'] = [line]
        f = {k: norm(' '.join(v)) for k, v in fields.items()}
        contact = ' '.join(line for _, line in lines[h:i])
        result[c['id']] = {'pamphlet': 'local', 'page': lines[i][0], 'fields': f, 'website': website(contact)}
    return result


# California Secretary of State voter guide candidate statements: one office per page,
# each candidate as a "Name | PARTY" line, then the statement (or "No candidate
# statement."), then an optional contact block (address, Tel, E-mail, website).
CA_PAGES = {
    'GOVERNOR': 'governor', 'LIEUTENANT GOVERNOR': 'lt-governor', 'SECRETARY OF STATE': 'secretary-of-state',
    'CONTROLLER': 'controller', 'TREASURER': 'treasurer', 'ATTORNEY GENERAL': 'attorney-general',
    'INSURANCE COMMISSIONER': 'insurance-commissioner', 'SUPERINTENDENT OF PUBLIC INSTRUCTION': 'superintendent',
}


SOCIAL = re.compile(r'twitter|x\.com|facebook|instagram|tiktok|linkedin|youtube|threads', re.I)
CONTACT = re.compile(r'\bTel:|E-mail:|\bWebsite:|P\.O\. Box|\b\d{3,5} [A-Z][a-z]+ (?:Ave|Avenue|Blvd|St|Street|Road|Rd|Dr|Way)\b')


def ca_website(contact, last_name):
    m = re.search(r'(?:Website|Web):\s*(\S+)', contact)
    if m:
        return website(m.group(1))
    sites = [s for s in re.findall(r'(?<![@\w.])((?:https?://)?(?:www\.)?[A-Za-z0-9-]+\.(?:com|org|net|us|vote))\b', contact) if not SOCIAL.search(s)]
    sites.sort(key=lambda s: last_name not in s.lower())
    return website(sites[0]) if sites else None


def parse_ca(pdf_path, candidates):
    by_key = {name_key(c['name']): c for c in candidates}
    result = {}
    for i, page in enumerate(pymupdf.open(pdf_path)):
        blocks = [(b[0], b[1], norm(b[4])) for b in page.get_text('blocks') if b[6] == 0 and b[4].strip()]
        heads = [t for _, _, t in blocks if t.isupper() and t != 'CANDIDATE STATEMENTS']
        if not heads:
            continue

        def who(t):
            m = re.match(r'^(.+?)(?: \| ([A-Z][A-Z ]+))?$', t)
            c = by_key.get(name_key(m.group(1))) if m and len(t) < 70 and not t.endswith('.') else None
            return c if c and (m.group(2) or t == norm(c['name'])) else None

        # Name lines first when a statement block starts a few points above them
        blocks.sort(key=lambda b: (round(b[1] / 8), 0 if who(b[2]) else 1, b[0]))
        current = None
        for _, _, t in blocks:
            c = who(t)
            if c:
                current = c['id']
                result[current] = {'pamphlet': 'state', 'page': i + 1, 'office': ' '.join(heads), 'fields': {}, 'website': None}
                continue
            if t.startswith('The views and opinions expressed'):
                current = None
                continue
            contact = CONTACT.search(t)
            # A contact block belongs to the candidate it names (layout order isn't reliable)
            owner = next((cid for cid in result if result[cid]['page'] == i + 1 and
                          name_key(next(x['name'] for x in candidates if x['id'] == cid))[1] in t.lower()), None) if contact else None
            target = owner or current
            if not target:
                continue
            entry = result[target]
            if contact:
                statement, info = t[:contact.start()].strip(), t[contact.start():]
                if statement and 'Statement' not in entry['fields'] and target == current:
                    entry['fields']['Statement'] = statement
                entry['website'] = entry['website'] or ca_website(info, name_key(next(x['name'] for x in candidates if x['id'] == target))[1])
            elif 'Statement' not in entry['fields'] and target == current:
                entry['fields']['Statement'] = t
    # Most statements end with the campaign site ("Join me: GloriajRomero.com")
    for cid, entry in result.items():
        if not entry['website'] and entry['fields'].get('Statement'):
            last = name_key(next(x['name'] for x in candidates if x['id'] == cid))[1]
            entry['website'] = ca_website(entry['fields']['Statement'], last)
    return result
