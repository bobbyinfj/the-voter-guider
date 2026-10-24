// How a race's quiz result is described everywhere (live quiz panel, results page, ballot), so
// they can't disagree. Never names a match the evidence doesn't support.
import { MIN_SHARED_QUESTIONS } from './score'
import type { OfficeResult } from './types'

export function verdictText(o: OfficeResult): { headline: string; detail: string; top: string | null } {
  const n = o.sharedQuestions
  const basis = `${n} of your answer${n === 1 ? '' : 's'} where each candidate compared has a sourced position`
  if (o.verdict === 'match') {
    const top = o.rankedCandidates[0].candidate.name
    return { headline: `Closest match: ${top}`, detail: `Based on ${basis}.`, top }
  }
  if (o.verdict === 'too-close') {
    return { headline: 'Too close to call', detail: `The candidates agree with you about equally, based on ${basis}.`, top: null }
  }
  const more = Math.max(MIN_SHARED_QUESTIONS - n, 1)
  return {
    headline: o.decidable ? `Answer ${more} more of its questions to compare` : 'Not enough sourced positions to compare',
    detail: o.decidable
      ? `A match needs at least ${MIN_SHARED_QUESTIONS} answers where each candidate compared has a sourced position.`
      : `The candidates' sourced positions overlap on fewer than ${MIN_SHARED_QUESTIONS} questions.`,
    top: null,
  }
}
