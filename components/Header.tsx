'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image
                src="/moleses-2.png"
                alt="Moleses"
                width={60}
                height={60}
                className="object-contain"
                priority
              />
            </Link>
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">The VoTer GuidEr</h1>
                <p className="text-sm text-gray-600">Know your whole ballot</p>
              </div>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            {[
              { href: '/', label: 'Elections', active: isActive('/') || pathname.startsWith('/elections') },
              { href: '/guides', label: 'My Guides', active: isActive('/guides') || pathname.startsWith('/guide/') },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`font-medium transition-colors ${
                  item.active
                    ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-1'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}

