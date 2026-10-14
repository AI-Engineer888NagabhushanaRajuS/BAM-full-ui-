import { useSyncExternalStore } from 'react'
import Uppy from '@uppy/core'
import { api } from '../api/adapter'
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES } from '../api/types'
import { initialStatuses, type Statuses } from '../tracker/trackerConfig.ts'
import { localTrackerStorage } from '../tracker/trackerStorage.ts'

// UI-only state: what the viewer is looking at. Process state lives in the backend snapshot.
/** `screen` is the screen ID the toast links to (e.g. '3.1'). */
export interface Toast { id: number; tone: 'info' | 'success' | 'error'; text: string; screen?: string; key?: string }

export interface Ui {
  theme: 'dark' | 'light'
  env: 'FDE' | 'Staging'
  settingsOpen: boolean
  toasts: Toast[]
  passage?: string
  codeFocus?: { file: string; line?: number }
  /** Collapsed side panes in the 3-pane workbench screens. */
  collapsed: { left: boolean; right: boolean }
  tracker: TrackerState
  /** Files refused at intake in this session (type/size limits, upload errors), with the reason. Shown in 1.2 and 1.4. */
  rejected: { name: string; reason: string; at: string }[]
  /** Upload record selected in 1.3 File detail. */
  fileDetail?: string
  /** Skill selected in 3.3 Skills/code review. */
  reviewSkill?: string
  /** FDE Intake Objectives & Scope Directives (typed or Windows Voice-to-Text). */
  fdeGoals?: string
  openRouterModalOpen?: boolean
  preflightModalOpen?: boolean
  openConnectorModalOpen?: boolean
}

// Manual progress tracker; lives in the same store the stepper navigates with.
export interface TrackerState {
  /** Manual statuses; shown only while `basis` matches the evidence (effectiveStatuses). */
  statuses: Statuses
  basis: Partial<Statuses>
  /** Workflow evidence per screen (tracker/evidence.ts), not persisted. */
  evidence: Statuses
  /** Screens whose evidence is from a previous RAG run. */
  previous: string[]
  openTask: string | null
  selected: string | null
  /** Edits stay disabled until saved progress has loaded. */
  loaded: boolean
  storageError?: string
}
export const trackerStorage = localTrackerStorage()

const saved = (() => { try { return localStorage.getItem('bam-theme') } catch { return null } })()
const savedPanes = (() => { try { return JSON.parse(localStorage.getItem('bam-panes') ?? 'null') as Ui['collapsed'] | null } catch { return null } })()
const savedGoals = (() => { try { return localStorage.getItem('bam-fde-goals') ?? '' } catch { return '' } })()
let state: Ui = {
  theme: saved === 'light' ? 'light' : 'dark',
  env: 'FDE', settingsOpen: false, toasts: [],
  collapsed: { left: savedPanes?.left === true, right: savedPanes?.right === true },
  tracker: { statuses: initialStatuses(), basis: {}, evidence: initialStatuses(), previous: [], openTask: null, selected: null, loaded: false },
  rejected: [],
  fdeGoals: savedGoals,
  openRouterModalOpen: false,
  preflightModalOpen: false,
  openConnectorModalOpen: false,
}
const subs = new Set<() => void>()

export const openSettings = () => setUi({ settingsOpen: true })
export const closeSettings = () => setUi({ settingsOpen: false })
export const openOpenRouterModal = () => setUi({ openRouterModalOpen: true })
export const closeOpenRouterModal = () => setUi({ openRouterModalOpen: false })
export const openPreflight = () => setUi({ preflightModalOpen: true })
export const closePreflight = () => setUi({ preflightModalOpen: false })
export const openOpenConnector = () => setUi({ openConnectorModalOpen: true })
export const closeOpenConnector = () => setUi({ openConnectorModalOpen: false })

export function setUi(patch: Partial<Ui> | ((s: Ui) => Partial<Ui>)) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
  try {
    localStorage.setItem('bam-theme', state.theme)
    localStorage.setItem('bam-panes', JSON.stringify(state.collapsed))
    if (state.fdeGoals !== undefined) localStorage.setItem('bam-fde-goals', state.fdeGoals)
  } catch { /* storage blocked */ }
  subs.forEach(f => f())
}

export const getUi = () => state

export const useUi = <T,>(select: (s: Ui) => T) =>
  useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb) } }, () => select(state))

void trackerStorage.load().then(r => setUi(s => ({ tracker: { ...s.tracker, statuses: r.statuses, basis: r.basis, loaded: true, storageError: r.error } })))

let toastId = 0
/** A toast with the same `key` (or the same text) replaces the earlier one instead of stacking. */
export function toast(text: string, tone: Toast['tone'] = 'info', screen?: string, key?: string) {
  const id = ++toastId
  setUi(s => ({ toasts: [...s.toasts.filter(t => (key ? t.key !== key : true) && t.text !== text), { id, tone, text, screen, key }] }))
  // Errors stay until dismissed; never auto-dismiss a failure.
  if (tone !== 'error') setTimeout(() => dismissToast(id), 6000)
}
export const dismissToast = (id: number) => setUi(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))

// One Uppy instance for the app's lifetime, so uploads keep running when the modal closes.
export const uppy = new Uppy({
  id: 'bam-intake',
  restrictions: { maxFileSize: MAX_UPLOAD_BYTES, allowedFileTypes: ACCEPTED_TYPES },
})

uppy.addUploader(async fileIDs => {
  const files = fileIDs.map(id => uppy.getFile(id))
  uppy.emit('upload-start', files)
  // ponytail: 3 files at a time so a big batch never floods the server; raise if the backend scales.
  const queue = [...files]
  const worker = async () => { for (let f = queue.shift(); f; f = queue.shift()) await send(f) }
  await Promise.all([worker(), worker(), worker()])
})

async function send(f: ReturnType<typeof uppy.getFile>) {
    try {
      const batchId = (f.meta as any)?.batchId as string | undefined
      const rec = await api.uploadFile({ name: f.name ?? 'file', size: f.size ?? 0, batchId }, (loaded, total) =>
        uppy.emit('upload-progress', uppy.getFile(f.id), { uploadStarted: Date.now(), bytesUploaded: loaded, bytesTotal: total }))
      uppy.emit('upload-success', uppy.getFile(f.id), { status: 200, body: rec as never, uploadURL: rec.objectKey })
    } catch (e) {
      uppy.emit('upload-error', uppy.getFile(f.id), { name: 'UploadError', message: (e as Error).message })
    }
}

/** Browse/drop in 1.1: add files to the shared Uppy instance (type/size restrictions apply) and upload right away. */
export function uploadFiles(list: FileList | File[], batchId?: string) {
  const done = uppy.getFiles().filter(f => f.progress.uploadComplete).map(f => f.id)
  if (done.length) uppy.removeFiles(done)
  uppy.setOptions({ restrictions: { maxNumberOfFiles: null } })
  let added = 0
  for (const f of list) {
    try {
      uppy.addFile({
        name: f.name,
        type: f.type,
        data: f,
        source: 'intake',
        meta: { batchId: (f as any).batchId || batchId },
      })
      added++
    } catch { /* restriction-failed already reported */ }
  }
  if (added) void uppy.upload()
}

uppy.on('complete', r => {
  if (r.successful?.length) toast(`${r.successful.length} file(s) uploaded to quarantine. Virus scans started.`, 'success', '1.1')
  if (r.failed?.length) toast(`${r.failed.length} upload(s) failed. See the upload list in 1.1.`, 'error', '1.1')
})
const reject = (name: string, reason: string) => setUi(s => ({ rejected: [...s.rejected, { name, reason, at: new Date().toISOString() }] }))
uppy.on('restriction-failed', (file, err) => { reject(file?.name ?? 'File', err.message); toast(`${file?.name ?? 'File'} rejected: ${err.message}`, 'error', '1.4') })
uppy.on('upload-error', (file, err) => { if (file) reject(file.name ?? 'File', err?.message ?? 'Upload failed') })
