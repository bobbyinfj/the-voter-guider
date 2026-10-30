'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

export interface OfficialDoc {
  title: string
  text: string
  source: string
}

function isDoc(d: unknown): d is OfficialDoc {
  return !!d && typeof d === 'object' && ['title', 'text', 'source'].every((k) => typeof (d as Record<string, unknown>)[k] === 'string')
}

// Official documents for a measure (Ballot.metadata.documents)
export function documentsOf(metadata: unknown): OfficialDoc[] {
  const docs = metadata && typeof metadata === 'object' ? (metadata as { documents?: unknown }).documents : null
  return Array.isArray(docs) ? docs.filter(isDoc) : []
}

// A candidate's statement from the county's sample ballot (race Ballot.metadata.statements)
export function statementOf(metadata: unknown, name: string): OfficialDoc | null {
  const all = metadata && typeof metadata === 'object' ? (metadata as { statements?: unknown }).statements : null
  const doc = all && typeof all === 'object' ? (all as Record<string, unknown>)[name] : null
  return isDoc(doc) ? doc : null
}

// Long official text (impartial analysis, arguments, full text, candidate statements), one at a time
// in a scrolling box so it doesn't swamp the ballot, with where it comes from. Plain text only.
export default function OfficialDocs({ docs, label }: { docs: OfficialDoc[]; label?: string }) {
  const [i, setI] = useState(0)
  const d = docs[Math.min(i, docs.length - 1)]
  if (!d) return null
  return (
    <div className="space-y-1.5">
      {label && <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-sky-800">{label}</p>}
      {docs.length > 1 && (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Pick a document">
          {docs.map((doc, j) => (
            <button
              key={doc.title}
              type="button"
              onClick={() => setI(j)}
              aria-pressed={doc === d}
              className={`rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold ${
                doc === d ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {doc.title}
            </button>
          ))}
        </div>
      )}
      <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white px-2 py-1.5">
        {docs.length === 1 && <p className="mb-0.5 text-xs font-semibold">{d.title}</p>}
        <p className="whitespace-pre-line text-xs leading-relaxed text-gray-800">{d.text}</p>
        <a
          href={d.source}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[0.6875rem] text-blue-700 underline"
        >
          Source: Los Angeles County sample ballot data <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}
