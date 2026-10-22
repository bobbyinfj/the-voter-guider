'use client'

import { useEffect, useState } from 'react'

export interface Account {
  email: string | null
  emailEnabled: boolean
}

let cached: Promise<Account> | null = null

// Who's signed in (fetched once per page load and shared)
export function useAccount(): Account | null {
  const [account, setAccount] = useState<Account | null>(null)
  useEffect(() => {
    cached ??= fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : { email: null, emailEnabled: false }))
      .catch(() => ({ email: null, emailEnabled: false }))
    let live = true
    cached.then((a) => live && setAccount(a))
    return () => {
      live = false
    }
  }, [])
  return account
}
