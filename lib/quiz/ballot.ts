// The quiz's result for each race, keyed by the race's ballot id, for showing on the ballot
import { verdictText } from './verdict'
import type { OfficeResult, QuizResults } from './types'

export interface QuizOnBallot {
  verdict: OfficeResult['verdict']
  headline: string
  detail: string
  // The candidate to suggest: only with a clear match
  top: string | null
  href: string
}

export function quizOnBallot(results: QuizResults, electionId: string, guideId: string): Record<string, QuizOnBallot> {
  return Object.fromEntries(
    results.officeResults.map((o) => {
      const v = verdictText(o)
      const href = `/elections/${electionId}/quiz/results?guideId=${encodeURIComponent(guideId)}#office-${o.officeId}`
      return [`${o.officeId}-race`, { verdict: o.verdict, headline: v.headline, detail: v.detail, top: v.top, href }]
    }),
  )
}
