import { test } from 'node:test'
import assert from 'node:assert/strict'
import { jobAnswersFor, JOB_ANSWERS_SOURCE } from '@/lib/jobAnswers'
import { glossaryFor } from '@/lib/glossary'
import bundle from '../data/elections/ca-general-2026-11-03.json'
import data from '../data/answers/ca-general-2026-11-03.json'

test('job answers cover every candidate in the race, with the glossary questions as they stand now', () => {
  for (const officeId of Object.keys(data.offices)) {
    const office = bundle.offices.find((o) => o.id === officeId)
    assert.ok(office, `${officeId} isn't on the ballot`)
    const answers = jobAnswersFor(officeId)!
    assert.deepEqual(answers.questions, glossaryFor(officeId)?.ask, `${officeId}: the glossary questions changed; re-run job_answers.py`)
    assert.deepEqual(Object.keys(answers.candidates).sort(), office.candidates.map((c) => c.id).sort(), `${officeId}: same candidates`)
    for (const [id, row] of Object.entries(answers.candidates)) {
      assert.equal(row.answers.length, answers.questions.length, id)
      if (row.noStatement) assert.ok(row.answers.every((a) => a === null), `${id}: answers without a statement`)
    }
  }
  assert.match(JOB_ANSWERS_SOURCE.url, /^https:\/\/vig\.cdn\.sos\.ca\.gov\//)
})
