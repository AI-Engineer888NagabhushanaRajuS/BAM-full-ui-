import type { DataProvider } from '@refinedev/core'
import type { CodeFile, IngestionRun, IsatvonField, SkillRow, Snapshot, StepId, UploadRecord } from './types'

export type ScanOutcome = 'clean' | 'threat' | 'error'
import { createMockApi } from './mock'

// The only seam between UI and backend. Swap `api` for an HTTP/WebSocket
// implementation of this interface to point the workbench at real services.
export interface BamApi {
  getSnapshot(): Promise<Snapshot>
  getSkills(): Promise<SkillRow[]>
  getCode(): Promise<CodeFile[]>
  /** stageUpload: stores the file in private quarantine staging and starts an async BuLL*Sav virus scan (ClamAV engine via clamd in production). */
  uploadFile(file: { name: string; size: number; batchId?: string }, onProgress: (loaded: number, total: number) => void): Promise<UploadRecord>
  /** Removes a file from the active intake batch once the service confirms. A blocked object stays in quarantine (audit). Refused while scanning. */
  removeUpload(id: string): Promise<void>
  /** Emergency flush: clears all staged uploads and resets quarantine queue. */
  resetAllUploads(): Promise<void>
  /** Rescans a file whose scan failed (outage, timeout, malformed verdict). */
  retryScan(id: string): Promise<void>
  /** Approved access for a released, Verified file only; refused for scanning, blocked or errored files. */
  getVerifiedFileAccess(id: string): Promise<{ url: string; expiresAt: string }>
  /** Atomically re-checks the whole batch (scanGate) and starts one run for the released files. Rejects ineligible or repeated starts. */
  startIngestionRun(): Promise<IngestionRun>
  /** Mock-only controls (failure simulation, mixed-state fixture). An HTTP adapter leaves this undefined. */
  demo?: { setScanOutcome(o: ScanOutcome): void; loadScanFixture(): void }
  /** Generate (or retry) the SOW from the RAG context of the ingested (verified) uploads. */
  startSowGeneration(contextRunId?: string): Promise<void>
  saveSowDraft(html: string, baseVersion: number): Promise<number>
  approveSow(version: number): Promise<void>
  requestSowChanges(version: number, note: string): Promise<void>
  reopen(step: StepId): Promise<void>
  closeReopen(step: StepId): Promise<void>
  updateSkillField(id: string, field: IsatvonField, value: string): Promise<SkillRow>
  markGridReviewed(): Promise<void>
  generateContract(): Promise<void>
  retryActivity(key: 'A' | 'B' | 'C' | 'D'): Promise<void>
  /** Saves a human edit; resolves true when the file passes activity C's AST check. */
  saveCode(path: string, content: string): Promise<boolean>
  /** Saves an edited manifest (JSON). Version, agent and skill names are editable; hash and createdAt are recomputed. */
  saveManifest(json: string): Promise<void>
  /** Human approval of the current manifest and code; completes 4.1 and unlocks 4.4. */
  approveManifest(): Promise<void>
  runTests(): Promise<void>
  markTestsReviewed(): Promise<void>
  commitToPostgres(): Promise<void>
  deployToStaging(): Promise<void>
}

// ponytail: mock only; add an http adapter here when endpoints exist (VITE_API_BASE).
export const api: BamApi = createMockApi()

// Refine reads go through `custom`; resource CRUD is unused by this workbench.
const reads: Record<string, () => Promise<unknown>> = {
  snapshot: () => api.getSnapshot(),
  skills: async () => ({ rows: await api.getSkills() }),
  code: async () => ({ files: await api.getCode() }),
}

const unsupported = () => Promise.reject(new Error('Not used by the BAM workbench'))

export const dataProvider: DataProvider = {
  getApiUrl: () => 'mock://bam',
  getList: unsupported,
  getOne: unsupported,
  create: unsupported,
  update: unsupported,
  deleteOne: unsupported,
  custom: async ({ url }) => {
    const read = reads[url]
    if (!read) throw new Error(`Unknown read: ${url}`)
    return { data: (await read()) as never }
  },
}
