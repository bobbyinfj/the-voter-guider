import SignInForm from '@/components/SignInForm'
import { currentUser, safeNext } from '@/lib/auth'
import { emailEnabled } from '@/lib/mail'

export const metadata = { title: 'Sign in — The Voter Guider' }

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const user = await currentUser()
  return (
    <div className="container mx-auto max-w-md px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">Keep your guides on every device</h1>
      <p className="mb-6 text-sm text-gray-700">
        You don&apos;t need an account: your picks already save on this device. Sign in with your email to see them
        on your phone or another computer too. No password; we email you a one-time link.
      </p>
      {user ? (
        <p className="text-sm">
          You&apos;re signed in as <strong>{user.email}</strong>.
        </p>
      ) : emailEnabled() ? (
        <SignInForm next={safeNext(next)} />
      ) : (
        <p className="text-sm text-gray-700">Email sign-in isn&apos;t switched on yet. Your guides are saved on this device.</p>
      )}
      <p className="mt-8 text-xs text-gray-500">
        We only use your email to send sign-in links. It&apos;s never shown on your guides or shared.
      </p>
    </div>
  )
}
