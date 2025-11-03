'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import BallotTracker from '@/components/BallotTracker'
import { Share2, Copy, CheckCircle2 } from 'lucide-react'

export default function GuidePage() {
  const params = useParams()
  const guideId = params.id as string
  const [guide, setGuide] = useState<any>(null)
  const [choices, setChoices] = useState<Record<string, { selection: string; notes?: string }>>({})
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGuide()
  }, [guideId])

  const fetchGuide = async () => {
    try {
      const response = await fetch(`/api/guides?shareToken=${guideId}`)
      const data = await response.json()
      setGuide(data)
      
      // Convert choices array to object
      const choicesObj: Record<string, { selection: string; notes?: string }> = {}
      data.choices?.forEach((choice: any) => {
        choicesObj[choice.ballotId] = {
          selection: choice.selection,
          notes: choice.notes,
        }
      })
      setChoices(choicesObj)
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
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{guide.title}</h1>
              {guide.author && (
                <p className="text-gray-600 mb-2">By {guide.author}</p>
              )}
              <div className="text-sm text-gray-500">
                {guide.jurisdiction.name}, {guide.jurisdiction.state} • 
                {' '}{new Date(guide.election.electionDate).toLocaleDateString()}
              </div>
            </div>
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
          </div>
        </div>

        {guide.election.ballots && (
          <BallotTracker
            ballots={guide.election.ballots}
            guideId={guide.id}
            choices={choices}
            onChoiceChange={handleChoiceChange}
          />
        )}
      </div>
    </div>
  )
}

