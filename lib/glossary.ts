import data from '../data/glossary/offices.json'

// What an office on the ballot does, for voters with no idea (data/glossary/offices.json, built and
// quote-checked by data/research/glossary-builders/build.py). `plain` is our summary of the
// official `quotes`; `ask` are questions to put to every candidate alike.
export interface OfficeGlossary {
  key: string
  title: string
  state: string
  offices: string[]
  plain: string
  quotes: string[]
  source: { url: string; name: string; retrieved: string }
  ask: string[]
}

export const OFFICE_GLOSSARY: OfficeGlossary[] = data.entries

const byOffice = new Map(OFFICE_GLOSSARY.flatMap((e) => e.offices.map((id) => [id, e] as const)))

// The entry for a bundle office id, or nothing (no entry means no explainer, never a placeholder)
export function glossaryFor(officeId: string | null | undefined): OfficeGlossary | undefined {
  return officeId ? byOffice.get(officeId) : undefined
}

export const STATE_NAMES: Record<string, string> = { CA: 'California', CO: 'Colorado', WA: 'Washington' }
