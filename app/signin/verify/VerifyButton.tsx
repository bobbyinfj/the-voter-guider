'use client'

import { useState } from 'react'

// Signs in, then loads the next page fresh so everything on it knows you're signed in
export default function VerifyButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const signIn = async () => {
    setBusy(true)
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => null)
    const data = res ? await res.json().catch(() => null) : null
    if (res?.ok && data?.next) return window.location.assign(data.next)
    setBusy(false)
    setError(data?.error ?? "Couldn't sign you in. Please try again.")
  }
  return (
    <>
      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        className="rounded bg-gray-900 px-6 py-2.5 font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      {error && (
        <p className="mt-3 text-sm text-red-700">
          {error} <a href="/signin" className="underline">Get a new link</a>
        </p>
      )}
    </>
  )
}
