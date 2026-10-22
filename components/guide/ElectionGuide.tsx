'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FilePlus2, Share2 } from 'lucide-react'
import BallotTracker from '@/components/BallotTracker'
import DistrictPicker from '@/components/DistrictPicker'
import { orderForBallot, type BallotItem } from '@/components/ballot/ballot'
import { matchesSelection, parseDistrictSelection, type DistrictOption, type DistrictSelection } from '@/lib/districts'
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
}

function savedDistricts(guide: EditableGuide | null): DistrictSelection {
  const m = guide?.metadata
  const d = m && typeof m === 'object' && 'districts' in m ? (m as { districts?: unknown }).districts : null
  return parseDistrictSelection(d && typeof d === 'object' ? (d as Record<string, unknown>) : null)
}

// The election's ballot, and your guide: whatever you mark here saves as you go
export default function ElectionGuide({ election, ballots, pickerOptions, initialGuide, otherGuides, urlDistricts, readOnly = false }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const account = useAccount()
  // The URL wins (shared links); otherwise the districts saved on your guide
  const [districts, setDistricts] = useState<DistrictSelection>(() =>
    Object.keys(urlDistricts).length ? urlDistricts : savedDistricts(initialGuide),
  )
  const editor = useGuideEditor({ initialGuide, electionId: election.id, districts })
  const { guide, choices } = editor
  const [creating, setCreating] = useState(false)

  const items = useMemo(() => orderForBallot(ballots.filter((b) => matchesSelection(b, districts))), [ballots, districts])
  const answered = items.filter((b) => choices[b.id]).length

  const changeDistrict = (type: string, code: string) => {
    const next: Record<string, string> = { ...districts }
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
          status={<SaveStatus state={editor.saveState} hasGuide={!!guide} signedIn={!!account?.email} />}
          notice={<KeepGuidePrompt show={answered > 0} />}
          setup={
            pickerOptions.length > 0 ? (
              <div className="print:hidden">
                <DistrictPicker
                  options={pickerOptions}
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
        />
      )}
    </div>
  )
}
