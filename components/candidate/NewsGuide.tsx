import { ExternalLink } from 'lucide-react'
import { guideCredit, isHttpUrl, type NewsGuide as Guide } from '@/lib/profile'

// Our own quote marks go around the text, so drop any the cut-off source quote starts or ends with
const unquote = (s: string) => s.replace(/^[“"]+|[”"]+$/g, '')

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  if (!isHttpUrl(href)) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-700 hover:underline">
      {children} <ExternalLink className="h-3 w-3" />
    </a>
  )
}

// What a news organization's voter guide says about one candidate, every piece credited to it
// (and a judge's bar rating to the bar association). `compact` is the ballot's info panel.
export default function NewsGuide({ guide: g, compact = false }: { guide: Guide; compact?: boolean }) {
  const credit = guideCredit(g)
  return (
    <div className={`space-y-1.5 ${compact ? 'text-xs' : 'text-sm'}`}>
      {g.rating && (
        <p>
          <span className="rounded bg-sky-200 px-1.5 py-0.5 font-semibold text-sky-950">{g.rating.value}</span>{' '}
          rating from the {g.rating.by}{' '}
          <span className="text-sky-800">
            (<SourceLink href={g.rating.source.url}>source</SourceLink>, retrieved {g.rating.source.retrieved})
          </span>
        </p>
      )}
      {g.about && (
        <p className={compact ? 'line-clamp-3' : ''}>
          “{g.about}” <span className="text-sky-800">({credit})</span>
        </p>
      )}
      {g.note && <p className="text-gray-700">{g.note}</p>}
      {(g.keyEndorsements?.length || g.endorsementsLine) && (
        <p>
          <span className="font-semibold">Key endorsements, per {g.source.publisher}:</span>{' '}
          {g.keyEndorsements?.join(' · ') ?? g.endorsementsLine}
        </p>
      )}
      {g.answers?.length ? (
        <details className="group">
          <summary className="cursor-pointer font-semibold text-blue-700 hover:underline">
            Their answers to {g.source.publisher}&apos;s survey ({g.answers.length})
          </summary>
          <dl className="mt-1 space-y-1.5">
            {g.answers.map((a) => (
              <div key={a.q}>
                <dt className="font-semibold">{a.q}</dt>
                <dd>“{unquote(a.a)}…”</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
      <p className="flex flex-wrap gap-x-3 gap-y-0.5">
        {g.endorsementsUrl && <SourceLink href={g.endorsementsUrl}>Endorsement list</SourceLink>}
        {g.stateBarUrl && <SourceLink href={g.stateBarUrl}>State Bar profile</SourceLink>}
        <span className="text-sky-800">
          From <SourceLink href={g.source.url}>{credit}&apos;s voter guide</SourceLink>, retrieved {g.source.retrieved}
        </span>
      </p>
    </div>
  )
}
