import data from '../data/judges/ca-cjp.json'

// Every California justice on a retention question, checked against the Commission on Judicial
// Performance's index of public decisions by judge's name (built by
// data/research/enrichment-builders/cjp.py). A check that ran, not a clean bill of health.
export interface CjpCheck {
  measure: string
  name: string
  // Index rows under this justice's name (surname and first name)
  found: string[]
}

export const CJP_SOURCE: { url: string; name: string; retrieved: string } = data.source
const byMeasure = new Map<string, CjpCheck>(data.checks.map((c) => [c.measure, c]))

// The checks for these retention questions, or null unless every one of them was checked
export function cjpChecks(measureIds: string[]): CjpCheck[] | null {
  const checks = measureIds.map((id) => byMeasure.get(id))
  return checks.length && checks.every(Boolean) ? (checks as CjpCheck[]) : null
}
