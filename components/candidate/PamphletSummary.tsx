import type { CandidateProfile } from '@/lib/profile'

// The candidate in their own words: fields copied verbatim from the official voters'
// pamphlet statement, with the page it's on
export default function PamphletSummary({
  summary,
  pamphletEndorsements,
  full = false,
}: {
  summary: NonNullable<CandidateProfile['summary']>
  pamphletEndorsements?: string
  full?: boolean
}) {
  const { source } = summary
  return (
    <div className="space-y-2 text-sm">
      {summary.fields.length > 0 && (
        <dl className="grid gap-x-3 gap-y-1 sm:grid-cols-[max-content_1fr]">
          {summary.fields.map((f) => (
            <div key={f.label} className="contents">
              <dt className="font-semibold text-gray-700">{f.label}</dt>
              <dd className={full ? '' : 'line-clamp-3'}>{f.text}</dd>
            </div>
          ))}
        </dl>
      )}
      {summary.statement && <blockquote className="border-l-2 border-gray-300 pl-3 italic">{summary.statement}</blockquote>}
      {full && pamphletEndorsements && (
        <p>
          <span className="font-semibold text-gray-700">On endorsements, in their statement: </span>“{pamphletEndorsements}”
        </p>
      )}
      <p className="text-xs text-gray-600">
        In the candidate&apos;s own words, from the{' '}
        <a href={`${source.url}${source.page ? `#page=${source.page}` : ''}`} target="_blank" rel="noopener noreferrer" className="underline">
          {source.title}
          {source.page ? `, p. ${source.page}` : ''}
        </a>
        . Statements aren&apos;t fact-checked by the elections office or by us.
      </p>
    </div>
  )
}
