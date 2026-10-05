'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import BallotTracker from '@/components/BallotTracker'
import { Share2, CheckCircle2, Globe, Lock, Trash2, Save } from 'lucide-react'
import { matchesSelection, parseDistrictSelection, type DistrictSelection } from '@/lib/districts'
import { formatElectionDate } from '@/lib/format'

interface GuideBallot {
  id: string
  number: string | null
  title: string
  description: string | null
  type: string
  options: unknown
  metadata: unknown
  districtType: string | null
  districtCode: string | null
}

interface Guide {
  id: string
  title: string
  author: string | null
  notes: string | null
  shareToken: string
  visibility: string
  isOwner: boolean
  metadata: unknown
  choices: { ballotId: string; selection: string; notes: string | null }[]
  election: {
    id: string
    title: string
    electionDate: string
    jurisdiction: { name: string }
    ballots: GuideBallot[]
  }
}

const LEVEL_ORDER: Record<string, number> = { state: 0, county: 1, city: 2, district: 3 }

function meta(ballot: GuideBallot): { level?: string; sortOrder?: number } {
  return ballot.metadata && typeof ballot.metadata === 'object' ? (ballot.metadata as { level?: string; sortOrder?: number }) : {}
}

// Races in ballot order, then measures grouped statewide → county → city → district
function orderBallots(ballots: GuideBallot[]): GuideBallot[] {
  const races = ballots
    .filter((b) => b.type === 'candidate')
    .sort((a, b) => (meta(a).sortOrder ?? 100) - (meta(b).sortOrder ?? 100))
  const measures = ballots
    .filter((b) => b.type !== 'candidate')
    .sort(
      (a, b) =>
        (LEVEL_ORDER[meta(a).level ?? 'state'] ?? 9) - (LEVEL_ORDER[meta(b).level ?? 'state'] ?? 9) ||
        (a.number ?? '').localeCompare(b.number ?? '', undefined, { numeric: true }),
    )
  return [...races, ...measures]
}

function districtsOf(guide: Guide): DistrictSelection {
  const m = guide.metadata
  const d = m && typeof m === 'object' && 'districts' in m ? (m as { districts?: unknown }).districts : null
  return parseDistrictSelection(d && typeof d === 'object' ? (d as Record<string, unknown>) : null)
}

export default function GuidePage() {
  const params = useParams()
  const router = useRouter()
  const guideKey = params.id as string
  const [guide, setGuide] = useState<Guide | null>(null)
  const [choices, setChoices] = useState<Record<string, { selection: string; notes?: string }>>({})
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applyGuide = useCallback((data: Guide) => {
    setGuide(data)
    setNotes(data.notes ?? '')
    setChoices(
      Object.fromEntries(
        data.choices.map((c) => [c.ballotId, { selection: c.selection, notes: c.notes ?? undefined }]),
      ),
    )
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        // Owners open /guide/<id>; shared links are /guide/<shareToken>
        let res = await fetch(`/api/guides?id=${encodeURIComponent(guideKey)}`)
        if (!res.ok) res = await fetch(`/api/guides?shareToken=${encodeURIComponent(guideKey)}`)
        if (res.ok) applyGuide(await res.json())
      } finally {
        setLoading(false)
      }
    })()
  }, [guideKey, applyGuide])

  const districts = useMemo(() => (guide ? districtsOf(guide) : {}), [guide])
  const ballots = useMemo(
    () => (guide ? orderBallots(guide.election.ballots.filter((b) => matchesSelection(b, districts))) : []),
    [guide, districts],
  )

  const patchGuide = async (body: Record<string, unknown>) => {
    if (!guide) return false
    const res = await fetch('/api/guides', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: guide.id, ...body }),
    })
    if (res.ok) applyGuide(await res.json())
    return res.ok
  }

  const handleChoiceChange = async (ballotId: string, selection: string, choiceNotes?: string) => {
    if (!guide?.isOwner) return
    const previous = choices[ballotId]
    setChoices((prev) => ({ ...prev, [ballotId]: { selection, notes: choiceNotes } }))
    const res = await fetch('/api/choices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guideId: guide.id, ballotId, selection, notes: choiceNotes }),
    })
    if (!res.ok) {
      setChoices((prev) => {
        const next = { ...prev }
        if (previous) next[ballotId] = previous
        else delete next[ballotId]
        return next
      })
      setError("Couldn't save that choice. Please try again.")
    }
  }

  const handleShare = async () => {
    if (!guide) return
    // A private guide can't be opened by others, so sharing makes it link-viewable
    if (guide.visibility === 'private') {
      setUpdating(true)
      const ok = await patchGuide({ visibility: 'public' })
      setUpdating(false)
      if (!ok) return setError("Couldn't turn on link sharing.")
    }
    const shareUrl = `${window.location.origin}/guide/${guide.shareToken}`
    if (navigator.share) {
      await navigator.share({ title: guide.title, url: shareUrl }).catch(() => undefined)
    } else {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guideId: guide.id, eventType: 'share' }),
    }).catch(() => undefined)
  }

  const handleDelete = async () => {
    if (!guide) return
    const res = await fetch(`/api/guides?id=${guide.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/guides')
    else setError("Couldn't delete the guide.")
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
      <div className="min-h-screen bg-gray-50">
        <div className="text-center py-24">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Guide not found</h2>
          <p className="text-gray-600">
            This guide doesn&apos;t exist, was deleted, or its owner hasn&apos;t shared it.
          </p>
        </div>
      </div>
    )
  }

  const ballotHref = `/elections/${guide.election.id}${
    Object.keys(districts).length ? `?${new URLSearchParams(districts as Record<string, string>)}` : ''
  }`

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{guide.title}</h1>
              {guide.author && <p className="text-gray-600 mb-2">By {guide.author}</p>}
              <p className="text-sm text-gray-500">
                {guide.election.title} · {formatElectionDate(guide.election.electionDate)}
              </p>
              <Link href={ballotHref} className="text-sm text-blue-600 hover:underline">
                See candidate details and the full ballot →
              </Link>
            </div>
            {guide.isOwner && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  disabled={updating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {copied ? <CheckCircle2 className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                  {copied ? 'Link copied!' : 'Share'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete
                </button>
              </div>
            )}
          </div>

          {guide.isOwner && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Who can see this guide</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'private', label: 'Only me', Icon: Lock },
                  { value: 'public', label: 'Anyone with the link', Icon: Globe },
                ].map(({ value, label, Icon }) => {
                  const active = value === 'private' ? guide.visibility === 'private' : guide.visibility !== 'private'
                  return (
                    <button
                      key={value}
                      onClick={() => patchGuide({ visibility: value })}
                      disabled={updating}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        active ? 'bg-blue-100 text-blue-900 font-semibold' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete this guide?</h3>
                <p className="text-gray-600 mb-4">
                  &ldquo;{guide.title}&rdquo; and all its choices will be deleted. This can&apos;t be undone.
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

        {(guide.isOwner || guide.notes) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Research &amp; Notes</h2>
              {guide.isOwner && (
                <button
                  onClick={async () => {
                    setSavingNotes(true)
                    if (!(await patchGuide({ notes }))) setError("Couldn't save your notes.")
                    setSavingNotes(false)
                  }}
                  disabled={savingNotes || notes === (guide.notes ?? '')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              )}
            </div>
            {guide.isOwner ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={10000}
                placeholder="Research, thoughts, links — anything you want to remember when you vote."
                className="w-full min-h-[160px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y text-sm"
              />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-line">{guide.notes}</p>
            )}
          </div>
        )}

        {ballots.length > 0 ? (
          <BallotTracker
            ballots={ballots}
            guideTitle={guide.title}
            choices={choices}
            readOnly={!guide.isOwner}
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
