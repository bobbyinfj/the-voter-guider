'use client'

import { ExternalLink } from 'lucide-react'
import VideoFacade from './VideoFacade'
import VideoCarousel from './VideoCarousel'
import { isHttpUrl, type RaceExtras as Extras } from '@/lib/profile'

// Debates, forums and links for a whole race or measure. Compact (contest info panel): several videos
// as a carousel, shortest first; one as a column-wide player. Otherwise a grid of players.
export default function RaceExtras({ extras, compact = false }: { extras: Extras; compact?: boolean }) {
  const videos = extras.videos ?? []
  const links = (extras.links ?? []).filter((l) => isHttpUrl(l.url))
  if (!videos.length && !links.length) return null
  return (
    <div className="space-y-2">
      {compact && videos.length > 1 ? (
        <VideoCarousel videos={videos} />
      ) : compact ? (
        videos.map((v) => <VideoFacade key={v.youtubeId} video={v} />)
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
