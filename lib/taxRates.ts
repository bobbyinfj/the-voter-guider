import data from '../data/measures/tax-rates.json'

// Income tax brackets with and without a measure (data/measures/tax-rates.json, built by
// data/research/measure-builders/tax_rates.py from the official analysis). Rates are percents; each
// bracket starts at `single` / `joint` and runs to the next one. No `joint` means one schedule for
// every filer.
export type Filer = 'single' | 'joint'
export type Scenario = 'now' | 'yes' | 'no'

export interface TaxBracket {
  single: number
  joint?: number
  now: number
  yes: number
  no: number
}

export interface MeasureTaxRates {
  tax: string
  labels: Record<Scenario, string>
  brackets: TaxBracket[]
  quotes: string[]
  source: { url: string; name: string; figure?: string; figureSha256?: string; retrieved: string }
}

const RATES: Record<string, MeasureTaxRates> = data

export const taxRatesFor = (measureId: string): MeasureTaxRates | undefined => RATES[measureId]

// Where a bracket starts for this filer (one schedule for everyone when there's no joint column)
const from = (b: TaxBracket, filer: Filer) => (filer === 'joint' ? (b.joint ?? b.single) : b.single)
export const hasJoint = (r: MeasureTaxRates) => r.brackets.every((b) => b.joint !== undefined)

// The rate on the last dollar of this much taxable income
export { from as bracketStart }

export function rateAt(brackets: TaxBracket[], filer: Filer, income: number, scenario: Scenario): number {
  let rate = brackets[0][scenario]
  for (const b of brackets) if (income >= from(b, filer)) rate = b[scenario]
  return rate
}

// Tax owed on this much taxable income under the brackets alone (no deductions or credits)
export function taxOn(brackets: TaxBracket[], filer: Filer, income: number, scenario: Scenario): number {
  let tax = 0
  brackets.forEach((b, i) => {
    const next = brackets[i + 1]
    const top = next ? from(next, filer) : Infinity
    if (income > from(b, filer)) tax += ((Math.min(income, top) - from(b, filer)) * b[scenario]) / 100
  })
  return tax
}
