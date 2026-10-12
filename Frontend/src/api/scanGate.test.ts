// npm test: 1.1 upload & virus-scan gate, against the pure rule and the real mock backend.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { acceptedType, autoPick, chunkNames, fit, ingestionBlock, scanView, triage } from './scanGate.ts'
import { createMockApi, SCAN_FIXTURE } from './mock.ts'
import { chunkCount, MAX_BATCH_FILES, MAX_UPLOAD_BYTES, type UploadRecord } from './types.ts'

const until = async (cond: () => Promise<boolean>) => {
  for (let i = 0; i < 800; i++) { if (await cond()) return; await new Promise(r => setTimeout(r, 5)) }
  throw new Error('timeout')
}
const rec = (p: Partial<UploadRecord>): UploadRecord => ({
  id: p.id ?? 'f1', batchId: 'b', name: 'a.pdf', size: 1, status: 'stored', uploadedAt: '', objectKey: 's3://bam-intake/f1/a.pdf', parts: 1, scan: 'verified', released: true, ...p,
})

test('supported types: PDF, DOCX, XLSX, PPTX, TXT, ZIP only; the backend refuses others', async () => {
  for (const n of ['a.pdf', 'b.DOCX', 'c.xlsx', 'd.pptx', 'e.txt', 'f.zip']) assert.equal(acceptedType(n), true, n)
  for (const n of ['a.exe', 'b.csv', 'noext', 'c.pdf.js']) assert.equal(acceptedType(n), false, n)
  const api = createMockApi({ speed: 0.01 })
  await assert.rejects(api.uploadFile({ name: 'x.exe', size: 10 }, () => {}), /not accepted/)
  // Multiple selection: each file is staged and scanned on its own.
  await Promise.all(['a.pdf', 'b.docx', 'c.zip'].map(name => api.uploadFile({ name, size: 10 }, () => {})))
  const s = await api.getSnapshot()
  assert.equal(s.uploads.length, 3)
  assert.ok(s.uploads.every(u => u.scan === 'scanning' && !u.released && u.objectKey.startsWith('s3://bam-quarantine/')), 'staged in quarantine, not released')
})

test('scan states: exact labels, text and allowed actions', () => {
  assert.deepEqual(scanView(rec({})), { pill: 'pass', label: 'Verified', text: 'Clean - Ready for ingestion', actions: ['view', 'remove'] })
  assert.deepEqual(scanView(rec({ scan: 'scanning', released: false })), { pill: 'running', label: 'Scanning', text: 'Checking file for threats...', actions: [] })
  assert.deepEqual(scanView(rec({ scan: 'blocked', released: false })), { pill: 'fail', label: 'Blocked', text: 'Threat detected: quarantined', actions: ['remove'] })
  const err = scanView(rec({ scan: 'scanning', released: false, scanError: 'Timeout.' }))
  assert.notEqual(err.label, 'Verified'); assert.notEqual(err.label, 'Blocked', 'a service error is not a threat')
  assert.deepEqual(err.actions, ['retry', 'remove'])
  assert.ok(!scanView(rec({ released: false })).actions.includes('view'), 'no preview before release')
})

test('gate: empty, uploading, scanning, blocked, error and all-verified batches', () => {
  assert.equal(ingestionBlock([]), 'Upload documents first')
  assert.equal(ingestionBlock([], { uploading: 1 }), 'Wait for uploads to finish')
  assert.equal(ingestionBlock([rec({}), rec({ id: 'f2', scan: 'scanning', released: false })]), 'Wait for virus scans to finish')
  assert.equal(ingestionBlock([rec({}), rec({ id: 'f2', scan: 'blocked', released: false })]), 'Remove blocked files to continue')
  assert.match(ingestionBlock([rec({}), rec({ id: 'f2', scan: 'scanning', scanError: 'x', released: false })])!, /scan failed/)
  assert.equal(ingestionBlock([rec({ status: 'failed' })]), 'Remove failed uploads to continue')
  assert.equal(ingestionBlock([rec({}), rec({ id: 'f2' })]), undefined)
  assert.equal(ingestionBlock([rec({})], { running: true }), 'An ingestion run is already running')
  assert.equal(ingestionBlock([rec({})], { starting: true }), 'Ingestion run is starting')
  // Filtering is display-only: the gate always takes the full batch, so a hidden blocked row still blocks.
  const batch = [rec({}), rec({ id: 'f2', scan: 'blocked', released: false })]
  const visible = batch.filter(u => u.scan === 'verified')
  assert.equal(ingestionBlock(visible), undefined)
  assert.equal(ingestionBlock(batch), 'Remove blocked files to continue')
})

test('backend: scan updates, failure never verifies, blocked removal, single start', async () => {
  const api = createMockApi({ speed: 0.01 })
  const snap = () => api.getSnapshot()
  await assert.rejects(api.startIngestionRun(), /Upload documents first/)

  api.demo!.setScanOutcome('error')
  const bad = await api.uploadFile({ name: 'down.pdf', size: 10 }, () => {})
  api.demo!.setScanOutcome('threat')
  const evil = await api.uploadFile({ name: 'archive.zip', size: 10 }, () => {})
  api.demo!.setScanOutcome('clean')
  const ok = await api.uploadFile({ name: 'brief.pdf', size: 10 }, () => {})
  await assert.rejects(api.removeUpload(ok.id), /Wait for the virus scan/, 'scanning rows cannot be removed')
  await assert.rejects(api.getVerifiedFileAccess(ok.id), /released, verified/)
  await until(async () => (await snap()).uploads.every(u => u.scan !== 'scanning' || u.scanError))

  let s = await snap()
  const by = (id: string) => s.uploads.find(u => u.id === id)!
  assert.equal(by(bad.id).scan, 'scanning'); assert.ok(by(bad.id).scanError); assert.equal(by(bad.id).released, false, 'outage fails closed')
  assert.equal(by(evil.id).scan, 'blocked'); assert.equal(by(evil.id).released, false)
  assert.equal(by(ok.id).scan, 'verified'); assert.ok(by(ok.id).objectKey.startsWith('s3://bam-intake/'))
  await assert.rejects(api.getVerifiedFileAccess(evil.id), /released, verified/, 'blocked files never get access')
  assert.match((await api.getVerifiedFileAccess(ok.id)).url, /mock:/)
  await assert.rejects(api.startIngestionRun(), /scan failed/)
  await assert.rejects(api.startSowGeneration(), /ingestion run/, 'SOW generation cannot bypass the gate')

  await api.retryScan(bad.id)
  await until(async () => (await snap()).uploads.find(u => u.id === bad.id)!.scan === 'verified')
  await assert.rejects(api.startIngestionRun(), /Remove blocked/)
  await api.removeUpload(evil.id) // the last blocked file
  s = await snap()
  assert.ok(!s.uploads.some(u => u.id === evil.id))
  assert.deepEqual(s.scanEvents.filter(e => e.fileId === evil.id).map(e => e.kind), ['staged', 'started', 'threat', 'removed'])
  assert.equal(new Set(s.scanEvents.map(e => e.id)).size, s.scanEvents.length, 'event ids are unique')

  const results = await Promise.allSettled([api.startIngestionRun(), api.startIngestionRun()])
  assert.deepEqual(results.map(r => r.status).sort(), ['fulfilled', 'rejected'], 'double start creates one run')
  assert.equal((await snap()).ingestion!.fileIds.length, 2)
  await assert.rejects(api.startIngestionRun(), /already ingested/)
})

test('mixed-state mockup fixture is opt-in and gated', async () => {
  const api = createMockApi({ speed: 0.01 })
  assert.equal((await api.getSnapshot()).uploads.length, 0, 'not the live default')
  api.demo!.loadScanFixture()
  const s = await api.getSnapshot()
  assert.deepEqual(s.uploads.map(u => u.name).sort(), SCAN_FIXTURE.map(f => f.name).sort())
  assert.deepEqual([s.uploads.filter(u => u.scan === 'verified').length, s.uploads.filter(u => u.scan === 'scanning').length, s.uploads.filter(u => u.scan === 'blocked').length], [3, 2, 1])
  assert.equal(ingestionBlock(s.uploads), 'Wait for virus scans to finish')
})

test('staged intake: filter incompatible files, then choose what fits the batch', async () => {
  const f = (name: string, size = 1000) => ({ name, size })
  const MB = 1024 * 1024
  // The reported case: a 2,853-file project folder of 152 MB.
  const folder = [
    ...Array.from({ length: 2844 }, (_, i) => f(i % 2 ? `src/c${i}.ts` : `web/p${i}.html`)),
    f('ROADMAP.md', 0), f('docs/brief.pdf', 3 * MB), f('docs/spec.docx', 2 * MB), f('docs/big deck.pptx', 34 * MB),
    f('notes.txt', 0), f('.DS_Store'), f('Thumbs.db'), f('docs/rfq.xlsx', MB), f('blank.pdf', 0), f('huge.zip', 300 * MB),
  ]
  const t0 = Date.now()
  const tr = triage(folder)
  assert.ok(Date.now() - t0 < 200, 'triage is fast')
  assert.equal(tr.total, 2854)
  assert.deepEqual(tr.usable.map(x => x.name), ['docs/brief.pdf', 'docs/spec.docx', 'docs/big deck.pptx', 'docs/rfq.xlsx'], 'only compatible files remain')
  assert.deepEqual([tr.unsupported.length, tr.empty.length, tr.system.length, tr.tooLarge.length], [2845, 2, 2, 1])
  assert.deepEqual(tr.byExt.slice(0, 2), [['.html', 1422], ['.ts', 1422]])
  assert.equal(fit(tr.usable).ok, true, 'the 4 usable files (40 MB) fit: no rejection')

  // Too many usable files: the user chooses; nothing is rejected outright.
  const many = Array.from({ length: 40 }, (_, i) => f(`d${i}.pdf`, 2 * MB))
  const all = fit(many)
  assert.equal(all.ok, false); assert.match(all.reason!, /40 chosen; 25 files fit/)
  const auto = autoPick(many)
  assert.equal(auto.length, 25); assert.equal(fit(auto).ok, true, 'auto-select fills the batch exactly')
  assert.equal(fit(autoPick(many, { count: 20, bytes: 0 }), { count: 20, bytes: 0 }).count, 5, 'room left in an existing batch')
  assert.match(fit(Array.from({ length: 13 }, (_, i) => f(`x${i}.pdf`, 20 * MB))).reason!, /260 MB chosen; 250 MB fits/)
  assert.equal(fit([]).reason, 'Select at least one file')
  assert.equal(fit([f('long.pdf', 240 * MB)]).ok, true, 'one long file under the batch budget fits (chunked)')

  // Chunk branches: Doc.pdf -> Doc-chunk1.pdf ...
  assert.deepEqual(chunkNames('Full RFQ package.pdf', 25 * MB), ['Full RFQ package-chunk1.pdf', 'Full RFQ package-chunk2.pdf', 'Full RFQ package-chunk3.pdf'])
  assert.deepEqual(chunkNames('small.pdf', 10 * MB), [], '10 MB goes in one piece')
  assert.deepEqual([chunkCount(1), chunkCount(10 * MB + 1), chunkCount(240 * MB)], [1, 2, 24])
  void MAX_UPLOAD_BYTES

  // The backend enforces the batch limit too.
  const api = createMockApi({ speed: 0.001 })
  for (let i = 0; i < MAX_BATCH_FILES; i++) await api.uploadFile({ name: `f${i}.pdf`, size: 10 }, () => {})
  await assert.rejects(api.uploadFile({ name: 'one-more.pdf', size: 10 }, () => {}), /batch is full/)
  const api2 = createMockApi({ speed: 0.001 })
  const seen: number[] = []
  const rec = await api2.uploadFile({ name: 'long.pdf', size: 25 * 1024 * 1024 }, l => seen.push(l))
  assert.deepEqual([rec.parts, seen.length], [3, 3], 'a 25 MB file goes up in three 10 MB parts')
  await assert.rejects(api2.uploadFile({ name: 'huge.pdf', size: MAX_UPLOAD_BYTES + 1 }, () => {}), /exceeds/)
})
