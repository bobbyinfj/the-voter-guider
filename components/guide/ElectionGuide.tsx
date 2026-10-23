'use client'

import type { QuizOnBallot } from '@/lib/quiz/ballot'
import type { BadgeMap } from '@/lib/scorecard'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FilePlus2, Share2 } from 'lucide-react'
import BallotTracker from '@/components/BallotTracker'
import DistrictPicker from '@/components/DistrictPicker'
import { orderForBallot, type BallotItem } from '@/components/ballot/ballot'
import { districtOptions, matchesSelection, parseDistrictSelection, scopesOf, type DistrictOption, type DistrictSelection } from '@/lib/districts'
import { useGuideEditor, type EditableGuide } from './useGuideEditor'
import { useAccount } from './useAccount'
import SaveStatus from './SaveStatus'
import KeepGuidePrompt from './KeepGuidePrompt'

type Ballot = BallotItem & { districtType: string | null; districtCode: string | null }

interface Props {
  election: { id: string; title: string; electionDate: string; districtLookupUrl: string | null; jurisdiction: { name: string } }
  ballots: Ballot[]
  pickerOptions: DistrictOption[]
  // Your default guide for this election, if you've marked anything yet
  initialGuide: EditableGuide | null
  // Your other guides for this election
  otherGuides: { id: string; title: string }[]
  urlDistricts: DistrictSelection
  // Past elections: show the ballot, no marking
  readOnly?: boolean
  // What your quiz answers matched in each race, by ballot id
  quiz?: Record<string, QuizOnBallot> | null
  // Published guides' picks, shown as badges in the Expanded view
  badges?: BadgeMap | null
}

function savedDistricts(guide: EditableGuide | null): DistrictSelection {
  const m = guide?.metadata
  const d = m && typeof m === 'object' && 'districts' in m ? (m as { districts?: unknown }).districts : null
  return parseDistrictSelection(d && typeof d === 'object' ? (d as Record<string, unknown>) : null)
}

// A guide saved before the election covered several cities has no city: take the one city its
// picks (or its council district) belong to, so its "to go" count doesn't suddenly grow
function withCity(selection: DistrictSelection, ballots: Ballot[], guide: EditableGuide | null): DistrictSelection {
  if (selection.city || !ballots.some((b) => scopesOf(b).some(([t]) => t === 'city'))) return selection
  const cityOf = (b: Ballot) => scopesOf(b).find(([t]) => t === 'city')?.[1]
  const picked = new Set((guide?.choices ?? []).map((c) => c.ballotId))
  const cities = new Set(
    ballots
      .filter((b) => picked.has(b.id) || scopesOf(b).some(([t, code]) => t !== 'city' && selection[t] === code))
      .map(cityOf)
      .filter((c): c is string => !!c),
  )
  return cities.size === 1 ? { ...selection, city: [...cities][0] } : selection
}

// The election's ballot, and your guide: whatever you mark here saves as you go
export default function ElectionGuide({
  election,
  ballots,
  pickerOptions,
  initialGuide,
  otherGuides,
  urlDistricts,
  readOnly = false,
  quiz,
  badges,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const account = useAccount()
  // The URL wins (shared links); otherwise the districts saved on your guide
  const [districts, setDistricts] = useState<DistrictSelection>(() =>
    Object.keys(urlDistricts).length ? urlDistricts : withCity(savedDistricts(initialGuide), ballots, initialGuide),
  )
  // With several cities on one election: pick the city first, then only its districts are offered
  const options = useMemo(() => {
    const labeled = ballots.map((b) => ({ ...b, district: b.office?.district }))
    const all = districtOptions(labeled)
    const city = all.find((o) => o.type === 'city')
    if (!city) return pickerOptions.length ? pickerOptions : all
    if (!districts.city) return [city]
    return [city, ...districtOptions(labeled.filter((b) => matchesSelection(b, { city: districts.city }))).filter((o) => o.type !== 'city')]
  }, [ballots, districts.city, pickerOptions])
  const editor = useGuideEditor({ initialGuide, electionId: election.id, districts })
  const { guide, choices } = editor
  const [creating, setCreating] = useState(false)

  const items = useMemo(() => orderForBallot(ballots.filter((b) => matchesSelection(b, districts))), [ballots, districts])
  const answered = items.filter((b) => choices[b.id]).length

  const changeDistrict = (type: string, code: string) => {
    // A new city starts its districts over (Monterey Park's council districts aren't Montebello's)
    const next: Record<string, string> = type === 'city' ? {} : { ...districts }
    if (code) next[type] = code
    else delete next[type]
    setDistricts(next)
    const query = new URLSearchParams(next as Record<string, string>).toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    if (guide) editor.patchGuide({ districts: next }, "Couldn't save your districts.")
  }

  const newGuide = async () => {
    setCreating(true)
    const res = await fetch('/api/guides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        electionId: election.id,
        title: `Guide ${otherGuides.length + 2}: ${election.title}`,
        metadata: { districts },
      }),
    }).catch(() => null)
    if (res?.ok) router.push(`/guide/${(await res.json()).id}`)
    else {
      setCreating(false)
      editor.setError("Couldn't create a new guide. Please try again.")
    }
  }

  return (
    <div className="space-y-3">
      {editor.error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {editor.error}
        </div>
      )}
      {!readOnly && <div className="flex flex-wrap items-center justify-between gap-2 font-sans text-sm print:hidden">
        <p className="text-gray-700">
          <strong>This is your guide.</strong> Mark your picks right on the ballot; they save as you go.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {otherGuides.map((g) => (
            <Link key={g.id} href={`/guide/${g.id}`} className="text-blue-700 hover:underline">
              {g.title}
            </Link>
          ))}
          {guide && (
            <Link href={`/guide/${guide.id}`} className="inline-flex items-center gap-1 text-blue-700 hover:underline">
              <Share2 className="h-4 w-4" /> Notes &amp; sharing
            </Link>
          )}
          <button
            type="button"
            onClick={newGuide}
            disabled={creating}
            className="inline-flex items-center gap-1 text-blue-700 hover:underline disabled:opacity-50"
          >
            <FilePlus2 className="h-4 w-4" /> New guide
          </button>
        </div>
      </div>}
      {items.length === 0 ? (
        <p className="text-sm italic text-gray-600">No contests loaded yet.</p>
      ) : (
        <BallotTracker
          ballots={items}
          guideTitle={guide?.title ?? `My ballot: ${election.title}`}
          election={election}
          choices={choices}
          readOnly={readOnly}
          quiz={quiz}
          badges={badges}
          status={<SaveStatus state={editor.saveState} hasGuide={!!guide} signedIn={!!account?.email} />}
          notice={<KeepGuidePrompt show={answered > 0} />}
          setup={
            pickerOptions.length > 0 ? (
              <div className="print:hidden">
                <DistrictPicker
                  options={options}
                  selection={districts}
                  lookupUrl={election.districtLookupUrl}
                  onChange={changeDistrict}
                />
              </div>
            ) : null
          }
          onChoiceChange={editor.setChoice}
          onChoiceClear={editor.clearChoice}
          onStatusChange={editor.setStatus}
          onCandidateNote={editor.setCandidateNote}
        />
      )}
    </div>
  )
}
