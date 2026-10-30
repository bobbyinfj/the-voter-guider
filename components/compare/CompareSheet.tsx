'use client'

import { useEffect, useState } from 'react'
import { Check, ExternalLink } from 'lucide-react'
import { choiceLabel, contestDomId, isPick, isSettled, navLabel, type BallotItem, type BallotSection, type ChoiceValue } from '@/components/ballot/ballot'
import { compareOptions, compareView, useCompareData, type CompareGuide, type CompareView } from './compare'

// Your column plus up to four sources; more stops being readable
const MAX_SOURCES = 4

const columnsOf = (view: CompareView) => (view.community ? 1 : view.guides.length)

// Compare view: a column for your ballot and one per source, contest by contest. Party and advocacy
// guides come as left/right pairs (compareOptions), so a pair takes two columns.
export default function CompareSheet({
  electionId,
  sections,
  choices,
  differOnly,
  coveredOnly,
  onOpen,
}: {
  electionId: string
  sections: BallotSection[]
  choices: Record<string, ChoiceValue>
  differOnly: boolean
  coveredOnly: boolean
  onOpen: (domId: string) => void
}) {
  const { data, state, load } = useCompareData(electionId)
  const [keys, setKeys] = useState<string[]>([])
  useEffect(() => {
    load()
  }, [load])

  const options = data ? compareOptions(data) : []
  const groups = [...new Set(options.map((o) => o.group))]
  const views = data ? keys.flatMap((key) => compareView(data, key) ?? []) : []
  const used = views.reduce((n, v) => n + columnsOf(v), 0)
  const guides = views.flatMap((v) => v.guides)
  const community = views.find((v) => v.community)?.community ?? null
  const fits = (key: string) => {
    const view = data && compareView(data, key)
    return !!view && used + columnsOf(view) <= MAX_SOURCES
  }
  const toggle = (key: string) => setKeys((k) => (k.includes(key) ? k.filter((x) => x !== key) : [...k, key]))

  const differs = (item: BallotItem) => {
    const mine = choices[item.id]?.selection
    return guides.some((g) => g.picks[item.id] && g.picks[item.id].selection !== mine)
  }
  const columns = 1 + used
  const grid = { gridTemplateColumns: `repeat(${columns}, minmax(8rem, 1fr))` }
  const covered = (item: BallotItem) => guides.some((g) => g.picks[item.id]) || !!community?.contests[item.id]
  const items = (s: BallotSection) => s.items.filter((i) => !used || ((!differOnly || differs(i)) && (!coveredOnly || covered(i))))

  return (
    <div className="space-y-3 font-sans">
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <p className="text-sm font-semibold">Compare your ballot with up to {MAX_SOURCES} sources</p>
        {state === 'loading' && <p className="text-sm text-gray-600">Loading…</p>}
        {state === 'error' && <p className="text-sm text-red-700">Couldn&apos;t load guides to compare.</p>}
        <div className="mt-2 space-y-2">
          {groups.map((group) => (
            <div key={group}>
              <p className="text-[0.6875rem] font-semibold text-gray-500">{group}</p>
              <div className="mt-0.5 flex flex-wrap gap-1.5">
                {options
                  .filter((o) => o.group === group)
                  .map((o) => {
                    const on = keys.includes(o.key)
                    return (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => toggle(o.key)}
                        disabled={!on && !fits(o.key)}
                        aria-pressed={on}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold disabled:opacity-40 ${
                          on ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {o.label}
                      </button>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {(guides.length > 0 || community) && (
        <div className="space-y-1 text-xs text-gray-700">
          {guides.map((g) => (
            <GuideNote key={g.id} guide={g} sections={sections} choices={choices} />
          ))}
          {community && (
            <p>
              <strong>Voter Guider users</strong>: anonymous totals from {community.sharers} {community.sharers === 1 ? 'user' : 'users'} who chose to share
              their picks. Not a poll or a prediction. Shown once {community.minimum} people have shared a pick.
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <div style={{ minWidth: `${columns * 8}rem` }}>
          {sections.map((section) => {
            const shown = items(section)
            if (!shown.length) return null
            return (
              <section key={section.key} aria-label={section.label}>
                {!section.continued && <h3 className="bg-gray-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-600">{section.label}</h3>}
                {shown.map((item) => {
                  const mine = choices[item.id]?.selection
                  return (
                    <div key={item.id} id={contestDomId(item)} data-item-id={item.id} className="scroll-mt-48 border-t border-gray-200 px-3 py-2">
                      <button type="button" onClick={() => onOpen(contestDomId(item))} className="text-left text-sm font-semibold text-gray-900 hover:underline">
                        {navLabel(item)}
                      </button>
                      <div className="mt-1.5 grid gap-3" style={grid}>
                        <Cell label="Your ballot" mine>
                          {isPick(mine) ? choiceLabel(mine!, item) : <span className="font-normal text-gray-500">{mine ? choiceLabel(mine, item) : 'No pick yet'}</span>}
                        </Cell>
                        {views.map((v) =>
                          v.community ? (
                            <Tally key={v.key} item={item} view={v} mine={mine} />
                          ) : (
                            v.guides.map((g) => <GuidePick key={g.id} guide={g} item={item} mine={mine} />)
                          ),
                        )}
                      </div>
                    </div>
                  )
                })}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Cell({ label, mine = false, children }: { label: string; mine?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-w-0 text-sm">
      <p className={`mb-0.5 truncate text-[0.6875rem] ${mine ? 'font-semibold text-gray-700' : 'text-gray-500'}`} title={label}>
        {label}
      </p>
      <div className={mine ? 'font-semibold' : ''}>{children}</div>
    </div>
  )
}

function GuidePick({ guide, item, mine }: { guide: CompareGuide; item: BallotItem; mine?: string }) {
  const p = guide.picks[item.id]
  const same = p && mine === p.selection
  return (
    <Cell label={guide.name}>
      {p ? (
        <>
          <span className={same ? 'font-semibold text-green-800' : ''}>
            {same && <Check aria-label="Same as you" className="mr-0.5 inline h-3.5 w-3.5 align-[-2px]" />}
            {choiceLabel(p.selection, item)}
          </span>
          {p.source && (
            <a href={p.source} target="_blank" rel="noopener noreferrer" title={p.quote ?? undefined} className="ml-1 inline-flex items-center gap-0.5 text-xs text-blue-700 underline">
              source <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </>
      ) : (
        <span className="text-gray-400">No pick found</span>
      )}
    </Cell>
  )
}

function Tally({ item, view, mine }: { item: BallotItem; view: CompareView; mine?: string }) {
  const c = view.community!.contests[item.id]
  return (
    <Cell label="Voter Guider users">
      {c ? (
        <ul className="space-y-0.5 text-xs">
          {Object.entries(c.picks)
            .sort((a, b) => b[1] - a[1])
            .map(([selection, n]) => (
              <li key={selection} className={mine === selection ? 'font-semibold' : ''}>
                {selection === 'WRITE-IN' ? 'Write-ins' : choiceLabel(selection, item)} · {Math.round((n / c.total) * 100)}%
              </li>
            ))}
        </ul>
      ) : (
        <span className="text-gray-400">Too few to show</span>
      )}
    </Cell>
  )
}

// Who the source is, where it's from, and how often you match
function GuideNote({ guide: g, sections, choices }: { guide: CompareGuide; sections: BallotSection[]; choices: Record<string, ChoiceValue> }) {
  const both = sections.flatMap((s) => s.items).filter((b) => g.picks[b.id] && isPick(choices[b.id]?.selection) && isSettled(choices[b.id]))
  const same = both.filter((b) => g.picks[b.id].selection === choices[b.id].selection).length
  return (
    <p>
      <strong>{g.name}</strong>: {g.about}{' '}
      <a href={g.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-700 underline">
        source <ExternalLink className="h-3 w-3" />
      </a>{' '}
      (retrieved {g.retrieved}).{' '}
      {both.length > 0 && (
        <span>
          You match on <strong>{same}</strong> of {both.length} contests you both picked.
        </span>
      )}
    </p>
  )
}
