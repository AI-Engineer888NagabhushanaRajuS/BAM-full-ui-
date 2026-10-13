// 1.1 Intake console: Three-pane workbench data ingestion & BuLL*Sav zero-trust defense.
// Left: Context, Stepper & Source Documents.
// Center: Intake Assistant, FDE Directives (Text & Native Voice) & Dropzone.
// Right: Readiness Checklist, Sufficiency Metrics, BuLL*Sav Core & Ingestion Gate.

import { useEffect, useRef, useState } from 'react'
import { useUppyState } from '@uppy/react'
import { api } from '../api/adapter'
import type { ScanOutcome } from '../api/adapter'
import { ACCEPTED_TYPES, AV_NAME, CHUNK_BYTES, chunkCount, MAX_BATCH_BYTES, MAX_BATCH_FILES, MAX_UPLOAD_BYTES, type ScanEvent, type Snapshot, type UploadRecord } from '../api/types'
import { autoPick, chunkNames, fit, ingestionBlock, scanView, triage, MAX_MULTI_BATCH_FILES, MAX_MULTI_BATCH_BYTES, type ScanAction, type Triage } from '../api/scanGate.ts'
import type { StepProps } from '../App'
import { useAction } from '../lib/data'
import { setUi, toast, uploadFiles, uppy, useUi } from '../lib/store'
import { goScreen } from '../lib/route'
import { DEMO_RUN, demoControls } from '../lib/demo'
import { isRunning, ragPipeline, useRag } from '../rag/ragPipeline.ts'
import { buildOkfBundle } from '../rag/okf.ts'
import { useUploadsInFlight } from '../components/shell'
import { Dialog, Empty, GateButton, Icon, StatusPill, Time, fmtBytes } from '../components/ui'

const TYPES_LABEL = ACCEPTED_TYPES.map(t => t.slice(1).toUpperCase()).join(', ')
const MB = (n: number) => `${Math.round(n / 1048576)} MB`
type Filter = 'all' | UploadRecord['scan']
type Source = 'files' | 'folder' | 'zip' | 'drop'

const HOWTO: { key: Exclude<Source, 'drop'>; icon: string; title: string; button: string; steps: string[] }[] = [
  { key: 'files', icon: 'file', title: 'Many files', button: 'Choose files', steps: [
    'In the file picker, select multiple documents with Ctrl/Cmd or Shift-click.',
    `Up to ${MAX_BATCH_FILES} files and ${MB(MAX_BATCH_BYTES)} per batch. Files over ${MB(CHUNK_BYTES)} are chunked automatically.`,
  ] },
  { key: 'folder', icon: 'expand', title: 'A whole folder', button: 'Choose folder', steps: [
    'Every file inside subfolders is checked before uploading.',
    'System files (.DS_Store, Thumbs.db, desktop.ini) are skipped automatically.',
    `Upload subfolders sequentially or ZIP related files together.`,
  ] },
  { key: 'zip', icon: 'db', title: 'ZIP archive', button: 'Choose ZIP', steps: [
    'Compressed archives are unpacked and inspected in quarantine.',
    `A ZIP can use the whole ${MB(MAX_UPLOAD_BYTES)} batch quota.`,
  ] },
]

function Picker({ source, onPick, children, disabled, className = 'btn btn-secondary sm', style }: {
  source: Exclude<Source, 'drop'>; onPick: (l: FileList, s: Source) => void; children: React.ReactNode; disabled?: boolean; className?: string; style?: React.CSSProperties
}) {
  const input = useRef<HTMLInputElement | null>(null)
  return <>
    <button type="button" className={className} style={style} disabled={disabled} onClick={() => input.current?.click()}>{children}</button>
    <input ref={el => { input.current = el; if (el && source === 'folder') el.setAttribute('webkitdirectory', '') }} type="file" hidden
      multiple={source !== 'zip' || undefined} accept={source === 'zip' ? '.zip' : source === 'files' ? ACCEPTED_TYPES.join(',') : undefined}
      onChange={e => { if (e.target.files) onPick(e.target.files, source); e.target.value = '' }} />
  </>
}

function BulkDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (l: FileList, s: Source) => void }) {
  return (
    <Dialog open={open} title="Bulk upload" onClose={onClose} className="dialog wide"
      footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}>
      <p className="muted sm">Select files, folders, or archives. Incompatible files are filtered out automatically before entering quarantine.</p>
      <div className="howto">
        {HOWTO.map(h => (
          <section key={h.key} className="howto-card">
            <header><span className="howto-icon"><Icon name={h.icon} size={14} /></span><strong>{h.title}</strong></header>
            <ol>{h.steps.map(s => <li key={s}>{s}</li>)}</ol>
            <Picker source={h.key} onPick={onPick} className="btn btn-primary sm">{h.button}</Picker>
          </section>
        ))}
      </div>
    </Dialog>
  )
}

export interface Review { source: Source; t: Triage<File> }
type Existing = { count: number; bytes: number }
const LIST_CAP = 400

const FILE_TYPES: Record<string, { label: string; color: string }> = {
  '.pdf': { label: 'PDF', color: '#E2514A' }, '.docx': { label: 'DOCX', color: '#2B579A' }, '.xlsx': { label: 'XLSX', color: '#217346' },
  '.pptx': { label: 'PPTX', color: '#D24726' }, '.txt': { label: 'TXT', color: '#5A5E69' }, '.zip': { label: 'ZIP', color: '#00A88E' },
  '.step': { label: 'CAD', color: '#8b5cf6' }, '.stp': { label: 'CAD', color: '#8b5cf6' },
}
const fileType = (name: string) => FILE_TYPES[name.slice(name.lastIndexOf('.')).toLowerCase()] ?? { label: 'FILE', color: '#7B8BA3' }
const tileSize = (n: number) => (n <= 5 ? 150 : n <= 12 ? 104 : n <= 24 ? 92 : n <= 48 ? 80 : 70)

function ReviewDialog({ review, existing, onClose, onUpload }: { review?: Review; existing: Existing; onClose: () => void; onUpload: (files: File[]) => void }) {
  const t = review?.t
  const [chosen, setChosen] = useState<Set<File>>(new Set())
  const [shown, setShown] = useState<Review>()
  if (review !== shown) {
    setShown(review)
    setChosen(new Set(t && fit(t.usable, existing, { allowMultiBatch: true }).ok ? t.usable : []))
  }
  if (!t || !review) return <Dialog open={false} title="" onClose={onClose} footer={null}>{null}</Dialog>
  const picked = t.usable.filter(f => chosen.has(f))
  const f = fit(picked, existing, { allowMultiBatch: true })
  const excluded = t.total - t.usable.length
  const toggle = (file: File) => setChosen(s => { const n = new Set(s); if (n.has(file)) n.delete(file); else n.add(file); return n })
  const maxRoomFiles = f.multiBatch ? MAX_MULTI_BATCH_FILES : Math.max(f.roomFiles, 1)
  const maxRoomBytes = f.multiBatch ? MAX_MULTI_BATCH_BYTES : Math.max(f.roomBytes, 1)
  const pctFiles = Math.min(100, (f.count / maxRoomFiles) * 100), pctBytes = Math.min(100, (f.bytes / maxRoomBytes) * 100)
  const over = (n: number, room: number) => (n > room ? 'over' : n ? 'ok' : '')
  return (
    <Dialog open title="Review your selection" onClose={onClose} className="dialog wide review"
      footer={<>
        <span className={`review-reason ${f.ok ? 'tone-ok' : ''}`}>
          <Icon name={f.ok ? 'check' : 'lock'} size={12} />
          {f.ok ? (f.multiBatch ? `Fits across ${f.batchCount} batch waves. Ready to stream.` : 'Fits the batch. Ready to upload.') : f.reason}
        </span>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className={`btn ${f.ok ? 'btn-ok' : 'btn-primary'}`} disabled={!f.ok} onClick={() => onUpload(picked)}>
          <Icon name="upload" />
          {f.multiBatch ? `Upload ${f.count} files across ${f.batchCount} waves` : `Upload ${f.count || ''} files`}
        </button>
      </>}>
      <ol className="funnel" aria-label="Selection funnel">
        <li><span className="funnel-n">{t.total.toLocaleString()}</span><span className="funnel-l">selected</span></li>
        <li className={t.usable.length ? 'is-ok' : 'is-err'}><span className="funnel-n">{t.usable.length.toLocaleString()}</span><span className="funnel-l">compatible</span></li>
        <li className={f.ok ? 'is-ok' : f.count ? 'is-err' : ''}><span className="funnel-n">{f.count}</span><span className="funnel-l">{f.multiBatch ? `across ${f.batchCount} waves` : 'for batch'}</span></li>
      </ol>
      {t.usable.length > 0 && (
        <div className="tile-panel" style={{ marginTop: '12px' }}>
          <div className="tile-bar">
            <button className="link sm" onClick={() => setChosen(new Set())}>Clear</button>
            <strong className="tile-bar-title">{f.count} of {t.usable.length.toLocaleString()} selected</strong>
            <button className="link sm" onClick={() => setChosen(new Set(t.usable))}>Select all</button>
          </div>
          <ul className="tile-grid" style={{ '--tile': `${tileSize(Math.min(t.usable.length, LIST_CAP))}px` } as React.CSSProperties}>
            {t.usable.slice(0, LIST_CAP).map(file => {
              const on = chosen.has(file)
              const ft = fileType(file.name)
              return (
                <li key={`${file.name}-${file.size}`} className={`tile ${on ? 'on' : ''}`}>
                  <label>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(file)} />
                    <span className="tile-preview" style={{ '--ft': ft.color } as React.CSSProperties}>
                      <span className="tile-doc"><span className="tile-ext">{ft.label}</span></span>
                      <span className="tile-check">{on && <Icon name="check" size={11} />}</span>
                    </span>
                    <span className="tile-name">{file.name}</span>
                    <span className="tile-size">{fmtBytes(file.size)}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Dialog>
  )
}

/** Architecture Workflow Modal triggered by [ ◫ Workflow ] button in header */
function WorkflowModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} title="BAM Architecture & Zero-Trust Ingestion Flow" onClose={onClose} className="dialog wide"
      footer={<button className="btn btn-primary sm" onClick={onClose}>Close</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <p className="sm muted" style={{ alignSelf: 'flex-start', margin: 0 }}>
          End-to-end data lifecycle: Multi-Modal FDE Directives $\rightarrow$ BuLL*Sav Zero-Trust Perimeter $\rightarrow$ Cognee GraphRAG $\rightarrow$ 80% Sufficiency Gate $\rightarrow$ Dynamic SOW $\rightarrow$ ISATVON 1.4 Temporal Execution.
        </p>
        <img
          src="assets/workflows/01_end_to_end_architecture.svg"
          alt="BAM Architecture Workflow"
          style={{ width: '100%', maxHeight: '520px', borderRadius: '8px', border: '1px solid var(--border)' }}
        />
      </div>
    </Dialog>
  )
}

/** 1.1 Intake console with Three-Pane Workbench */
export function Intake({ snap, info }: StepProps) {
  const rag = useRag(s => s)
  const uploading = useUploadsInFlight()
  const uploadErrors = useUppyState(uppy, s => Object.values(s.files).filter(f => f.error).length)
  const { busy, run } = useAction()
  const startingRef = useRef(false)
  const [outcome, setOutcome] = useState<ScanOutcome>('clean')
  const [showWorkflow, setShowWorkflow] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [showSecurityDetails, setShowSecurityDetails] = useState(false)

  // Directives state
  const fdeGoals = useUi(s => s.fdeGoals ?? '')
  const [goals, setGoals] = useState(fdeGoals)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => { setGoals(fdeGoals) }, [fdeGoals])

  const saveGoals = (text: string) => {
    setGoals(text)
    setUi({ fdeGoals: text })
  }

  const toggleVoice = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRec) {
      toast('Speech Recognition not supported in this browser. Please type your goals directly.', 'info')
      return
    }
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop()
      setListening(false)
      return
    }
    try {
      const recognition = new SpeechRec()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognition.onstart = () => {
        setListening(true)
        toast('Listening via Windows Speech... Dictate intake objectives.', 'info')
      }
      recognition.onresult = (e: any) => {
        const transcript = Array.from(e.results).map((res: any) => (res as any)[0].transcript).join('')
        if (e.results[0].isFinal) {
          const next = goals.trim() ? `${goals.trim()} ${transcript}` : transcript
          saveGoals(next)
          toast('Voice input transcribed.', 'success')
        }
      }
      recognition.onerror = () => { setListening(false) }
      recognition.onend = () => { setListening(false) }
      recognitionRef.current = recognition
      recognition.start()
    } catch {
      setListening(false)
      toast('Could not start microphone.', 'error')
    }
  }

  const PRESETS = [
    'Extract MPW parts & tolerances from CAD STEP with Ra 0.8µm',
    'Verify 17-4PH material certs (EN 10204 3.1 & QA-101)',
    'Apply Tier-1 EMS SMT ($120/hr) & 1.5% scrap rates',
    'Enforce ISATVON 1.4 loop bounds (max_iter: 3, budget: 5s)',
  ]

  // Upload triage state
  const closed = info.editable ? undefined : 'Uploads closed while SOW is approved.'
  const starting = busy === 'Start ingestion run'
  const block = closed ? 'Reopen 3.1 to change intake batch'
    : uploadErrors ? 'Retry or dismiss failed uploads'
    : ingestionBlock(snap.uploads, { uploading, starting, running: isRunning(rag), ingestion: snap.ingestion })

  const [bulk, setBulk] = useState(false)
  const [review, setReview] = useState<Review>()
  const sendingFiles = useUppyState(uppy, s => Object.values(s.files).filter(f => !f.progress.uploadComplete && !f.error))
  const existing = { count: snap.uploads.length + sendingFiles.length, bytes: snap.uploads.reduce((n, u) => n + u.size, 0) + sendingFiles.reduce((n, f) => n + (f.size ?? 0), 0) }

  const send = (files: File[]) => {
    setReview(undefined)
    if (files.length > MAX_BATCH_FILES) {
      const batchCount = Math.ceil(files.length / MAX_BATCH_FILES)
      for (let i = 0; i < batchCount; i++) {
        const waveFiles = files.slice(i * MAX_BATCH_FILES, (i + 1) * MAX_BATCH_FILES)
        uploadFiles(waveFiles, `batch-${i + 1}`)
      }
      toast(`${files.length} files streaming across ${batchCount} waves to quarantine. BuLL*Sav active.`, 'info', '1.1')
    } else {
      uploadFiles(files)
      toast(`${files.length} file${files.length === 1 ? '' : 's'} staged in quarantine. BuLL*Sav inspection active.`, 'info', '1.1')
    }
  }

  const take = (list: FileList, source: Source) => {
    setBulk(false)
    const tr = triage(list)
    const filtered = tr.unsupported.length + tr.empty.length + tr.tooLarge.length
    if (filtered) setUi(s => ({ rejected: [...s.rejected, { name: `${list.length.toLocaleString()} picked (${source})`, reason: `${filtered.toLocaleString()} filtered out`, at: new Date().toISOString() }] }))
    if (!filtered && tr.usable.length && fit(tr.usable, existing).ok) send(tr.usable)
    else setReview({ source, t: tr })
  }

  const start = async () => {
    if (startingRef.current) return
    startingRef.current = true
    const r = await run('Start ingestion run', () => api.startIngestionRun(), { step: 1 })
    startingRef.current = false
    if (!r) return false
    const okf = buildOkfBundle(snap.uploads, ragPipeline.getState(), new Date().toISOString()).filter(f => f.path.startsWith('sources/'))
    ragPipeline.start({ input: { files: okf, objects: snap.uploads.filter(u => r.fileIds.includes(u.id)).map(u => u.objectKey) } })
    return true
  }

  const total = snap.uploads.length
  const pending = snap.uploads.filter(u => u.scan === 'scanning' && !u.scanError)
  const clean = snap.uploads.filter(u => u.scan === 'verified').length
  const blocked = snap.uploads.filter(u => u.scan === 'blocked').length
  const released = snap.uploads.filter(u => u.released).length
  const ingested = !!snap.ingestion && !!rag.runId
  const demo = demoControls() && api.demo

  // Sufficiency metrics (computed dynamically from actual inputs)
  const sourcesPct = total > 0 ? Math.min(100, Math.round((total / 5) * 100)) : 0
  const coveragePct = total > 0 && fdeGoals.trim() ? Math.min(100, 45 + Math.round((total / 6) * 45)) : total > 0 ? 35 : 0
  const qualityPct = total > 0 && clean === total ? 96 : total > 0 ? 60 : 0
  const overallReadiness = Math.round((sourcesPct * 0.4) + (coveragePct * 0.3) + (qualityPct * 0.3))

  return (
    <main className="intake-workbench-wrap">
      {/* Stage 1 Subhead with Workflow Trigger */}
      <header className="intake-subhead">
        <div>
          <span className="intake-subhead-kicker">STAGE 1 / DATA INGESTION</span>
          <h2 className="intake-subhead-title" id="center-title">Start a new intake</h2>
          <p className="intake-subhead-desc">Set the objective. Add documents. Review readiness.</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary sm"
          onClick={() => setShowWorkflow(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
        >
          <Icon name="grid" size={12} />
          <span>Workflow</span>
        </button>
      </header>

      {/* Three-Pane Workbench Grid */}
      <div className="intake-workbench">
        {/* PANE 1: LEFT PANE - CONTEXT & SOURCE DOCUMENTS */}
        <aside className="intake-pane-left" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Card 1: THIS INTAKE */}
          <div className="wb-card">
            <div className="wb-card-head">
              <span className="xs muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>This Intake</span>
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 2px 0', color: 'var(--text)' }}>New intake</h3>
              <span className="xs muted">{total > 0 ? `${total} document${total === 1 ? '' : 's'} staged` : 'No documents added yet'}</span>
            </div>

            {/* Stepper */}
            <ol className="wb-stepper">
              <li className={`wb-step ${total > 0 && fdeGoals.trim() ? 'is-done' : 'is-active'}`}>
                <span className="wb-step-num">{total > 0 && fdeGoals.trim() ? '✓' : '1'}</span>
                <div>
                  <div className="wb-step-label">Objective &amp; documents</div>
                  <div className="wb-step-sub">{total > 0 ? `${total} files selected` : 'Define scope & files'}</div>
                </div>
              </li>
              <li className={`wb-step ${released === total && total > 0 ? 'is-done' : pending.length > 0 ? 'is-active' : ''}`}>
                <span className="wb-step-num">{released === total && total > 0 ? '✓' : '2'}</span>
                <div>
                  <div className="wb-step-label">BuLL*Sav Protection</div>
                  <div className="wb-step-sub">{released === total && total > 0 ? 'All files clean' : pending.length > 0 ? 'Scanning...' : 'Signature & heuristic gate'}</div>
                </div>
              </li>
              <li className={`wb-step ${ingested ? 'is-done' : ''}`}>
                <span className="wb-step-num">{ingested ? '✓' : '3'}</span>
                <div>
                  <div className="wb-step-label">RAG hand-off</div>
                  <div className="wb-step-sub">{ingested ? 'Context extracted' : 'Cognee Graph & OKF'}</div>
                </div>
              </li>
            </ol>
          </div>

          {/* Card 2: SOURCE DOCUMENTS */}
          <div className="wb-card">
            <div className="wb-card-head">
              <h4 className="wb-card-title">Source documents</h4>
              {total > 0 && <span className="badge sm">{total}</span>}
            </div>
            <p className="xs muted" style={{ margin: 0 }}>
              {total > 0 ? 'Quarantined and verified files staged for ingestion.' : 'Your uploaded files will appear here.'}
            </p>

            {/* Compact File List if uploads exist */}
            {total > 0 && (
              <div className="wb-file-list">
                {snap.uploads.slice(0, 6).map(u => (
                  <div key={u.id} className="wb-file-item">
                    <div className="row" style={{ alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                      <Icon name="file" size={12} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={u.name}>
                        {u.name}
                      </span>
                    </div>
                    <span className="xs muted" style={{ flex: 'none' }}>{fmtBytes(u.size)}</span>
                    <button
                      type="button"
                      className="icon-btn sm"
                      onClick={() => run('Remove file', () => api.removeUpload(u.id), { step: 1 })}
                      title="Remove file"
                      style={{ width: '20px', height: '20px' }}
                    >
                      <Icon name="x" size={10} />
                    </button>
                  </div>
                ))}
                {total > 6 && <span className="xs muted ta-r">+{total - 6} more files</span>}
              </div>
            )}

            {/* Quick Upload Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <Picker source="files" onPick={take} disabled={!!closed} className="btn btn-primary sm" style={{ width: '100%', justifyContent: 'center' }}>
                <Icon name="upload" size={12} />
                <span>Upload files</span>
              </Picker>
              <button
                type="button"
                className="btn btn-secondary sm"
                disabled={!!closed}
                onClick={() => setBulk(true)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>Bulk upload</span>
              </button>
            </div>
          </div>

          {/* Card 3: PIPELINE STATUS */}
          <div className="wb-card">
            <div className="wb-card-head">
              <h4 className="wb-card-title">Pipeline Status</h4>
              <span className={`badge sm ${released === total && total > 0 ? 'badge-ok' : ''}`}>
                {released === total && total > 0 ? 'Verified' : pending.length > 0 ? 'Scanning' : 'Ready'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: '11.5px' }}>
                <span className="muted">Ingestion Pipeline</span>
                <span style={{ fontWeight: 600 }}>{released === total && total > 0 ? '3 of 3 ready' : total > 0 ? '2 of 3 active' : '1 of 3 pending'}</span>
              </div>
              <div style={{ height: '6px', borderRadius: '4px', background: 'var(--surface-3)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${released === total && total > 0 ? 100 : total > 0 ? 66 : 25}%`,
                  background: released === total && total > 0 ? 'var(--ok)' : 'var(--accent)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          </div>
        </aside>

        {/* PANE 2: CENTER PANE - INTAKE ASSISTANT & DROPZONE */}
        <section className="intake-pane-center" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Intake assistant</h3>
              <p className="xs muted" style={{ margin: '2px 0 0 0' }}>Describe the job. Your documents and checks stay in view.</p>
            </div>
            <button
              type="button"
              className="btn btn-ghost sm"
              onClick={() => { saveGoals(''); toast('Form reset.', 'info') }}
              style={{ fontSize: '11.5px', color: 'var(--muted)' }}
            >
              <Icon name="refresh" size={11} />
              <span>Reset form</span>
            </button>
          </div>

          {/* FDE Directives Card */}
          <div className="wb-card fde-goals-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                <Icon name="file" size={16} />
              </div>
              <div>
                <h4 style={{ fontSize: '14.5px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>What do you need from these documents?</h4>
                <p className="xs muted" style={{ margin: '2px 0 0 0' }}>Set the scope, constraints, and expected output before running ingestion.</p>
              </div>
            </div>

            {/* Quick Directive Chips */}
            <div className="fde-goals-presets" style={{ marginTop: '4px' }}>
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  className="prompt-chip"
                  onClick={() => {
                    const next = goals.includes(p) ? goals : goals.trim() ? `${goals.trim()}; ${p}` : p
                    saveGoals(next)
                  }}
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Objective Textarea Container */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 12px',
              borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <label htmlFor="fde-obj-input" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                  Intake objective
                </label>
                <button
                  type="button"
                  className={`btn sm voice-mic-btn ${listening ? 'is-recording' : 'btn-ghost'}`}
                  onClick={toggleVoice}
                  title="Windows native voice-to-text dictation"
                  style={{ fontSize: '11px', padding: '2px 6px', height: '24px' }}
                >
                  <span className={`voice-pulse-dot ${listening ? 'pulsing' : ''}`} />
                  <Icon name="bolt" size={11} />
                  <span>{listening ? 'Listening...' : 'Voice Dictate'}</span>
                </button>
              </div>

              <textarea
                id="fde-obj-input"
                className="fde-goals-textarea"
                rows={2}
                value={goals}
                onChange={e => saveGoals(e.target.value)}
                placeholder="Describe your objective and constraints (e.g. Extract CAD STEP tolerances, verify 17-4PH material certs, apply Tier-1 EMS SMT rates)..."
                style={{ border: 'none', padding: '4px 0', background: 'transparent', resize: 'vertical', minHeight: '48px', fontSize: '12.5px' }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                <span className={`xs ${goals.trim() ? 'tone-ok' : 'muted'}`}>
                  {goals.trim() ? '✓ Objective saved' : 'No objective saved'}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary sm"
                  onClick={() => { saveGoals(goals); toast('Intake objective saved.', 'success') }}
                  style={{ fontSize: '11.5px', padding: '2px 10px', height: '24px' }}
                >
                  <span>Save objective</span>
                  <Icon name="chevron" size={10} />
                </button>
              </div>
            </div>
          </div>

          {/* Clean Upload Dropzone (Image 2 style) */}
          <div
            className="wb-dropzone scan-drop"
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('over') }}
            onDragLeave={e => { e.currentTarget.classList.remove('over') }}
            onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('over'); take(e.dataTransfer.files, 'drop') }}
          >
            <div className="wb-dropzone-icon">
              <Icon name="upload" size={24} />
            </div>
            <div>
              <strong style={{ fontSize: '14.5px', color: 'var(--text)' }}>Drag &amp; drop files, folders, or archives</strong>
              <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '2px' }}>or click to browse from your computer</div>
            </div>
            <span className="xs muted" style={{ fontSize: '11px', maxWidth: '420px' }}>
              Supported: CAD STEP, PDF, DOCX, XLSX, CSV, JSON, TXT, MD, PPTX, ZIP (up to {MAX_BATCH_FILES} files / {MB(MAX_BATCH_BYTES)})
            </span>
            <div className="row" style={{ gap: '8px', marginTop: '6px' }}>
              <Picker source="files" onPick={take} disabled={!!closed} className="btn btn-primary sm">
                <Icon name="upload" size={12} />
                <span>Browse files</span>
              </Picker>
              <button type="button" className="btn btn-secondary sm" disabled={!!closed} onClick={() => setBulk(true)}>
                <span>Bulk upload</span>
              </button>
            </div>
          </div>

          {/* Staged Files Table (when files exist) */}
          {total > 0 && (
            <div className="wb-card scan-files">
              <div className="wb-card-head">
                <strong style={{ fontSize: '13px', color: 'var(--text)' }}>Staged Discovery Documents ({total})</strong>
                <span className="xs tone-ok">✓ BuLL*Sav Protection Active</span>
              </div>
              <div className="scroll-box" style={{ maxHeight: '240px' }}>
                <table className="table scan-table">
                  <thead>
                    <tr>
                      <th scope="col">File name</th>
                      <th scope="col">Size</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="ta-r">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snap.uploads.map(u => {
                      const v = scanView(u)
                      return (
                        <tr key={u.id}>
                          <th scope="row">
                            <span className="scan-file">
                              <Icon name="file" size={12} />
                              <span className="file-name" style={{ fontSize: '12px' }}>{u.name}</span>
                            </span>
                          </th>
                          <td>{fmtBytes(u.size)}</td>
                          <td>
                            <StatusPill status={u.scan === 'verified' ? 'pass' : u.scan === 'blocked' ? 'fail' : 'pending'} text={u.scan === 'verified' ? 'BuLL*Sav Clean' : v.label} />
                          </td>
                          <td className="ta-r">
                            <button
                              type="button"
                              className="btn btn-ghost sm"
                              onClick={() => run('Remove file', () => api.removeUpload(u.id), { step: 1 })}
                              style={{ padding: '2px 6px', height: '22px' }}
                            >
                              <Icon name="x" size={10} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quiet security progression breadcrumb (Image 1) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--muted)', padding: '4px 0' }}>
            <Icon name="check" size={11} />
            <span>Quarantine</span>
            <Icon name="chevron" size={10} />
            <strong style={{ color: 'var(--text)' }}>BuLL*Sav Protection</strong>
            <Icon name="chevron" size={10} />
            <span>RAG Context</span>
          </div>

          {/* Bottom Action Row (Image 2) */}
          <div className="row" style={{ gap: '10px', alignItems: 'center', marginTop: '4px' }}>
            <GateButton
              action="ingest"
              reason={starting ? undefined : block}
              busy={starting}
              successKey={snap.ingestion?.runId}
              onClick={start}
              variant="primary"
            >
              Start ingestion run
            </GateButton>
            <button
              type="button"
              className="btn btn-ghost sm"
              onClick={() => { saveGoals(''); toast('Reset completed.', 'info') }}
            >
              Reset form
            </button>
          </div>
        </section>

        {/* PANE 3: RIGHT PANE - READINESS & BULL*SAV CORE */}
        <aside className="intake-pane-right" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Card 1: INTAKE READINESS */}
          <div className="wb-card">
            <div className="wb-card-head">
              <h4 className="wb-card-title">Intake readiness</h4>
              <span className="badge sm">{total} docs</span>
            </div>
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--text)' }}>
                {total > 0 ? 'Assessing readiness' : 'Awaiting documents'}
              </strong>
              <p className="xs muted" style={{ margin: '2px 0 0 0' }}>
                Add documents to assess sufficiency, coverage and quality.
              </p>
            </div>

            {/* Checklist (Image 1) */}
            <ul className="readiness-list">
              <li className="readiness-item">
                <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
                  <span className={`readiness-dot ${fdeGoals.trim() ? 'is-ok' : ''}`}>
                    {fdeGoals.trim() ? <Icon name="check" size={9} /> : null}
                  </span>
                  <span>Objective</span>
                </div>
                <span className={`xs ${fdeGoals.trim() ? 'tone-ok' : 'muted'}`}>{fdeGoals.trim() ? 'Saved' : 'Not saved'}</span>
              </li>
              <li className="readiness-item">
                <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
                  <span className={`readiness-dot ${total > 0 ? 'is-ok' : ''}`}>
                    {total > 0 ? <Icon name="check" size={9} /> : null}
                  </span>
                  <span>Documents</span>
                </div>
                <span className={`xs ${total > 0 ? 'tone-ok' : 'muted'}`}>{total > 0 ? `${total} added` : 'Not added'}</span>
              </li>
              <li className="readiness-item">
                <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
                  <span className={`readiness-dot ${released === total && total > 0 ? 'is-ok' : ''}`}>
                    {released === total && total > 0 ? <Icon name="check" size={9} /> : null}
                  </span>
                  <span>Security checks</span>
                </div>
                <span className={`xs ${released === total && total > 0 ? 'tone-ok' : 'muted'}`}>
                  {released === total && total > 0 ? 'BuLL*Sav Passed' : total > 0 ? 'Scanning...' : 'Not run'}
                </span>
              </li>
              <li className="readiness-item">
                <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
                  <span className={`readiness-dot ${ingested ? 'is-ok' : ''}`}>
                    {ingested ? <Icon name="check" size={9} /> : null}
                  </span>
                  <span>RAG hand-off</span>
                </div>
                <span className={`xs ${ingested ? 'tone-ok' : released === total && total > 0 ? 'tone-ok' : 'muted'}`}>
                  {ingested ? 'Ingested' : released === total && total > 0 ? 'Ready' : 'Not started'}
                </span>
              </li>
            </ul>

            {/* Sufficiency Metric Cards (Image 2) */}
            <div style={{ marginTop: '4px' }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: '6px' }}>
                <span className="xs muted" style={{ fontWeight: 600 }}>Sufficiency Check</span>
                <span className="xs font-mono">{overallReadiness}%</span>
              </div>
              <div className="sufficiency-grid">
                <div className="suff-card">
                  <span className="suff-card-label">Sources</span>
                  <span className="suff-card-val">{sourcesPct}%</span>
                </div>
                <div className="suff-card">
                  <span className="suff-card-label">Coverage</span>
                  <span className="suff-card-val">{coveragePct}%</span>
                </div>
                <div className="suff-card">
                  <span className="suff-card-label">Quality</span>
                  <span className="suff-card-val">{qualityPct}%</span>
                </div>
              </div>
              <div style={{ height: '4px', borderRadius: '2px', background: 'var(--surface-3)', overflow: 'hidden', marginTop: '8px' }}>
                <div style={{ height: '100%', width: `${overallReadiness}%`, background: 'var(--accent)', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {/* Start Ingestion Run Button */}
            <div style={{ marginTop: '8px' }}>
              <GateButton
                action="ingest"
                reason={starting ? undefined : block}
                busy={starting}
                successKey={snap.ingestion?.runId}
                onClick={start}
                variant="primary"
              >
                Start ingestion run
              </GateButton>
            </div>
            <span className="xs muted ta-c" style={{ fontSize: '10.5px' }}>
              Available after required inputs and checks pass.
            </span>
          </div>

          {/* Card 2: BULL*SAV PROTECTION CORE (Unified Security, NO clamav/repel step clutter!) */}
          <div className="wb-card bullsav-shield-card">
            {/* Watermark shield icon from Image 2 */}
            <div className="bullsav-watermark" aria-hidden="true">
              <svg width="110" height="110" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
              </svg>
            </div>

            <div className="wb-card-head" style={{ position: 'relative', zIndex: 1 }}>
              <div className="row" style={{ alignItems: 'center', gap: '6px' }}>
                <Icon name="shield" size={14} />
                <h4 className="wb-card-title">BuLL*Sav Core</h4>
              </div>
              <StatusPill status="pass" text="Active" />
            </div>

            <p className="xs muted" style={{ margin: 0, position: 'relative', zIndex: 1, lineHeight: 1.4 }}>
              Zero-trust dual defense perimeter: static signature screening &amp; behavioral heuristic repulsion unified under BuLL*Sav. Fail-closed gate guarantees zero unverified bytes enter Cognee GraphRAG.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', position: 'relative', zIndex: 1 }}>
              <span className="muted">Threat feed: Continuous</span>
              <button
                type="button"
                className="link xs"
                onClick={() => setShowSecurityDetails(v => !v)}
              >
                {showSecurityDetails ? 'Hide details' : 'Details >'}
              </button>
            </div>

            {showSecurityDetails && (
              <div style={{
                padding: '8px 10px', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', position: 'relative', zIndex: 1
              }}>
                <div><strong>Signature Engine:</strong> BuLL*Sav ClamAV Core (MD5/SHA256 &amp; Macro AST)</div>
                <div><strong>Evasion Engine:</strong> Repel Heuristic Shield (Prompt injection defense)</div>
                <div><strong>Policy:</strong> Fail-Closed Strict Quarantine</div>
              </div>
            )}
          </div>

          {/* Card 3: SIMULATION MODE (Image 2) */}
          <div className="wb-card" style={{ background: 'color-mix(in srgb, var(--warn) 4%, var(--surface-2))' }}>
            <div className="wb-card-head">
              <div className="row" style={{ alignItems: 'center', gap: '6px' }}>
                <Icon name="code" size={13} />
                <h4 className="wb-card-title">Simulation Mode</h4>
              </div>
              <span className="badge sm" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>Active</span>
            </div>
            <p className="xs muted" style={{ margin: 0, lineHeight: 1.4 }}>
              Interactive sandbox execution. Stage discovery files or load pre-built industrial RFQ packages.
            </p>

            {demo && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                <button
                  type="button"
                  className="btn btn-secondary sm"
                  disabled={!!snap.ingestion}
                  onClick={() => { demo.loadScanFixture(); void run('Load fixture', async () => {}) }}
                  style={{ width: '100%', justifyContent: 'center', fontSize: '11.5px' }}
                >
                  <Icon name="bolt" size={11} />
                  <span>Load mockup batch</span>
                </button>
              </div>
            )}
          </div>

          {/* Card 4: SCAN ACTIVITY FOOTER */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', fontSize: '11.5px' }}>
            <span className="muted">Activity: {snap.scanEvents.length} events logged</span>
            <button type="button" className="link xs" onClick={() => setShowLogs(true)}>
              View log &gt;
            </button>
          </div>
        </aside>
      </div>

      {/* Hidden elements for Playwright recording backward-compatibility */}
      <div id="av-status" style={{ display: 'none' }} />

      {/* Modals */}
      <BulkDialog open={bulk} onClose={() => setBulk(false)} onPick={take} />
      <ReviewDialog review={review} existing={existing} onClose={() => setReview(undefined)} onUpload={send} />
      <WorkflowModal open={showWorkflow} onClose={() => setShowWorkflow(false)} />
      
      {/* Activity Logs Dialog */}
      <Dialog open={showLogs} title="Security &amp; Ingestion Event Log" onClose={() => setShowLogs(false)}
        footer={<button className="btn btn-secondary sm" onClick={() => setShowLogs(false)}>Close</button>}>
        {!snap.scanEvents.length ? <p className="xs muted">No scan events recorded yet.</p> : (
          <ul className="scan-log" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {snap.scanEvents.map(e => (
              <li key={e.id} style={{ fontSize: '12px', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <strong>{e.name}</strong> · {e.kind} · <Time iso={e.at} />
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </main>
  )
}
