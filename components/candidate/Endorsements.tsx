import { ENDORSER_KIND_LABELS, endorsersByKind, formatRetrieved, initials, type Endorser, type EndorserKind } from '@/lib/profile'

// Endorsements as circle "badges": initials in a color per kind of endorser. Names come
// from each campaign's own endorsements page (see data/research/enrichment-builders), so
// we link there and say so; no logos (we'd be implying the endorsers work with us).

const KIND_STYLE: Record<EndorserKind, string> = {
  media: 'bg-slate-700 text-white',
  org: 'bg-indigo-600 text-white',
  official: 'bg-amber-500 text-amber-950',
  person: 'bg-teal-600 text-white',
}

export function EndorserCircle({ endorser, size = 'md' }: { endorser: Endorser; size?: 'sm' | 'md' }) {
  const text = initials(endorser)
  const dim = size === 'sm' ? 'h-7 w-7 text-[0.5625rem]' : 'h-9 w-9 text-[0.625rem]'
  return (
    <span
      title={endorser.name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none ring-2 ring-white ${dim} ${KIND_STYLE[endorser.kind]}`}
    >
      <span aria-hidden>{text}</span>
      <span className="sr-only">{endorser.name}</span>
    </span>
  )
}

// A row of circles (overlapping a little) plus "+N"; used in snacks and cards
export function EndorserStrip({
  endorsers,
  total,
  size = 'sm',
}: {
  endorsers: Endorser[]
  total: number
  size?: 'sm' | 'md'
}) {
  if (!endorsers.length) return null
  return (
    <span className="inline-flex items-center" aria-label={`Endorsed by ${endorsers.map((e) => e.name).join(', ')}${total > endorsers.length ? ` and ${total - endorsers.length} more` : ''}`}>
      <span className="flex -space-x-1.5" aria-hidden>
        {endorsers.map((e) => (
          <EndorserCircle key={e.name} endorser={e} size={size} />
        ))}
      </span>
      {total > endorsers.length && (
        <span aria-hidden className="ml-1.5 text-xs font-semibold text-sky-900">
          +{total - endorsers.length}
        </span>
      )}
    </span>
  )
}

export function EndorsementSource({ url, retrieved }: { url: string; retrieved: string }) {
  return (
    <p className="text-xs text-gray-600">
      As listed on the{' '}
      <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="underline">
        campaign&apos;s endorsements page
      </a>{' '}
      (retrieved {formatRetrieved(retrieved)}). We copy names as published and don&apos;t verify them.
    </p>
  )
}

// The full list, grouped by kind: circles with names, on the candidate page
export function EndorsementList({
  list,
  individuals,
  source,
}: {
  list: Endorser[]
  individuals?: number
  source: { url: string; retrieved: string }
}) {
  const groups = endorsersByKind(list)
  return (
    <div className="space-y-4">
      {groups.map(({ kind, items }) => (
        <section key={kind} aria-label={ENDORSER_KIND_LABELS[kind]}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <span className={`h-3 w-3 rounded-full ${KIND_STYLE[kind]}`} aria-hidden />
            {ENDORSER_KIND_LABELS[kind]} <span className="font-normal text-gray-500">({items.length})</span>
          </h3>
          <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((e) => (
              <li key={e.name} className="flex min-w-0 items-center gap-2 text-sm">
                <EndorserCircle endorser={e} size="sm" />
                <span className="min-w-0">{e.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!!individuals && (
        <p className="text-sm text-gray-700">
          Plus {individuals.toLocaleString()} individual supporters listed by name on the campaign&apos;s page.
        </p>
      )}
      <EndorsementSource {...source} />
    </div>
  )
}
