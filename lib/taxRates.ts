import data from '../data/measures/tax-rates.json'

// Income tax brackets with and without a measure (data/measures/tax-rates.json, built by
// data/research/measure-builders/tax_rates.py from the LAO's analysis). Rates are percents; each
// bracket starts at `single` / `joint` and runs to the next one.
export type Filer = 'single' | 'joint'
export type Scenario = 'now' | 'yes' | 'no'

export interface TaxBracket {
  single: number
  joint: number
  now: number
  yes: number
  no: number
}

export interface MeasureTaxRates {
  tax: string
  labels: Record<Scenario, string>
  brackets: TaxBracket[]
  quotes: string[]
  source: { url: string; name: string; figure: string; figureSha256: string; retrieved: string }
}

const RATES: Record<string, MeasureTaxRates> = data

export const taxRatesFor = (measureId: string): MeasureTaxRates | undefined => RATES[measureId]

// The rate on the last dollar of this much taxable income
export function rateAt(brackets: TaxBracket[], filer: Filer, income: number, scenario: Scenario): number {
  let rate = brackets[0][scenario]
  for (const b of brackets) if (income >= b[filer]) rate = b[scenario]
  return rate
}

// Tax owed on this much taxable income under the brackets alone (no deductions or credits)
export function taxOn(brackets: TaxBracket[], filer: Filer, income: number, scenario: Scenario): number {
  let tax = 0
  brackets.forEach((b, i) => {
    const top = brackets[i + 1]?.[filer] ?? Infinity
    if (income > b[filer]) tax += ((Math.min(income, top) - b[filer]) * b[scenario]) / 100
  })
  return tax
}
