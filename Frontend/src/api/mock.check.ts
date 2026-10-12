// Runnable self-check of the mock backend's gates: npm run check
import assert from 'node:assert/strict'
import { createMockApi, validateField } from './mock.ts'

const api = createMockApi({ speed: 0.01 })
const wait = async (cond: () => Promise<boolean>) => { for (let i = 0; i < 500; i++) { if (await cond()) return; await new Promise(r => setTimeout(r, 5)) } throw new Error('timeout') }
const snap = () => api.getSnapshot()
const state = async (n: number) => (await snap()).steps[n - 1].state

assert.equal(validateField('sourceData', 'bom.xlsx')?.startsWith('value_error'), true)
assert.equal(validateField('variables', 'a: 1; b 2')?.includes('"b 2"'), true)

assert.equal(await state(2), 'locked')
await api.uploadFile({ name: 'rfq.pdf', size: 1000 }, () => {})
assert.equal((await snap()).sow, undefined, 'upload alone does not generate a SOW')
await assert.rejects(api.startSowGeneration(), /ingestion run/, 'no SOW before the scan-gated ingestion run')
await assert.rejects(api.startIngestionRun(), /virus scans/, 'cannot ingest while scanning')
await wait(async () => (await snap()).uploads[0].scan === 'verified')
await api.startIngestionRun()
await api.startSowGeneration()
await wait(async () => !!(await snap()).sow)
const v1 = (await snap()).sow!.version
assert.equal(await state(1), 'needs_review')
await assert.rejects(api.updateSkillField('SK-001', 'outcome', 'x'), /locked/)

await api.approveSow(v1)
await wait(async () => (await api.getSkills()).length === 6)
assert.equal((await snap()).activeStep, 2)
await assert.rejects(api.saveSowDraft('<p>x</p>', v1), /read-only/)
await assert.rejects(api.generateContract(), /reviewed/)

const bad = await api.updateSkillField('SK-001', 'sourceData', 'nope')
assert.ok(bad.errors.sourceData)
await assert.rejects(api.markGridReviewed(), /validation/)
await api.updateSkillField('SK-001', 'sourceData', 's3://ok/x')
await api.markGridReviewed()
await api.generateContract()
await wait(async () => { const w = (await snap()).workflow!; if (w.status === 'failed') console.log(JSON.stringify(w.activities, null, 1)); return w.status !== 'running' })
const wf = (await snap()).workflow!
assert.equal(wf.status, 'succeeded')
assert.equal(wf.activities[2].attempts, 2, 'C retried after D fallback')
assert.equal(wf.activities[3].status, 'succeeded')
// 4.1 stays open for human review until the manifest and code are approved
assert.equal(await state(3), 'needs_review')
assert.equal(await state(4), 'locked')
assert.ok((await api.getCode()).every(f => typeof f.generated === 'string' && f.generated.length > 0), 'generated code kept for comparison')
assert.ok(wf.generatedManifest?.includes('"skills"'), 'generated manifest kept for comparison')

// Manifest edits: validated; names and version editable; hash recomputed
await assert.rejects(api.saveManifest('{ not json'), /not valid JSON/)
const man = JSON.parse(wf.generatedManifest!)
await assert.rejects(api.saveManifest(JSON.stringify({ ...man, skills: man.skills.slice(1) })), /must list all/)
man.skills[0].name = 'Receive RFQ (renamed)'
await api.saveManifest(JSON.stringify(man))
const afterMan = (await snap()).workflow!
assert.equal(afterMan.manifest!.skills[0].name, 'Receive RFQ (renamed)')
assert.notEqual(afterMan.manifest!.hash, wf.manifest!.hash, 'hash recomputed after a manifest edit')
assert.equal((await api.getSkills())[0].name, 'Receive RFQ (renamed)', 'grid follows the manifest rename')
assert.equal(afterMan.manifest!.skills[0].file, wf.manifest!.skills[0].file, 'renaming a skill keeps its code file path (and its edits)')

// Approval completes 4.1 and is tied to the manifest hash
await api.approveManifest()
assert.equal(await state(4), 'active')
assert.equal((await snap()).workflow!.approval!.hash, afterMan.manifest!.hash)

// After approval the code is locked; reopening and editing clears the approval
await assert.rejects(api.saveCode('skills/validate_bom.py', 'x'), /read-only/)
await api.reopen(3)
const hash0 = (await snap()).workflow!.manifest!.hash
const file = (await api.getCode()).find(f => f.path === 'skills/validate_bom.py')!
assert.equal(await api.saveCode(file.path, file.content.replace('VARIABLES = {', 'VARIABLES = {\n    "bad": =A1,')), false)
assert.equal((await snap()).workflow!.status, 'failed')
assert.equal(await state(4), 'locked')
assert.equal(await api.saveCode(file.path, file.content + '\n# reviewed by FDE\n'), true)
const s3 = await snap()
assert.equal(s3.workflow!.status, 'succeeded')
assert.notEqual(s3.workflow!.manifest!.hash, hash0, 'manifest hash covers edited code')
assert.ok((await api.getCode()).find(f => f.path === file.path)!.edited)
assert.equal(s3.workflow!.approval, undefined, 'editing clears the approval')
assert.equal(await state(4), 'locked')
await api.approveManifest()
assert.equal((await snap()).activeStep, 4)

await api.runTests()
await wait(async () => (await snap()).tests?.promptfoo.status === 'succeeded')
await assert.rejects(api.commitToPostgres(), /Review the Promptfoo results/, 'unreviewed run cannot persist')
await api.markTestsReviewed()
await api.commitToPostgres()
await wait(async () => !!(await snap()).persist.committed)
await api.deployToStaging()
await wait(async () => !!(await snap()).persist.deployed)
assert.equal(await state(4), 'done')

// Reopen step 1 and edit: approval invalidated, later steps stale/locked
await api.reopen(1)
const s1 = await snap()
assert.equal(s1.activeStep, 1)
assert.ok(s1.steps[1].stale && s1.steps[3].stale)
await api.saveSowDraft(s1.sow!.html + '<p>edit</p>', s1.sow!.version)
const s2 = await snap()
assert.deepEqual([s2.sow!.previous!.version, s2.sow!.previous!.html], [s1.sow!.version, s1.sow!.html], 'previous saved version is kept for comparison')
assert.match(s2.sow!.invalidated!.reason, /Edited after approval/)
assert.equal(s2.steps[1].state, 'locked')

// A failing Promptfoo run can be neither reviewed nor persisted/deployed.
{
  const b = createMockApi({ speed: 0.01 })
  const bs = () => b.getSnapshot()
  await b.uploadFile({ name: 'rfq.pdf', size: 1000 }, () => {})
  await wait(async () => (await bs()).uploads[0].scan === 'verified')
  await b.startIngestionRun()
  await b.startSowGeneration()
  await wait(async () => !!(await bs()).sow)
  await b.approveSow((await bs()).sow!.version)
  await wait(async () => (await b.getSkills()).length === 6)
  await b.updateSkillField('SK-002', 'instructions', 'Classify each attachment by OKF class. TBD: confidence rules.')
  await b.markGridReviewed()
  await b.generateContract()
  await wait(async () => (await bs()).workflow?.status === 'succeeded')
  await b.approveManifest()
  await b.runTests()
  await wait(async () => (await bs()).tests?.promptfoo.status === 'failed')
  await assert.rejects(b.markTestsReviewed(), /clean run/)
  await assert.rejects(b.commitToPostgres(), /must pass/)
  await assert.rejects(b.deployToStaging(), /Commit/)
}
console.log('mock backend checks passed')
