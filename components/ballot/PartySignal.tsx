'use client'

import { createContext, useContext } from 'react'
import { MolesesPause } from '@/components/Moleses'
import { partyMembers, type PartySignal } from '@/lib/partySignals'
import type { BallotItem } from './ballot'

// Per ballot id, from the election page (lib/partySignals.ts)
export const PartySignalContext = createContext<Record<string, PartySignal>>({})

// Above a race's candidates (Quick and Expanded), Moleses holding up his staff: where party is all
// our signals give a voter to go on. Facts only; no recommendation.
export default function PartySignalNote({ item }: { item: BallotItem }) {
  const signal = useContext(PartySignalContext)[item.id]
  if (!signal) return null
  const count = item.office?.candidates.length ?? 0
  return (
    <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-3 py-1.5 font-sans text-sm text-amber-950 print:hidden">
      <MolesesPause size={32} className="-my-0.5" />
      <p className="min-w-0">
        {signal.sameParty && (
          <>
            <strong>{partyMembers(signal.sameParty, count)}</strong>, so party doesn&apos;t separate them here.{' '}
          </>
        )}
        {signal.partyOnly && (
          <>
            {signal.sameParty ? 'Only' : <strong>Only</strong>} party and advocacy groups have published picks here, and the quiz
            can&apos;t compare these candidates yet.
          </>
        )}
      </p>
    </div>
  )
}
