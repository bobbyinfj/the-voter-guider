import { ballotThemeFor } from '@/lib/ballot-theme'

// Building blocks of the ballot design system (tokens in app/globals.css). Ballot-looking
// parts are black-and-gray "paper"; anything we add that isn't on the real ballot goes in
// a sky-blue Extra so it can't be mistaken for ballot text.

// Page wrapper: sets the election's ballot theme for everything inside it
export function BallotPage({
  electionId,
  className = '',
  children,
}: {
  electionId: string | null | undefined
  className?: string
  children: React.ReactNode
}) {
  return (
    <div data-ballot={ballotThemeFor(electionId).key} className={`min-h-screen bg-gray-100 font-ballot text-ballot-ink ${className}`}>
      {children}
    </div>
  )
}

// Top of a page, laid out like a ballot's header block (date, election, county), with the
// ballot's accent rule. Never says "official".
export function BallotHeader({
  electionId,
  date,
  title,
  place,
  children,
  aside,
}: {
  electionId: string | null | undefined
  date?: string
  title: React.ReactNode
  place?: string
  children?: React.ReactNode
  aside?: React.ReactNode
}) {
  const { styledAfter } = ballotThemeFor(electionId)
  return (
    <header className="border-[1.5px] border-t-[6px] border-ballot-ink border-t-ballot-accent bg-ballot-paper">
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-3">
        <div className="min-w-0 basis-64 grow">
          {date && <p className="text-sm font-bold">{date}</p>}
          <h1 className="font-ballot-heading text-xl font-bold leading-tight sm:text-2xl">{title}</h1>
          {place && <p className="text-sm">{place}</p>}
          {children}
        </div>
        {aside && <div className="flex shrink-0 flex-col gap-2">{aside}</div>}
      </div>
      {styledAfter && (
        <p className="border-t border-gray-300 px-4 py-1 text-[11px] text-gray-600">
          Styled after {styledAfter}&apos;s sample ballot so it looks familiar. This page is not a ballot.
        </p>
      )}
    </header>
  )
}

// Black heading bar ("Federal", "State Offices", ...)
export function SectionBar({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`bg-ballot-bar px-2 py-1 font-ballot-heading text-[13px] font-bold text-white print:bg-black ${className}`}>
      {children}
    </h2>
  )
}

// Ruled box around one contest
export function ContestBox({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`border-[1.5px] border-ballot-ink bg-ballot-paper ${className}`}>{children}</div>
}

// Gray contest heading: office or measure name, then instruction lines ("Vote for one")
export function ContestHead({
  heading,
  instructions = [],
  children,
  className = '',
}: {
  heading: React.ReactNode[]
  instructions?: string[]
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-start gap-2 bg-ballot-head px-2 py-1.5 print:bg-gray-100 ${className}`}>
      <div className="min-w-0 flex-1">
        {heading.map((line, i) => (
          <p key={i} className="text-[13px] font-bold leading-snug">
            {line}
          </p>
        ))}
        {instructions.map((line) => (
          <p key={line} className="text-[12px] leading-snug">
            {line}
          </p>
        ))}
      </div>
      {children}
    </div>
  )
}

// Voter Guider content that isn't on the ballot
export function Extra({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border-l-2 border-sky-400 bg-sky-50 px-2 py-1.5 font-sans text-sky-950 print:hidden ${className}`}>
      {children}
    </div>
  )
}

// The ballot's accent color as a call-to-action button, and a plain outlined one
export const accentButton =
  'inline-flex items-center justify-center gap-1.5 bg-ballot-accent px-4 py-2 text-sm font-bold text-ballot-accent-ink hover:brightness-95 disabled:opacity-50'
export const outlineButton =
  'inline-flex items-center justify-center gap-1.5 border-[1.5px] border-ballot-ink bg-ballot-paper px-4 py-2 text-sm font-semibold hover:bg-ballot-head disabled:opacity-50'
