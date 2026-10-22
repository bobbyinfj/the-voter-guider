'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import { VIDEO_KIND_LABELS, formatDuration, type CandidateVideo } from '@/lib/profile'

// Thumbnail first; the YouTube player (privacy-enhanced domain) loads only when clicked.
// `tiny` (scorecard cells): a one-line caption, with the title on hover
export default function VideoFacade({
  video,
  compact = false,
  tiny = false,
}: {
  video: CandidateVideo
  compact?: boolean
  tiny?: boolean
}) {
  const [playing, setPlaying] = useState(false)
  const duration = formatDuration(video.durationSec)
  const label = `${VIDEO_KIND_LABELS[video.kind]} · ${video.channel}${duration ? ` · ${duration}` : ''}`

  return (
    <figure className={compact ? 'max-w-xs' : ''} title={tiny ? video.title : undefined}>
      <div className="relative aspect-video w-full overflow-hidden rounded bg-black">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play: ${video.title} (${label})`}
            className="group absolute inset-0 h-full w-full"
          >
            {/* Plain img: a fixed YouTube thumbnail URL, no need for next/image's optimizer */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover opacity-90 group-hover:opacity-100"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className={`flex items-center justify-center rounded-full bg-red-600 text-white shadow-lg group-hover:scale-105 ${tiny ? 'h-8 w-8' : 'h-12 w-12'}`}>
                <Play className={tiny ? 'ml-0.5 h-4 w-4' : 'ml-0.5 h-6 w-6'} fill="currentColor" />
              </span>
            </span>
          </button>
        )}
      </div>
      {tiny ? (
        <figcaption className="mt-0.5 truncate text-[0.6875rem] leading-snug text-gray-700">
          {label} ·{' '}
          <a href={`https://www.youtube.com/watch?v=${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="underline">
            YouTube
          </a>
        </figcaption>
      ) : (
      <figcaption className="mt-1 text-xs leading-snug">
        <span className="font-semibold">{label}</span>
        <span className="block text-gray-600">
          “{video.title}” ·{' '}
          <a
            href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            YouTube
          </a>
        </span>
      </figcaption>
      )}
    </figure>
  )
}
