'use client'

import { Check, CheckCircle2, Circle, CircleHelp, MinusCircle, X } from 'lucide-react'
import { ABSTAIN, NOTES_ONLY, contestDomId, isPick, isSettled, isUnsure, navLabel, type BallotSection, type ChoiceValue } from './ballot'
import { MEASURE_TOPICS } from '@/lib/measureTopics'

interface BallotNavProps {
  sections: BallotSection[]
  choices: Record<string, ChoiceValue>
  activeId: string | null
  onJump: (itemId: string) => void
}

// Table of contents for the ballot: every contest with its decided/undecided state. A Yes/No
// question's icon also says which way you're voting (VoteMark)
export default function BallotNav({ sections, choices, activeId, onJump }: BallotNavProps) {
  return (
    <nav aria-label="Contests on this ballot" className="space-y-4 text-sm">
      {sections.map((section) => {
        const decided = section.items.filter((i) => isSettled(choices[i.id])).length
        return (
          <div key={section.key} className="break-inside-avoid">
            <p className="mb-1 flex justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span>{section.continued ? section.subsection : section.label}</span>
              <span>
                {decided}/{section.items.length}
              </span>
            </p>
            <ul>
              {section.items.map((item) => {
                const picked = choices[item.id]?.selection
                const selection = picked === NOTES_ONLY ? undefined : picked
                const unsure = isUnsure(choices[item.id])
                const leaning = isPick(selection) && choices[item.id]?.status === 'tentative'
                const Icon = !selection ? Circle : selection === ABSTAIN ? MinusCircle : unsure ? CircleHelp : CheckCircle2
                const vote = selection === 'YES' || selection === 'NO' ? selection : null
                const status = choices[item.id]?.status ?? 'decided'
                return (
                  <li key={item.id}>
                    <a
                      href={`#${contestDomId(item)}`}
                      onClick={(e) => {
                        e.preventDefault()
                        onJump(item.id)
                      }}
                      aria-current={activeId === item.id ? 'location' : undefined}
                      className={`flex items-start gap-2 rounded px-2 py-1 ${
                        activeId === item.id ? 'bg-blue-100 text-blue-900' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {vote ? (
                        <VoteMark vote={vote} status={status} />
                      ) : (
                      <Icon
                        aria-label={!selection ? 'Undecided' : selection === ABSTAIN ? 'Left blank' : unsure ? 'Not sure yet' : leaning ? 'Leaning' : 'Decided'}
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          !selection ? 'text-gray-400' : selection === ABSTAIN ? 'text-gray-500' : unsure ? 'text-purple-600' : leaning ? 'text-amber-600' : 'text-green-600'
                        }`}
                      />
                      )}
                      <span className="min-w-0" title={MEASURE_TOPICS[item.id] ? item.title : undefined}>
                        <span className="line-clamp-2">{navLabel(item)}</span>
                        {/* A state measure's topic, in words from its official title (lib/measureTopics.ts) */}
                        {MEASURE_TOPICS[item.id] && <span className="block text-xs text-gray-500">{MEASURE_TOPICS[item.id]}</span>}
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

// A Yes/No pick drawn like its ballot oval: green ✓ for Yes or red ✕ for No, solid once decided,
// striped while leaning, a dashed ring while possibly or not sure
function VoteMark({ vote, status }: { vote: 'YES' | 'NO'; status: string }) {
  const yes = vote === 'YES'
  const Glyph = yes ? Check : X
  const how = status === 'decided' ? 'decided' : status === 'tentative' ? 'leaning' : status === 'possible' ? 'possibly' : 'not sure'
  const ring = yes ? 'border-green-700' : 'border-red-700'
  const style =
    how === 'decided'
      ? `${yes ? 'bg-green-700' : 'bg-red-700'} ${ring} text-white`
      : how === 'leaning'
        ? `${ring} ${yes ? 'text-green-800 bg-[repeating-linear-gradient(135deg,var(--color-green-200)_0_2px,transparent_2px_4px)]' : 'text-red-800 bg-[repeating-linear-gradient(135deg,var(--color-red-200)_0_2px,transparent_2px_4px)]'}`
        : `border-dashed ${ring} ${yes ? 'text-green-800' : 'text-red-800'} bg-white`
  return (
    <span
      role="img"
      aria-label={`Voting ${yes ? 'Yes' : 'No'}, ${how}`}
      title={`Voting ${yes ? 'Yes' : 'No'} (${how})`}
      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] ${style}`}
    >
      <Glyph aria-hidden className="h-2.5 w-2.5" strokeWidth={3.5} />
    </span>
  )
}
