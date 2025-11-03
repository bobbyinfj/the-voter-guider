'use client'

import { useState, useEffect } from 'react'
import { Plus, FileText, Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'

interface Guide {
  id: string
  title: string
  author?: string
  createdAt: string
  updatedAt: string
  election: {
    title: string
    electionDate: string
    jurisdiction: {
      name: string
      state: string
    }
  }
  _count?: {
    choices: number
  }
}

export default function GuideList() {
  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGuides()
  }, [])

  const fetchGuides = async () => {
    try {
      const response = await fetch('/api/guides')
      const data = await response.json()
      setGuides(data)
    } catch (error) {
      console.error('Error fetching guides:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Your Voter Guides</h2>
        <Link
          href="/guide/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Guide
        </Link>
      </div>

      {guides.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No voter guides yet</p>
          <p className="text-sm text-gray-500">Create your first guide to start tracking your voting choices</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <Link
              key={guide.id}
              href={`/guide/${guide.id}`}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{guide.title}</h3>
              {guide.author && (
                <p className="text-sm text-gray-600 mb-2">By {guide.author}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <MapPin className="w-4 h-4" />
                <span>{guide.election.jurisdiction.name}, {guide.election.jurisdiction.state}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <Calendar className="w-4 h-4" />
                <span>{new Date(guide.election.electionDate).toLocaleDateString()}</span>
              </div>
              {guide._count && (
                <div className="text-sm text-blue-600 font-medium">
                  {guide._count.choices} choices saved
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

