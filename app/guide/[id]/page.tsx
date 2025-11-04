'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BallotTracker from '@/components/BallotTracker'
import { Share2, Copy, CheckCircle2, Globe, Lock, Users, Trash2, Eye, Save } from 'lucide-react'

export default function GuidePage() {
  const params = useParams()
  const router = useRouter()
  const guideId = params.id as string
  const [guide, setGuide] = useState<any>(null)
  const [choices, setChoices] = useState<Record<string, { selection: string; notes?: string }>>({})
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [updatingVisibility, setUpdatingVisibility] = useState(false)
  const [notes, setNotes] = useState<string>('')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    fetchGuide()
  }, [guideId])

  const fetchGuide = async () => {
    try {
      // Try both shareToken and id
      const response = await fetch(`/api/guides?id=${guideId}`)
      if (!response.ok) {
        // Fallback to shareToken
        const shareResponse = await fetch(`/api/guides?shareToken=${guideId}`)
        if (shareResponse.ok) {
          const shareData = await shareResponse.json()
          setGuide(shareData)
      // Convert choices array to object
      const choicesObj: Record<string, { selection: string; notes?: string }> = {}
      shareData.choices?.forEach((choice: any) => {
        choicesObj[choice.ballotId] = {
          selection: choice.selection,
          notes: choice.notes,
        }
      })
      setChoices(choicesObj)
      setNotes(shareData.notes || '')
      return
        }
      }
      const data = await response.json()
      // Handle array response (when fetching by sessionId)
      const guideData = Array.isArray(data) ? data.find((g: any) => g.id === guideId) || data[0] : data
      setGuide(guideData)
      
      // Convert choices array to object
      const choicesObj: Record<string, { selection: string; notes?: string }> = {}
      data.choices?.forEach((choice: any) => {
        choicesObj[choice.ballotId] = {
          selection: choice.selection,
          notes: choice.notes,
        }
      })
      setChoices(choicesObj)
      setNotes(guideData.notes || '')
    } catch (error) {
      console.error('Error fetching guide:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChoiceChange = async (ballotId: string, selection: string, notes?: string) => {
    if (!guide) return

    setChoices(prev => ({
      ...prev,
      [ballotId]: { selection, notes },
    }))

    try {
      await fetch('/api/choices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guideId: guide.id,
          ballotId,
          selection,
          notes,
        }),
      })
    } catch (error) {
      console.error('Error saving choice:', error)
    }
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/guide/${guide.shareToken}`
    if (navigator.share) {
      await navigator.share({
        title: guide.title,
        url: shareUrl,
      })
      // Track analytics
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guideId: guide.id,
          eventType: 'share',
        }),
      })
    } else {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleVisibilityChange = async (newVisibility: string) => {
    if (!guide) return
    
    setUpdatingVisibility(true)
    try {
      const response = await fetch('/api/guides', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: guide.id,
          visibility: newVisibility,
        }),
      })

      if (response.ok) {
        const updatedGuide = await response.json()
        setGuide(updatedGuide)
      }
    } catch (error) {
      console.error('Error updating visibility:', error)
      alert('Failed to update visibility')
    } finally {
      setUpdatingVisibility(false)
    }
  }

  const handleDelete = async () => {
    if (!guide || !showDeleteConfirm) return

    try {
      const response = await fetch(`/api/guides?id=${guide.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete guide')
      }
    } catch (error) {
      console.error('Error deleting guide:', error)
      alert('Failed to delete guide')
    }
  }

  const handleNotesSave = async () => {
    if (!guide) return

    setSavingNotes(true)
    try {
      const response = await fetch('/api/guides', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: guide.id,
          notes: notes,
        }),
      })

      if (response.ok) {
        const updatedGuide = await response.json()
        setGuide(updatedGuide)
      } else {
        alert('Failed to save notes')
      }
    } catch (error) {
      console.error('Error saving notes:', error)
      alert('Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!guide) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Guide not found</h2>
          <p className="text-gray-600">The guide you're looking for doesn't exist or has been deleted.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{guide.title}</h1>
              {guide.author && (
                <p className="text-gray-600 mb-2">By {guide.author}</p>
              )}
              <div className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
                <span>
                  {guide.jurisdiction?.name || guide.election?.jurisdiction?.name || 'Unknown'}, {guide.jurisdiction?.state || guide.election?.jurisdiction?.state || ''} • 
                  {' '}{guide.election?.electionDate ? new Date(guide.election.electionDate).toLocaleDateString() : 'Date TBD'}
                </span>
                {guide.election?.ballots?.some((b: any) => b.metadata?.isSample || b.title?.includes('(SAMPLE)')) && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded font-medium">
                    ⚠️ Sample Data - Not Real Ballot Items
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="w-5 h-5" />
                    Share
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Delete
              </button>
            </div>
          </div>

          {/* Visibility Toggle */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleVisibilityChange('private')}
                disabled={updatingVisibility}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  guide.visibility === 'private'
                    ? 'bg-gray-200 text-gray-900 font-semibold'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Lock className="w-4 h-4" />
                Private
              </button>
              <button
                onClick={() => handleVisibilityChange('friends')}
                disabled={updatingVisibility}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  guide.visibility === 'friends'
                    ? 'bg-blue-200 text-blue-900 font-semibold'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Users className="w-4 h-4" />
                Friends
              </button>
              <button
                onClick={() => handleVisibilityChange('public')}
                disabled={updatingVisibility}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  guide.visibility === 'public'
                    ? 'bg-green-200 text-green-900 font-semibold'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                Public
              </button>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Voter Guide?</h3>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete "{guide.title}"? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Free-form Notes Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Research & Notes</h2>
            <button
              onClick={handleNotesSave}
              disabled={savingNotes}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Save your research, thoughts, and information here. These notes will be preserved for future elections.
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write your research, thoughts, candidate positions, policy notes, or any other information you want to save for future elections..."
            className="w-full min-h-[200px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-2">
            💡 Tip: These notes are saved with your guide and can be referenced for future elections.
          </p>
        </div>

        {guide.election?.ballots && guide.election.ballots.length > 0 ? (
          <BallotTracker
            ballots={guide.election.ballots}
            guideId={guide.id}
            choices={choices}
            onChoiceChange={handleChoiceChange}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
            No ballot items available for this election yet.
          </div>
        )}
      </div>
    </div>
  )
}

