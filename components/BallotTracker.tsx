'use client'

import { useState } from 'react'
import { CheckCircle2, Download } from 'lucide-react'

export interface BallotItem {
  id: string
  number?: string | null
  title: string
  description?: string | null
  type: string
  options?: unknown
}

interface BallotTrackerProps {
  ballots: BallotItem[]
  guideTitle: string
  choices: Record<string, { selection: string; notes?: string }>
  readOnly?: boolean
  onChoiceChange?: (ballotId: string, selection: string, notes?: string) => void
}

const MEASURE_CHOICES = [
  { value: 'YES', label: 'Yes', active: 'bg-green-500 text-white', idle: 'hover:bg-green-100' },
  { value: 'NO', label: 'No', active: 'bg-red-500 text-white', idle: 'hover:bg-red-100' },
  { value: 'ABSTAIN', label: 'Skip', active: 'bg-yellow-500 text-white', idle: 'hover:bg-yellow-100' },
]

function optionList(options: unknown): string[] {
  return Array.isArray(options) ? options.filter((o): o is string => typeof o === 'string') : []
}

function NotesField({
  initial,
  onSave,
}: {
  initial: string
  onSave: (notes: string) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <textarea
      placeholder="Add notes about your choice..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value !== initial && onSave(value)}
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      rows={2}
      maxLength={5000}
    />
  )
}

export default function BallotTracker({
  ballots,
  guideTitle,
  choices,
  readOnly = false,
  onChoiceChange,
}: BallotTrackerProps) {
  const answered = ballots.filter((b) => choices[b.id]).length
  const completionPercentage = ballots.length > 0 ? Math.round((answered / ballots.length) * 100) : 0

  const handleExport = () => {
    const lines = [`${guideTitle}`, '']
    for (const ballot of ballots) {
      const choice = choices[ballot.id]
      const label = ballot.number ? `${ballot.number} — ${ballot.title}` : ballot.title
      lines.push(`${label}: ${choice ? choice.selection : '(no choice)'}`)
      if (choice?.notes) lines.push(`  Notes: ${choice.notes}`)
    }
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'my-voter-guide.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const races = ballots.filter((b) => b.type === 'candidate')
  const measures = ballots.filter((b) => b.type !== 'candidate')

  const renderItem = (ballot: BallotItem) => {
    const choice = choices[ballot.id]
    const isMeasure = ballot.type !== 'candidate'
    return (
      <div
        key={ballot.id}
        className={`bg-white rounded-lg border-2 p-4 transition-all ${
          choice ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          {ballot.number && <span className="font-semibold text-blue-600">{ballot.number}</span>}
          <h4 className="text-lg font-semibold text-gray-800">{ballot.title}</h4>
          {choice && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
        </div>
        {ballot.description && <p className="text-sm text-gray-600 mb-3">{ballot.description}</p>}

        {readOnly ? (
          <p className="text-sm">
            <span className="text-gray-500">Choice: </span>
            <span className="font-medium text-gray-800">
              {choice ? (isMeasure ? MEASURE_CHOICES.find((m) => m.value === choice.selection)?.label ?? choice.selection : choice.selection) : '—'}
            </span>
            {choice?.notes && <span className="block text-gray-600 mt-1">{choice.notes}</span>}
          </p>
        ) : (
          <div className="space-y-2">
            {isMeasure ? (
              <div className="flex gap-2">
                {MEASURE_CHOICES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => onChoiceChange?.(ballot.id, m.value, choice?.notes)}
                    className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                      choice?.selection === m.value ? m.active : `bg-gray-100 text-gray-700 ${m.idle}`
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            ) : (
              optionList(ballot.options).map((option) => (
                <button
                  key={option}
                  onClick={() => onChoiceChange?.(ballot.id, option, choice?.notes)}
                  className={`w-full text-left px-4 py-2 rounded-md transition-all ${
                    choice?.selection === option ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-blue-50 text-gray-700'
                  }`}
                >
                  {option}
                </button>
              ))
            )}
            {choice && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <NotesField
                  initial={choice.notes ?? ''}
                  onSave={(notes) => onChoiceChange?.(ballot.id, choice.selection, notes)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-800">
            {readOnly ? 'Choices' : 'Your Voting Choices'}
          </h3>
          <div className="text-sm font-medium text-gray-600">
            {answered} of {ballots.length} decided
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <button
          onClick={handleExport}
          className="mt-2 flex items-center gap-2 px-3 py-1.5 text-sm bg-white hover:bg-gray-50 rounded-md border border-gray-300"
        >
          <Download className="w-4 h-4" />
          Download as text
        </button>
      </div>

      {races.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Candidates</h3>
          {races.map(renderItem)}
        </section>
      )}
      {measures.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Ballot Measures</h3>
          {measures.map(renderItem)}
        </section>
      )}
    </div>
  )
}
