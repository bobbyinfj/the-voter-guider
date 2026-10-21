import Image from 'next/image'
import Link from 'next/link'

// Molesis, the blind mole wizard: our mascot, and the face of every "this isn't official" notice

export function MolesisAvatar({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/moleses-2.png"
      alt="Molesis, the Voter Guider's blind mole wizard mascot"
      width={size}
      height={size}
      className={`shrink-0 rounded-full bg-white object-cover ${className}`}
    />
  )
}

// Thin bar on every page
export function UnofficialBar() {
  return (
    <div className="border-b border-amber-300 bg-amber-50 text-amber-950 print:hidden">
      <div className="container mx-auto flex items-center gap-2 px-4 py-1.5 text-xs sm:text-sm">
        <MolesisAvatar size={24} />
        <p className="min-w-0">
          <strong>Unofficial!</strong> Not a government website, and not your ballot. We&apos;re just the Voter Guider
          people.{' '}
          <Link href="#unofficial" className="underline underline-offset-2 hover:text-amber-800">
            What that means
          </Link>
        </p>
      </div>
    </div>
  )
}

// Site footer with the full disclaimer
export function UnofficialFooter() {
  return (
    <footer id="unofficial" className="mt-16 border-t border-gray-200 bg-white print:hidden">
      <div className="container mx-auto flex flex-col gap-4 px-4 py-8 sm:flex-row sm:items-start">
        <MolesisAvatar size={88} className="border border-gray-200" />
        <div className="max-w-3xl space-y-2 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">
            Molesis is a blind mole wizard, not an election official. Neither are we.
          </p>
          <p>
            The Voter Guider is an independent, unofficial voter guide. It isn&apos;t run by, affiliated with or
            endorsed by any state, county or city government or election office. Nothing on this site is a ballot
            or a registration, and nothing you mark here gets counted.
          </p>
          <p>
            We copy ballot content from official sources (sample ballots, voters&apos; pamphlets, certified
            candidate lists) and link to them, but we can make mistakes. Check your official voters&apos; pamphlet,
            and vote using the ballot your county elections office sends you.
          </p>
        </div>
      </div>
    </footer>
  )
}

// Stamp at the top of the ballot replica (also prints)
export function NotABallotStamp({ readOnly }: { readOnly: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b-2 border-dashed border-red-700 bg-red-50 px-4 py-3 text-red-900">
      <MolesisAvatar size={48} className="border border-red-200" />
      <div className="min-w-0 text-sm">
        <p className="font-black uppercase tracking-wider">Not a ballot. Don&apos;t mail this.</p>
        <p className="text-xs sm:text-sm">
          {readOnly
            ? 'Someone’s practice copy, made with the Voter Guider. Molesis can’t count it, and neither can anyone else.'
            : 'Your practice copy from the Voter Guider, an unofficial site. Molesis can’t count it. Copy your picks onto the real ballot from your county.'}
        </p>
      </div>
    </div>
  )
}

// Diagonal watermark on every printed page
export function PrintWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 hidden items-center justify-center print:flex"
    >
      <p className="-rotate-[35deg] whitespace-nowrap text-5xl font-black uppercase tracking-widest text-red-700/15">
        Not an official ballot · The Voter Guider
      </p>
    </div>
  )
}
