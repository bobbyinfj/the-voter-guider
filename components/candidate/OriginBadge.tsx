'use client'

import { useState } from 'react'
import { ORIGIN_ORDER, VIDEO_ORIGINS, type VideoOrigin } from '@/lib/profile'

// "Who made this" beside a video: a four-step scale from questions someone else asks to the
// candidate's own message. Click for what that means; it's a description, not a score.
export default function OriginBadge({ origin, host }: { origin?: VideoOrigin; host?: string }) {
  const [open, setOpen] = useState(false)
  // Profiles seeded before origins existed only had independent series
  const key = origin && VIDEO_ORIGINS[origin] ? origin : 'independent'
  const o = VIDEO_ORIGINS[key]
  const step = ORIGIN_ORDER.indexOf(key)
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={o.about}
        className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-1.5 py-px align-middle text-[0.625rem] font-semibold text-gray-800 hover:bg-gray-50"
      >
        <span aria-hidden className="flex gap-px">
          {ORIGIN_ORDER.map((k, i) => (
            <span key={k} className={`h-1.5 w-1.5 rounded-sm ${i === step ? 'bg-gray-800' : 'bg-gray-300'}`} />
          ))}
        </span>
        {o.label}
      </button>
      {open && (
        <span
          role="note"
          className="absolute left-0 top-full z-20 mt-1 block w-64 rounded border border-gray-300 bg-white p-2 text-left text-[0.6875rem] font-normal leading-snug text-gray-800 shadow-lg"
        >
          <span className="mb-1 block font-semibold">Who made this: {o.label}{host ? ` · hosted by ${host}` : ''}</span>
          {o.about}
          <span className="mt-1.5 flex justify-between gap-1 text-[0.5625rem] uppercase tracking-wide text-gray-500">
            <span>Others ask</span>
            <span>Their own message</span>
          </span>
          <span aria-hidden className="mt-0.5 flex gap-0.5">
            {ORIGIN_ORDER.map((k, i) => (
              <span key={k} title={VIDEO_ORIGINS[k].label} className={`h-1.5 flex-1 rounded-sm ${i === step ? 'bg-gray-800' : 'bg-gray-200'}`} />
            ))}
          </span>
        </span>
      )}
    </span>
  )
}
