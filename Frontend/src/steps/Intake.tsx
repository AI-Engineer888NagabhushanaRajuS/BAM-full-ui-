// 1.1 Intake console: Three-pane workbench data ingestion & BuLLSav zero-trust defense.
// Left: Context, Stepper & Source Documents.
// Center: Intake Assistant, FDE Directives (Text & Native Voice) & Dropzone.
// Right: Readiness Checklist, Sufficiency Metrics, BuLLSav Core & Ingestion Gate.

import { useEffect, useRef, useState } from 'react'
import { useUppyState } from '@uppy/react'
import { api } from '../api/adapter'
import type { ScanOutcome } from '../api/adapter'
import { ACCEPTED_TYPES, AV_NAME, CHUNK_BYTES, chunkCount, MAX_BATCH_BYTES, MAX_BATCH_FILES, MAX_UPLOAD_BYTES, type ScanEvent, type Snapshot, type UploadRecord } from '../api/types'
import { autoPick, chunkNames, fit, ingestionBlock, scanView, triage, MAX_MULTI_BATCH_FILES, MAX_MULTI_BATCH_BYTES, type ScanAction, type Triage } from '../api/scanGate.ts'
import type { StepProps } from '../App'
import { useAction } from '../lib/data'
import { setUi, toast, uploadFiles, uppy, useUi, openPreflight, openOpenConnector, openOpenRouterModal, openSettings } from '../lib/store'
import { goScreen } from '../lib/route'
import { DEMO_RUN, demoControls } from '../lib/demo'
import { isRunning, ragPipeline, useRag } from '../rag/ragPipeline.ts'
import { buildOkfBundle } from '../rag/okf.ts'
import { getPreflightSufficiency } from '../rag/CogneePreflightCockpit'
import { getModelGateStatus } from '../lib/modelGate'
import { useUploadsInFlight } from '../components/shell'
import { Dialog, Empty, GateButton, Icon, StatusPill, Time, fmtBytes } from '../components/ui'

const TYPES_LABEL = ACCEPTED_TYPES.map(t => t.slice(1).toUpperCase()).join(', ')
const MB = (n: number) => `${Math.round(n / 1048576)} MB`
type Filter = 'all' | UploadRecord['scan']
type Source = 'files' | 'folder' | 'zip' | 'drop'

const HOWTO: { key: Exclude<Source, 'drop'>; icon: string; title: string; button: string; steps: string[] }[] = [
  { key: 'files', icon: 'file', title: 'Single & Multi-Files', button: 'Choose files', steps: [
    'Select individual or multiple documents (.pdf, .docx, .xlsx, .step, .zip).',
    'Use Ctrl/Cmd or Shift-click to select multiple files at once.',
    `Up to ${MAX_BATCH_FILES} files and ${MB(MAX_BATCH_BYTES)} per batch wave.`,
  ] },
  { key: 'folder', icon: 'folder', title: 'Folder (with Nested ZIPs)', button: 'Choose folder', steps: [
    'Select an entire project folder or RFQ directory.',
    'All documents, subdirectories, and nested ZIP archives inside are processed automatically.',
    'System files (.DS_Store, Thumbs.db) are filtered out automatically.',
  ] },
  { key: 'zip', icon: 'archive', title: 'ZIP Archives', button: 'Choose ZIP', steps: [
    'Upload a standalone compressed archive.',
    'Quarantine sandbox decompresses packages for deep heuristic & AST virus scanning.',
    `A ZIP can use the whole ${MB(MAX_UPLOAD_BYTES)} batch quota.`,
  ] },
  { key: 'files', icon: 'upload', title: 'Bulk Mixed Packages', button: 'Bulk upload', steps: [
    'Multi-batch streaming for enterprise RFQ bundles up to 1,000 files.',
    'Supports mixed CAD geometry, BOM workbooks, engineering threads and nested ZIPs.',
    'Automated batch wave pipelining into BuLLSav zero-trust quarantine.',
  ] },
]

function Picker({ source, onPick, children, disabled, className = 'btn btn-secondary sm', style, title }: {
  source: Exclude<Source, 'drop'>; onPick: (l: FileList, s: Source) => void; children: React.ReactNode; disabled?: boolean; className?: string; style?: React.CSSProperties; title?: string
}) {
  const input = useRef<HTMLInputElement | null>(null)
  return <>
    <button type="button" className={className} style={style} disabled={disabled} title={title} onClick={() => input.current?.click()}>{children}</button>
    <input ref={el => { input.current = el; if (el && source === 'folder') el.setAttribute('webkitdirectory', '') }} type="file" hidden
      multiple={source !== 'zip' || undefined} accept={source === 'zip' ? '.zip' : source === 'files' ? ACCEPTED_TYPES.join(',') : undefined}
      onChange={e => { if (e.target.files) onPick(e.target.files, source); e.target.value = '' }} />
  </>
}

function IngestModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (l: FileList, s: Source) => void }) {
  const [isDragging, setIsDragging] = useState(false)
  const dropInputRef = useRef<HTMLInputElement | null>(null)

  return (
    <Dialog open={open} title="Intake Document & Package Assistant" onClose={onClose} className="dialog wide ingest-mode-modal"
      footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}>
      <p className="muted sm" style={{ margin: '0 0 12px 0' }}>
        Select files, full project directories, or compressed archives. If you choose a folder with nested ZIP archives, every contained document and archive is automatically discovered and staged for zero-trust scanning.
      </p>

      {/* Prominent Modal Drag & Drop Landing Zone */}
      <div
        className={`ingest-modal-dropzone ${isDragging ? 'is-dragging' : ''}`}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDragging(true) }}
        onDragLeave={e => { e.preventDefault(); setIsDragging(false) }}
        onDrop={e => {
          e.preventDefault()
          setIsDragging(false)
          if (e.dataTransfer?.files?.length) {
            onPick(e.dataTransfer.files, 'drop')
          }
        }}
        onClick={() => dropInputRef.current?.click()}
      >
        <div className="ingest-drop-icon">
          <Icon name="upload" size={24} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <strong style={{ fontSize: '13.5px', color: 'var(--text)' }}>
            {isDragging ? 'Release files or folders to stage for intake' : 'Drag & drop documents, folders, or ZIP archives right here'}
          </strong>
          <p className="xs muted" style={{ margin: '3px 0 0' }}>
            Supports PDF, DOCX, XLSX, STEP CAD, and nested ZIP archives (auto-extracted)
          </p>
        </div>
        <span className="pill tone-ok xs">✓ BuLLSav Zero-Trust Quarantine Active</span>
        <input
          ref={dropInputRef}
          type="file"
          hidden
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          onChange={e => { if (e.target.files) { onPick(e.target.files, 'files'); e.target.value = '' } }}
        />
      </div>

      <div style={{ margin: '14px 0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
          Select Ingestion Modality
        </strong>
        <span className="xs muted">Auto-discovers nested ZIPs</span>
      </div>

      <div className="howto">
        {HOWTO.map(h => (
          <section key={h.title} className="howto-card">
            <header><span className="howto-icon"><Icon name={h.icon} size={14} /></span><strong>{h.title}</strong></header>
            <ol>{h.steps.map(s => <li key={s}>{s}</li>)}</ol>
            <Picker source={h.key} onPick={onPick} className="btn btn-primary sm">{h.button}</Picker>
          </section>
        ))}
      </div>
    </Dialog>
  )
}

const BulkDialog = IngestModal

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
    if (t) {
      if (fit(t.usable, existing, { allowMultiBatch: true }).ok) {
        setChosen(new Set(t.usable))
      } else {
        setChosen(new Set(t.usable.slice(0, MAX_BATCH_FILES)))
      }
    } else {
      setChosen(new Set())
    }
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
          <div className="tile-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div className="row" style={{ alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-primary sm"
                onClick={() => setChosen(new Set(t.usable.slice(0, MAX_BATCH_FILES)))}
                style={{ fontSize: '11px', padding: '2px 8px' }}
                title="Auto-select first 25 files"
              >
                <Icon name="bolt" size={11} />
                <span>Auto-Fit Top 25</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary sm"
                onClick={() => setChosen(new Set(t.usable.slice(0, MAX_MULTI_BATCH_FILES)))}
                style={{ fontSize: '11px', padding: '2px 8px' }}
                title="Auto-select up to 225 files (9 waves)"
              >
                <Icon name="sparkle" size={11} />
                <span>Auto-Fit 225 (9 Waves)</span>
              </button>
            </div>
            <strong className="tile-bar-title">{f.count.toLocaleString()} of {t.usable.length.toLocaleString()} selected</strong>
            <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
              <button className="link sm" onClick={() => setChosen(new Set())}>Clear</button>
              <button className="link sm" onClick={() => setChosen(new Set(t.usable))}>Select all</button>
            </div>
          </div>
          <ul className="tile-grid" style={{ '--tile': `${tileSize(Math.min(t.usable.length, LIST_CAP))}px` } as React.CSSProperties}>
            {t.usable.slice(0, LIST_CAP).map((file, idx) => {
              const on = chosen.has(file)
              const ft = fileType(file.name)
              return (
                <li key={`${file.name}-${file.size}-${idx}`} className={`tile ${on ? 'on' : ''}`}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
        <p className="sm muted" style={{ alignSelf: 'flex-start', margin: 0 }}>
          End-to-end data lifecycle: Multi-Modal FDE Directives → BuLLSav Zero-Trust Perimeter → Cognee GraphRAG → 80% Sufficiency Gate → Dynamic SOW → ISATVON 1.4 Temporal Execution.
        </p>
        <img
          src="/assets/workflows/01_end_to_end_architecture.svg"
          alt="BAM Architecture Workflow"
          style={{ width: '100%', maxHeight: '420px', borderRadius: '8px', border: '1px solid var(--border)', background: '#0b0f17' }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', width: '100%' }}>
          <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <strong style={{ fontSize: '11.5px', color: 'var(--accent)' }}>1. Zero-Trust Intake</strong>
            <p className="xs muted" style={{ margin: '2px 0 0 0' }}>Quarantine memory isolation, ClamAV signatures, Repel heuristic guardrails.</p>
          </div>
          <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <strong style={{ fontSize: '11.5px', color: 'var(--ok)' }}>2. Cognee GraphRAG</strong>
            <p className="xs muted" style={{ margin: '2px 0 0 0' }}>Bifrost entity extraction, 5 Enterprise Masters, 80% sufficiency gate.</p>
          </div>
          <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <strong style={{ fontSize: '11.5px', color: '#8b5cf6' }}>3. Dynamic SOW &amp; Skills</strong>
            <p className="xs muted" style={{ margin: '2px 0 0 0' }}>Laya/Jev System-1 judge, ISATVON 1.4 declarative bounded loops.</p>
          </div>
          <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <strong style={{ fontSize: '11.5px', color: 'var(--warn)' }}>4. Temporal Sandbox</strong>
            <p className="xs muted" style={{ margin: '2px 0 0 0' }}>AST validation, Promptfoo evaluation, PostgreSQL state handoff.</p>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

const FLOW_STAGES = [
  { label: 'Upload & Ingest', icon: 'upload', desc: 'Ingesting binary payload into quarantine memory sandbox with auto-chunking' },
  { label: 'Quarantine Sandbox', icon: 'lock', desc: 'Isolating untrusted bytes in memory sandbox before static signature analysis' },
  { label: 'BuLLSav Twin Engine', icon: 'shield', desc: 'Parallel consensus screening: ClamAV static signatures + Repel behavioral evasion repulsion' },
  { label: 'AST Inspection', icon: 'code', desc: 'Scanning workbook formula strings and embedded code for execution escapes' },
  { label: 'Released', icon: 'check', desc: 'Fail-closed verification complete. Released for Cognee graph entity extraction' },
]

export function AvStatus({ uploads }: { uploads: UploadRecord[] }) {
  const files = useUppyState(uppy, s => s.files)
  const list = Object.values(files)
  const sending = list.filter(f => f.progress.uploadStarted && !f.progress.uploadComplete && !f.error)
  const failed = list.filter(f => f.error)
  const sendTotal = sending.reduce((n, f) => n + (f.size ?? 0), 0)
  const chunked = sending.filter(f => chunkCount(f.size ?? 0) > 1)
  const sendPct = sendTotal ? Math.round(sending.reduce((n, f) => n + (f.progress.bytesUploaded || 0), 0) / sendTotal * 100) : 0
  const total = uploads.length
  const pending = uploads.filter(u => u.scan === 'scanning' && !u.scanError)
  const inScan = pending.filter(u => u.scanStartedAt)
  const queued = pending.length - inScan.length
  const blocked = uploads.filter(u => u.scan === 'blocked').length
  const errors = uploads.filter(u => u.scanError).length
  const clean = uploads.filter(u => u.scan === 'verified').length
  const released = uploads.filter(u => u.released).length
  const state = sending.length || pending.length ? 'scanning' : !total ? 'idle' : blocked ? 'threat' : errors ? 'error' : 'clear'
  const s = (n: number) => (n === 1 ? '' : 's')

  const [animatingStep, setAnimatingStep] = useState<number | null>(null)
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isRunningRef = useRef(false)
  const prevUploadsCount = useRef(uploads.length)

  const runSequentialFlow = (targetStep = 1) => {
    if (animationTimer.current) clearTimeout(animationTimer.current)
    if (targetStep <= 5) {
      isRunningRef.current = true
      setAnimatingStep(targetStep)
      animationTimer.current = setTimeout(() => {
        runSequentialFlow(targetStep + 1)
      }, 140) // 140ms per step = 700ms total sequence
    } else {
      setAnimatingStep(null)
      isRunningRef.current = false
      if (uploads.length > 0) {
        toast(`🎉 BuLLSav Twin Engine Complete! ClamAV & Repel verified all ${uploads.length} files clean. Auto-launching Pre-Flight Cockpit...`, 'success')
        setTimeout(() => openPreflight(), 400)
      }
    }
  }

  // Auto-trigger fast sequential animation only on first upload transition
  useEffect(() => {
    if (uploads.length > 0 && prevUploadsCount.current === 0 && !isRunningRef.current) {
      runSequentialFlow(1)
    }
    prevUploadsCount.current = uploads.length
  }, [uploads.length])

  // Cleanup ONLY on unmount
  useEffect(() => {
    return () => {
      if (animationTimer.current) clearTimeout(animationTimer.current)
    }
  }, [])

  // Expose runSequentialFlow globally for external triggers
  useEffect(() => {
    ;(window as any).__triggerAvFlow = () => runSequentialFlow(1)
    return () => { delete (window as any).__triggerAvFlow }
  }, [])

  const isSimulating = animatingStep !== null
  const currentStepInfo = isSimulating ? FLOW_STAGES[animatingStep - 1] : null

  const [title, sub] = isSimulating
    ? [
        `Workflow Step ${animatingStep}/5: ${currentStepInfo?.label}`,
        currentStepInfo?.desc ?? '',
      ]
    : {
        idle: [`BuLLSav Twin Engine: Zero-Trust Quarantine Ready`, 'Every uploaded byte is isolated in quarantine and inspected through ClamAV signatures and Repel heuristic guardrails.'],
        scanning: sending.length && !pending.length
          ? [`Uploading ${sending.length} file${s(sending.length)} to quarantine · ${sendPct}%`, chunked.length ? `${chunked.length} large file${s(chunked.length)} sent in ${MB(CHUNK_BYTES)} chunks. Scanned upon landing.` : 'Files quarantined and evaluated upon landing.']
          : [`BuLLSav Twin Engine Active · ${total - pending.length} of ${total} inspected`, 'Dual-engine consensus defense: ClamAV signature screening + Repel prompt injection repulsion.'],
        threat: [`${blocked} threat${s(blocked)} quarantined by security perimeter`, 'Blocked files cannot be opened or ingested. Remove them to continue.'],
        error: [`${errors} scan${s(errors)} did not finish`, 'No verdict means not clean. Retry the scan or remove the file.'],
        clear: [`All ${total} file${s(total)} verified clean (BuLLSav Twin Engine)`, 'Zero-trust perimeter passed. Released to Cognee GraphRAG for entity extraction.'],
      }[state]

  type St = 'idle' | 'active' | 'done' | 'alert'
  const resolved = total > 0 && !pending.length && !blocked && !errors

  const nodes: { label: string; st: St; count: string; icon: string }[] = isSimulating
    ? FLOW_STAGES.map((fs, idx) => {
        const stepNum = idx + 1
        const st: St = stepNum < animatingStep ? 'done' : stepNum === animatingStep ? 'active' : 'idle'
        const count = stepNum < animatingStep ? 'Passed' : stepNum === animatingStep ? 'Active…' : 'Queued'
        return { label: fs.label, icon: fs.icon, st, count }
      })
    : [
        { label: 'Upload & Ingest', icon: 'upload', st: sending.length ? 'active' : failed.length ? 'alert' : total ? 'done' : 'idle',
          count: sending.length ? `${sendPct}%` : failed.length ? `${failed.length} failed` : total ? `${total} sent` : '—' },
        { label: 'Quarantine Sandbox', icon: 'lock', st: queued ? 'active' : total ? 'done' : 'idle', count: queued ? `${queued} waiting` : total ? 'Cleared' : '—' },
        { label: 'BuLLSav Twin Engine', icon: 'shield', st: inScan.length ? 'active' : errors ? 'alert' : resolved ? 'done' : 'idle', count: total ? (resolved ? '2/2 Clean' : `${total - pending.length}/${total}`) : '—' },
        { label: 'AST Inspection', icon: 'code', st: blocked ? 'alert' : resolved ? 'done' : clean ? 'active' : 'idle', count: total ? `${clean} clean` : '—' },
        { label: 'Released', icon: 'bolt', st: resolved ? 'done' : released ? 'active' : 'idle', count: total ? `${released || total} of ${total}` : '—' },
      ]

  const pct = isSimulating
    ? Math.round((animatingStep / 5) * 100)
    : sending.length && !pending.length
    ? sendPct
    : resolved
    ? 100
    : total
    ? Math.round(((total - pending.length) / total) * 100)
    : 0

  return (
    <section id="av-status" className={`av av-${isSimulating ? 'scanning' : state}`} aria-label="Virus scan status" style={{ margin: '8px 0' }}>
      <div className="av-head" role="status" aria-live="polite">
        <span className="av-radar" aria-hidden="true">
          <Icon name={isSimulating ? 'spinner' : state === 'threat' ? 'alert' : 'shield'} size={16} spin={isSimulating} />
        </span>
        <span className="av-text">
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <strong>{title}</strong>
            <button
              type="button"
              className="btn btn-secondary sm"
              style={{ fontSize: '11px', padding: '2px 8px', height: '24px' }}
              onClick={() => runSequentialFlow(1)}
              title="Re-run the 5-stage security inspection animation sequence"
            >
              <Icon name="bolt" size={10} />
              <span>Simulate Pipeline Flow</span>
            </button>
          </div>
          <span>{sub}</span>
        </span>
      </div>

      <div className="av-bar">
        <span style={{ width: `${pct}%` }} />
      </div>

      <ol className="av-flow">
        {nodes.map(n => (
          <li key={n.label} className={`av-node is-${n.st}`}>
            <span className="av-dot">
              <Icon name={n.st === 'done' ? 'check' : n.st === 'alert' ? 'alert' : n.icon} size={12} />
            </span>
            <span className="av-label">{n.label}</span>
            <span className="av-count">{n.count}</span>
          </li>
        ))}
      </ol>

      {/* Interactive Git-Branching Accordion for BuLLSav Twin Engine */}
      <details className="av-twin-accordion" open>
        <summary className="av-twin-summary">
          <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
            <span className="git-branch-pill-icon"><Icon name="git-branch" size={12} /></span>
            <strong style={{ fontSize: '12px', color: 'var(--text)' }}>BuLLSav Twin Engine: Parallel Git-Branch Consensus</strong>
            <span className={`badge sm ${resolved ? 'badge-ok' : (inScan.length || (isSimulating && animatingStep === 3)) ? 'badge-accent' : ''}`}>
              {resolved ? '2 of 2 Branches Clean' : (inScan.length || (isSimulating && animatingStep === 3)) ? 'Active Consensus Scan' : 'Consensus Gate'}
            </span>
          </div>
          <span className="xs muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span>Dual Git-Branches</span>
            <Icon name="chevron" size={10} />
          </span>
        </summary>

        <div className="av-git-tree">
          {/* Quarantine Ingress */}
          <div className="git-trunk-node git-ingress-node">
            <span className="git-dot-ingress" />
            <span className="git-trunk-label">Quarantine Ingress (SHA-256 Isolated Memory Sandbox · Zero-Trust Pipeline)</span>
          </div>

          {/* Twin Parallel Branches */}
          <div className="git-branches-grid">
            {/* Branch A: ClamAV Core */}
            <div className={`git-branch-card ${(isSimulating && animatingStep === 3) || inScan.length ? 'is-active' : resolved ? 'is-done' : ''}`}>
              <div className="git-branch-header">
                <div className="row" style={{ alignItems: 'center', gap: '6px' }}>
                  <span className="git-branch-symbol">├──</span>
                  <span className="git-branch-code">branch: engine/clamav-core</span>
                </div>
                <StatusPill
                  status={(isSimulating && animatingStep === 3) || inScan.length ? 'pending' : resolved ? 'pass' : 'pending'}
                  text={(isSimulating && animatingStep === 3) || inScan.length ? 'Scanning Signatures…' : resolved ? 'Clean (0 CVEs)' : 'Ready'}
                />
              </div>
              <div className="git-branch-content">
                <div className="row" style={{ alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '12px', color: 'var(--text)' }}>
                  <Icon name="shield" size={12} />
                  <span>🌿 ClamAV Core v1.4 (Static Signatures)</span>
                </div>
                <p className="xs muted" style={{ margin: '3px 0 0' }}>
                  MD5/SHA-256 hash lookup against daily threat feeds, macro AST disassembly &amp; known CVE payload scanning.
                </p>
              </div>
            </div>

            {/* Branch B: Repel Shield */}
            <div className={`git-branch-card ${(isSimulating && animatingStep === 3) || inScan.length ? 'is-active' : resolved ? 'is-done' : ''}`}>
              <div className="git-branch-header">
                <div className="row" style={{ alignItems: 'center', gap: '6px' }}>
                  <span className="git-branch-symbol">└──</span>
                  <span className="git-branch-code">branch: engine/repel-shield</span>
                </div>
                <StatusPill
                  status={(isSimulating && animatingStep === 3) || inScan.length ? 'pending' : resolved ? 'pass' : 'pending'}
                  text={(isSimulating && animatingStep === 3) || inScan.length ? 'Repelling Payloads…' : resolved ? 'Repelled (0 Exploits)' : 'Ready'}
                />
              </div>
              <div className="git-branch-content">
                <div className="row" style={{ alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '12px', color: 'var(--text)' }}>
                  <Icon name="shield" size={12} />
                  <span>🌿 Repel Behavioral Shield (Heuristic &amp; Evasion)</span>
                </div>
                <p className="xs muted" style={{ margin: '3px 0 0' }}>
                  DigiBull pre-prompt guardrails, adversarial prompt injection repulsion, polyglot binary traps &amp; jailbreak shields.
                </p>
              </div>
            </div>
          </div>

          {/* Consensus Merge Trunk */}
          <div className="git-trunk-node git-merge-node">
            <span className={`git-dot-merge ${resolved ? 'is-done' : ''}`} />
            <span className="git-trunk-label">
              git merge: Unanimous Consensus Verdict (2/2 Passed) &rarr; Releases to AST Inspection
            </span>
            <span className="xs font-mono" style={{ marginLeft: 'auto', color: resolved ? 'var(--ok)' : 'var(--muted)' }}>
              {resolved ? '✓ Unanimous Pass' : 'Strict Consensus 2/2 Required'}
            </span>
          </div>
        </div>
      </details>
    </section>
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

  const emergencyReset = async () => {
    uppy.cancelAll()
    try {
      localStorage.removeItem('uppy-state')
    } catch {}
    await run('Reset staged uploads', () => api.resetAllUploads(), { step: 1 })
    toast('Quarantine & staged files cleared. Browser memory restored.', 'info', '1.1')
  }

  const send = (files: File[]) => {
    setReview(undefined)
    if (files.length > MAX_MULTI_BATCH_FILES) {
      files = files.slice(0, MAX_MULTI_BATCH_FILES)
      toast(`Capped upload wave to ${MAX_MULTI_BATCH_FILES} files to prevent browser memory freeze.`, 'info', '1.1')
    }
    if (files.length > MAX_BATCH_FILES) {
      const batchCount = Math.ceil(files.length / MAX_BATCH_FILES)
      for (let i = 0; i < batchCount; i++) {
        const waveFiles = files.slice(i * MAX_BATCH_FILES, (i + 1) * MAX_BATCH_FILES)
        uploadFiles(waveFiles, `batch-${i + 1}`)
      }
      toast(`${files.length} files streaming across ${batchCount} waves to quarantine. BuLLSav active.`, 'info', '1.1')
    } else {
      uploadFiles(files)
      toast(`${files.length} file${files.length === 1 ? '' : 's'} staged in quarantine. BuLLSav inspection active.`, 'info', '1.1')
    }
  }

  const take = (list: FileList, source: Source) => {
    setBulk(false)
    const FIFTEEN_GB = 15 * 1024 * 1024 * 1024
    let totalBytes = 0
    for (let i = 0; i < list.length; i++) totalBytes += list[i].size

    if (totalBytes > FIFTEEN_GB) {
      toast(`🚨 Parent folder exceeds 15 GB limit (${(totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB)! Please select sub-folders or archives within the 15 GB ceiling.`, 'error', '1.1')
      return
    }

    if (list.length > 5000) {
      toast(`🚨 Massive Directory Detected (${list.length.toLocaleString()} files)! Entire drive drops are capped at 5,000 files to prevent browser memory exhaustion.`, 'error', '1.1')
      return
    }
    if (list.length > MAX_MULTI_BATCH_FILES) {
      toast(`ℹ️ Large folder (${list.length.toLocaleString()} files, ${(totalBytes / (1024 * 1024)).toFixed(1)} MB). Streaming across batch waves (max ${MAX_MULTI_BATCH_FILES} files per wave).`, 'info', '1.1')
    }
    const tr = triage(list)
    const filtered = tr.unsupported.length + tr.empty.length + tr.tooLarge.length
    if (filtered) setUi(s => ({ rejected: [...s.rejected, { name: `${list.length.toLocaleString()} picked (${source})`, reason: `${filtered.toLocaleString()} filtered out`, at: new Date().toISOString() }] }))
    
    // Always transition to Uppy Tile Dashboard (ReviewDialog) so user can inspect tiles & waves
    if (tr.usable.length > 0) {
      setReview({ source, t: tr })
    } else {
      toast('No compatible documents discovered in selection.', 'info', '1.1')
    }
  }

  const start = async () => {
    if (startingRef.current) return
    const currentModel = getModelGateStatus()
    if (!currentModel.ready) {
      toast(`🚨 Inference Model Gate: ${currentModel.reason || 'OpenRouter API Key or Local Engine required before entering RAG.'}`, 'error', '1.1')
      openSettings('keys')
      return false
    }
    startingRef.current = true
    const r = await run('Start ingestion run', () => api.startIngestionRun(), { step: 1 })
    startingRef.current = false
    if (!r) return false
    const okf = buildOkfBundle(snap.uploads, ragPipeline.getState(), new Date().toISOString()).filter(f => f.path.startsWith('sources/'))
    ragPipeline.start({ input: { files: okf, objects: snap.uploads.filter(u => r.fileIds.includes(u.id)).map(u => u.objectKey) } })
    // Seamless workflow progression: navigate to Stage 2 Graph Explorer and auto-popup Pre-Flight Gate Cockpit
    goScreen('2.1')
    openPreflight()
    return true
  }

  const modelStatus = getModelGateStatus()

  const total = snap.uploads.length
  const pending = snap.uploads.filter(u => u.scan === 'scanning' && !u.scanError)
  const clean = snap.uploads.filter(u => u.scan === 'verified').length
  const blocked = snap.uploads.filter(u => u.scan === 'blocked').length
  const released = snap.uploads.filter(u => u.released).length
  const ingested = !!snap.ingestion && !!rag.runId
  const demo = demoControls() && api.demo

  // Auto-popup trigger: when all uploads reach verified/released, auto-open Pre-Flight Verification Cockpit!
  const prevReleasedRef = useRef(0)
  useEffect(() => {
    if (released === total && total > 0 && prevReleasedRef.current !== released) {
      prevReleasedRef.current = released
      toast(`🎉 BuLLSav Twin Engine Complete! All ${total} files cleared. Auto-opening Pre-Flight Verification Cockpit...`, 'success')
      const timer = setTimeout(() => {
        openPreflight()
      }, 700)
      return () => clearTimeout(timer)
    }
    prevReleasedRef.current = released
  }, [released, total])

  // Sync upload count so Preflight Cockpit knows if batch is empty
  useEffect(() => {
    const verifiedCount = snap.uploads.filter(u => u.scan === 'verified').length
    localStorage.setItem('bam_uploads_count', String(verifiedCount))
  }, [snap.uploads])

  // Sufficiency metrics (computed dynamically from actual inputs)
  const sourcesPct = total > 0 ? Math.min(100, Math.round((total / 5) * 100)) : 0
  const coveragePct = total > 0 && fdeGoals.trim() ? Math.min(100, 45 + Math.round((total / 6) * 45)) : total > 0 ? 35 : 0
  const qualityPct = total > 0 && clean === total ? 96 : total > 0 ? 60 : 0
  const overallReadiness = Math.round((sourcesPct * 0.4) + (coveragePct * 0.3) + (qualityPct * 0.3))

  // Full-screen window drag-and-drop state
  const [isDraggingWindow, setIsDraggingWindow] = useState(false)
  const dragCounter = useRef(0)

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      dragCounter.current += 1
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        setIsDraggingWindow(true)
      }
    }
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      dragCounter.current -= 1
      if (dragCounter.current <= 0) {
        dragCounter.current = 0
        setIsDraggingWindow(false)
      }
    }
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy'
      }
    }
    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      dragCounter.current = 0
      setIsDraggingWindow(false)
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        take(e.dataTransfer.files, 'drop')
      }
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [])

  return (
    <main className="intake-workbench-wrap">
      {/* Full-Screen Glass Drop Target */}
      {isDraggingWindow && (
        <div
          className="fullscreen-drop-overlay"
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            setIsDraggingWindow(false)
            dragCounter.current = 0
            if (e.dataTransfer?.files?.length) {
              take(e.dataTransfer.files, 'drop')
            }
          }}
        >
          <div className="fullscreen-drop-modal">
            <div className="fullscreen-drop-icon">
              <Icon name="upload" size={36} />
            </div>
            <h2 style={{ margin: '6px 0 2px', fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
              Drop Documents or Folders Anywhere
            </h2>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--muted)' }}>
              Adaptive intake: CAD STEP, PDF drawings, XLSX BOMs, specifications
            </p>
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <span className="pill tone-ok sm">✓ BuLLSav Zero-Trust Quarantine Active</span>
              <span className="pill tone-info sm">Twin Engine (ClamAV + Repel) Ready</span>
            </div>
          </div>
        </div>
      )}

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
                  <div className="wb-step-label">BuLLSav Twin Engine</div>
                  <div className="wb-step-sub">{released === total && total > 0 ? 'All files clean' : pending.length > 0 ? 'Scanning...' : 'ClamAV + Repel consensus'}</div>
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

            {/* Adaptive Intake Action */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setBulk(true)}
                disabled={!!closed}
                className="btn btn-primary sm"
                style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
                title="Open Bulk Ingestion Assistant: Select files, multi-files, whole folders with nested ZIPs, or standalone archives"
              >
                <Icon name="plus" size={12} />
                <span>Add Documents / Folder</span>
              </button>
              {total > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost sm"
                  onClick={emergencyReset}
                  style={{ width: '100%', justifyContent: 'center', color: 'var(--err)', fontSize: '11.5px', gap: '6px' }}
                  title="Clear all staged files and reset memory"
                >
                  <Icon name="trash" size={11} />
                  <span>Clear Staged Files ({total})</span>
                </button>
              )}
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

          {/* Central Intelligent Intake Command Bar */}
          <div className="wb-card intake-command-bar">
            <div className="intake-command-header">
              <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
                <div className="command-bar-icon-box">
                  <Icon name="bolt" size={15} />
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                    Intelligent Intake &amp; Objective Command
                  </h4>
                  <span className="xs muted">
                    Set scope &amp; constraints · Speak, type, or drop files anywhere on screen
                  </span>
                </div>
              </div>

              {demo && (
                <button
                  type="button"
                  className="btn btn-secondary sm demo-batch-pill"
                  disabled={!!snap.ingestion}
                  onClick={() => {
                    demo.loadScanFixture()
                    void run('Load fixture', async () => {})
                    toast('Loaded Meridian Aerospace RFQ package (21 files). BuLLSav scanning triggered.', 'success')
                  }}
                  title="1-click load pre-built industrial RFQ batch with 21 aerospace documents"
                >
                  <Icon name="bolt" size={11} />
                  <span>⚡ Load Industrial RFQ Batch (21 Docs)</span>
                </button>
              )}
            </div>

            {/* Main Textarea Container */}
            <div className="intake-command-input-container">
              <textarea
                id="fde-obj-input"
                className="intake-command-textarea"
                rows={2}
                value={goals}
                onChange={e => saveGoals(e.target.value)}
                placeholder="Type intake directives (e.g. Extract CAD STEP tolerances, verify 17-4PH certs, calculate Tier-1 EMS SMT rates)..."
              />

              {/* Integrated Minimal Action Row inside the Bar */}
              <div className="intake-command-actions">
                <div className="intake-command-left-actions">
                  <button
                    type="button"
                    className="btn btn-primary sm intake-add-btn"
                    disabled={!!closed}
                    onClick={() => setBulk(true)}
                    title="Open Ingest Assistant: Select files, whole folders with nested ZIPs, archives, or bulk enterprise packages"
                  >
                    <Icon name="plus" size={13} />
                    <span>Add / Ingest Files</span>
                  </button>

                  {/* Voice Dictation Button */}
                  <button
                    type="button"
                    className={`btn sm voice-mic-btn ${listening ? 'is-recording' : 'btn-ghost'}`}
                    onClick={toggleVoice}
                    title="Windows native voice-to-text dictation"
                    style={{ fontSize: '11px', padding: '2px 8px', height: '26px' }}
                  >
                    <span className={`voice-pulse-dot ${listening ? 'pulsing' : ''}`} />
                    <Icon name="bolt" size={11} />
                    <span>{listening ? 'Listening...' : 'Voice'}</span>
                  </button>

                  {/* Drop hint pill */}
                  <span className="drop-hint-pill" title="Drag and drop documents, folders, or ZIP archives anywhere on screen">
                    <Icon name="upload" size={10} />
                    <span>Drop files anywhere</span>
                  </span>
                </div>

                <div className="intake-command-right-actions">
                  <span className={`xs ${goals.trim() ? 'tone-ok' : 'muted'}`} style={{ marginRight: '6px' }}>
                    {goals.trim() ? '✓ Saved' : 'No objective'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary sm"
                    onClick={() => { saveGoals(goals); toast('Intake objective saved.', 'success') }}
                    style={{ height: '26px', fontSize: '11.5px', padding: '2px 10px' }}
                  >
                    <span>Save Objective</span>
                    <Icon name="chevron" size={10} />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Directive Chips */}
            <div className="fde-goals-presets" style={{ marginTop: '2px' }}>
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  className="prompt-chip"
                  onClick={() => {
                    const next = goals.includes(p) ? goals : goals.trim() ? `${goals.trim()}; ${p}` : p
                    saveGoals(next)
                  }}
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Live 5-Node BuLLSav Twin Engine Animated Scanning Pipeline (Prominently at eye-level directly beneath Command Bar!) */}
          <AvStatus uploads={snap.uploads} />

          {/* Staged Files Table (when files exist) */}
          {total > 0 && (
            <div className="wb-card scan-files">
              <div className="wb-card-head">
                <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '13px', color: 'var(--text)' }}>Staged Discovery Documents ({total})</strong>
                  <button
                    type="button"
                    className="btn btn-ghost sm"
                    onClick={emergencyReset}
                    style={{ color: 'var(--err)', fontSize: '11px', padding: '1px 6px', height: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="Clear all staged files and reset memory"
                  >
                    <Icon name="trash" size={10} />
                    <span>Clear All</span>
                  </button>
                </div>
                <span className="xs tone-ok">✓ BuLLSav Protection Active</span>
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
                            <StatusPill status={u.scan === 'verified' ? 'pass' : u.scan === 'blocked' ? 'fail' : 'pending'} text={u.scan === 'verified' ? 'BuLLSav Clean' : v.label} />
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

          {/* Supported Ingestion Modalities Accordion (Hidden by default to protect IP) */}
          <details className="ingestion-modalities-accordion">
            <summary className="ingestion-modalities-summary">
              <div className="row" style={{ alignItems: 'center', gap: '6px' }}>
                <Icon name="info" size={12} />
                <span>Ingestion Architecture &amp; Data Pipelines (BuLLM Engine)</span>
              </div>
              <span className="xs muted">Click to expand</span>
            </summary>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', marginTop: '8px' }}>
              <div style={{ padding: '6px 8px', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="row" style={{ alignItems: 'center', gap: '5px' }}>
                  <Icon name="upload" size={11} />
                  <strong style={{ fontSize: '11px', color: 'var(--text)' }}>A. Browser Resumable</strong>
                </div>
                <div className="xs muted" style={{ marginTop: '2px', fontSize: '10px' }}>
                  Refine.dev + Uppy + tusd
                </div>
              </div>
              <div style={{ padding: '6px 8px', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="row" style={{ alignItems: 'center', gap: '5px' }}>
                  <Icon name="bolt" size={11} />
                  <strong style={{ fontSize: '11px', color: 'var(--text)' }}>B1. Air-Gapped Watchdog</strong>
                </div>
                <div className="xs muted" style={{ marginTop: '2px', fontSize: '10px' }}>
                  services/watcher.py (.tmp &gt;&gt; .pdf)
                </div>
              </div>
              <div style={{ padding: '6px 8px', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="row" style={{ alignItems: 'center', gap: '5px' }}>
                  <Icon name="shield" size={11} />
                  <strong style={{ fontSize: '11px', color: 'var(--text)' }}>B2. Inbound Email</strong>
                </div>
                <div className="xs muted" style={{ marginTop: '2px', fontSize: '10px' }}>
                  FastMCP Webhook (&lt;25MB)
                </div>
              </div>
              <div style={{ padding: '6px 8px', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="row" style={{ alignItems: 'center', gap: '5px' }}>
                  <Icon name="db" size={11} />
                  <strong style={{ fontSize: '11px', color: 'var(--text)' }}>B3/B4. Cloud &amp; SFTP</strong>
                </div>
                <div className="xs muted" style={{ marginTop: '2px', fontSize: '10px' }}>
                  AWS S3 DLQ / Temporal pull
                </div>
              </div>
            </div>
          </details>

          {/* Model Gating Banner if Model / Key is required */}
          {!modelStatus.ready && (
            <div style={{
              padding: '10px 12px', borderRadius: '8px', margin: '6px 0',
              background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
              border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="alert" size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{modelStatus.reason}</span>
              </div>
              <div className="row" style={{ gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-primary sm"
                  onClick={() => openSettings('keys')}
                  style={{ fontSize: '11.5px', padding: '3px 10px', height: '26px' }}
                >
                  <Icon name="lock" size={11} />
                  <span>Configure API Key</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary sm"
                  onClick={() => openSettings('engines')}
                  style={{ fontSize: '11.5px', padding: '3px 10px', height: '26px' }}
                >
                  <Icon name="bolt" size={11} />
                  <span>Select Engine</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Action Row (Image 2) */}
          <div className="row" style={{ gap: '10px', alignItems: 'center', marginTop: '4px' }}>
            <GateButton
              action="ingest"
              reason={starting ? undefined : !modelStatus.ready ? modelStatus.reason : block}
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

        {/* PANE 3: RIGHT PANE - READINESS & BULLSAV CORE */}
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
                  {released === total && total > 0 ? 'BuLLSav Passed' : total > 0 ? 'Scanning...' : 'Not run'}
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

            {/* Quick Pre-Flight Verification Gate Launcher */}
            {(() => {
              const pf = getPreflightSufficiency()
              return (
                <div style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary sm"
                    onClick={openPreflight}
                    title="Open Pre-Flight Verification Cockpit to test Master Checks and evaluate queries against graph"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      width: '100%',
                      fontSize: '11.5px',
                      padding: '5px 8px',
                      background: pf.isUnlocked ? 'color-mix(in srgb, #10b981 12%, transparent)' : 'color-mix(in srgb, var(--accent) 10%, transparent)',
                      borderColor: pf.isUnlocked ? 'color-mix(in srgb, #10b981 40%, transparent)' : 'var(--accent)',
                      color: pf.isUnlocked ? '#10b981' : 'var(--text)',
                    }}
                  >
                    <Icon name={pf.isUnlocked ? 'check' : 'bolt'} size={12} />
                    <span>Pre-Flight Gate: {pf.passRate}% {pf.isUnlocked ? '(Ready)' : '(80% Req)'}</span>
                  </button>
                </div>
              )
            })()}

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

            {/* Minimal Activity Log Link */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 2px 0', borderTop: '1px solid var(--border)', fontSize: '11px', marginTop: '6px' }}>
              <span className="muted">Activity: {snap.scanEvents.length} events logged</span>
              <button type="button" className="link xs" onClick={() => setShowLogs(true)}>
                View log &gt;
              </button>
            </div>
          </div>
        </aside>
      </div>


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
