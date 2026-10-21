'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ExternalLink } from 'lucide-react'
import { measureOfficial } from '@/components/MeasureExplainer'
import {
  ABSTAIN,
  WRITE_IN,
  choiceLabel,
  contestDomId,
  isMeasure,
  optionList,
  type BallotItem,
  type ChoiceValue,
} from './ballot'

interface ContestProps {
  item: BallotItem
  electionId: string
  choice?: ChoiceValue
  readOnly: boolean
  onChange: (selection: string, notes?: string) => void
  onClear: () => void
}

// The oval a voter fills in; the real radio input is visually hidden but keeps keyboard
// (arrow keys within a contest) and screen reader behaviour
function OvalRow({
  name,
  value,
  checked,
  disabled,
  onSelect,
  children,
  aside,
}: {
  name: string
  value: string
  checked: boolean
  disabled: boolean
  onSelect: () => void
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <div
      className={`flex items-center gap-3 border-t border-gray-300 pr-3 transition-colors ${
        checked ? 'bg-blue-50' : disabled ? '' : 'hover:bg-gray-50'
      }`}
    >
      <label className={`flex flex-1 min-w-0 items-center gap-4 px-4 py-3 ${disabled ? '' : 'cursor-pointer'}`}>
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={onSelect}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="h-5 w-9 shrink-0 rounded-[50%] border-2 border-gray-900 bg-white peer-checked:bg-gray-900 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2"
        />
        <span className="min-w-0">{children}</span>
      </label>
      {aside}
    </div>
  )
}

function NotesField({ initial, onSave }: { initial: string; onSave: (notes: string) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <textarea
      aria-label="Notes about this choice"
      placeholder="Why this choice? Notes for yourself (or whoever you share with)…"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value !== initial && onSave(value)}
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 print:placeholder-shown:hidden"
      rows={2}
      maxLength={5000}
    />
  )
}

export default function Contest({ item, electionId, choice, readOnly, onChange, onClear }: ContestProps) {
  const selection = choice?.selection
  const measure = isMeasure(item)
  const isWriteIn = selection?.startsWith(WRITE_IN) ?? false
  const [writeIn, setWriteIn] = useState(isWriteIn ? selection!.slice(WRITE_IN.length) : '')
  const candidates = new Map((item.office?.candidates ?? []).map((c) => [c.name, c]))
  const official = measure ? measureOfficial(item.metadata) : {}

  const saveWriteIn = () => {
    const name = writeIn.trim()
    if (name && selection !== `${WRITE_IN}${name}`) onChange(`${WRITE_IN}${name}`, choice?.notes)
  }

  return (
    <fieldset id={contestDomId(item)} className="scroll-mt-48 border-2 border-gray-900 bg-white min-w-0">
      <legend className="sr-only">{item.number ? `${item.number}: ${item.title}` : item.title}</legend>

      <div className="bg-gray-100 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold uppercase tracking-wide text-gray-900">
            {item.number && <span className="mr-2 text-blue-700">{item.number}</span>}
            {item.title}
          </h3>
          {selection ? (
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-green-700">
              <CheckCircle2 className="h-4 w-4" /> Decided
            </span>
          ) : (
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-700">
              <Circle className="h-4 w-4" /> Undecided
            </span>
          )}
        </div>
        <p className="mt-1 text-xs font-semibold uppercase text-gray-700">
          {measure ? 'Vote Yes or No' : 'Vote for one'}
        </p>
        {item.description && <p className="mt-1 text-sm text-gray-600">{item.description}</p>}
      </div>

      {measure ? (
        (['YES', 'NO'] as const).map((value) => {
          const meaning = value === 'YES' ? official.yesMeans : official.noMeans
          return (
            <OvalRow
              key={value}
              name={item.id}
              value={value}
              checked={selection === value}
              disabled={readOnly}
              onSelect={() => onChange(value, choice?.notes)}
            >
              <span className="block font-bold text-gray-900">{value === 'YES' ? 'Yes' : 'No'}</span>
              {meaning && <span className="block text-sm text-gray-600">{meaning}</span>}
            </OvalRow>
          )
        })
      ) : (
        <>
          {optionList(item.options).map((name) => {
            const candidate = candidates.get(name)
            return (
              <OvalRow
                key={name}
                name={item.id}
                value={name}
                checked={selection === name}
                disabled={readOnly}
                onSelect={() => onChange(name, choice?.notes)}
                aside={
                  candidate && (
                    <Link
                      href={`/candidates/${candidate.id}`}
                      className="shrink-0 text-xs text-blue-600 hover:underline print:hidden"
                    >
                      Profile
                    </Link>
                  )
                }
              >
                <span className="block font-semibold uppercase text-gray-900">
                  {name}
                  {candidate?.incumbent && (
                    <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 align-middle text-[10px] font-semibold normal-case text-gray-700">
                      Incumbent
                    </span>
                  )}
                </span>
                {candidate?.party && <span className="block text-sm text-gray-600">{candidate.party}</span>}
              </OvalRow>
            )
          })}
          {(!readOnly || isWriteIn) && (
            <OvalRow
              name={item.id}
              value={WRITE_IN}
              checked={isWriteIn}
              disabled={readOnly}
              onSelect={saveWriteIn}
            >
              {readOnly ? (
                <span className="block font-semibold uppercase text-gray-900">{writeIn}</span>
              ) : (
                <input
                  type="text"
                  aria-label={`Write-in for ${item.title}`}
                  placeholder="Name"
                  value={writeIn}
                  maxLength={100}
                  onChange={(e) => setWriteIn(e.target.value)}
                  onBlur={saveWriteIn}
                  onKeyDown={(e) => e.key === 'Enter' && saveWriteIn()}
                  className="w-full max-w-xs border-0 border-b border-gray-500 bg-transparent px-0 py-0.5 text-sm uppercase focus:border-blue-600 focus:outline-none focus:ring-0"
                />
              )}
              <span className="block text-xs text-gray-500">Write-in</span>
            </OvalRow>
          )}
        </>
      )}

      {measure && (official.fiscalImpact || official.placedBy || official.passes || official.sourceUrl) && (
        <div className="border-t border-gray-300 px-4 py-2 text-xs text-gray-600 space-y-1">
          {official.fiscalImpact && (
            <p>
              <span className="font-semibold text-gray-700">Fiscal impact: </span>
              {official.fiscalImpact}
            </p>
          )}
          {(official.placedBy || official.passes) && <p>{[official.placedBy, official.passes].filter(Boolean).join(' · ')}</p>}
          {official.sourceUrl && (
            <a
              href={official.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline print:hidden"
            >
              Official text <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      {/* Enhancements a paper ballot can't do: notes, research links, blank-on-purpose */}
      <div className="border-t-2 border-gray-900 bg-gray-50 px-4 py-2 text-sm print:bg-white">
        {readOnly ? (
          <>
            {selection === ABSTAIN && <p className="text-gray-600">Left blank on purpose</p>}
            {choice?.notes && <p className="whitespace-pre-line text-gray-700">{choice.notes}</p>}
            {!selection && <p className="text-gray-500">No choice recorded</p>}
          </>
        ) : (
          <div className="space-y-2">
            {selection && selection !== ABSTAIN && (
              <NotesField initial={choice?.notes ?? ''} onSave={(notes) => onChange(selection, notes)} />
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs print:hidden">
              {item.office && (
                <Link href={`/elections/${electionId}/offices/${item.office.id}`} className="text-blue-600 hover:underline">
                  Compare candidates →
                </Link>
              )}
              {selection === ABSTAIN ? (
                <span className="text-gray-600">Leaving this one blank on purpose</span>
              ) : (
                <button type="button" onClick={() => onChange(ABSTAIN)} className="text-gray-600 hover:text-gray-900 hover:underline">
                  Leave blank on purpose
                </button>
              )}
              {selection && (
                <button
                  type="button"
                  onClick={() => {
                    setWriteIn('')
                    onClear()
                  }}
                  className="text-gray-600 hover:text-red-700 hover:underline"
                >
                  Clear {selection === ABSTAIN ? '' : `(${choiceLabel(selection)})`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </fieldset>
  )
}
