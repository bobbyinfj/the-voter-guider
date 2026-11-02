import { jobAnswersFor, JOB_ANSWERS_SOURCE } from '@/lib/jobAnswers'
import { choiceLabel, layoutOf, type BallotItem } from './ballot'

// Above a down-ballot race's candidates (Quick and Expanded): the job's questions, each answered with
// one sentence from each candidate's own statement, or "Not addressed in their statement" (PRD S-2)
export default function JobAnswers({ item }: { item: BallotItem }) {
  const data = jobAnswersFor(item.office?.id)
  // In the order printed on the ballot
  const printed = layoutOf(item)?.candidates?.map((c) => c.name) ?? []
  const at = (name: string) => (printed.includes(name) ? printed.indexOf(name) : printed.length)
  const people = (item.office?.candidates.filter((c) => data?.candidates[c.id]) ?? []).sort((a, b) => at(a.name) - at(b.name))
  if (!data || people.length < 2) return null
  return (
    <div className="border-b border-sky-200 bg-white px-3 py-2 font-sans text-sm print:hidden">
      <p className="font-semibold text-sky-950">The job&apos;s questions, in their own words</p>
      <div className="mt-1 space-y-2">
        {data.questions.map((q, i) => (
          <div key={q}>
            <p className="text-xs font-semibold text-gray-700">{q}</p>
            <div className="mt-0.5 grid gap-x-4 gap-y-1 sm:grid-cols-2">
              {people.map((c) => {
                const row = data.candidates[c.id]
                const answer = row.answers[i]
                return (
                  <p key={c.id} className="text-xs leading-snug">
                    <span className="font-semibold">{choiceLabel(c.name, item)}:</span>{' '}
                    {answer ? (
                      <span className="text-sky-950">“{answer}”</span>
                    ) : (
                      <span className="italic text-gray-500">{row.noStatement ? 'No statement in the state voter guide' : 'Not addressed in their statement'}</span>
                    )}
                  </p>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[0.6875rem] text-gray-600">
        Each sentence is copied from the candidate&apos;s statement in the{' '}
        <a href={JOB_ANSWERS_SOURCE.url} target="_blank" rel="noopener noreferrer" className="underline" title={JOB_ANSWERS_SOURCE.name}>
          state voter guide
        </a>
        . Voter Guider chose which sentence speaks to which question; the questions are ours, the same for every candidate.
      </p>
    </div>
  )
}
