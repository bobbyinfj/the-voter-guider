'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import RealUSMap from '@/components/map/RealUSMap'
import PrecinctMap from '@/components/map/PrecinctMap'
import BallotTracker from '@/components/BallotTracker'

interface Jurisdiction {
  id: string
  name: string
  state: string
  countyName?: string
  fipsCode?: string
  precincts?: Array<{
    id: string
    name: string
    number?: string
    centerLat?: number
    centerLng?: number
  }>
}

export default function NewGuidePage() {
  const router = useRouter()
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([])
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string | null>(null)
  const [selectedPrecinct, setSelectedPrecinct] = useState<string | null>(null)
  const [elections, setElections] = useState<any[]>([])
  const [selectedElection, setSelectedElection] = useState<any | null>(null)
  const [guideTitle, setGuideTitle] = useState('')
  const [guideAuthor, setGuideAuthor] = useState('')
  const [guideId, setGuideId] = useState<string | null>(null)
  const [choices, setChoices] = useState<Record<string, { selection: string; notes?: string }>>({})
  const [showPrecinctMap, setShowPrecinctMap] = useState(false)

  // Fetch jurisdictions on mount
  useEffect(() => {
    const fetchJurisdictions = async () => {
      try {
        const response = await fetch('/api/jurisdictions')
        const data = await response.json()
        if (response.ok && Array.isArray(data)) {
          setJurisdictions(data)
        }
      } catch (error) {
        console.error('Error fetching jurisdictions:', error)
      }
    }
    fetchJurisdictions()
  }, [])

  const handleJurisdictionSelect = async (jurisdictionId: string) => {
    setSelectedJurisdiction(jurisdictionId)
    // Fetch elections for this jurisdiction
    try {
      const response = await fetch(`/api/elections?jurisdictionId=${jurisdictionId}&status=upcoming`)
      const data = await response.json()
      if (response.ok && Array.isArray(data)) {
        setElections(data)
        if (data.length > 0) {
          setSelectedElection(data[0])
        }
      } else {
        const errorMessage = (data as any)?.error || 'Unknown error'
        console.error('Error fetching elections:', errorMessage)
        setElections([])
        setSelectedElection(null)
      }
    } catch (error) {
      console.error('Error fetching elections:', error)
      setElections([])
      setSelectedElection(null)
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
          precinctId: selectedPrecinct || undefined, // Use precinct if available
        }),
      })
      const guide = await response.json()
      setGuideId(guide.id)
      router.push(`/guide/${guide.id}`)
    } catch (error) {
      console.error('Error creating guide:', error)
    }
  }

  const handlePrecinctSelect = (precinctId: string) => {
    setSelectedPrecinct(precinctId)
    setShowPrecinctMap(false)
  }

  const handleFetchRealBallot = async () => {
    if (!selectedJurisdiction) {
      alert('Please select a jurisdiction first')
      return
    }

    const address = prompt('Enter your full address to fetch real ballot data:\n(e.g., "123 Main St, Monterey Park, CA 91754")')
    if (!address || !address.trim()) return

    try {
      const response = await fetch('/api/fetch-real-ballot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.trim(),
          jurisdictionId: selectedJurisdiction,
        }),
      })

      const data = await response.json()
      if (response.ok && data.success) {
        // Refresh elections list to show the updated data
        await handleJurisdictionSelect(selectedJurisdiction)
        alert(`✅ Successfully fetched real ballot data!\n\nFound ${data.ballots?.length || 0} ballot items.\n\nRefresh the page to see the updated elections.`)
      } else {
        const errorMsg = data.error || 'Failed to fetch ballot data'
        const details = data.message || data.details || ''
        const suggestion = data.suggestion || ''
        alert(`❌ ${errorMsg}\n\n${details}\n\n${suggestion}\n\nNote: You need a Google Civic API key in .env.local to use this feature.`)
      }
    } catch (error) {
      console.error('Error fetching real ballot:', error)
      alert(`Error fetching real ballot data: ${error instanceof Error ? error.message : 'Unknown error'}\n\nCheck the console for details.`)
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
      {/* Header */}
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Create New Voter Guide</h1>
          <p className="text-gray-600 mt-2">Select your jurisdiction and election to create a personalized voting guide</p>
        </div>

        {!selectedJurisdiction ? (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Select Your Jurisdiction</h2>
            <RealUSMap
              jurisdictions={jurisdictions}
              onJurisdictionSelect={handleJurisdictionSelect}
              selectedJurisdiction={selectedJurisdiction || undefined}
            />
          </div>
        ) : !selectedElection ? (
          <div>
            {/* Show Precinct Selection First */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">Select Your Precinct (Optional)</h2>
              <p className="text-sm text-gray-600 mb-4">
                Select your specific precinct for more accurate ballot information, or skip to see all elections.
              </p>
              
              <PrecinctMap
                jurisdictionId={selectedJurisdiction}
                onPrecinctSelect={handlePrecinctSelect}
                selectedPrecinctId={selectedPrecinct || undefined}
              />
              
              {selectedPrecinct && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✓ Precinct selected. You can continue to select an election below.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-700">Select Election</h2>
                <button
                  onClick={handleFetchRealBallot}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  title="Fetch real ballot data from Google Civic Information API"
                >
                  📥 Fetch Real Ballot Data
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Current elections are sample data. Click "Fetch Real Ballot Data" to get your actual ballot items.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {elections.length > 0 ? (
                  elections.map((election) => (
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
                  ))
                ) : (
                  <div className="col-span-2 p-6 bg-gray-50 rounded-lg text-center">
                    <p className="text-gray-600">No elections found for this jurisdiction.</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Elections may need to be created or data needs to be fetched from APIs.
                    </p>
                  </div>
                )}
              </div>
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

