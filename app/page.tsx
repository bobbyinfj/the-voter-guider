'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import RealUSMap from '@/components/map/RealUSMap'
import { MapPin, Calendar, FileText, ArrowRight } from 'lucide-react'

interface Jurisdiction {
  id: string
  name: string
  state: string
  fipsCode?: string
}

interface Election {
  id: string
  title: string
  electionDate: string
  type: string
  jurisdiction: {
    name: string
    state: string
  }
  _count?: {
    ballots: number
  }
}

export default function HomePage() {
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([])
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string | null>(null)
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJurisdictions()
  }, [])

  useEffect(() => {
    if (selectedJurisdiction) {
      fetchElections(selectedJurisdiction)
    }
  }, [selectedJurisdiction])

  const fetchJurisdictions = async () => {
    try {
      const response = await fetch('/api/jurisdictions')
      const data = await response.json()
      if (response.ok && Array.isArray(data)) {
        setJurisdictions(data)
      } else {
        const errorMessage = (data as any)?.error || 'Unknown error'
        console.error('Error fetching jurisdictions:', errorMessage)
        setJurisdictions([])
      }
    } catch (error) {
      console.error('Error fetching jurisdictions:', error)
      setJurisdictions([])
    } finally {
      setLoading(false)
    }
  }

  const fetchElections = async (jurisdictionId: string) => {
    try {
      const response = await fetch(`/api/elections?jurisdictionId=${jurisdictionId}&status=upcoming`)
      const data = await response.json()
      if (response.ok && Array.isArray(data)) {
        setElections(data)
      } else {
        const errorMessage = (data as any)?.error || 'Unknown error'
        console.error('Error fetching elections:', errorMessage)
        setElections([])
      }
    } catch (error) {
      console.error('Error fetching elections:', error)
      setElections([])
    }
  }

  const handleJurisdictionSelect = (jurisdictionId: string) => {
    setSelectedJurisdiction(jurisdictionId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-6 mb-6">
            <Image
              src="/moleses-1.png"
              alt="Moleses"
              width={200}
              height={133}
              className="object-contain"
              priority
            />
            <div>
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                Track Your Voting Choices
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Create personalized voter guides for upcoming elections. Save your choices, 
                add notes, and easily share with others.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Real Map */}
        <div className="mb-12">
          <h3 className="text-2xl font-semibold text-center mb-6 text-gray-800">
            Select Your Jurisdiction
          </h3>
          <RealUSMap
            selectedJurisdiction={selectedJurisdiction || undefined}
            onJurisdictionSelect={handleJurisdictionSelect}
            jurisdictions={jurisdictions}
          />
        </div>

        {/* Elections List */}
        {selectedJurisdiction && elections.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-semibold mb-6 text-gray-800">
              Upcoming Elections
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {elections.map((election) => (
                <Link
                  key={election.id}
                  href={`/guide/new?electionId=${election.id}`}
                  className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-blue-500 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600">
                      {election.title}
                    </h4>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{election.jurisdiction.name}, {election.jurisdiction.state}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(election.electionDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}</span>
                    </div>
                    {election._count && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{election._count.ballots} ballot items</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-16 mb-12">
          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Save & Return</h3>
            <p className="text-gray-600">
              Your choices are automatically saved. Return anytime to review or update your guide.
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Easy Sharing</h3>
            <p className="text-gray-600">
              Share your guide with friends and family using a simple link. No account required.
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Future Proof</h3>
            <p className="text-gray-600">
              Built to handle elections across multiple jurisdictions and election cycles.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/guide/new"
            className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Create Your First Guide
          </Link>
        </div>
      </main>
    </div>
  )
}
