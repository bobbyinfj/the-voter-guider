import ca from '../data/results/ca-general-2026-11-03.json'
import wa from '../data/results/wa-general-2026-11-03.json'

// How a November race went in this year's primary (data/results/, built from the official results by
// data/research/results-builders/build.py). A fact about who voted then, never a forecast.
export interface PrimaryRace {
  contest: string
  total: number
  candidates: { name: string; votes: number }[]
  others: number
}

interface PrimaryFile {
  election: string
  publisher: string
  url: string
  retrieved: string
  races: Record<string, PrimaryRace>
}

const FILES: PrimaryFile[] = [ca, wa]

export function primaryFor(officeId: string) {
  const file = FILES.find((f) => f.races[officeId])
  return file ? { ...file, race: file.races[officeId] } : null
}

export const share = (votes: number, total: number) => (total ? Math.round((votes / total) * 1000) / 10 : 0)
