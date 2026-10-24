'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import OriginBadge from './OriginBadge'
import { VIDEO_KIND_LABELS, formatDuration, isHttpUrl, type CandidateVideo } from '@/lib/profile'

// Thumbnail first; the YouTube player (privacy-enhanced domain) loads only when clicked.
// `tiny` (scorecard cells): a one-line caption, with the title on hover. `startSec` overrides the
// video's own start (one candidate's part of a forum).
export default function VideoFacade({
  video,
  compact = false,
  tiny = false,
  startSec,
}: {
  video: CandidateVideo
  compact?: boolean
  tiny?: boolean
  startSec?: number
}) {
  const [playing, setPlaying] = useState(false)
  const start = startSec ?? video.startSec
  const end = startSec === undefined ? video.endSec : undefined
  const clip = start !== undefined && end !== undefined ? formatDuration(end - start) : null
  const duration = clip ?? formatDuration(video.durationSec)
  const at = start ? ` · from ${clock(start)}` : ''
  const label = `${VIDEO_KIND_LABELS[video.kind]} · ${video.channel}${duration ? ` · ${duration}` : ''}${clip ? '' : at}`
  const params = `autoplay=1&rel=0${start ? `&start=${start}` : ''}${end ? `&end=${end}` : ''}`
  const watchUrl = `https://www.youtube.com/watch?v=${video.youtubeId}${start ? `&t=${start}s` : ''}`
  const source = video.sourceUrl && isHttpUrl(video.sourceUrl) ? video.sourceUrl : null

  return (
    <figure className={compact ? 'max-w-xs' : ''} title={tiny ? video.title : undefined}>
      <div className="relative aspect-video w-full overflow-hidden rounded bg-black">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?${params}`}
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
        <figcaption className="mt-0.5 text-[0.6875rem] leading-snug text-gray-700">
          <OriginBadge origin={video.origin} host={video.host} />
          <span className="line-clamp-2">
            {label} ·{' '}
            <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="underline">
              YouTube
            </a>
          </span>
        </figcaption>
      ) : (
      <figcaption className="mt-1 text-xs leading-snug">
        <OriginBadge origin={video.origin} host={video.host} /> <span className="font-semibold">{label}</span>
        <span className="block text-gray-600">
          “{video.title}”{video.host ? ` · hosted by ${video.host}` : ''} ·{' '}
          <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="underline">
            YouTube
          </a>
          {source && (
            <>
              {' · '}
              <a href={source} target="_blank" rel="noopener noreferrer" className="underline">
                {video.sourceLabel ?? 'Where we found it'}
              </a>
            </>
          )}
        </span>
      </figcaption>
      )}
    </figure>
  )
}

function clock(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = String(sec % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}
