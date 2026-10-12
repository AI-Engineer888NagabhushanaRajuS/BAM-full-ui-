// npm test: OKF v0.2 bundle from a real mock run: conformance, trust tiers, provenance, tarball.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createMockApi } from '../api/mock.ts'
import { createMockRagService } from './ragPipeline.ts'
import { buildOkfBundle, conceptStatus, conceptType, toTar, trustTier, validateOkf } from './okf.ts'

const until = async (cond: () => Promise<boolean> | boolean) => {
  for (let i = 0; i < 800; i++) { if (await cond()) return; await new Promise(r => setTimeout(r, 5)) }
  throw new Error('timeout')
}

test('OKF v0.2 bundle: conformant, provenance from released uploads, trust from scans and reviews', async () => {
  const api = createMockApi({ speed: 0.01 })
  await api.uploadFile({ name: 'RFQ Package.pdf', size: 25 * 1024 * 1024 }, () => {})
  api.demo!.setScanOutcome('threat')
  await api.uploadFile({ name: 'bad.zip', size: 1000 }, () => {})
  await until(async () => (await api.getSnapshot()).uploads.every(u => u.scan !== 'scanning'))
  const rag = createMockRagService({ speed: 0.01, loadDelay: 1 })
  rag.start()
  await until(() => rag.getState().steps.every(s => s.status === 'done'))
  rag.sendToWorkbench('QuoteLine')
  const files = buildOkfBundle((await api.getSnapshot()).uploads, rag.getState(), new Date().toISOString())

  assert.deepEqual(validateOkf(files), [], 'conformant with OKF v0.2 §11')
  assert.match(files[0].content, /^---\nokf_version: "0.2"\n---/, 'root index declares okf_version')
  const by = (p: string) => files.find(f => f.path === p)!
  const sources = files.filter(f => f.path.startsWith('sources/'))
  assert.deepEqual(sources.map(f => f.path), ['sources/rfq-package-pdf.md'], 'only released (clean) uploads become sources; the blocked file never does')
  assert.equal(trustTier(sources[0].content), 'machine-confirmed', 'verified by process:bullsav')
  assert.match(sources[0].content, /uploaded in 3 chunks/)
  assert.equal(trustTier(by('schemas/quoteline.md').content), 'human-reviewed', 'hand-off in 2.2 is a human verification')
  assert.equal(conceptStatus(by('schemas/quoteline.md').content), 'stable')
  assert.equal(trustTier(by('schemas/requirement.md').content), 'unverified')
  assert.equal(conceptStatus(by('schemas/requirement.md').content), 'draft')
  const entity = files.find(f => f.path.startsWith('entities/table/'))!
  assert.equal(conceptType(entity.content), 'Table')
  assert.match(entity.content, /sources:\n  - id: bom-revc-xlsx\n    resource: \/sources\/bom-revc-xlsx.md/, 'per-claim provenance keyed by id')
  assert.match(entity.content, /\[\^bom-revc-xlsx\]: BOM_RevC.xlsx/, 'footnote attribution')
  assert.match(entity.content, /stale_after: "\d{4}-\d\d-\d\dT[\d:]+Z"/)
  assert.ok(files.some(f => f.path === 'log.md'))
  assert.deepEqual(validateOkf([{ path: 'x.md', content: '# no frontmatter' }, { path: 'y.md', content: '---\ntitle: t\n---\n' }]).length, 2)

  // Tarball (spec §3): real `tar` lists every file. Optional dump dir for external validators: OKF_DUMP=<dir>.
  const dir = process.env.OKF_DUMP ?? mkdtempSync(join(tmpdir(), 'okf-'))
  for (const f of files) { mkdirSync(dirname(join(dir, 'bundle', f.path)), { recursive: true }); writeFileSync(join(dir, 'bundle', f.path), f.content) }
  const tar = toTar(files)
  writeFileSync(join(dir, 'okf-bundle.tar'), tar)
  // Piped through stdin: GNU tar would read a "C:\..." path as a remote host.
  const listed = execFileSync('tar', ['-tf', '-'], { input: tar, encoding: 'utf8' }).trim().split(/\r?\n/)
  assert.deepEqual(listed, files.map(f => `okf-bundle/${f.path}`))
})
