import { MolesesPause } from '@/components/Moleses'
import type { OfficeGlossary } from '@/lib/glossary'
import { SourceLine } from './OfficeExplainer'

// Once, above the first retention question (Quick and Expanded): what these votes are and how
// they've gone, each fact with its source (the glossary's retention entry), so the voter isn't
// facing a run of Yes/No questions with nothing to go on. Every question is still voted on its own.
export default function RetentionIntro({ entry, count }: { entry: OfficeGlossary; count: number }) {
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
        <p className="text-xs">
          Under each question: what the justice&apos;s own court says about them. We found no official evaluation of
          California justices for these votes.
        </p>
      </div>
    </div>
  )
}
