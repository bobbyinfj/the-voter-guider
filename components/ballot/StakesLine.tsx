import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { isHttpUrl } from '@/lib/profile'
import type { Stakes } from '@/lib/stakes'

const TONE = { High: 'bg-slate-800 text-white', Medium: 'bg-slate-300 text-slate-900', Lower: 'bg-slate-100 text-slate-700' }

// Beside a measure: its stakes grade and the facts behind it. Worked out by rule, not a recommendation.
export default function StakesLine({ stakes: s, source }: { stakes: Stakes; source?: string | null }) {
  const reasons = [
    s.money ? `Official estimate: ${s.money.plain}` : 'No dollar figure in the official summary',
    ...(s.locked ? ['Changes a constitution or charter, so it’s hard to undo'] : []),
    ...(s.split ? ['Published guides disagree'] : []),
    ...(s.local ? ['Local vote: fewer voters, so yours counts for more'] : []),
  ]
  return (
    <div className="px-2 pt-2 font-sans text-xs leading-snug text-gray-700">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${TONE[s.grade]}`}>{s.grade} stakes</span>
        <span>{reasons.join(' · ')}</span>
      </p>
      <p className="mt-0.5 text-[0.6875rem] text-gray-500">
        {s.money && <>“{s.money.quote}” </>}
        {isHttpUrl(s.money?.source ?? source) && (
          <a href={s.money?.source ?? source!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-700 underline">
            Official source <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}{' '}
        <Link href="/how-we-score#stakes" className="text-blue-700 underline">
          How this is worked out
        </Link>
        . Our rule, not a recommendation; it can&apos;t say what matters to you.
      </p>
    </div>
  )
}
