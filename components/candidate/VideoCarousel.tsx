'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import VideoFacade from './VideoFacade'
import { VIDEO_KIND_LABELS, formatDuration, shortestFirst, videoTier, watchLength, type CandidateVideo } from '@/lib/profile'

const TIER_NAMES = { bite: 'Quick look', snack: 'Short', meal: 'Go deep' } as const

// Several videos on one measure or race, one player at a time: shortest first, with arrows and a chip
// per video (its length, what it is and who made it) to jump between them. Like every player, a
// video loads only when its thumbnail is clicked, so a long debate costs nothing until chosen.
export default function VideoCarousel({ videos, tiny = false, label = 'Watch' }: { videos: CandidateVideo[]; tiny?: boolean; label?: string }) {
  const list = shortestFirst(videos)
  const [i, setI] = useState(0)
  if (!list.length) return null
  const at = Math.min(i, list.length - 1)
  const v = list[at]
  const step = (d: number) => setI((at + d + list.length) % list.length)
  const arrow = 'rounded-full border border-sky-300 bg-white p-0.5 text-blue-700 hover:bg-sky-100'
  return (
    <section aria-label={`${label}: ${list.length} videos`} className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[0.6875rem]">
        <span className="font-semibold text-sky-900">
          {label}: {list.length} videos, shortest first
        </span>
        <span className="ml-auto flex items-center gap-1 text-gray-600">
          <button type="button" onClick={() => step(-1)} aria-label="Previous video" className={arrow}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          {at + 1} of {list.length}
          <button type="button" onClick={() => step(1)} aria-label="Next video" className={arrow}>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      <VideoFacade key={`${v.youtubeId}@${v.startSec ?? 0}`} video={v} tiny={tiny} />
      <div className="flex gap-1 overflow-x-auto pb-1" role="group" aria-label="Pick a video">
        {list.map((w, j) => {
          const len = formatDuration(watchLength({ video: w }))
          return (
            <button
              key={`${w.youtubeId}@${w.startSec ?? 0}`}
              type="button"
              onClick={() => setI(j)}
              aria-pressed={j === at}
              title={`${w.title} (${w.host ?? w.channel})`}
              className={`shrink-0 rounded-full border px-2 py-0.5 text-left text-[0.6875rem] leading-tight ${
                j === at ? 'border-blue-700 bg-blue-50 font-semibold text-blue-900' : 'border-sky-300 bg-white text-blue-700 hover:bg-sky-100'
              }`}
            >
              <span className="block text-[0.625rem] uppercase tracking-wide text-gray-500">{TIER_NAMES[videoTier({ video: w })]}</span>
              {len ? `${len} · ` : ''}
              {VIDEO_KIND_LABELS[w.kind]} · {w.host ?? w.channel}
            </button>
          )
        })}
      </div>
    </section>
  )
}
