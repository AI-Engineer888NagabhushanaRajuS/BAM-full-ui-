// npm test  (Node's built-in runner; no extra dependencies)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SCREEN_ROUTES, STEP_SCREEN, SUBTASKS, screenByPath, TASKS, TRACKER_ITEMS, initialStatuses, rollup, subtasksOf, taskStatus } from './trackerConfig.ts'
import { LEGACY_TRACKER_KEY, TRACKER_KEY, localTrackerStorage } from './trackerStorage.ts'

const EXPECTED: Record<string, string> = {
  '1': 'Data Ingestion',
  '1.1': 'Intake console: upload & virus scan', '1.2': 'Ingestion queue/jobs', '1.3': 'File detail/preview', '1.4': 'Ingestion review',
  '2': 'RAG',
  '2.1': 'Context graph explorer', '2.2': 'Schema generation workbench', '2.3': 'Retrieval/context quality', '2.4': 'RAG review',
  '3': 'FDE Workbench',
  '3.1': 'SOW generation and approval', '3.2': 'ISATVON skills grid', '3.3': 'Skills/code review', '3.4': 'Manifest and deploy prep',
  '4': 'Sandbox',
  '4.1': 'Activities', '4.2': 'Manifest JSON', '4.3': 'Generated code', '4.4': 'Sandbox and assertions',
}

test('registry: 4 stages x 4 screens with the agreed IDs and labels (denominator 4 everywhere)', () => {
  assert.equal(TASKS.length, 4)
  assert.equal(SUBTASKS.length, 16)
  assert.deepEqual(TASKS.map(t => subtasksOf(t.id).length), [4, 4, 4, 4])
  assert.deepEqual(Object.fromEntries(TRACKER_ITEMS.map(i => [i.id, i.label])), EXPECTED)
  assert.equal(new Set(TRACKER_ITEMS.map(i => i.id)).size, TRACKER_ITEMS.length)
})

test('config: no old 21-item labels and no excluded areas', () => {
  const labels = TRACKER_ITEMS.map(i => i.label).join(' | ')
  for (const old of ['Upload discovery documents', 'Generate SOW', 'Retry or use fallback', 'Hot-reload into Skill Palette', 'Load approved SOW'])
    assert.ok(!labels.includes(old), old)
  assert.ok(!/jinja|masters|admin|client sri/i.test(labels))
})

test('routes: one registry; every screen has a unique stable route; 4.2/4.3 share step 3 gating with 4.1', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(SCREEN_ROUTES).map(([k, v]) => [k, v.path])), {
    '1.1': '/ingestion', '1.2': '/ingestion/queue', '1.3': '/ingestion/file', '1.4': '/ingestion/review',
    '2.1': '/rag/graph', '2.2': '/rag/schemas', '2.3': '/rag/quality', '2.4': '/rag/review',
    '3.1': '/workbench/sow', '3.2': '/workbench/skills', '3.3': '/workbench/review', '3.4': '/workbench/release',
    '4.1': '/sandbox/validation', '4.2': '/sandbox/manifest', '4.3': '/sandbox/code', '4.4': '/sandbox/results',
  })
  assert.deepEqual(SUBTASKS.map(x => x.id).sort(), Object.keys(SCREEN_ROUTES).sort(), 'every tracker screen is routed')
  assert.equal(new Set(Object.values(SCREEN_ROUTES).map(r => r.path)).size, 16, 'unique paths')
  assert.deepEqual(['4.1', '4.2', '4.3'].map(id => SCREEN_ROUTES[id].step), [3, 3, 3])
  assert.deepEqual(STEP_SCREEN, { 1: '3.1', 2: '3.2', 3: '4.1', 4: '4.4' })
  for (const s of SUBTASKS) assert.equal(screenByPath(s.path!)?.id, s.id, `${s.path} resolves back to ${s.id}`)
  assert.equal(screenByPath('/nope'), undefined)
})

test('rollup: all four done → done', () => {
  assert.equal(rollup(['done', 'done', 'done', 'done']), 'done')
})

test('rollup: blocked beats needs review and progress', () => {
  assert.equal(rollup(['done', 'blocked', 'needs_review', 'in_progress']), 'blocked')
})

test('rollup: needs review beats in progress and partly done', () => {
  assert.equal(rollup(['needs_review', 'in_progress', 'done', 'not_started']), 'needs_review')
})

test('rollup: any started → in progress; nothing started → not started; empty is not done', () => {
  assert.equal(rollup(['in_progress', 'not_started', 'not_started', 'not_started']), 'in_progress')
  assert.equal(rollup(['done', 'not_started', 'not_started', 'not_started']), 'in_progress')
  assert.equal(rollup(['not_started', 'not_started', 'not_started', 'not_started']), 'not_started')
  assert.equal(rollup([]), 'not_started')
})

test('taskStatus uses only that stage’s screens', () => {
  const s = initialStatuses()
  for (const x of subtasksOf('1')) s[x.id] = 'done'
  s['2.2'] = 'needs_review'
  assert.equal(taskStatus('1', s), 'done')
  assert.equal(taskStatus('2', s), 'needs_review')
  assert.equal(taskStatus('4', s), 'not_started')
})

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) }, data }
}

test('persistence: new namespace; all screens start not started', async () => {
  assert.notEqual(TRACKER_KEY, LEGACY_TRACKER_KEY)
  const r = await localTrackerStorage(memory()).load()
  assert.equal(r.error, undefined)
  assert.equal(Object.keys(r.statuses).length, 16)
  assert.ok(Object.values(r.statuses).every(v => v === 'not_started'))
})

test('persistence: old 21-item data is not read, migrated, overwritten or deleted', async () => {
  const legacy = JSON.stringify({ version: 1, statuses: { '1.1': 'done', '1.5': 'done', '2.6': 'blocked' } })
  const mem = memory({ [LEGACY_TRACKER_KEY]: legacy })
  const store = localTrackerStorage(mem)
  const r = await store.load()
  assert.equal(r.statuses['1.1'], 'not_started', 'old positional status not mapped onto new 1.1')
  await store.save({ ...r.statuses, '1.1': 'in_progress' })
  assert.equal(mem.data.get(LEGACY_TRACKER_KEY), legacy)
})

test('persistence: round-trips by stable screen ID under one versioned key', async () => {
  const mem = memory()
  const s = initialStatuses()
  s['1.1'] = 'done'; s['4.4'] = 'needs_review'; s['2.3'] = 'blocked'
  await localTrackerStorage(mem).save(s)
  assert.deepEqual([...mem.data.keys()], [TRACKER_KEY])
  const saved = JSON.parse(mem.data.get(TRACKER_KEY)!)
  assert.equal(saved.version, 1)
  assert.equal(saved.statuses['4.4'], 'needs_review')
  assert.deepEqual((await localTrackerStorage(mem).load()).statuses, s)
})

test('persistence: unreadable data is reported and left in place; unknown IDs ignored', async () => {
  const mem = memory({ [TRACKER_KEY]: '{not json' })
  const r = await localTrackerStorage(mem).load()
  assert.match(r.error ?? '', /unreadable/)
  assert.equal(mem.data.get(TRACKER_KEY), '{not json')
  const wrongVersion = await localTrackerStorage(memory({ [TRACKER_KEY]: JSON.stringify({ version: 2, statuses: { '1.1': 'done' } }) })).load()
  assert.ok(wrongVersion.error)
  assert.equal(wrongVersion.statuses['1.1'], 'not_started')
  const partial = await localTrackerStorage(memory({ [TRACKER_KEY]: JSON.stringify({ version: 1, statuses: { '1.1': 'done', '2.1': 'bogus', '9.9': 'done' } }) })).load()
  assert.equal(partial.error, undefined)
  assert.equal(partial.statuses['1.1'], 'done')
  assert.equal(partial.statuses['2.1'], 'not_started')
  assert.ok(!('9.9' in partial.statuses))
})

test('persistence: storage failures surface as errors, never silently', async () => {
  const none = await localTrackerStorage(undefined).load()
  assert.match(none.error ?? '', /unavailable/)
  await assert.rejects(localTrackerStorage(undefined).save(initialStatuses()), /unavailable/)
  const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('quota exceeded') } }
  assert.match((await localTrackerStorage(broken).load()).error ?? '', /blocked/)
  await assert.rejects(localTrackerStorage(broken).save(initialStatuses()), /could not be saved.*quota exceeded/)
})
