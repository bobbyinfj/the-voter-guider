'use client'

import Header from '@/components/Header'
import GuideList from '@/components/GuideList'

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      <div className="container mx-auto px-4 py-8">
        <GuideList />
      </div>
    </div>
  )
}

