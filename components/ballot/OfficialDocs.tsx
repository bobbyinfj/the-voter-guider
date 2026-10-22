'use client'

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

// Long official text (impartial analysis, arguments, full text, candidate statements), folded
// so it doesn't swamp the ballot, each with where it comes from. Plain text only.
export default function OfficialDocs({ docs, label }: { docs: OfficialDoc[]; label?: string }) {
  if (!docs.length) return null
  return (
    <div className="space-y-1">
      {label && <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">{label}</p>}
      {docs.map((d) => (
        <details key={d.title} className="rounded border border-sky-200 bg-white">
          <summary className="cursor-pointer px-2 py-1 text-xs font-semibold">{d.title}</summary>
          <div className="max-h-96 overflow-y-auto border-t border-sky-100 px-2 py-1.5">
            <p className="whitespace-pre-line text-xs leading-relaxed text-gray-800">{d.text}</p>
            <a
              href={d.source}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-blue-700 underline"
            >
              Source: Los Angeles County sample ballot data <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </details>
      ))}
    </div>
  )
}
