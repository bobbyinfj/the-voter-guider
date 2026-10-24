import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoreQuiz } from '@/lib/quiz/score'
import type { ScoringCandidate, ScoringQuestion } from '@/lib/quiz/types'

const q = (n: number): ScoringQuestion => ({ id: `q${n}`, prompt: `Q${n}`, order: n, issues: [{ issueId: `i${n}`, weight: 1 }] })
const questions = [1, 2, 3, 4].map(q)
const cand = (id: string, officeId: string, stances: Record<number, number>): ScoringCandidate => ({
  id,
  name: id,
  officeId,
  stances: Object.entries(stances).map(([n, position]) => ({ issueId: `i${n}`, position })),
})
const answer = (n: number, stanceValue: number, importance = 1) => ({ questionId: `q${n}`, optionId: `o${n}`, stanceValue, importance })
const run = (candidates: ScoringCandidate[], answers: ReturnType<typeof answer>[]) =>
  scoreQuiz({ candidates, questions, answers, issueNames: {}, officeInfo: {}, totalQuestions: 4 })

test('asymmetric coverage never produces a match', () => {
  // A agrees on the one question only A has a position on; B has positions on others
  const r = run([cand('A', 'o', { 1: 2 }), cand('B', 'o', { 2: 2, 3: 2 })], [answer(1, 2), answer(2, -2), answer(3, -2)])
  const o = r.officeResults[0]
  assert.equal(o.verdict, 'not-enough')
  assert.equal(o.sharedQuestions, 0)
  assert.equal(o.confidence, 0)
})

test('one shared question is not enough', () => {
  const r = run([cand('A', 'o', { 1: 2 }), cand('B', 'o', { 1: -2 })], [answer(1, 2)])
  assert.equal(r.officeResults[0].verdict, 'not-enough')
})

test('two shared questions with a clear gap is a match, scored only on shared questions', () => {
  const r = run(
    [cand('A', 'o', { 1: 2, 2: 2, 3: 2 }), cand('B', 'o', { 1: -2, 2: -2 })],
    [answer(1, 2), answer(2, 2), answer(3, -2)],
  )
  const o = r.officeResults[0]
  assert.equal(o.verdict, 'match')
  assert.equal(o.sharedQuestions, 2)
  assert.equal(o.rankedCandidates[0].candidate.id, 'A')
  assert.equal(o.rankedCandidates[0].normalized, 1) // q3 (only A has a position) isn't counted
  assert.equal(o.rankedCandidates[0].known, 3)
  assert.equal(o.rankedCandidates[0].breakdown.find((b) => b.questionId === 'q3')?.counted, false)
})

test('a small gap is too close to call', () => {
  const r = run([cand('A', 'o', { 1: 2, 2: 1 }), cand('B', 'o', { 1: 1, 2: 2 })], [answer(1, 2), answer(2, 2)])
  assert.equal(r.officeResults[0].verdict, 'too-close')
})

test('depth is per race: answers about another race add no confidence', () => {
  const candidates = [
    cand('A', 'gov', { 1: 2, 2: 2, 3: 2 }),
    cand('B', 'gov', { 1: -2, 2: -2, 3: -2 }),
    cand('C', 'ins', { 4: 2 }),
    cand('D', 'ins', { 4: -2 }),
  ]
  const r = run(candidates, [answer(1, 2), answer(2, 2), answer(3, 2), answer(4, 2)])
  const ins = r.officeResults.find((o) => o.officeId === 'ins')!
  assert.equal(ins.sharedQuestions, 1)
  assert.equal(ins.verdict, 'not-enough')
  assert.equal(ins.confidence, 0)
})

test('questions marked as not mattering (importance 0) are ignored', () => {
  const r = run([cand('A', 'o', { 1: 2, 2: 2 }), cand('B', 'o', { 1: -2, 2: -2 })], [answer(1, 2, 0), answer(2, 2)])
  assert.equal(r.officeResults[0].sharedQuestions, 1)
  assert.equal(r.officeResults[0].verdict, 'not-enough')
})

test('candidates without any sourced position are listed, not compared, and do not block the race', () => {
  // A six-name statewide race where only two candidates were researched
  const r = run(
    [cand('A', 'o', { 1: 2, 2: 2 }), cand('B', 'o', { 1: -2, 2: -2 }), cand('C', 'o', {}), cand('D', 'o', {})],
    [answer(1, 2), answer(2, 2)],
  )
  const o = r.officeResults[0]
  assert.equal(o.decidable, true)
  assert.deepEqual(o.decisiveQuestionIds, ['q1', 'q2'])
  assert.deepEqual(o.notCompared.map((c) => c.id), ['C', 'D'])
  assert.deepEqual(o.rankedCandidates.map((rc) => rc.candidate.id), ['A', 'B'])
  assert.equal(o.verdict, 'match')
})

test('a race whose compared candidates overlap on one question can never be compared', () => {
  const r = run([cand('A', 'o', { 1: 2, 2: 1 }), cand('B', 'o', { 1: -2, 3: 1 })], [])
  const o = r.officeResults[0]
  assert.deepEqual(o.decisiveQuestionIds, ['q1'])
  assert.equal(o.decidable, false)
})
