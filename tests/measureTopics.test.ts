import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { MEASURE_TOPICS } from '../lib/measureTopics'

const measures = new Map<string, { title: string; level: string; type: string }>(
  readdirSync('data/elections')
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(`data/elections/${f}`, 'utf8')).measures ?? [])
    .map((m: { id: string; title: string; level: string; type: string }) => [m.id, m]),
)

test('every measure topic uses only words from its official title', () => {
  for (const [id, topic] of Object.entries(MEASURE_TOPICS)) {
    const m = measures.get(id)
    assert.ok(m, `${id} isn't in data/elections`)
    const title = m.title.toLowerCase()
    for (const word of topic.toLowerCase().match(/[a-z]+/g) ?? [])
      if (!['and', 'of', 'on'].includes(word)) assert.ok(title.includes(word.replace(/s$/, '')), `${id}: "${word}" isn't in "${m.title}"`)
  }
})

test('every state measure has a topic', () => {
  for (const [id, m] of measures)
    if (m.level === 'state' && m.type !== 'retention') assert.ok(MEASURE_TOPICS[id], `${id} (${m.title}) has no topic`)
})
