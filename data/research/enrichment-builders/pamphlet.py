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
