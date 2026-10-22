'use client'

import { ABSTAIN, UNSURE, choiceLabel, contestLabel, type BallotSection, type ChoiceValue } from './ballot'

interface ReviewSheetProps {
  sections: BallotSection[]
  choices: Record<string, ChoiceValue>
  readOnly: boolean
  onEdit: (itemId: string) => void
}

// One-glance summary of every pick, like the review screen on a ballot marking device
export default function ReviewSheet({ sections, choices, readOnly, onEdit }: ReviewSheetProps) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.key} className="border-2 border-gray-900 bg-white">
          <h3 className="bg-gray-900 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-white">
            {section.label}
          </h3>
          <ul>
            {section.items.map((item) => {
              const choice = choices[item.id]
              return (
                <li key={item.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-gray-300 px-4 py-2 first:border-t-0">
                  <span className="min-w-0 flex-1 basis-56 text-sm text-gray-700">{contestLabel(item)}</span>
                  <span
                    className={`flex-1 basis-40 font-semibold ${
                      !choice || choice.selection === UNSURE ? 'text-amber-700' : choice.selection === ABSTAIN ? 'text-gray-500' : 'text-gray-900'
                    }`}
                  >
                    {choice ? choiceLabel(choice.selection, item) : 'No choice yet'}
                    {choice?.notes && <span className="block text-xs font-normal text-gray-600 whitespace-pre-line">{choice.notes}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEdit(item.id)}
                    className="text-xs text-blue-600 hover:underline print:hidden"
                  >
                    {readOnly ? 'View on ballot' : choice ? 'Change' : 'Decide'}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
