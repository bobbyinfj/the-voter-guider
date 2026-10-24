import { test } from 'node:test'
import assert from 'node:assert/strict'
import { moduleCounts, parseModules, questionModules, questionsFor } from '@/lib/quiz/modules'
import { askClaudeUrl } from '@/lib/quiz/ask'
import type { ScoringQuestion } from '@/lib/quiz/types'

const q = (id: string, issueId: string): ScoringQuestion => ({ id, prompt: id, order: 1, issues: [{ issueId, weight: 1 }] })
const office = (level: string, ...issues: string[]) => ({ level, candidates: [{ stances: issues.map((issueId) => ({ issueId })) }] })
const questions = [q('tax', 'i-tax'), q('housing', 'i-housing'), q('nobody', 'i-none')]
const offices = [office('state', 'i-tax', 'i-housing'), office('school', 'i-housing')]

test("a question's modules are the levels of races with a stance on it", () => {
  assert.deepEqual(questionModules(questions, offices), { tax: ['state'], housing: ['state', 'school'], nobody: [] })
})

test('module counts skip empty modules', () => {
  assert.deepEqual(moduleCounts(questionModules(questions, offices)), [
    { module: 'state', label: 'Statewide & legislature', count: 2 },
    { module: 'school', label: 'School & college boards', count: 1 },
  ])
})

test('only chosen modules are asked, and never a question no race on the ballot has a stance on', () => {
  const by = questionModules(questions, offices)
  assert.deepEqual(questionsFor(questions, by, null).map((x) => x.id), ['tax', 'housing'])
  assert.deepEqual(questionsFor(questions, by, ['school']).map((x) => x.id), ['housing'])
})

test('module lists from the URL are validated', () => {
  assert.deepEqual(parseModules('city,school,bogus,city'), ['city', 'school'])
  assert.equal(parseModules('bogus'), null)
  assert.equal(parseModules(null), null)
})

test('askClaudeUrl: opens claude.ai with the statement and races, never asking how to vote', () => {
  const url = new URL(askClaudeUrl('The state should end the filibuster', ['Governor', 'Treasurer']))
  assert.equal(url.origin + url.pathname, 'https://claude.ai/new')
  const q = url.searchParams.get('q') ?? ''
  assert.ok(q.includes('"The state should end the filibuster"'))
  assert.ok(q.includes('Governor, Treasurer'))
  assert.ok(q.includes("don't tell me how to vote"))
  assert.ok(!new URL(askClaudeUrl('X', [])).searchParams.get('q')!.includes('offices'))
})
