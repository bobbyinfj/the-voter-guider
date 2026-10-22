'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import SignInForm from '@/components/SignInForm'
import { MolesesAvatar } from '@/components/Moleses'
import { useAccount } from './useAccount'

const DISMISS_KEY = 'voter-guider:keep-prompt-dismissed'

// A gentle, skippable nudge after your first pick: picks already save on this device;
// signing in (magic link) keeps them everywhere. Skipping changes nothing.
export default function KeepGuidePrompt({ show }: { show: boolean }) {
  const account = useAccount()
  const [dismissed, setDismissed] = useState(true)
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only preference, read after hydration
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  if (!show || dismissed || !account || account.email || !account.emailEnabled) return null
  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {}
  }
  return (
    <div className="relative flex gap-3 rounded-lg border border-sky-200 bg-sky-50 p-3 font-sans text-sm text-sky-950 print:hidden">
      <MolesesAvatar size={36} />
      <div className="min-w-0 flex-1 space-y-2">
        <p>
          <strong>Your picks are saved on this device.</strong> Want them on your phone or another computer too? Get a
          one-time sign-in link by email. No password.
        </p>
        <SignInForm compact />
        <button type="button" onClick={dismiss} className="text-xs text-sky-800 underline underline-offset-2">
          No thanks, I&apos;ll stay anonymous
        </button>
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="absolute right-2 top-2 text-sky-700 hover:text-sky-950">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
