'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import USMap from '@/components/map/USMap'
import BallotTracker from '@/components/BallotTracker'

export default function NewGuidePage() {
  const router = useRouter()
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string | null>(null)
  const [elections, setElections] = useState<any[]>([])
  const [selectedElection, setSelectedElection] = useState<any | null>(null)
  const [guideTitle, setGuideTitle] = useState('')
  const [guideAuthor, setGuideAuthor] = useState('')
  const [guideId, setGuideId] = useState<string | null>(null)
  const [choices, setChoices] = useState<Record<string, { selection: string; notes?: string }>>({})

  const handleJurisdictionSelect = async (jurisdictionId: string) => {
    setSelectedJurisdiction(jurisdictionId)
    // Fetch elections for this jurisdiction
    try {
      const response = await fetch(`/api/elections?jurisdictionId=${jurisdictionId}&status=upcoming`)
      const data = await response.json()
      setElections(data)
      if (data.length > 0) {
        setSelectedElection(data[0])
      }
    } catch (error) {
      console.error('Error fetching elections:', error)
    }
  }

  const handleCreateGuide = async () => {
    if (!selectedElection || !guideTitle) return

    try {
      const response = await fetch('/api/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: guideTitle,
          author: guideAuthor,
          electionId: selectedElection.id,
          jurisdictionId: selectedJurisdiction,
        }),
      })
      const guide = await response.json()
      setGuideId(guide.id)
      router.push(`/guide/${guide.id}`)
    } catch (error) {
      console.error('Error creating guide:', error)
    }
  }

  const handleChoiceChange = async (ballotId: string, selection: string, notes?: string) => {
    if (!guideId) return

    setChoices(prev => ({
      ...prev,
      [ballotId]: { selection, notes },
    }))

    try {
      await fetch('/api/choices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guideId,
          ballotId,
          selection,
          notes,
        }),
      })
    } catch (error) {
      console.error('Error saving choice:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Create New Voter Guide</h1>

        {!selectedJurisdiction ? (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Select Your Jurisdiction</h2>
            <USMap
              onJurisdictionSelect={handleJurisdictionSelect}
            />
          </div>
        ) : !selectedElection ? (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Select Election</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {elections.map((election) => (
                <button
                  key={election.id}
                  onClick={() => setSelectedElection(election)}
                  className="bg-white rounded-lg border-2 border-gray-200 p-6 text-left hover:border-blue-500 transition-colors"
                >
                  <h3 className="text-lg font-semibold mb-2">{election.title}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(election.electionDate).toLocaleDateString()}
                  </p>
                  {election.ballots && (
                    <p className="text-sm text-gray-500 mt-2">
                      {election.ballots.length} ballot items
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : !guideId ? (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Guide Details</h2>
            <div className="bg-white rounded-lg p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guide Title *
                </label>
                <input
                  type="text"
                  value={guideTitle}
                  onChange={(e) => setGuideTitle(e.target.value)}
                  placeholder="My 2025 Voting Guide"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name (optional)
                </label>
                <input
                  type="text"
                  value={guideAuthor}
                  onChange={(e) => setGuideAuthor(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleCreateGuide}
                disabled={!guideTitle}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Create Guide
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-700">{guideTitle}</h2>
            {selectedElection.ballots && (
              <BallotTracker
                ballots={selectedElection.ballots}
                guideId={guideId}
                choices={choices}
                onChoiceChange={handleChoiceChange}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

