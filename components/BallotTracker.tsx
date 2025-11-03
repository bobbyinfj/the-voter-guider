'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, FileText, Share2, Copy, Download } from 'lucide-react'

interface BallotItem {
  id: string
  number?: string
  title: string
  description?: string
  type: string
  options?: any
}

interface BallotTrackerProps {
  ballots: BallotItem[]
  guideId: string
  choices: Record<string, { selection: string; notes?: string }>
  onChoiceChange: (ballotId: string, selection: string, notes?: string) => void
}

export default function BallotTracker({ ballots, guideId, choices, onChoiceChange }: BallotTrackerProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/guide/${guideId}`
    if (navigator.share) {
      await navigator.share({
        title: 'My Voter Guide',
        url: shareUrl,
      })
    } else {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleExport = () => {
    const data = {
      guideId,
      ballots: ballots.map(ballot => ({
        ...ballot,
        choice: choices[ballot.id],
      })),
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `voter-guide-${guideId}.json`
    a.click()
  }

  const completionPercentage = ballots.length > 0
    ? Math.round((Object.keys(choices).length / ballots.length) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-800">Your Voting Choices</h3>
          <div className="text-sm font-medium text-gray-600">
            {Object.keys(choices).length} of {ballots.length} completed
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white hover:bg-gray-50 rounded-md border border-gray-300"
          >
            <Share2 className="w-4 h-4" />
            {copied ? 'Copied!' : 'Share'}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white hover:bg-gray-50 rounded-md border border-gray-300"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Ballot Items */}
      <div className="space-y-4">
        {ballots.map((ballot) => {
          const choice = choices[ballot.id]
          const isCompleted = !!choice

          return (
            <div
              key={ballot.id}
              className={`bg-white rounded-lg border-2 p-4 transition-all ${
                isCompleted
                  ? 'border-green-200 bg-green-50/30'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {ballot.number && (
                      <span className="font-semibold text-blue-600">{ballot.number}</span>
                    )}
                    <h4 className="text-lg font-semibold text-gray-800">{ballot.title}</h4>
                    {isCompleted && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  {ballot.description && (
                    <p className="text-sm text-gray-600 mt-1">{ballot.description}</p>
                  )}
                </div>
              </div>

              {/* Choice Options */}
              <div className="space-y-2">
                {ballot.type === 'proposition' || ballot.type === 'measure' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onChoiceChange(ballot.id, 'YES')}
                      className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                        choice?.selection === 'YES'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 hover:bg-green-100 text-gray-700'
                      }`}
                    >
                      YES
                    </button>
                    <button
                      onClick={() => onChoiceChange(ballot.id, 'NO')}
                      className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
                        choice?.selection === 'NO'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 hover:bg-red-100 text-gray-700'
                      }`}
                    >
                      NO
                    </button>
                    <button
                      onClick={() => onChoiceChange(ballot.id, 'ABSTAIN')}
                      className={`px-4 py-2 rounded-md font-medium transition-all ${
                        choice?.selection === 'ABSTAIN'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-100 hover:bg-yellow-100 text-gray-700'
                      }`}
                    >
                      Abstain
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ballot.options?.map((option: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => onChoiceChange(ballot.id, option)}
                        className={`w-full text-left px-4 py-2 rounded-md transition-all ${
                          choice?.selection === option
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 hover:bg-blue-50 text-gray-700'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {/* Notes Section */}
                {isCompleted && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <textarea
                      placeholder="Add notes about your choice..."
                      value={choice?.notes || ''}
                      onChange={(e) => onChoiceChange(ballot.id, choice.selection, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

