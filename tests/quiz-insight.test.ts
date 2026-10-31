import { test } from 'node:test'
import assert from 'node:assert/strict'
import { flatImportance, importanceEffect, ratedDifferently, reasonLine, reasonsFor } from '@/lib/quiz/insight'
import { scoreQuiz } from '@/lib/quiz/score'
import type { ScoringAnswer, ScoringCandidate, ScoringQuestion } from '@/lib/quiz/types'

const q = (n: number): ScoringQuestion => ({ id: `q${n}`, prompt: `Q${n}`, order: n, issues: [{ issueId: `i${n}`, weight: 1 }] })
const questions = [1, 2, 3].map(q)
const cand = (id: string, stances: number[]): ScoringCandidate => ({
  id,
  name: id,
  officeId: 'o',
  stances: stances.map((position, i) => ({ issueId: `i${i + 1}`, position })),
})
const answer = (n: number, stanceValue: number, importance: number): ScoringAnswer => ({ questionId: `q${n}`, optionId: `o${n}`, stanceValue, importance })
const run = (answers: ScoringAnswer[]) =>
  scoreQuiz({
    candidates: [cand('A', [2, 2, -2]), cand('B', [-2, -2, 2])],
    questions,
    answers,
    issueNames: { i1: 'Housing', i2: 'Transit', i3: 'Taxes' },
    officeInfo: {},
    totalQuestions: 3,
  })

test('a clear match names the topics that gave its winner the most points', () => {
  const o = run([answer(1, 2, 3), answer(2, 2, 1), answer(3, 2, 1)]).officeResults[0]
  assert.equal(o.verdict, 'match')
  assert.deepEqual(reasonsFor(o), ['Housing', 'Transit'])
  assert.equal(reasonLine(o), 'Mostly your answers on Housing and Transit.')
})

test('no clear match, no reason given', () => {
  assert.equal(reasonLine(run([answer(1, 2, 1)]).officeResults[0]), null)
})

test('counts the races where importance ratings changed the top match', () => {
  // Evenly weighted, A leads two to one; a Very important third answer hands it to B
  const answers = [answer(1, 2, 1), answer(2, 2, 1), answer(3, 2, 3)]
  const rated = run(answers)
  const flat = run(flatImportance(answers))
  assert.equal(flat.officeResults[0].rankedCandidates[0].candidate.id, 'A')
  assert.equal(rated.officeResults[0].rankedCandidates[0].candidate.id, 'B')
  assert.deepEqual(importanceEffect(rated, flat), { changed: 1, races: 1 })
  assert.deepEqual(importanceEffect(flat, flat), { changed: 0, races: 1 })
})

test('flattening keeps skipped answers out, and equal ratings have nothing to report', () => {
  assert.deepEqual(flatImportance([answer(1, 2, 3), answer(2, 0, 0)]).map((a) => a.importance), [1, 0])
  assert.equal(ratedDifferently([answer(1, 2, 2), answer(2, 2, 2), answer(3, 0, 0)]), false)
  assert.equal(ratedDifferently([answer(1, 2, 2), answer(2, 2, 3)]), true)
})
