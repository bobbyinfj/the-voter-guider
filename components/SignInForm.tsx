'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'

// Email → magic link. Used on /signin and in the "keep your guide" prompt.
export default function SignInForm({ next, compact = false }: { next?: string; compact?: boolean }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('sending')
    setError(null)
    const res = await fetch('/api/auth/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, next: next ?? window.location.pathname + window.location.search }),
    }).catch(() => null)
    if (res?.ok) return setState('sent')
    setState('idle')
    setError((res && (await res.json().catch(() => null))?.error) || "Couldn't send the link. Please try again.")
  }

  if (state === 'sent') {
    return (
      <p className="text-sm" role="status">
        Check <strong>{email}</strong> for a sign-in link. It works once and expires in 15 minutes.
      </p>
    )
  }

  return (
    <form onSubmit={submit} className={compact ? 'flex flex-wrap items-center gap-2' : 'space-y-3'}>
      <label className={compact ? 'sr-only' : 'block text-sm font-medium'} htmlFor="signin-email">
        Email
      </label>
      <input
        id="signin-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={state === 'sending'}
        className="inline-flex items-center gap-1.5 rounded bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        <Mail className="h-4 w-4" />
        {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
      </button>
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </form>
  )
}
