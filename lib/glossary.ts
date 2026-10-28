import data from '../data/glossary/offices.json'

// What an office on the ballot does, for voters with no idea (data/glossary/offices.json, built and
// quote-checked by data/research/glossary-builders/build.py). `plain` is our summary of the
// official `quotes`; `ask` are questions to put to every candidate alike.
export interface GlossarySource {
  url: string
  name: string
  retrieved: string
}

// More context (e.g. retention history), each point with its own source
export interface GlossaryFact {
  plain: string
  quotes: string[]
  source: GlossarySource
}

export interface OfficeGlossary {
  key: string
  title: string
  state: string
  offices: string[]
  // Ballot questions it applies to instead of an office (every CA retention question)
  measures?: string[]
  plain: string
  quotes: string[]
  source: GlossarySource
  ask: string[]
  facts?: GlossaryFact[]
  links?: { label: string; url: string }[]
}

export const OFFICE_GLOSSARY: OfficeGlossary[] = data.entries

const byId = new Map(OFFICE_GLOSSARY.flatMap((e) => [...e.offices, ...(e.measures ?? [])].map((id) => [id, e] as const)))

// The entry for a bundle office or measure id, or nothing (no entry means no explainer, never a
// placeholder)
export function glossaryFor(id: string | null | undefined): OfficeGlossary | undefined {
  return id ? byId.get(id) : undefined
}

// For a ballot item: its office's entry, else the question's own (retention)
export function glossaryForItem(item: { id: string; office?: { id: string } | null }): OfficeGlossary | undefined {
  return glossaryFor(item.office?.id) ?? glossaryFor(item.id)
}

export const STATE_NAMES: Record<string, string> = { CA: 'California', CO: 'Colorado', WA: 'Washington' }
