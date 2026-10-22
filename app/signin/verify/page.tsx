import Link from 'next/link'
import VerifyButton from './VerifyButton'
import { previewToken } from '@/lib/auth'

export const metadata = { title: 'Sign in — The Voter Guider' }

// The emailed link lands here. Signing in takes a button press (a POST), so mail scanners
// that open links ahead of you can't use up the one-time link.
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams
  const forEmail = error ? null : await previewToken(token)

  return (
    <div className="container mx-auto max-w-md px-4 py-12 text-center">
      {!forEmail || !token ? (
        <>
          <h1 className="mb-2 text-2xl font-bold">That link didn&apos;t work</h1>
          <p className="mb-6 text-sm text-gray-700">Sign-in links work once and expire after 15 minutes.</p>
          <Link href="/signin" className="text-blue-700 underline">
            Get a new link
          </Link>
        </>
      ) : (
        <>
          <h1 className="mb-2 text-2xl font-bold">Sign in to The Voter Guider</h1>
          <p className="mb-6 text-sm text-gray-700">
            as <strong>{forEmail}</strong>. If that isn&apos;t your email, close this page: someone else sent you their link.
          </p>
          <VerifyButton token={token} />
          <p className="mt-4 text-xs text-gray-500">
            Guides made in the browser where you asked for this link move to your account.
          </p>
        </>
      )}
    </div>
  )
}
