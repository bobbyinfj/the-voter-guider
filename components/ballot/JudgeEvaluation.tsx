import { CheckCircle2, ExternalLink, Scale, XCircle } from 'lucide-react'
import { evaluationMeets, isHttpUrl, raceExtrasOf, type JudgeBiography, type JudgeEvaluation as Evaluation } from '@/lib/profile'
import type { BallotItem } from './ballot'

export function evaluationOf(item: BallotItem): Evaluation | JudgeBiography | null {
  return raceExtrasOf(item.metadata)?.evaluation ?? null
}

const isBiography = (e: Evaluation | JudgeBiography): e is JudgeBiography => e.kind === 'biography'

// The page prints "MEETS PERFORMANCE STANDARDS ." with a space; keep the words, drop the gap
const tidy = (s: string) => s.replace(/\s+([.,])/g, '$1')

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  if (!isHttpUrl(href)) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-700 hover:underline">
      {children} <ExternalLink className="h-3 w-3" />
    </a>
  )
}

// One line under a retention question's ovals, so the voter has something to go on right where they
// choose: the official commission's finding and vote (Colorado), or what the court's own biography says:
// the nominee rating in its words, else how long they've served (California). A credited extra.
export function EvaluationLine({ item }: { item: BallotItem }) {
  const e = evaluationOf(item)
  if (!e) return null
  if (isBiography(e)) {
    const since = e.role.find((r) => /^Since \d{4}$/.test(r))
    const text = e.ratingWords ? `Nominee rating: “${e.ratingWords}”` : since ? `${e.role.join(', ')}` : null
    if (!text) return null
    return (
      <p className="flex items-start gap-1 px-2 pb-1.5 font-sans text-[0.6875rem] leading-snug text-sky-900 print:hidden" title={e.rating ?? undefined}>
        <Scale className="mt-px h-3.5 w-3.5 shrink-0 text-sky-700" aria-hidden />
        <span>
          {text} <span className="text-sky-600">· the court&apos;s biography</span>
        </span>
      </p>
    )
  }
  const meets = evaluationMeets(e)
  const Icon = meets ? CheckCircle2 : XCircle
  return (
    <p className="flex items-start gap-1 px-2 pb-1.5 font-sans text-[0.6875rem] leading-snug text-sky-900 print:hidden" title={tidy(e.finding)}>
      <Icon className={`mt-px h-3.5 w-3.5 shrink-0 ${meets ? 'text-green-700' : 'text-red-700'}`} aria-hidden />
      <span>
        <span className="font-semibold">{e.recommendation}</span> ({e.vote}) <span className="text-sky-600">· {e.by}</span>
      </span>
    </p>
  )
}

function Biography({ bio: e }: { bio: JudgeBiography }) {
  return (
    <section className="space-y-1.5 rounded border border-sky-200 bg-white p-2 text-xs" aria-label="This justice's official biography">
      <p className="font-semibold text-sky-950">How to decide: what the court says about this justice</p>
      <p className="text-gray-700">
        We found no official evaluation of California justices for retention votes, so this is their court&apos;s own
        biography of them{e.rating ? ', which quotes the rating the Judicial Nominees Evaluation Commission gave them as a nominee' : ''}.
      </p>
      {e.role.length > 0 && <p className="font-semibold">{e.role.join(' · ')}</p>}
      {e.rating && <p>“{e.rating}”</p>}
      {e.appointed && e.appointed !== e.rating && <p>“{e.appointed}”</p>}
      {!e.rating && <p className="text-gray-700">The biography doesn&apos;t mention a nominee rating.</p>}
      <details>
        <summary className="cursor-pointer font-semibold text-blue-700 hover:underline">Read the full biography</summary>
        <div className="mt-1 space-y-1.5 text-gray-800">
          {e.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </details>
      <p className="text-sky-800">
        From the {e.publisher}: <Link href={e.source.url}>{e.source.title}</Link>, retrieved {e.source.retrieved}
      </p>
    </section>
  )
}

// The info panel's "How to decide": the commission's finding, its own words, and its reports
export default function JudgeEvaluation({ evaluation: e }: { evaluation: Evaluation | JudgeBiography }) {
  if (isBiography(e)) return <Biography bio={e} />
  const meets = evaluationMeets(e)
  return (
    <section className="space-y-1.5 rounded border border-sky-200 bg-white p-2 text-xs" aria-label="Official evaluation of this judge">
      <p className="font-semibold text-sky-950">How to decide: the official evaluation</p>
      <p>
        <span className={`rounded px-1.5 py-0.5 font-semibold ${meets ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
          {e.recommendation}
        </span>{' '}
        “{tidy(e.finding)}”
      </p>
      <details>
        <summary className="cursor-pointer font-semibold text-blue-700 hover:underline">Read the commission&apos;s evaluation</summary>
        <div className="mt-1 space-y-1.5 text-gray-800">
          {e.narrative.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </details>
      <p className="text-sky-800">
        From the {e.publisher}:{' '}
        <Link href={e.source.url}>{e.source.title}</Link>, retrieved {e.source.retrieved}
        {e.reports.map((r) => (
          <span key={r.url}>
            {' · '}
            <Link href={r.url}>{r.label}</Link>
          </span>
        ))}
      </p>
    </section>
  )
}
