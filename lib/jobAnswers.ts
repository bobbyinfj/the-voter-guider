import data from '../data/answers/ca-general-2026-11-03.json'

// The "What's this job?" questions, answered per candidate from their own state voter guide
// statement (PRD S-2; built and quote-checked by data/research/enrichment-builders/job_answers.py).
// A null answer means their statement doesn't address that question.
export interface JobAnswers {
  questions: string[]
  candidates: Record<string, { noStatement?: boolean; answers: (string | null)[] }>
}

export const JOB_ANSWERS_SOURCE: { name: string; url: string; retrieved: string } = data.source
const offices = data.offices as Record<string, JobAnswers>

export function jobAnswersFor(officeId: string | null | undefined): JobAnswers | null {
  return (officeId && offices[officeId]) || null
}
