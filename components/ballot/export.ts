import {
  ABSTAIN,
  NOTES_ONLY,
  UNSURE,
  choiceLabel,
  contestLabel,
  isMeasure,
  isPick,
  layoutOf,
  navLabel,
  optionList,
  type BallotSection,
  type ChoiceValue,
} from './ballot'

// Your ballot as plain text: the Text download, and "Copy for an AI", which puts the contests you
// have a ? on (or haven't got to) first, with a neutral request for help researching them.

type Choices = Record<string, ChoiceValue | undefined>

interface GuideInfo {
  guideTitle: string
  electionTitle: string
  date: string
  sections: BallotSection[]
  choices: Choices
}

function noteLines(choice?: ChoiceValue): string[] {
  return [
    ...(choice?.notes ? [`    Notes: ${choice.notes}`] : []),
    ...Object.entries(choice?.candidateNotes ?? {}).map(([name, note]) => `    On ${name}: ${note}`),
  ]
}

export function guideText({ guideTitle, electionTitle, date, sections, choices }: GuideInfo): string {
  const lines = [guideTitle, `${electionTitle} · ${date}`]
  lines.push('Practice copy from the Voter Guider (unofficial). Not a ballot.', '')
  for (const section of sections) {
    lines.push(section.label.toUpperCase())
    for (const ballot of section.items) {
      const choice = choices[ballot.id]
      const how = isPick(choice?.selection) && choice!.status !== 'decided' ? ` (${choice!.status === 'unsure' ? 'not sure' : 'leaning'})` : ''
      lines.push(`  ${contestLabel(ballot)}: ${choice ? choiceLabel(choice.selection, ballot) : '(no choice)'}${how}`)
      lines.push(...noteLines(choice))
    }
    lines.push('')
  }
  return lines.join('\n')
}

type Group = 'help' | 'unsure' | 'untouched' | 'leaning' | 'decided' | 'blank'

function groupOf(choice?: ChoiceValue): Group {
  if (!choice || choice.selection === NOTES_ONLY) return 'untouched'
  if (choice.selection === UNSURE) return 'help'
  if (choice.selection === ABSTAIN) return 'blank'
  if (choice.status === 'unsure') return 'unsure'
  return choice.status === 'tentative' ? 'leaning' : 'decided'
}

const HEADINGS: Record<Group, string> = {
  help: 'NO CLUE YET (I need the most help here)',
  unsure: "NOT SURE (I put a ? on a choice but haven't decided)",
  untouched: "HAVEN'T LOOKED AT YET",
  leaning: 'LEANING',
  decided: 'DECIDED',
  blank: 'LEAVING BLANK ON PURPOSE',
}

export function helpRequestText({ electionTitle, date, sections, choices, link }: GuideInfo & { link: string }): string {
  const groups = new Map<Group, string[]>((Object.keys(HEADINGS) as Group[]).map((g) => [g, []]))
  for (const section of sections)
    for (const item of section.items) {
      const choice = choices[item.id]
      const group = groupOf(choice)
      const lines = groups.get(group)!
      const pick = isPick(choice?.selection) ? `: ${choiceLabel(choice!.selection, item)}` : ''
      lines.push(`- ${navLabel(item)}${pick}`)
      // Where you're stuck, the choices on the ballot so the answer can cover each one
      if (group === 'help' || group === 'unsure') {
        const options = isMeasure(item)
          ? (layoutOf(item)?.responses ?? ['Yes', 'No'])
          : (item.office?.candidates.map((c) => c.name) ?? optionList(item.options))
        if (options.length) lines.push(`    Choices: ${options.join(' / ')}${!isMeasure(item) && options.length === 1 ? ' (only one candidate)' : ''}`)
      }
      lines.push(...noteLines(choice))
    }
  const out = [
    `I'm working through my ballot for the ${electionTitle} (${date}). Below is where I am, from the Voter Guider (${link}).`,
    'Please help me with the "no clue yet" and "not sure" contests first, then the ones I haven\'t looked at. For each one: what the office or measure does, who or what the choices are, and how they differ, with sources I can check.',
    "Don't tell me how to vote. Ask me a few questions that would help me decide, and say where the information is thin or disputed.",
    '',
  ]
  for (const [group, lines] of groups) if (lines.length) out.push(`${HEADINGS[group]} (${groupCount(lines)})`, ...lines, '')
  return out.join('\n').trimEnd()
}

const groupCount = (lines: string[]) => lines.filter((l) => l.startsWith('- ')).length
