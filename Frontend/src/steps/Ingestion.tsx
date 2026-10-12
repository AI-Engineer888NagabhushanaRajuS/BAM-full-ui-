// Stage 1 screens 1.2 Ingestion queue/jobs, 1.3 File detail/preview and 1.4 Ingestion review.
// Built from the real service model only: uploads in the shared Uppy instance (pending/uploading/failed),
// stored upload records with their virus-scan state (mock scan adapter), and files refused at intake.
// Parsing has no backend contract in this build, so it is shown as unavailable, never as working.
import { useState } from 'react'
import { useUppyState } from '@uppy/react'
import { ACCEPTED_TYPES, type Snapshot } from '../api/types'
import { setUi, uppy, useUi } from '../lib/store'
import { goScreen } from '../lib/route'
import { useRag } from '../rag/ragPipeline.ts'
import { JOBS } from '../rag/mockData.ts'
import { DemoTag } from '../components/release'
import { Banner, Copy, Empty, Icon, StatusPill, Time, fmtBytes } from '../components/ui'
import { isReleased } from '../api/scanGate.ts'
import { JevVisionHUD } from '../components/JevVisionHUD'

type QState = 'pending' | 'processing' | 'complete' | 'failed' | 'quarantined'
interface QRow { key: string; name: string; size?: number; state: QState; stage: string; pct?: number; detail?: string; at?: string; uppyId?: string; uploadId?: string }
const Q_LABEL: Record<QState, string> = { pending: 'Pending', processing: 'Processing', complete: 'Complete', failed: 'Failed', quarantined: 'Quarantined' }
const Q_PILL: Record<QState, 'queued' | 'running' | 'pass' | 'fail' | 'unavailable'> = { pending: 'queued', processing: 'running', complete: 'pass', failed: 'fail', quarantined: 'unavailable' }

function useQueue(snap: Snapshot): QRow[] {
  const files = useUppyState(uppy, s => s.files)
  const rejected = useUi(s => s.rejected)
  const inFlight = Object.values(files).filter(f => !f.progress.uploadComplete).map((f): QRow => ({
    key: `u:${f.id}`, name: f.name ?? 'file', size: f.size ?? undefined, uppyId: f.id,
    state: f.error ? 'failed' : f.progress.uploadStarted ? 'processing' : 'pending',
    stage: f.error ? 'Upload failed' : f.progress.uploadStarted ? 'Uploading to object storage' : 'Added, not started',
    pct: f.progress.percentage ?? 0, detail: f.error ?? undefined,
  }))
  const stored = snap.uploads.map((u): QRow => ({
    key: `s:${u.id}`, name: u.name, size: u.size, uploadId: u.id, at: u.uploadedAt,
    state: u.status !== 'stored' || u.scanError ? 'failed' : u.scan === 'blocked' ? 'quarantined' : u.scan === 'scanning' ? 'processing' : 'complete',
    stage: u.status !== 'stored' ? 'Storage failed' : u.scanError ? 'Virus scan error' : u.scan === 'blocked' ? 'Threat detected · quarantined' : u.scan === 'scanning' ? 'Virus scan running' : 'Verified · released',
    pct: u.scan === 'scanning' && !u.scanError ? undefined : 100, detail: u.error ?? u.scanError ?? u.threat ?? u.objectKey,
  }))
  const refused = rejected.map((r, i): QRow => ({ key: `r:${i}`, name: r.name, state: 'failed', stage: 'Refused at intake', detail: r.reason, at: r.at }))
  return [...inFlight, ...stored, ...refused]
}

function Provenance({ snap }: { snap: Snapshot }) {
  const runId = useRag(s => s.runId)
  return (
    <Banner tone="info" icon="question">
      <strong>Dataset provenance.</strong> {snap.uploads.length && runId
        ? `${snap.uploads.length} uploaded file${snap.uploads.length === 1 ? '' : 's'} started RAG run ${runId}.`
        : 'No stored upload has started a RAG run yet.'}{' '}
      This build has no parser, so the graph uses the labelled EXAMPLE fixture dataset (RFQ-2026-0147, {JOBS.length} objects), not the contents of your files.
      Files whose names match a fixture object are linked to it; nothing else is linked. Real lineage needs the Cognee/OKF API.
    </Banner>
  )
}

// ---- 1.2 Ingestion queue/jobs ---------------------------------------------------------------------
export function IngestionQueue({ snap }: { snap: Snapshot }) {
  const rows = useQueue(snap)
  const [filter, setFilter] = useState<QState | 'all'>('all')
  const count = (s: QState) => rows.filter(r => r.state === s).length
  const shown = filter === 'all' ? rows : rows.filter(r => r.state === filter)
  return (
    <div className="rag">
      <div className="rag-col">
        <section className="rag-card" aria-labelledby="q-title">
          <header className="rag-card-head"><h3 id="q-title">Ingestion queue</h3><span className="muted xs">per file · object storage s3://bam-intake/</span>
            <span className="tag">{rows.length} item{rows.length === 1 ? '' : 's'}</span></header>
          <div className="filter-chips" role="group" aria-label="Filter by state">
            <button className="class-chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All {rows.length}</button>
            {(Object.keys(Q_LABEL) as QState[]).map(s => (
              <button key={s} className="class-chip" aria-pressed={filter === s} onClick={() => setFilter(s)}>{Q_LABEL[s]} {count(s)}</button>
            ))}
          </div>
          {shown.length === 0 ? <Empty icon="upload" title={rows.length ? `No ${Q_LABEL[filter as QState].toLowerCase()} items` : 'Nothing ingested yet'}
                action={!rows.length && <button className="btn btn-primary" onClick={() => goScreen('1.1')}><Icon name="upload" />Upload in 1.1</button>}>
                {rows.length ? 'Choose another filter.' : 'Uploads from 1.1 appear here with their processing stage, progress and errors.'}</Empty>
            : <div className="scroll-box">
              <table className="table queue">
                <thead><tr><th scope="col">File</th><th scope="col">State</th><th scope="col">Stage</th><th scope="col">Progress</th><th scope="col">Detail</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>{shown.map(r => (
                  <tr key={r.key} className={r.state === 'failed' ? 'row-fail' : ''}>
                    <th scope="row"><span className="file-name">{r.name}</span>{r.size !== undefined && <div className="muted xs">{fmtBytes(r.size)}</div>}</th>
                    <td><StatusPill status={Q_PILL[r.state]} text={Q_LABEL[r.state]} /></td>
                    <td className="sm">{r.stage}{r.at && <div className="muted xs"><Time iso={r.at} /></div>}</td>
                    <td>{r.pct !== undefined && r.state !== 'failed' ? <span className="progress" role="progressbar" aria-valuenow={r.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.name} progress`}><span style={{ width: `${r.pct}%` }} /></span> : '—'}</td>
                    <td className="xs">{r.detail && (r.detail.startsWith('s3://') ? <Copy value={r.detail} label="object key" /> : <span className={r.state === 'failed' ? 'stage-error' : ''}>{r.detail}</span>)}</td>
                    <td className="row">
                      {r.uppyId && r.state === 'failed' && <button className="btn btn-secondary sm" onClick={() => void uppy.retryUpload(r.uppyId!)}><Icon name="refresh" />Retry</button>}
                      {r.uploadId && <button className="btn btn-ghost sm" onClick={() => { setUi({ fileDetail: r.uploadId }); goScreen('1.3') }}>Detail</button>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>}
          <footer className="rag-card-foot"><span>Stages: added → uploading → quarantine → virus scan → verified (released) or blocked. Start ingestion run in 1.1 hands verified files to RAG. Parsing and classification run in stage 2.</span><span>Retry re-sends a failed upload</span></footer>
        </section>
        <Provenance snap={snap} />
      </div>
    </div>
  )
}

// ---- 1.3 File detail/preview ------------------------------------------------------------------------
export function FileDetail({ snap }: { snap: Snapshot }) {
  const picked = useUi(s => s.fileDetail)
  const file = snap.uploads.find(u => u.id === picked) ?? snap.uploads[0]
  const fixture = file && JOBS.find(j => j.object === file.name)
  const ext = file?.name.slice(file.name.lastIndexOf('.') + 1).toUpperCase()
  return (
    <div className="rag">
      <div className="rag-grid g13">
        <section className="rag-card" aria-labelledby="fl-title">
          <header className="rag-card-head"><h3 id="fl-title">Stored files</h3><span className="tag">{snap.uploads.length}</span></header>
          {snap.uploads.length === 0 ? <Empty icon="upload" title="No files yet" action={<button className="btn btn-primary" onClick={() => goScreen('1.1')}><Icon name="upload" />Upload in 1.1</button>}>Stored files appear here.</Empty>
            : <ul className="nav-list">{snap.uploads.map(u => (
                <li key={u.id}><button className="nav-item" aria-current={file?.id === u.id || undefined} onClick={() => setUi({ fileDetail: u.id })}>
                  <span className="file-name">{u.name}</span><span className="muted xs">{fmtBytes(u.size)}</span></button></li>))}</ul>}
        </section>
        <div className="rag-col">
          {!file ? <section className="rag-card"><Empty icon="file" title="Select a file">Upload documents in 1.1, then pick one to see its metadata and preview.</Empty></section> : <>
            <section className="rag-card" aria-labelledby="fd-title">
              <header className="rag-card-head"><h3 id="fd-title" className="file-name">{file.name}</h3><StatusPill status={file.status === 'stored' ? 'pass' : 'fail'} text={file.status === 'stored' ? 'Stored' : 'Failed'} /></header>
              <dl className="kv two-col">
                <div><dt>Type</dt><dd className="mono">{ext}</dd></div>
                <div><dt>Size</dt><dd>{fmtBytes(file.size)}</dd></div>
                <div><dt>Stored</dt><dd><Time iso={file.uploadedAt} /></dd></div>
                <div><dt>Object key</dt><dd><Copy value={file.objectKey} label="object key" /></dd></div>
                <div><dt>Upload ID</dt><dd><Copy value={file.id} label="upload ID" /></dd></div>
                {file.error && <div><dt>Error</dt><dd className="stage-error">{file.error}</dd></div>}
              </dl>
            </section>
            <section className="rag-card" aria-labelledby="pp-title">
              <header className="rag-card-head"><h3 id="pp-title">Parsed preview and flags</h3><StatusPill status="unavailable" text="Not available" /></header>
              <p className="muted sm">No parse service is connected in this build, so this file's rows, text and flags cannot be shown. Nothing here is inferred or made up.</p>
              {fixture ? (
                <div className="lineage">
                  <p className="sm"><strong>Fixture lineage</strong> <span className="tag example-tag">EXAMPLE fixture</span></p>
                  <p className="muted sm">The file name matches an object in the example RAG dataset; its fixture extraction record is:</p>
                  <dl className="kv two-col">
                    <div><dt>OKF class</dt><dd>{fixture.okfClass}</dd></div><div><dt>Extractor</dt><dd>{fixture.extractor}</dd></div>
                    <div><dt>Entities</dt><dd>{fixture.entities}</dd></div><div><dt>Confidence</dt><dd>{fixture.confidence?.toFixed(2) ?? '—'}</dd></div>
                    <div><dt>Fixture object</dt><dd><Copy value={fixture.s3} label="fixture URI" /></dd></div>
                  </dl>
                  <button className="link sm" onClick={() => goScreen('2.3')}><Icon name="link" size={12} />See it in 2.3 extraction jobs</button>
                </div>
              ) : <p className="muted xs">No fixture object matches this file name, so it has no lineage into the example graph.</p>}
            </section>
          </>}
        </div>
      </div>
    </div>
  )
}

// ---- 1.4 Ingestion review ---------------------------------------------------------------------------
export function IngestionReview({ snap }: { snap: Snapshot }) {
  const rejected = useUi(s => s.rejected)
  const inFlight = useUppyState(uppy, s => Object.values(s.files).filter(f => f.progress.uploadStarted && !f.progress.uploadComplete && !f.error).length)
  const rag = useRag(s => s)
  const accepted = snap.uploads.filter(isReleased)
  const ragFailed = rag.steps.find(s => s.status === 'failed')
  const checks: { label: string; ok: boolean | 'running'; detail: string }[] = [
    { label: 'At least one verified document', ok: accepted.length > 0, detail: accepted.length ? `${accepted.length} virus-scanned and released` : 'Upload documents in 1.1 and wait for the virus scan' },
    { label: 'No uploads still running', ok: inFlight === 0 ? true : 'running', detail: inFlight ? `${inFlight} upload(s) in progress` : 'All uploads finished' },
    { label: 'Handed to RAG (stage 2)', ok: snap.ingestion && rag.runId ? (ragFailed ? false : rag.lastSyncAt ? true : 'running') : false,
      detail: !snap.ingestion || !rag.runId ? 'Starts with Start ingestion run in 1.1, once every scan passes' : ragFailed ? `Run ${rag.runId} failed at ${ragFailed.label}` : rag.lastSyncAt ? `Run ${rag.runId} synced` : `Run ${rag.runId} in progress` },
    { label: 'IP data detailed context readiness (Jev check)',
      ok: rag.contextEvaluation ? (rag.contextEvaluation.verdict === 'sufficient' ? true : rag.contextEvaluation.verdict === 'marginal' ? 'running' : false) : (rag.contextEvalStatus === 'running' ? 'running' : false),
      detail: rag.contextEvaluation
        ? `${rag.contextEvaluation.verdict === 'sufficient' ? 'Sufficient detail' : 'Needs review'}: ${rag.contextEvaluation.metrics.find(m => m.key === 'sufficiency')?.score ?? 0}% confidence (${rag.contextEvaluation.model})`
        : 'Evaluated automatically once files enter RAG; inspect in 2.3 Context quality' },
  ]

  return (
    <div className="rag">
      <div className="rag-col">
        <JevVisionHUD mode="intake" sources={accepted.map(u => u.name)} compact />
        <div className="rag-grid g14">
          <section className="rag-card" aria-labelledby="acc-title">
            <header className="rag-card-head"><h3 id="acc-title">Accepted</h3><span className="tag">{accepted.length}</span></header>
            {accepted.length === 0 ? <p className="muted sm">Nothing accepted yet.</p> : <ul className="files">{accepted.map(u => (
              <li key={u.id} className="file"><Icon name="check" />
                <div className="file-main"><button className="link file-name" onClick={() => { setUi({ fileDetail: u.id }); goScreen('1.3') }}>{u.name}</button>
                  <span className="muted xs">{fmtBytes(u.size)} · uploaded <Time iso={u.uploadedAt} /> · virus scan clean</span></div></li>))}</ul>}
          </section>
          <section className="rag-card" aria-labelledby="rej-title">
            <header className="rag-card-head"><h3 id="rej-title">Rejected and quarantined</h3><span className="tag">{rejected.length + snap.uploads.filter(u => u.scan === 'blocked').length}</span></header>
            {snap.uploads.filter(u => u.scan === 'blocked').map(u => (
              <div key={u.id} className="file"><Icon name="alert" /><div className="file-main"><span className="file-name">{u.name}</span><span className="stage-error xs">Threat detected: quarantined</span></div></div>))}
            {rejected.length === 0 ? <p className="muted sm">No file was refused at upload in this session.</p> : <ul className="files">{rejected.map((r, i) => (
              <li key={i} className="file"><Icon name="x" /><div className="file-main"><span className="file-name">{r.name}</span><span className="stage-error xs">{r.reason}</span><span className="muted xs"><Time iso={r.at} /></span></div></li>))}</ul>}
            <p className="muted xs" id="accepted-types"><Icon name="file" size={11} /> Accepted intake types: {ACCEPTED_TYPES.join(', ')}. Anything else is filtered out at upload, and an object whose type has no extraction rule stays Unclassified in RAG.</p>
            <p className="muted xs"><Icon name="lock" size={11} /> BuLL*Sav verdicts come from the mock scan adapter in this build; the real Digibull Security AntiVirus Engine service (ClamAV core, clamd) replaces it behind the same API.</p>
          </section>
        </div>
        <section className="rag-card" aria-labelledby="ready-title">
          <header className="rag-card-head"><h3 id="ready-title">Hand-off readiness</h3><DemoTag /></header>
          <ol className="cert-list">{checks.map(c => (
            <li key={c.label} className="cert-item">
              <StatusPill status={c.ok === true ? 'pass' : c.ok === 'running' ? 'running' : 'pending'} text={c.ok === true ? 'Ready' : c.ok === 'running' ? 'In progress' : 'Not yet'} />
              <div className="cert-main"><span className="cert-label">{c.label}</span><span className="cert-detail">{c.detail}</span></div>
            </li>))}</ol>
          <div className="row">
            <button className="btn btn-secondary" onClick={() => goScreen('1.2')}>Open 1.2 queue</button>
            <button className="btn btn-primary" onClick={() => goScreen('2.4')}>Continue to 2.4 RAG review</button>
          </div>
        </section>
        <Provenance snap={snap} />
      </div>
    </div>
  )
}
