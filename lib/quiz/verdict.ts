// How a race's quiz result is described everywhere (live quiz panel, results page, ballot), so
// they can't disagree. Never names a match the evidence doesn't support.
import { MIN_SHARED_QUESTIONS } from './score'
import type { OfficeResult } from './types'

export function verdictText(o: OfficeResult): { headline: string; detail: string; top: string | null } {
  const n = o.sharedQuestions
  const basis = `${n} of your answer${n === 1 ? '' : 's'} where we have a sourced position from every candidate`
  if (o.verdict === 'match') {
    const top = o.rankedCandidates[0].candidate.name
    return { headline: `Closest match: ${top}`, detail: `Based on ${basis}.`, top }
  }
  if (o.verdict === 'too-close') {
    return { headline: 'Too close to call', detail: `The candidates agree with you about equally, based on ${basis}.`, top: null }
  }
  return {
    headline: 'Not enough sourced positions to suggest a match',
    detail:
      n === 0
        ? "We don't have sourced positions from every candidate on any question you answered, so we won't guess."
        : `Only ${basis} (we need at least ${MIN_SHARED_QUESTIONS}), so we won't guess.`,
    top: null,
  }
}
