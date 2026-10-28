'use client'

import { useState } from 'react'
import { ExternalLink, PlayCircle } from 'lucide-react'
import VideoFacade from './VideoFacade'
import { VIDEO_KIND_LABELS, formatDuration, isHttpUrl, videoTier, type RaceExtras as Extras } from '@/lib/profile'

// Debates, forums and links for a whole race. Compact (contest info panel): short videos as
// column-wide players, long ones (a meal) as a button that opens one; otherwise a grid of players.
export default function RaceExtras({ extras, compact = false }: { extras: Extras; compact?: boolean }) {
  const [open, setOpen] = useState<string | null>(null)
  const videos = extras.videos ?? []
  const links = (extras.links ?? []).filter((l) => isHttpUrl(l.url))
  if (!videos.length && !links.length) return null
  return (
    <div className="space-y-2">
      {compact ? (
        videos.map((v) =>
          videoTier({ video: v }) !== 'meal' ? (
            <VideoFacade key={v.youtubeId} video={v} />
          ) : (
            <div key={v.youtubeId} className="space-y-1">
              <button
                type="button"
                onClick={() => setOpen((o) => (o === v.youtubeId ? null : v.youtubeId))}
                aria-expanded={open === v.youtubeId}
                className="inline-flex items-start gap-1 text-left text-xs font-semibold text-blue-700 hover:underline"
              >
                <PlayCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>
                  {open === v.youtubeId ? 'Hide' : 'Watch'} {VIDEO_KIND_LABELS[v.kind].toLowerCase()}: “{v.title}”
                  {formatDuration(v.durationSec) && ` (${formatDuration(v.durationSec)})`}
                </span>
              </button>
              {open === v.youtubeId && <VideoFacade video={v} />}
            </div>
          ),
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {videos.map((v) => (
            <VideoFacade key={v.youtubeId} video={v} />
          ))}
        </div>
      )}
      {links.map((l) => (
        <a
          key={l.url}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
        >
          {l.label} <ExternalLink className="h-3 w-3" />
        </a>
      ))}
    </div>
  )
}
