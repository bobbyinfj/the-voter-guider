import { MolesesPause } from '@/components/Moleses'
import type { OfficeGlossary } from '@/lib/glossary'
import { SourceLine } from './OfficeExplainer'
import { CJP_SOURCE, cjpChecks } from '@/lib/cjp'
import { formatElectionDate } from '@/lib/format'

// Once, above the first retention question (Quick and Expanded): what these votes are and how
// they've gone, each fact with its source (the glossary's retention entry), so the voter isn't
// facing a run of Yes/No questions with nothing to go on. Every question is still voted on its own.
export default function RetentionIntro({ entry, measureIds }: { entry: OfficeGlossary; measureIds: string[] }) {
  const count = measureIds.length
  const checks = cjpChecks(measureIds)
  const found = checks?.filter((c) => c.found.length) ?? []
  return (
    <div className="mb-[-1.5px] flex gap-3 border-[1.5px] border-ballot-ink bg-sky-50 px-3 py-2 font-sans text-sm text-sky-950 print:hidden">
      <MolesesPause size={48} />
      <div className="min-w-0 space-y-1">
        <p className="font-semibold">
          {count} questions on keeping a justice. Each is its own Yes or No.
        </p>
        <ul className="ml-4 list-disc space-y-0.5">
          {(entry.facts ?? []).map((f) => (
            <li key={f.plain}>
              {f.plain} <SourceLine source={f.source} inline />
            </li>
          ))}
        </ul>
        {checks && (
          <p>
            <strong>Discipline check:</strong> we looked up all {count} justices in the{' '}
            <a href={CJP_SOURCE.url} target="_blank" rel="noopener noreferrer" className="underline">
              {CJP_SOURCE.name}
            </a>{' '}
            (checked {formatElectionDate(CJP_SOURCE.retrieved, { year: 'numeric', month: 'short', day: 'numeric' })}).{' '}
            {found.length === 0
              ? 'None of them is on it.'
              : found.map((c) => `${c.name}: ${c.found.join('; ')}`).join(' · ')}{' '}
            <span className="text-xs text-sky-800">It lists public decisions only.</span>
          </p>
        )}
        <p className="text-xs">
          Under each question: what the justice&apos;s own court says about them. We found no official evaluation of
          California justices for these votes.
        </p>
      </div>
    </div>
  )
}
