// What actually blocks a locked screen, derived from backend + RAG state. The reason text and the
// button target come from the same check, so a lock never says "approve in 3.1" while sending you to 1.1.
import type { Snapshot, StepId } from '../api/types'
import type { RagState } from '../rag/ragPipeline.ts'

export interface Blocker { reason: string; label: string; target: string }

/** The first unmet prerequisite for working on backend step `step`, or undefined when nothing blocks it. */
export function prerequisite(snap: Snapshot, rag: Pick<RagState, 'runId' | 'steps'>, step: StepId): Blocker | undefined {
  if (!snap.uploads.length) return { reason: 'Source documents are needed first. The SOW is generated from the RAG context of the uploaded documents.', label: 'Upload documents', target: '1.1' }
  if (!snap.ingestion) return { reason: 'Documents are uploaded but have not entered RAG. Only virus-scanned, verified files can: start the ingestion run in 1.1.', label: 'Open 1.1 Intake console', target: '1.1' }

  const sow = snap.sow
  const genFailed = snap.sowGeneration.find(s => s.status === 'failed')
  const generating = snap.sowGeneration.some(s => s.status === 'running' || s.status === 'queued')
  const ragFailed = rag.steps.find(s => s.status === 'failed')
  if (ragFailed) return { reason: `The RAG pipeline failed at "${ragFailed.label}", so no verified SOW can be approved.`, label: 'Open 2.1 to retry', target: '2.1' }

  const ragRunning = rag.runId && !rag.steps.every(s => s.status === 'done')
  if (ragRunning && (!sow || (sow.contextRunId && sow.contextRunId !== rag.runId))) {
    return {
      reason: 'The RAG context pipeline is still running. SOW synthesis begins automatically once Stage 2 finishes.',
      label: 'Open 2.1 context pipeline', target: '2.1',
    }
  }

  if (!sow) {
    if (genFailed) return { reason: `SOW generation failed at "${genFailed.label}": ${genFailed.error ?? 'no reason reported'}`, label: 'Open 3.1 to retry', target: '3.1' }
    if (generating) return { reason: 'The SOW is being generated from the RAG context. It needs review and approval in 3.1 when it is ready.', label: 'Open 3.1', target: '3.1' }
    return {
      reason: rag.runId ? 'The RAG context is still being built. The SOW is generated automatically when it is ready.' : 'Documents are stored but the RAG context has not been built yet, so no SOW exists.',
      label: 'Open 2.1 context pipeline', target: '2.1',
    }
  }
  if (step === 1) return undefined

  if (sow.status === 'regenerating') return { reason: `SOW v${sow.changeRequest?.version ?? sow.version} is being regenerated with AI. Review and approve the new version in 3.1.`, label: 'Review SOW', target: '3.1' }
  if (sow.status !== 'approved' || !sow.approval) return { reason: `SOW v${sow.version} is a draft awaiting approval. Approve it in 3.1 to unlock the skills grid.`, label: 'Review SOW', target: '3.1' }
  if (step === 2) return undefined

  const wf = snap.workflow
  if (!wf) return {
    reason: snap.gridReviewedAt ? 'The grid is reviewed; generate the ISATVON Contract in 3.2 to start validation.' : 'Review the skills grid in 3.2, then generate the ISATVON Contract to start validation.',
    label: 'Open 3.2', target: '3.2',
  }
  if (step === 3) return undefined

  if (wf.status === 'running') return { reason: 'The Temporal validation workflow is still running.', label: 'Open 4.1', target: '4.1' }
  if (wf.status === 'failed') return { reason: `Validation failed: ${wf.activities.find(a => a.status === 'failed')?.reason ?? 'see 4.1'}`, label: 'Open 4.1', target: '4.1' }
  if (!wf.manifest || wf.approval?.hash !== wf.manifest.hash) return { reason: 'Approve the manifest and code to unlock testing.', label: 'Review manifest', target: '4.2' }
  return undefined
}
