'use client'

import { Check, CloudOff, Loader2 } from 'lucide-react'
import type { SaveState } from './useGuideEditor'

// Autosave status; there's no save button anywhere
export default function SaveStatus({
  state,
  hasGuide,
  signedIn,
}: {
  state: SaveState
  hasGuide: boolean
  signedIn: boolean
}) {
  if (state === 'saving')
    return (
      <span role="status" className="flex items-center gap-1 text-xs text-gray-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    )
  if (state === 'error')
    return (
      <span role="status" className="flex items-center gap-1 text-xs font-semibold text-red-700">
        <CloudOff className="h-3.5 w-3.5" /> Not saved
      </span>
    )
  return (
    <span role="status" className="flex items-center gap-1 text-xs text-gray-600">
      {hasGuide && <Check className="h-3.5 w-3.5 text-green-700" />}
      {!hasGuide ? 'Your picks save automatically' : signedIn ? 'Saved to your account' : 'Saved on this device'}
    </span>
  )
}
