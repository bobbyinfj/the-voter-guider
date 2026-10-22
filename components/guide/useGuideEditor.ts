'use client'

import { useCallback, useRef, useState } from 'react'
import type { ChoiceStatus, ChoiceValue } from '@/components/ballot/ballot'

export interface EditableGuide {
  id: string
  title: string
  isDefault: boolean
  isOwner: boolean
  visibility: string
  shareToken: string
  shareCommunity: boolean
  notes: string | null
  metadata: unknown
  choices: { ballotId: string; selection: string; notes: string | null; status?: string }[]
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function choiceMap(guide: EditableGuide | null): Record<string, ChoiceValue> {
  return Object.fromEntries(
    (guide?.choices ?? []).map((c) => [
      c.ballotId,
      { selection: c.selection, notes: c.notes ?? undefined, status: c.status === 'tentative' ? 'tentative' : 'decided' },
    ]),
  )
}

// Everything you change saves as you go: picks, leaning/decided, notes, districts. With no
// guide yet (an election page you haven't marked), the first change creates your default
// guide for that election; concurrent first changes share that one request.
export function useGuideEditor(opts: {
  initialGuide: EditableGuide | null
  electionId: string
  districts?: Record<string, string>
}) {
  const [guide, setGuideState] = useState<EditableGuide | null>(opts.initialGuide)
  const [choices, setChoicesState] = useState<Record<string, ChoiceValue>>(() => choiceMap(opts.initialGuide))
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const creating = useRef<Promise<EditableGuide | null> | null>(null)
  const pending = useRef(0)
  // Latest values for async handlers; only written alongside the state they mirror
  const guideRef = useRef(opts.initialGuide)
  const choicesRef = useRef(choices)
  const setGuide = useCallback((g: EditableGuide) => {
    guideRef.current = g
    setGuideState(g)
  }, [])
  const updateChoices = useCallback((change: (prev: Record<string, ChoiceValue>) => Record<string, ChoiceValue>) => {
    choicesRef.current = change(choicesRef.current)
    setChoicesState(choicesRef.current)
  }, [])

  const track = useCallback(async <T,>(work: () => Promise<T>, failure: string): Promise<T | null> => {
    pending.current += 1
    setSaveState('saving')
    try {
      const result = await work()
      pending.current -= 1
      if (pending.current === 0) setSaveState('saved')
      setError(null)
      return result
    } catch {
      pending.current -= 1
      setSaveState('error')
      setError(failure)
      return null
    }
  }, [])

  const ensureGuide = useCallback(async (): Promise<EditableGuide | null> => {
    if (guideRef.current) return guideRef.current
    creating.current ??= (async () => {
      const res = await fetch('/api/guides/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ electionId: opts.electionId, districts: opts.districts ?? {} }),
      })
      if (!res.ok) {
        creating.current = null
        throw new Error('create failed')
      }
      const created = (await res.json()) as EditableGuide
      setGuide(created)
      return created
    })()
    return creating.current
  }, [opts.electionId, opts.districts, setGuide])

  const postChoice = useCallback(
    async (ballotId: string, value: ChoiceValue) => {
      const g = await ensureGuide()
      if (!g) throw new Error('no guide')
      const res = await fetch('/api/choices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guideId: g.id, ballotId, selection: value.selection, notes: value.notes, status: value.status }),
      })
      if (!res.ok) throw new Error('save failed')
    },
    [ensureGuide],
  )

  const setChoice = useCallback(
    async (ballotId: string, selection: string, notes?: string, status?: ChoiceStatus) => {
      if (guideRef.current && !guideRef.current.isOwner) return
      const previous = choicesRef.current[ballotId]
      // Changing your pick keeps whether you were leaning or decided
      const next: ChoiceValue = { selection, notes, status: status ?? previous?.status ?? 'decided' }
      updateChoices((prev) => ({ ...prev, [ballotId]: next }))
      const ok = await track(() => postChoice(ballotId, next), "Couldn't save that choice. Please try again.")
      if (ok === null)
        updateChoices((prev) => {
          const reverted = { ...prev }
          if (previous) reverted[ballotId] = previous
          else delete reverted[ballotId]
          return reverted
        })
    },
    [postChoice, track, updateChoices],
  )

  const setStatus = useCallback(
    (ballotId: string, status: ChoiceStatus) => {
      const current = choicesRef.current[ballotId]
      if (current) setChoice(ballotId, current.selection, current.notes, status)
    },
    [setChoice],
  )

  const clearChoice = useCallback(
    async (ballotId: string) => {
      const g = guideRef.current
      if (!g?.isOwner) return
      const previous = choicesRef.current[ballotId]
      updateChoices((prev) => {
        const next = { ...prev }
        delete next[ballotId]
        return next
      })
      const ok = await track(async () => {
        const res = await fetch(
          `/api/choices?guideId=${encodeURIComponent(g.id)}&ballotId=${encodeURIComponent(ballotId)}`,
          { method: 'DELETE' },
        )
        if (!res.ok) throw new Error('clear failed')
      }, "Couldn't clear that choice. Please try again.")
      if (ok === null && previous) updateChoices((prev) => ({ ...prev, [ballotId]: previous }))
    },
    [track, updateChoices],
  )

  // PATCH guide fields (title, notes, visibility, shareCommunity, districts); creates the
  // default guide first if needed
  const patchGuide = useCallback(
    async (body: Record<string, unknown>, failure = "Couldn't save that change.") =>
      track(async () => {
        const g = await ensureGuide()
        if (!g) throw new Error('no guide')
        const res = await fetch('/api/guides', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: g.id, ...body }),
        })
        if (!res.ok) throw new Error('patch failed')
        const updated = (await res.json()) as EditableGuide
        setGuide(updated)
        return updated
      }, failure),
    [ensureGuide, setGuide, track],
  )

  return { guide, choices, saveState, error, setError, setChoice, setStatus, clearChoice, patchGuide, ensureGuide }
}
