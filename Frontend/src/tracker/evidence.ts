// Tracker status from real workflow evidence (backend snapshot + RAG pipeline). Pure, so it is unit tested.
// Completion follows saved reviews, checks and gates, never a route visit. Stage 1 completes from the intake
// gates alone (upload, BuLLSav verdicts, release, hand-off to RAG), so all four screens finish automatically.
import type { Snapshot, StepState } from '../api/types'
import type { RagState } from '../rag/ragPipeline.ts'
import type { TrackerStatus } from './trackerConfig.ts'

const FROM_STEP: Record<StepState, TrackerStatus> = {
  locked: 'not_started', active: 'in_progress', needs_review: 'needs_review', done: 'done', failed: 'blocked',
}

function ragStep(rag: RagState, key: 'chunk' | 'extract' | 'graph' | 'schemas'): TrackerStatus {
  if (!rag.runId) return 'not_started'
  const steps = rag.steps
  const i = steps.findIndex(s => s.key === key)
  if (steps[i].status === 'done') return 'done'
  if (steps.slice(0, i + 1).some(s => s.status === 'failed')) return 'blocked'
  return 'in_progress'
}

export function evidenceStatuses(snap: Snapshot, rag: RagState): Record<string, TrackerStatus> {
  const sow = snap.sow
  const gen = snap.sowGeneration
  const graph = ragStep(rag, 'graph')
  const schemas = ragStep(rag, 'schemas')
  const uploads = snap.uploads.length
  const scanning = snap.uploads.some(u => u.scan === 'scanning' && !u.scanError)
  const wf = snap.workflow
  const approved = !!wf?.manifest && wf.approval?.hash === wf.manifest.hash
  // Code and manifest review (3.3, 4.2, 4.3) completes only with the human approval for the current hash.
  const review: TrackerStatus = !wf ? 'not_started' : wf.status === 'running' ? 'in_progress' : wf.status === 'failed' ? 'blocked' : approved ? 'done' : 'needs_review'
  // Only a hand-off from the current RAG run counts; one from an earlier run does not complete 2.2/2.4.
  const handedOff = schemas === 'done' ? (rag.handoffs.some(h => h.contextVersion === rag.runId) ? 'done' : 'needs_review') : schemas
  // Stage 2 must pass before Stage 3/4 can show progress or completion
  const ragPassed = !!rag.runId && schemas === 'done' && !rag.steps.some(s => s.status === 'failed')

  const ev: Record<string, TrackerStatus> = {
    // 1.1 completes when its scan-gated ingestion run starts, not on upload.
    '1.1': snap.ingestion ? 'done' : snap.uploads.some(u => u.scan === 'blocked' || u.scanError) ? 'blocked' : uploads ? 'in_progress' : 'not_started',
    // 1.2 queue: every file has left the upload/scan queue with no failure.
    '1.2': !uploads ? 'not_started' : snap.uploads.some(u => u.status === 'failed' || u.scanError) ? 'blocked' : scanning ? 'in_progress' : 'done',
    // 1.3 file detail: every file has a final verdict and released detail (a blocked file stays quarantined: needs review).
    '1.3': !uploads ? 'not_started' : scanning ? 'in_progress' : snap.uploads.some(u => u.scan === 'blocked' || u.scanError) ? 'needs_review' : snap.uploads.every(u => u.released) ? 'done' : 'in_progress',
    // 1.4 review: done once the verified batch is handed to RAG (the ingestion run); a failed RAG step blocks it.
    '1.4': !uploads ? 'not_started' : !snap.ingestion ? 'needs_review' : rag.steps.some(s => s.status === 'failed') ? 'blocked' : 'done',
    '2.1': graph,
    '2.2': handedOff,
    '2.3': graph,
    '2.4': handedOff,
    '3.1': !ragPassed
      ? (gen.some(s => s.status === 'running' || s.status === 'queued') ? 'in_progress' : rag.steps.some(s => s.status === 'failed') || gen.some(s => s.status === 'failed') ? 'blocked' : 'not_started')
      : (sow?.status === 'approved' ? 'done'
        : gen.some(s => s.status === 'failed') ? 'blocked'
        : sow?.status === 'regenerating' || gen.some(s => s.status === 'running' || s.status === 'queued') ? 'in_progress'
        : sow ? 'needs_review' : 'not_started'),
    '3.2': !ragPassed ? 'not_started' : FROM_STEP[snap.steps[1].state],
    '3.3': !ragPassed ? 'not_started' : review,
    '3.4': !ragPassed ? 'not_started' : (!wf?.manifest ? 'not_started' : approved ? 'done' : 'needs_review'),
    '4.1': !ragPassed ? 'not_started' : (!wf ? 'not_started' : wf.status === 'running' ? 'in_progress' : wf.status === 'failed' ? 'blocked' : 'done'),
    '4.2': !ragPassed ? 'not_started' : review,
    '4.3': !ragPassed ? 'not_started' : review,
    '4.4': !ragPassed ? 'not_started' : FROM_STEP[snap.steps[3].state],
  }
  // Work built on an earlier RAG run is kept but shows as not started (marked "from previous run" by previousRun()).
  for (const id of previousRun(snap, rag)) ev[id] = 'not_started'
  return ev
}

/** Stage 3 and 4 screens whose evidence comes from an earlier RAG run (the SOW was generated from another run's context). */
export function previousRun(snap: Snapshot, rag: RagState): string[] {
  const from = snap.sow?.contextRunId
  return from && rag.runId && from !== rag.runId ? ['3.1', '3.2', '3.3', '3.4', '4.1', '4.2', '4.3', '4.4'] : []
}

/** What marks each screen done: the single rule behind the tracker counts, shown in the chip tooltips. */
export const DONE_RULE: Record<string, string> = {
  '1.1': 'Done when the verified batch is handed to RAG (Start ingestion run).',
  '1.2': 'Done when every file has left the upload and scan queue without a failure.',
  '1.3': 'Done when every file has a final BuLLSav verdict and is released from quarantine.',
  '1.4': 'Done when the ingestion run hands the verified batch to RAG.',
  '2.1': 'Done when the Cognee graph build of the current RAG run finishes.',
  '2.2': 'Done when a schema from the current RAG run is sent to the Workbench.',
  '2.3': 'Done when the graph of the current RAG run is queryable (graph build finished).',
  '2.4': 'Done when a schema from the current RAG run is sent to the Workbench.',
  '3.1': 'Done when the current SOW version is approved.',
  '3.2': 'Done when the grid is reviewed and Generate ISATVON Contract starts the validation workflow.',
  '3.3': 'Done when manifest and code are approved for the current hash (Approve and continue to 4.4). Opening 3.3 is not required.',
  '3.4': 'Done when manifest and code are approved for the current hash (Approve and continue to 4.4). Opening 3.4 is not required.',
  '4.1': 'Done when the validation run (activities A to D) succeeds.',
  '4.2': 'Done when manifest and code are approved for the current hash.',
  '4.3': 'Done when manifest and code are approved for the current hash.',
  '4.4': 'Done when the certified manifest is deployed to Staging.',
}
