'use client'

import { useCallback, useRef, useState } from 'react'
import { NOTES_ONLY, isPick, isSoft, toStatus, withMark, type ChoiceStatus, type ChoiceValue, type SoftStatus } from '@/components/ballot/ballot'

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
  choices: { ballotId: string; selection: string; notes: string | null; status?: string; marks?: unknown; candidateNotes?: unknown }[]
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function candidateNotesOf(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const notes = Object.fromEntries(Object.entries(value).filter((e): e is [string, string] => typeof e[1] === 'string'))
  return Object.keys(notes).length ? notes : undefined
}

function marksFrom(value: unknown): Record<string, SoftStatus> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const marks = Object.fromEntries(Object.entries(value).filter((e): e is [string, SoftStatus] => isSoft(e[1])))
  return Object.keys(marks).length > 1 ? marks : undefined
}

export function choiceMap(guide: EditableGuide | null): Record<string, ChoiceValue> {
  return Object.fromEntries(
    (guide?.choices ?? []).map((c) => [
      c.ballotId,
      {
        selection: c.selection,
        notes: c.notes ?? undefined,
        status: toStatus(c.status),
        marks: marksFrom(c.marks),
        candidateNotes: candidateNotesOf(c.candidateNotes),
      },
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
        body: JSON.stringify({
          guideId: g.id,
          ballotId,
          selection: value.selection,
          notes: value.notes,
          status: value.status,
          marks: value.marks ?? null,
          candidateNotes: value.candidateNotes ?? {},
        }),
      })
      if (!res.ok) throw new Error('save failed')
    },
    [ensureGuide],
  )

  // Show the change right away, save it, and put it back if the save fails
  const saveChoice = useCallback(
    async (ballotId: string, next: ChoiceValue) => {
      if (guideRef.current && !guideRef.current.isOwner) return
      const previous = choicesRef.current[ballotId]
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

  // `marks` given (an oval click works out every label): use them, null for none. Not given: this
  // sets one option's label and keeps the others (withMark). Changing your pick keeps how sure you
  // were, and your candidate notes.
  const setChoice = useCallback(
    (ballotId: string, selection: string, notes?: string, status?: ChoiceStatus, marks?: Record<string, SoftStatus> | null) => {
      const previous = choicesRef.current[ballotId]
      const resolved = status ?? previous?.status ?? 'decided'
      const pick =
        marks !== undefined ? { selection, status: resolved, marks: marks ?? undefined }
        : isPick(selection) ? (withMark(previous, selection, resolved) ?? { selection, status: resolved })
        : { selection, status: resolved }
      return saveChoice(ballotId, { ...pick, notes, candidateNotes: previous?.candidateNotes })
    },
    [saveChoice],
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

  // Your note on one candidate. With no pick in the contest it's kept on its own (NOTES_ONLY);
  // when the last note on a contest with no pick is emptied, the contest is cleared
  const setCandidateNote = useCallback(
    (ballotId: string, name: string, text: string) => {
      const current = choicesRef.current[ballotId]
      const notes = { ...current?.candidateNotes }
      if (text.trim()) notes[name] = text
      else delete notes[name]
      const candidateNotes = Object.keys(notes).length ? notes : undefined
      if (!current && !candidateNotes) return
      const next: ChoiceValue = current ? { ...current, candidateNotes } : { selection: NOTES_ONLY, candidateNotes }
      if (next.selection === NOTES_ONLY && !next.notes && !candidateNotes) return clearChoice(ballotId)
      return saveChoice(ballotId, next)
    },
    [clearChoice, saveChoice],
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

  return { guide, choices, saveState, error, setError, setChoice, setStatus, clearChoice, setCandidateNote, patchGuide, ensureGuide }
}
