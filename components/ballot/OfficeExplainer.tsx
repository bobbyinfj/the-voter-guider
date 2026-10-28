'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen, ExternalLink } from 'lucide-react'
import type { GlossarySource, OfficeGlossary } from '@/lib/glossary'

// What this office does, in plain English, with the official words it's based on and questions to
// ask every candidate. Shown at the top of a contest's info panel and in the heading's popover.
export default function OfficeExplainer({ entry }: { entry: OfficeGlossary }) {
  const vote = !!entry.measures?.length
  return (
    <div className="space-y-1.5 text-sm">
      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-sky-700">
        {vote ? 'What is this vote?' : 'What does this office do?'}
      </p>
      <p>{entry.plain}</p>
      <SourceLine source={entry.source} />
      {entry.facts?.length ? (
        <ul className="ml-4 list-disc space-y-1">
          {entry.facts.map((f) => (
            <li key={f.plain}>
              {f.plain} <SourceLine source={f.source} inline />
            </li>
          ))}
        </ul>
      ) : null}
      <details className="text-xs">
        <summary className="cursor-pointer font-semibold text-blue-700 hover:underline">Their exact words</summary>
        <div className="mt-1 space-y-1 border-l-2 border-sky-300 pl-2 italic text-gray-700">
          {[{ quotes: entry.quotes, source: entry.source }, ...(entry.facts ?? [])].flatMap(({ quotes, source }) =>
            quotes.map((q) => (
              <p key={q}>
                “{q}” <span className="not-italic text-sky-700">({source.name})</span>
              </p>
            )),
          )}
        </div>
      </details>
      {entry.links?.map((l) => (
        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="block text-xs font-semibold text-blue-700 hover:underline">
          {l.label} <ExternalLink className="inline h-3 w-3 align-[-1px]" />
        </a>
      ))}
      {entry.ask.length > 0 && (
        <div className="text-xs">
          <p className="font-semibold">Questions to ask every candidate</p>
          <ul className="ml-4 list-disc space-y-0.5">
            {entry.ask.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <p className="mt-1 text-sky-800">Our suggestions, not a recommendation.</p>
        </div>
      )}
      <a href={`/glossary#${entry.key}`} className="block text-xs font-semibold text-blue-700 underline">
        How to choose, and every office explained
      </a>
    </div>
  )
}

// "Voter Guider summary of <source> (retrieved <date>)", or just the linked source inline
function SourceLine({ source, inline = false }: { source: GlossarySource; inline?: boolean }) {
  const link = (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">
      {source.name}
      <ExternalLink className="ml-0.5 inline h-3 w-3 align-[-1px]" />
    </a>
  )
  if (inline) return <span className="text-xs text-sky-800">({link})</span>
  return (
    <p className="text-xs text-sky-800">
      Voter Guider summary of {link} (retrieved {source.retrieved})
    </p>
  )
}

// A "What's this job?" button for a contest heading that opens the explainer in a popover
// (click, not hover, so it works on phones). Closes on Escape or a click outside.
export function OfficeExplainerButton({ entry }: { entry: OfficeGlossary }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])
  return (
    <div ref={ref} className="relative font-sans">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={entry.measures?.length ? `About this vote: ${entry.title}` : `What does the ${entry.title} do?`}
        title={entry.measures?.length ? 'What is this vote?' : "What's this job?"}
        className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-[0.6875rem] font-semibold ${
          open ? 'bg-sky-200 text-sky-900' : 'text-sky-800 hover:bg-sky-100'
        }`}
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{entry.measures?.length ? 'What is this vote?' : <>What&apos;s this job?</>}</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={entry.title}
          className="fixed inset-x-4 top-24 z-30 max-h-[70vh] overflow-y-auto rounded-md sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1 sm:w-[22rem] border border-sky-300 bg-sky-50 p-3 text-left font-normal normal-case tracking-normal text-sky-950 shadow-lg"
        >
          <OfficeExplainer entry={entry} />
        </div>
      )}
    </div>
  )
}
