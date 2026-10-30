'use client'

import { BallotPage, accentButton } from '@/components/ballot/Paper'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import BallotTracker from '@/components/BallotTracker'
import DistrictPicker from '@/components/DistrictPicker'
import { isSettled, orderForBallot, type BallotCandidate } from '@/components/ballot/ballot'
import { Share2, CheckCircle2, Globe, Lock, Trash2, Users } from 'lucide-react'
import {
  districtOptions,
  matchesSelection,
  parseDistrictSelection,
  type DistrictSelection,
} from '@/lib/districts'
import { formatElectionDate } from '@/lib/format'
import { useGuideEditor, type EditableGuide } from '@/components/guide/useGuideEditor'
import { useAccount } from '@/components/guide/useAccount'
import SaveStatus from '@/components/guide/SaveStatus'
import KeepGuidePrompt from '@/components/guide/KeepGuidePrompt'

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
  office: { id: string; district: string | null; candidates: BallotCandidate[] } | null
}

interface Guide extends EditableGuide {
  author: string | null
  election: {
    id: string
    title: string
    electionDate: string
    districtLookupUrl: string | null
    jurisdiction: { name: string }
    ballots: GuideBallot[]
  }
}

function districtsOf(guide: EditableGuide): DistrictSelection {
  const m = guide.metadata
  const d = m && typeof m === 'object' && 'districts' in m ? (m as { districts?: unknown }).districts : null
  return parseDistrictSelection(d && typeof d === 'object' ? (d as Record<string, unknown>) : null)
}

export default function GuidePage() {
  const params = useParams()
  const guideKey = params.id as string
  const [guide, setGuide] = useState<Guide | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        // Owners open /guide/<id>; shared links are /guide/<shareToken>
        let res = await fetch(`/api/guides?id=${encodeURIComponent(guideKey)}`)
        if (!res.ok) res = await fetch(`/api/guides?shareToken=${encodeURIComponent(guideKey)}`)
        if (res.ok) setGuide(await res.json())
      } finally {
        setLoading(false)
      }
    })()
  }, [guideKey])

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

  return <GuideView initial={guide} />
}

function GuideView({ initial }: { initial: Guide }) {
  const router = useRouter()
  const account = useAccount()
  const election = initial.election
  const editor = useGuideEditor({ initialGuide: initial, electionId: election.id })
  const guide = editor.guide ?? initial
  const { choices } = editor
  const [copied, setCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [title, setTitle] = useState(initial.title)
  const [notes, setNotes] = useState(initial.notes ?? '')
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const districts = useMemo(() => districtsOf(guide), [guide])
  const ballots = useMemo(
    () => orderForBallot(election.ballots.filter((b) => matchesSelection(b, districts))),
    [election.ballots, districts],
  )
  const pickerOptions = useMemo(
    () => districtOptions(election.ballots.map((b) => ({ ...b, district: b.office?.district }))),
    [election.ballots],
  )
  const answered = ballots.filter((b) => isSettled(choices[b.id])).length

  // Notes save themselves a moment after you stop typing (and when you leave the box)
  const saveNotes = (value: string) => {
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = null
    if (value !== (guide.notes ?? '')) editor.patchGuide({ notes: value }, "Couldn't save your notes.")
  }
  const changeNotes = (value: string) => {
    setNotes(value)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => saveNotes(value), 800)
  }
  const saveTitle = () => {
    const value = title.trim()
    if (!value) return setTitle(guide.title)
    if (value !== guide.title) editor.patchGuide({ title: value }, "Couldn't rename the guide.")
  }

  const handleDistrictChange = (type: string, code: string) => {
    const next: Record<string, string> = { ...districts }
    if (code) next[type] = code
    else delete next[type]
    editor.patchGuide({ districts: next }, "Couldn't save your districts.")
  }

  const handleShare = async () => {
    // A private guide can't be opened by others, so sharing makes it link-viewable
    if (guide.visibility === 'private' && !(await editor.patchGuide({ visibility: 'public' }, "Couldn't turn on link sharing."))) return
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
    const res = await fetch(`/api/guides?id=${guide.id}`, { method: 'DELETE' })
    if (res.ok) router.push(`/elections/${election.id}`)
    else editor.setError("Couldn't delete the guide.")
  }

  const ballotHref = `/elections/${election.id}${
    Object.keys(districts).length ? `?${new URLSearchParams(districts as Record<string, string>)}` : ''
  }`

  return (
    <BallotPage electionId={election.id}>
      <div className="container mx-auto px-4 py-8 max-w-6xl xl:max-w-[calc(100vw-2rem)] 2xl:max-w-[96rem]">
        {editor.error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {editor.error}
          </div>
        )}
        <div className="mb-6 border-[1.5px] border-t-[6px] border-ballot-ink border-t-ballot-accent bg-ballot-paper p-5 print:hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div className="flex-1 basis-64 min-w-0">
              {guide.isOwner ? (
                <input
                  aria-label="Guide name"
                  value={title}
                  maxLength={200}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  className="mb-1 w-full border-b border-transparent bg-transparent font-ballot-heading text-2xl font-bold hover:border-gray-300 focus:border-gray-500 focus:outline-none sm:text-3xl"
                />
              ) : (
                <h1 className="mb-1 font-ballot-heading text-2xl font-bold sm:text-3xl">{guide.title}</h1>
              )}
              {initial.author && <p className="text-gray-600 mb-2">By {initial.author}</p>}
              <p className="text-sm text-gray-500">
                {election.title} · {formatElectionDate(election.electionDate)}
                {guide.isOwner && guide.isDefault && ' · the guide your ballot page saves to'}
              </p>
              <Link href={ballotHref} className="text-sm text-blue-600 hover:underline">
                {guide.isOwner && guide.isDefault ? 'Back to my ballot →' : 'See candidate details and the full ballot →'}
              </Link>
            </div>
            {guide.isOwner && (
              <div className="flex items-center gap-2">
                <button onClick={handleShare} className={accentButton}>
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
            <div className="grid gap-4 border-t pt-4 font-sans sm:grid-cols-2">
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">Who can see this guide</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'private', label: 'Only me', Icon: Lock },
                    { value: 'public', label: 'Anyone with the link', Icon: Globe },
                  ].map(({ value, label, Icon }) => {
                    const active = value === 'private' ? guide.visibility === 'private' : guide.visibility !== 'private'
                    return (
                      <button
                        key={value}
                        onClick={() => editor.patchGuide({ visibility: value })}
                        aria-pressed={active}
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
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={guide.shareCommunity}
                  onChange={(e) => editor.patchGuide({ shareCommunity: e.target.checked })}
                  className="mt-1"
                />
                <span>
                  <span className="flex items-center gap-1 font-medium text-gray-700">
                    <Users className="h-4 w-4" /> Count my picks in the community tally
                  </span>
                  <span className="block text-xs text-gray-500">
                    Adds your picks, anonymously, to the &ldquo;Voter Guider users&rdquo; totals others can compare
                    against. Never your name, email or notes. Turn it off any time.
                  </span>
                </span>
              </label>
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

        {ballots.length > 0 ? (
          <BallotTracker
            ballots={ballots}
            guideTitle={guide.title}
            choices={choices}
            election={election}
            readOnly={!guide.isOwner}
            status={
              guide.isOwner ? <SaveStatus state={editor.saveState} hasGuide signedIn={!!account?.email} /> : undefined
            }
            notice={guide.isOwner ? <KeepGuidePrompt show={answered > 0} /> : undefined}
            setup={
              guide.isOwner && pickerOptions.length > 0 ? (
                <div className="print:hidden">
                  {pickerOptions.some((o) => !districts[o.type]) && (
                    <p className="mb-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950">
                      <strong>Make this match your real ballot:</strong> pick your districts. Until you do, races from
                      every district are shown, and nobody&apos;s ballot has all of them.
                    </p>
                  )}
                  <DistrictPicker
                    options={pickerOptions}
                    selection={districts}
                    lookupUrl={election.districtLookupUrl}
                    onChange={handleDistrictChange}
                  />
                </div>
              ) : null
            }
            onChoiceChange={editor.setChoice}
            onChoiceClear={editor.clearChoice}
            onStatusChange={editor.setStatus}
          onCandidateNote={editor.setCandidateNote}
          />
        ) : (
          <div className="border-[1.5px] border-ballot-ink bg-ballot-paper p-6 text-center text-gray-500">
            No ballot items available for this election yet.
          </div>
        )}

        {(guide.isOwner || guide.notes) && (
          <div className="mt-8 border-[1.5px] border-ballot-ink bg-ballot-paper p-5 font-sans print:hidden">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Research &amp; Notes</h2>
            {guide.isOwner ? (
              <textarea
                value={notes}
                onChange={(e) => changeNotes(e.target.value)}
                onBlur={() => saveNotes(notes)}
                maxLength={10000}
                placeholder="Research, thoughts, links — anything you want to remember when you vote. Saves as you type."
                className="w-full min-h-[160px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y text-sm"
              />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-line">{guide.notes}</p>
            )}
          </div>
        )}
      </div>
    </BallotPage>
  )
}
