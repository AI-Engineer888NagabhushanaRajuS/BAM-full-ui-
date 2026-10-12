// BAM progress tracker and the app's single screen registry: 4 stages x 4 screens (the 4x4 UX document).
// IDs are stable keys for persistence and routing. 4.1–4.4 are screen NAVIGATION order, not execution order:
// never derive a "next step" gate from these numbers.
import type { StepId } from '../api/types'

export const TRACKER_STATUSES = ['not_started', 'in_progress', 'needs_review', 'done', 'blocked'] as const
export type TrackerStatus = (typeof TRACKER_STATUSES)[number]

export const STATUS_LABEL: Record<TrackerStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  needs_review: 'Needs review',
  done: 'Done',
  blocked: 'Blocked',
}

export interface TrackerItem {
  id: string
  /** null for a stage; the stage id for a screen. */
  parentId: string | null
  label: string
  shortLabel: string
  description: string
  /** Screen URL (screens only). */
  path?: string
  /** The backend workbench step that gates (locks) this screen, if any. */
  step?: StepId
}

const stage = (id: string, label: string, description: string): TrackerItem =>
  ({ id, parentId: null, label, shortLabel: label, description })
const screen = (id: string, label: string, path: string, description: string, step?: StepId): TrackerItem =>
  ({ id, parentId: id.split('.')[0], label, shortLabel: label, description, path, step })

// Excluded on purpose: Jinja2 render (part of 4.1 activity C), Masters, Admin, Client SRI, connectors.
export const TRACKER_ITEMS: readonly TrackerItem[] = [
  stage('1', 'Data Ingestion', 'Upload the discovery documents for this RFQ and check what was accepted.'),
  screen('1.1', 'Intake console: upload & virus scan', '/ingestion', 'Upload documents. Only virus-scanned, verified files enter RAG, via Start ingestion run.', 1),
  screen('1.2', 'Ingestion queue/jobs', '/ingestion/queue', 'Every file with its processing stage, progress, errors and retry.'),
  screen('1.3', 'File detail/preview', '/ingestion/file', 'One source file: metadata, parsed preview and flags.'),
  screen('1.4', 'Ingestion review', '/ingestion/review', 'Accepted and rejected items with reasons, and readiness for the RAG hand-off.'),

  stage('2', 'RAG', 'Build the context graph and draft schemas from the ingested objects.'),
  screen('2.1', 'Context graph explorer', '/rag/graph', 'Graph nodes link back to their source objects (Cognee + OKF).'),
  screen('2.2', 'Schema generation workbench', '/rag/schemas', 'Draft Pydantic models from context; they stay drafts until reviewed.'),
  screen('2.3', 'Retrieval/context quality', '/rag/quality', 'Coverage, extraction jobs and a GraphRAG query test with cited sources.'),
  screen('2.4', 'RAG review', '/rag/review', 'Graph, schema and retrieval readiness, open gaps, and the reviewed hand-off to the Workbench.'),

  stage('3', 'FDE Workbench', 'Generate and approve the SOW, then turn it into ISATVON skills and a manifest.'),
  screen('3.1', 'SOW generation and approval', '/workbench/sow', 'SOW draft with version comparison; approval is tied to the reviewed version.', 1),
  screen('3.2', 'ISATVON skills grid', '/workbench/skills', 'Agent > Skill grid with all seven ISATVON fields, row diffs and the certification summary.', 2),
  screen('3.3', 'Skills/code review', '/workbench/review', 'One skill at a time: its contract, generated code diff and review findings (read-only).'),
  screen('3.4', 'Manifest and deploy prep', '/workbench/release', 'Manifest version, release prerequisites, version history and the hand-off into the Sandbox.'),

  stage('4', 'Sandbox', 'Validate and edit the generated code and manifest, test them, freeze and deploy to Staging.'),
  screen('4.1', 'Activities', '/sandbox/validation', 'Temporal activities A–D with attempt history and findings.', 3),
  screen('4.2', 'Manifest JSON', '/sandbox/manifest', 'Edit the manifest against the certified or generated baseline, then approve manifest and code.', 3),
  screen('4.3', 'Generated code', '/sandbox/code', 'Edit the generated skill code against the generated version; saving re-runs the AST check.', 3),
  screen('4.4', 'Sandbox and assertions', '/sandbox/results', 'Certification checklist and assertion evidence, then Test > Review > Commit > Deploy.', 4),
]

export const TASKS = TRACKER_ITEMS.filter(i => i.parentId === null)
export const SUBTASKS = TRACKER_ITEMS.filter(i => i.parentId !== null)
export const subtasksOf = (stageId: string) => SUBTASKS.filter(s => s.parentId === stageId)

/** Every screen's URL and, for gated screens, the backend step that locks it. Derived from TRACKER_ITEMS. */
export interface ScreenRoute { path: string; step?: StepId }
export const SCREEN_ROUTES: Readonly<Record<string, ScreenRoute>> =
  Object.fromEntries(SUBTASKS.map(s => [s.id, { path: s.path!, ...(s.step ? { step: s.step } : {}) }]))
/** The screen where each backend workbench step is worked on. */
export const STEP_SCREEN: Readonly<Record<StepId, string>> = { 1: '3.1', 2: '3.2', 3: '4.1', 4: '4.4' }
export const screenByPath = (path: string) => {
  const item = SUBTASKS.find(s => s.path === path)
  return item ? { id: item.id, path: item.path!, step: item.step, item } : undefined
}
export const screenLabel = (id: string) => `${id} ${TRACKER_ITEMS.find(i => i.id === id)?.label ?? ''}`.trim()

export type Statuses = Record<string, TrackerStatus>
export const initialStatuses = (): Statuses => Object.fromEntries(SUBTASKS.map(s => [s.id, 'not_started']))

/** Derived parent status; parents are never edited directly. */
export function rollup(children: readonly TrackerStatus[]): TrackerStatus {
  if (children.length > 0 && children.every(s => s === 'done')) return 'done'
  if (children.includes('blocked')) return 'blocked'
  if (children.includes('needs_review')) return 'needs_review'
  if (children.some(s => s === 'in_progress' || s === 'done')) return 'in_progress'
  return 'not_started'
}

/**
 * The one rule for what the tracker shows: workflow evidence (tracker/evidence.ts), unless the screen was set by hand
 * while its evidence was exactly what it is now. Any evidence change (a new run, a reset backend) ends the override.
 */
export function effectiveStatuses(evidence: Statuses, manual: Statuses, basis: Partial<Statuses>): Statuses {
  return Object.fromEntries(SUBTASKS.map(s => [s.id, basis[s.id] !== undefined && basis[s.id] === evidence[s.id] ? manual[s.id] : evidence[s.id] ?? 'not_started']))
}

export const taskStatus = (stageId: string, statuses: Statuses) => rollup(subtasksOf(stageId).map(s => statuses[s.id] ?? 'not_started'))
export const doneCount = (items: readonly TrackerItem[], statuses: Statuses) => items.filter(s => statuses[s.id] === 'done').length
