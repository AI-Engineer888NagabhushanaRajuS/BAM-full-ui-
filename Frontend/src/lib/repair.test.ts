// npm test: focused checks for the 16-screen repair (prerequisites, certification, SOW comparison,
// shared 4.2/4.3 drafts, ISATVON display names). Uses the real mock backend, no fixtures beyond the marked ones.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMockApi } from '../api/mock.ts'
import { ISATVON, type Snapshot, type Sow } from '../api/types.ts'
import { SOW_LABELS, parseRequirements, renderSowHtml, RFQ_REQUIREMENTS } from '../api/sowFormat.ts'
import { prerequisite } from './prereq.ts'
import { certification, certifiedBaseline } from './certification.ts'
import { sowComparison } from './sowCompare.ts'
import { diffBlocks, editCount } from './sowDiff.ts'
import { getDrafts, setCodeDraft, setDrafts, unsaved } from './drafts.ts'

const until = async (cond: () => Promise<boolean>) => {
  for (let i = 0; i < 800; i++) { if (await cond()) return; await new Promise(r => setTimeout(r, 5)) }
  throw new Error('timeout')
}
const noRag = { runId: undefined, steps: [] }
const ragDone = { runId: 'rag-1', steps: [{ key: 'chunk' as const, label: 'Chunk + embed', status: 'done' as const }] }

test('ISATVON: confirmed display names; N = Notify on next; serialized keys unchanged', () => {
  assert.deepEqual(ISATVON.map(c => `${c.letter}=${c.label}`), [
    'I=Instructions', 'S=Source data', 'A=Automation', 'T=Tech stack', 'V=Variables', 'O=Outcome', 'N=Notify on next'])
  assert.equal(ISATVON[6].key, 'notifications', 'contract key kept for saved records')
  assert.equal(SOW_LABELS.notifications, 'N — Notify on next')
  assert.ok(!/Verification|Output|Notifications/.test(ISATVON.map(c => c.label).join()), 'no older mockup names')
  // Saved SOWs that still say "N — Notifications" keep parsing (by letter).
  const legacy = renderSowHtml(RFQ_REQUIREMENTS.slice(0, 1)).replace('N — Notify on next', 'N — Notifications')
  assert.equal(parseRequirements(legacy)[0].fields.notifications, RFQ_REQUIREMENTS[0].notifications)
})

test('locked 3.2: reason and action come from the same prerequisite', async () => {
  const api = createMockApi({ speed: 0.01 })
  const snap = () => api.getSnapshot()
  let b = prerequisite(await snap(), noRag, 2)!
  assert.deepEqual([b.label, b.target], ['Upload documents', '1.1'])
  assert.match(b.reason, /Source documents are needed/)

  await api.uploadFile({ name: 'rfq.pdf', size: 1000 }, () => {})
  b = prerequisite(await snap(), noRag, 2)!
  assert.deepEqual([b.target, /virus-scanned/.test(b.reason)], ['1.1', true], 'uploaded but not ingested: points at the 1.1 scan gate')
  await until(async () => (await snap()).uploads[0].scan === 'verified')
  await api.startIngestionRun()
  b = prerequisite(await snap(), noRag, 2)!
  assert.equal(b.target, '2.1', 'source exists, no SOW: points at the real blocker (RAG), not at upload')
  assert.doesNotMatch(b.reason, /no source|upload documents/i)

  await api.startSowGeneration()
  b = prerequisite(await snap(), ragDone, 2)!
  assert.equal(b.target, '3.1', 'generating: open 3.1')
  await until(async () => !!(await snap()).sow)
  b = prerequisite(await snap(), ragDone, 2)!
  assert.deepEqual([b.label, b.target], ['Review SOW', '3.1'])
  assert.match(b.reason, /v1 is a draft awaiting approval/)

  await api.approveSow(1)
  assert.equal(prerequisite(await snap(), ragDone, 2), undefined, 'approved version unlocks 3.2')
  assert.equal(prerequisite(await snap(), ragDone, 3)?.target, '3.2')
})

test('certification: bound to the manifest hash; edits make results stale; history is kept', async () => {
  const api = createMockApi({ speed: 0.01 })
  const snap = () => api.getSnapshot()
  await api.uploadFile({ name: 'rfq.pdf', size: 1000 }, () => {})
  await until(async () => (await snap()).uploads[0].scan === 'verified')
  await api.startIngestionRun()
  await api.startSowGeneration()
  await until(async () => !!(await snap()).sow)
  await api.approveSow(1)
  await until(async () => (await api.getSkills()).length === 6)
  await api.markGridReviewed()
  await api.generateContract()
  await until(async () => (await snap()).workflow?.status === 'succeeded')

  let s: Snapshot = await snap()
  assert.equal(certification(s).certified, false)
  assert.equal(certifiedBaseline(s), undefined, 'first build: no certified baseline')
  assert.equal(certification(s).items.find(i => i.key === 'sandbox')!.state, 'pending')

  await api.approveManifest()
  await api.runTests()
  await until(async () => (await snap()).tests?.promptfoo.status === 'succeeded')
  await api.markTestsReviewed()
  s = await snap()
  const c = certification(s)
  assert.ok(c.certified, JSON.stringify(c.items))
  assert.equal(s.tests!.manifestHash, s.workflow!.manifest!.hash)
  assert.equal(certifiedBaseline(s)!.hash, s.workflow!.manifest!.hash)

  // Edit the code after certification: new hash, the old run stays but is stale and cannot certify.
  await api.reopen(3)
  const file = (await api.getCode())[0]
  assert.equal(await api.saveCode(file.path, file.content + '\n# reviewed\n'), true)
  s = await snap()
  assert.notEqual(s.workflow!.manifest!.hash, s.tests!.manifestHash)
  const c2 = certification(s)
  assert.equal(c2.certified, false)
  assert.equal(c2.items.find(i => i.key === 'sandbox')!.state, 'stale')
  assert.equal(c2.items.find(i => i.key === 'review')!.state, 'pending', 'approval cleared for the new hash')
  assert.ok(s.tests, 'old run kept as evidence history')
  assert.ok(certifiedBaseline(s), 'earlier certified version remains the release baseline')
  await assert.rejects(api.markTestsReviewed(), /locked|read-only|earlier manifest/)

  await api.approveManifest()
  await assert.rejects(api.markTestsReviewed(), /earlier manifest/, 'stale results cannot be reviewed for the new hash')
  await assert.rejects(api.commitToPostgres(), /must pass for this manifest/)
  await api.runTests()
  await until(async () => (await snap()).tests?.promptfoo.status === 'succeeded')
  s = await snap()
  assert.equal(s.testHistory.length, 1, 'previous run moved to history')
  assert.equal(s.tests!.manifestHash, s.workflow!.manifest!.hash)
  assert.deepEqual(s.versions.map(v => v.kind).filter(k => k !== 'draft'), ['certified'])
})

const sow = (p: Partial<Sow>): Sow => ({
  version: 1, generatedVersion: 1, html: '<p>a</p>', generatedHtml: '<p>a</p>', meta: { sowId: 'SOW-T', client: 'c', lengthMode: 'm', sources: 1 },
  updatedAt: '2026-10-07T10:00:00Z', status: 'draft', ...p,
})

test('SOW comparison: first version is explicit, never a fake diff; later versions compare with the previous saved one', () => {
  const first = sowComparison(sow({}), '<p>a</p>', 'previous')
  assert.equal(first.kind, 'none')
  assert.match(first.kind === 'none' ? first.reason : '', /first saved version.*v2/)
  assert.equal(sowComparison(sow({}), '<p>a</p>', 'generated').kind, 'diff', 'audit against the model output is always available')

  const v2 = sowComparison(sow({ version: 2, html: '<p>b</p>', previous: { version: 1, html: '<p>a</p>', at: 'x' } }), '<p>b</p>', 'previous')
  assert.deepEqual(v2.kind === 'diff' && [v2.from, v2.to], ['v1', 'v2'])
  const dirty = sowComparison(sow({ version: 2, html: '<p>b</p>', previous: { version: 1, html: '<p>a</p>', at: 'x' } }), '<p>c</p>', 'previous')
  assert.deepEqual(dirty.kind === 'diff' && [dirty.from, dirty.to], ['v2 (saved)', 'unsaved edits'])
})

test('SOW demo fixture (marked): v1 → v2 shows one addition, one removal, one modification, each counted once', () => {
  // DEMO FIXTURE: not a user document.
  const v1 = [{ tag: 'p', text: 'Freight is 4% of base price.' }, { tag: 'p', text: 'Quotes expire after 30 days.' }, { tag: 'p', text: 'Legacy fax intake is supported.' }]
  const v2 = [{ tag: 'p', text: 'Freight is 5% of base price.' }, { tag: 'p', text: 'Quotes expire after 30 days.' }, { tag: 'p', text: 'Every quote cites its source document.' }]
  const { counts, blocks } = diffBlocks(v1, v2)
  assert.deepEqual(counts, { added: 1, removed: 1, modified: 1 })
  assert.equal(editCount(counts), 3, 'a replacement is one modification, not a removal plus an addition')
  assert.deepEqual(blocks.map(b => b.kind), ['changed', 'same', 'removed', 'added'])
})

test('4.2 / 4.3 drafts: one shared store, so switching screens never forks or drops an edit', () => {
  setDrafts({ code: {}, manifest: undefined })
  setCodeDraft('skills/a.py', 'edited')                 // typed in 4.2
  setDrafts({ manifest: '{"version":"1.0.1"}' })         // typed in 4.3
  const seenElsewhere = getDrafts()                       // read by 4.1's approve gate
  assert.equal(seenElsewhere.code['skills/a.py'], 'edited')
  const u = unsaved(seenElsewhere, { code: { 'skills/a.py': 'original' }, manifest: '{"version":"1.0.0"}' })
  assert.deepEqual([u.files, u.manifest, u.any], [['skills/a.py'], true, true])
  assert.equal(unsaved(seenElsewhere, { code: { 'skills/a.py': 'edited' }, manifest: '{"version":"1.0.1"}' }).any, false, 'saved drafts are not unsaved')
  setCodeDraft('skills/a.py', undefined)
  assert.deepEqual(getDrafts().code, {})
})

test('SOW accuracy: real rule checks per version, judge marked simulated', async () => {
  const { ruleChecks, overall } = await import('../api/sowEval.ts')
  const { validateField } = await import('../api/mock.ts')
  const good = ruleChecks(renderSowHtml(RFQ_REQUIREMENTS), validateField)
  assert.equal(good.metrics.find(m => m.key === 'completeness')!.score, 100)
  assert.equal(good.metrics.find(m => m.key === 'structure')!.score, 100)
  const bad = RFQ_REQUIREMENTS.map((r, i) => (i === 0 ? { ...r, variables: 'TBD', outcome: '' } : r))
  const b = ruleChecks(renderSowHtml(bad), validateField)
  assert.ok(b.metrics.find(m => m.key === 'completeness')!.score < 100, 'a missing field lowers completeness')
  assert.ok(b.findings.some(f => f.requirement === 1 && /Missing/.test(f.text)), 'missing field is a finding on requirement 1')
  assert.ok(b.findings.some(f => f.requirement === 1 && /placeholder/i.test(f.text)), 'TBD is a finding')
  assert.ok(overall(b.metrics) < overall(good.metrics))

  const api = createMockApi({ speed: 0.01 })
  const snap = () => api.getSnapshot()
  await api.uploadFile({ name: 'rfq.pdf', size: 1000 }, () => {})
  await until(async () => (await snap()).uploads[0].scan === 'verified')
  await api.startIngestionRun()
  await api.startSowGeneration()
  await until(async () => (await snap()).sow?.evaluation?.status === 'done')
  const ev = (await snap()).sow!.evaluation!
  assert.equal(ev.version, 1)
  assert.equal(ev.simulated, true, 'judge scores are labelled simulated')
  assert.ok(ev.metrics.some(m => m.method === 'judge') && ev.metrics.some(m => m.method === 'rule'))
  await api.saveSowDraft((await snap()).sow!.html + '<p>edit</p>', 1)
  assert.equal((await snap()).sow!.evaluation!.status, 'running', 'every new version is re-evaluated')
})
