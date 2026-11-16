// A cache for public data read on pages that can't be cached whole (they also show the
// visitor's own guide). A hit doesn't wake Neon's compute, which is billed per hour awake.
// Public data only: never cache anything that depends on who is looking.
import { unstable_cache } from 'next/cache'

// Entries are per deployment, so a code change to a query's shape never reads an old entry
const DEPLOYMENT = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'local'

// The data only changes when a data merge re-seeds the database; an hour bounds how long a
// page can show what was there before the seed finished
export const PUBLIC_REVALIDATE_SECONDS = 3600

// The cache stores JSON, which would turn Dates into strings; tag and restore them
const DATE_TAG = '__vgDate'

export function toCacheJson(value: unknown): string {
  return JSON.stringify(value, function (this: Record<string, unknown>, key, v) {
    const raw = this[key]
    if (raw instanceof Date) return { [DATE_TAG]: raw.toISOString() }
    if (raw instanceof Set || raw instanceof Map) throw new Error('publicCache: convert Sets and Maps to arrays first')
    return v
  })
}

export function fromCacheJson<T>(text: string): T {
  return JSON.parse(text, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && typeof v[DATE_TAG] === 'string'
      ? new Date(v[DATE_TAG])
      : v,
  ) as T
}

export function cachedPublic<A extends string[], T>(name: string, load: (...args: A) => Promise<T>) {
  const cached = unstable_cache(async (...args: A) => toCacheJson(await load(...args)), [name, DEPLOYMENT], {
    revalidate: PUBLIC_REVALIDATE_SECONDS,
  })
  return async (...args: A): Promise<T> => fromCacheJson<T>(await cached(...args))
}
