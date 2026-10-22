'use client'

import { CheckCircle2, Circle, CircleHelp, MinusCircle } from 'lucide-react'
import { ABSTAIN, NOTES_ONLY, contestDomId, isPick, isSettled, isUnsure, navLabel, type BallotSection, type ChoiceValue } from './ballot'

interface BallotNavProps {
  sections: BallotSection[]
  choices: Record<string, ChoiceValue>
  activeId: string | null
  onJump: (itemId: string) => void
}

// Table of contents for the ballot: every contest with its decided/undecided state
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
                      <Icon
                        aria-label={!selection ? 'Undecided' : selection === ABSTAIN ? 'Left blank' : unsure ? 'Not sure yet' : leaning ? 'Leaning' : 'Decided'}
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          !selection ? 'text-gray-400' : selection === ABSTAIN ? 'text-gray-500' : unsure ? 'text-purple-600' : leaning ? 'text-amber-600' : 'text-green-600'
                        }`}
                      />
                      <span className="min-w-0 line-clamp-2">{navLabel(item)}</span>
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
