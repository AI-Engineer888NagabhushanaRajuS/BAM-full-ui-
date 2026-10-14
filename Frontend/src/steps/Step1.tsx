import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../api/adapter'
import { isReleased } from '../api/scanGate.ts'
import type { Sow } from '../api/types'
import type { StepProps } from '../App'
import { useAction } from '../lib/data'
import { setUi, useUi, openPreflight, openOpenConnector, openOpenRouterModal, toast } from '../lib/store'
import { getModelGateStatus } from '../lib/modelGate'
import { DemoTag } from '../components/release'
import { goScreen, goStep } from '../lib/route'
import { isRunning, ragPipeline, useRag } from '../rag/ragPipeline.ts'
import { ChangeHighlight, DiffLegend, SowMeta, setChangeBase, sowExtensions, useSowDiff } from '../components/sow'
import { editCount } from '../lib/sowDiff'
import { sowComparison, type CompareWith } from '../lib/sowCompare'
import { Banner, Copy, Empty, ErrorState, GateButton, Icon, Pane, Section, Skeleton, StageList, StatusPill, fmtTime } from '../components/ui'
import { JevVisionHUD } from '../components/JevVisionHUD'
import { getPreflightSufficiency } from '../rag/CogneePreflightCockpit'
import { SowImageEditorModal } from '../components/SowImageEditorModal'


function Toolbar({ editor, onOpenImageEditor }: { editor: Editor; onOpenImageEditor?: () => void }) {
  const st = useEditorState({ editor, selector: ({ editor: e }) => ({
    bold: e.isActive('bold'), italic: e.isActive('italic'), h2: e.isActive('heading', { level: 2 }), h3: e.isActive('heading', { level: 3 }),
    ul: e.isActive('bulletList'), ol: e.isActive('orderedList'), undo: e.can().undo(), redo: e.can().redo(), editable: e.isEditable,
  }) })
  const b = (label: string, text: string, on: boolean | undefined, fn: () => void, disabled = false) => (
    <button className="tb" aria-label={label} title={label} aria-pressed={on} disabled={!st.editable || disabled} onClick={fn}>{text}</button>
  )
  return (
    <div className="toolbar" role="toolbar" aria-label="SOW formatting">
      {b('Bold', 'B', st.bold, () => editor.chain().focus().toggleBold().run())}
      {b('Italic', 'I', st.italic, () => editor.chain().focus().toggleItalic().run())}
      <span className="tb-sep" />
      {b('Heading 2', 'H2', st.h2, () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
      {b('Heading 3', 'H3', st.h3, () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
      {b('Bullet list', '•', st.ul, () => editor.chain().focus().toggleBulletList().run())}
      {b('Numbered list', '1.', st.ol, () => editor.chain().focus().toggleOrderedList().run())}
      <span className="tb-sep" />
      {b('Undo', '↶', undefined, () => editor.chain().focus().undo().run(), !st.undo)}
      {b('Redo', '↷', undefined, () => editor.chain().focus().redo().run(), !st.redo)}
      <span className="tb-sep" />
      <button
        type="button"
        className="tb tb-image-markup"
        aria-label="Annotate Evidence & Documents (Filerobot)"
        title="Open Universal Filerobot Studio to annotate insurance claim evidence, police FIRs, CAD blueprints, or photos and insert figure into SOW"
        disabled={!st.editable}
        onClick={onOpenImageEditor}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          color: 'var(--accent)',
          fontWeight: 600,
          padding: '0 8px',
        }}
      >
        <span>📷</span>
        <span>Annotate Evidence / Drawing</span>
      </button>
    </div>
  )
}

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

function SowEditor({ sow, editable, info, uploadedFiles }: { sow: Sow; editable: boolean; info: StepProps['info']; uploadedFiles?: string[] }) {
  const qc = useQueryClient()
  const base = useRef(sow.version)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [save, setSave] = useState<{ s: SaveState; at?: string; err?: string }>({ s: 'idle' })
  const [showDiff, setShowDiff] = useState(true)
  const [compareWith, setCompareWith] = useState<CompareWith>('previous')
  const [liveHtml, setLiveHtml] = useState(sow.html)
  const [imageEditorOpen, setImageEditorOpen] = useState(false)
  const [editingImageSrc, setEditingImageSrc] = useState<string | undefined>(undefined)
  const [editingImageCaption, setEditingImageCaption] = useState<string | undefined>(undefined)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { busy, run } = useAction()

  const handleOpenImageEditor = () => {
    setEditingImageSrc(undefined)
    setEditingImageCaption(undefined)
    setImageEditorOpen(true)
  }

  const handleInsertAnnotatedImage = (dataUri: string, captionTitle?: string) => {
    if (!editor) return
    const title = captionTitle || 'Annotated Document Evidence'
    editor.chain().focus().setImage({ src: dataUri, alt: title, title }).run()
  }

  const editor = useEditor({
    extensions: [...sowExtensions, ChangeHighlight], content: sow.html, editable,
    onUpdate: ({ editor: e }) => {
      setLiveHtml(e.getHTML())
      clearTimeout(timer.current)
      setSave({ s: 'pending' })
      timer.current = setTimeout(async () => {
        setSave({ s: 'saving' })
        try {
          base.current = await api.saveSowDraft(e.getHTML(), base.current)
          setSave({ s: 'saved', at: new Date().toISOString() })
          void qc.invalidateQueries()
        } catch (err) { setSave({ s: 'error', err: (err as Error).message }) }
      }, 800)
    },
  })

  // Click on any embedded drawing/image in the SOW to edit directly in Filerobot
  useEffect(() => {
    const dom = editor?.view.dom
    if (!dom) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName?.toLowerCase() === 'img') {
        const src = target.getAttribute('src')
        const alt = target.getAttribute('alt') || 'Evidence Markup'
        if (src) {
          setEditingImageSrc(src)
          setEditingImageCaption(alt)
          setImageEditorOpen(true)
        }
      }
    }
    dom.addEventListener('click', handleClick)
    return () => dom.removeEventListener('click', handleClick)
  }, [editor])

  useEffect(() => () => clearTimeout(timer.current), [])
  // emitUpdate=false: toggling editability is not an edit and must not autosave a new version.
  useEffect(() => { editor?.setEditable(editable, false) }, [editor, editable])
  // A new version from the backend (regeneration) replaces the content; our own saves already match.
  useEffect(() => {
    if (!editor || sow.version === base.current || save.s === 'pending' || save.s === 'saving') return
    editor.commands.setContent(sow.html, { emitUpdate: false })
    setLiveHtml(sow.html)
    base.current = sow.version
  }, [editor, sow.version, sow.html, save.s])

  // Accuracy findings (right pane) jump to their requirement in the document.
  const passage = useUi(s => s.passage)
  useEffect(() => {
    const root = editor?.view.dom
    if (!root || !passage) return
    root.querySelectorAll('.passage-hl').forEach(el => el.classList.remove('passage-hl'))
    const el = root.querySelector(`[data-passage="${CSS.escape(passage)}"]`)
    if (el) { el.classList.add('passage-hl'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }) }
  }, [editor, passage])

  const saving = save.s === 'pending' || save.s === 'saving'
  const approved = sow.status === 'approved'
  const decideReason = !info.editable ? 'This SOW is read-only. Reopen it to change the decision.'
    : sow.status === 'regenerating' ? 'The SOW is being regenerated'
    : saving ? 'Saving your edits first' : save.s === 'error' ? 'Your last edit was not saved' : undefined
  const approveReason = decideReason ?? (approved ? `v${sow.version} is already approved` : undefined)
  // Default base: the previous saved version (or the saved version itself while edits are unsaved).
  // Audit base: the model-generated version.
  const cmp = sowComparison(sow, liveHtml, compareWith)
  const baseHtml = cmp.kind === 'diff' ? cmp.html : liveHtml
  const diff = useSowDiff(baseHtml, liveHtml)
  const edits = cmp.kind === 'diff' ? editCount(diff.counts) : 0
  // Colour-code changes live in the editor against the chosen base (display-only, never saved).
  useEffect(() => { if (editor) setChangeBase(editor, showDiff && cmp.kind === 'diff' ? baseHtml : null) }, [editor, showDiff, baseHtml, cmp.kind])
  const editsText = cmp.kind === 'none' ? 'First version: nothing to compare' : `${edits ? `${edits} change${edits === 1 ? '' : 's'}` : 'No changes'} · ${cmp.from} → ${cmp.to}`

  return (
    <Pane id="center-title" kicker="3.1 · Human review" title="SOW draft" className={`center ${isFullscreen ? 'is-fullscreen' : ''}`}
      actions={<span className="row">
        <label className="switch" title="Colour-code changes in the document">
          <input type="checkbox" role="switch" checked={showDiff} onChange={e => setShowDiff(e.target.checked)} />
          <span className="switch-track" aria-hidden><span /></span>Changes
        </label>
        <label className="compare-select">
          <span className="sr-only">Compare with</span>
          <select value={compareWith} onChange={e => setCompareWith(e.target.value as CompareWith)} aria-label="Compare with">
            <option value="previous">vs previous saved version</option>
            <option value="generated">vs model-generated (audit)</option>
          </select>
        </label>
        <span className={`edits-chip ${edits ? 'has' : ''}`}>{editsText}</span>
        <button
          type="button"
          className={`btn xs ${isFullscreen ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setIsFullscreen(f => !f)}
          title="Toggle Fullscreen Document View"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '11px', borderRadius: '4px' }}
        >
          <Icon name="expand" size={11} />
          <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
        {info.editable && sow.status !== 'regenerating' && (
          <button
            type="button"
            className="btn xs btn-secondary"
            disabled={!!busy}
            onClick={() => run('Regenerate SOW', () => api.requestSowChanges(sow.version, 'Regenerate tailored SOW matching ingested files and modules'), { success: 'SOW regenerated from ingested source files', step: 1 })}
            title="Re-synthesize SOW requirements dynamically from currently ingested source documents"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '11px', borderRadius: '4px' }}
          >
            <Icon name="refresh" size={11} />
            <span>Regenerate from Files</span>
          </button>
        )}
        <StatusPill status={approved ? 'done' : sow.status === 'regenerating' ? 'running' : 'needs_review'}
        text={approved ? `Approved v${sow.approval!.version}` : sow.status === 'regenerating' ? 'Regenerating' : `Draft v${sow.version}`} /></span>}
      footer={<>
        <div className="foot-info">
          <span className="mono">v{sow.version}</span>
          <span className="muted sm" role="status">
            {save.s === 'pending' ? 'Unsaved changes…' : save.s === 'saving' ? 'Saving draft…' : save.s === 'saved' ? `Draft saved ${fmtTime(save.at)}`
              : save.s === 'error' ? `Not saved: ${save.err}` : `Updated ${fmtTime(sow.updatedAt)}`}
            {cmp.kind === 'diff' && edits > 0 && ` · ${edits} change${edits === 1 ? '' : 's'}, ${cmp.from} → ${cmp.to} (${diff.counts.added} added, ${diff.counts.removed} removed, ${diff.counts.modified} modified)`}
          </span>
          {!approved && !decideReason && <span className="muted sm">Approving v{sow.version} unlocks 3.2 and extracts skills from this exact version.</span>}
        </div>
        <div className="row">
          {approved && info.editable && <button className="btn btn-ghost" disabled={!!busy}
            onClick={() => run('Close SOW review', () => api.closeReopen(1), { step: 1 }).then(() => goStep(2))}>Keep approval and close</button>}
          <GateButton action="approve" reason={approveReason} busy={busy === 'Approve'} successKey={sow.approval?.version}
            onClick={() => run('Approve', () => api.approveSow(sow.version), { success: `SOW v${sow.version} approved. Skills extraction started in 3.2.`, step: 2 }).then(() => goStep(2))}>
            Approve v{sow.version}
          </GateButton>
        </div>
      </>}>
      <div className="banners">
        {approved && !info.editable && <Banner tone="ok" icon="check">Approved <strong>v{sow.approval!.version}</strong> at {fmtTime(sow.approval!.at)} by {sow.approval!.by}. Approval is tied to this version.</Banner>}
        {approved && info.editable && <Banner tone="warn" icon="alert">Approval of <strong>v{sow.approval!.version}</strong> is still valid. Any edit creates a new version and invalidates it.</Banner>}
        {sow.invalidated && <Banner tone="warn" icon="alert"><strong>Approval of v{sow.invalidated.version} invalidated</strong> at {fmtTime(sow.invalidated.at)}: {sow.invalidated.reason}.</Banner>}
        {sow.status === 'regenerating' && sow.changeRequest && <Banner tone="info" icon="spinner">Regenerating v{sow.changeRequest.version} with AI: “{sow.changeRequest.note}”. The new version appears here when the model finishes (see pipeline).</Banner>}
      </div>
      <SowMeta sow={sow} />
      {showDiff && cmp.kind === 'none' && <Banner tone="info" icon="question"><strong>No comparison yet.</strong> {cmp.reason}</Banner>}
      <div className="editor-bar">
        {editor && <Toolbar editor={editor} onOpenImageEditor={handleOpenImageEditor} />}
        {showDiff && cmp.kind === 'diff' && <DiffLegend from={cmp.from} to={cmp.to} counts={diff.counts} />}
      </div>
      <div className={`sow-doc ${editable ? 'editable' : 'readonly'} ${showDiff ? 'tracking' : ''}`}><EditorContent editor={editor} aria-label="SOW document" /></div>
      <SowImageEditorModal
        open={imageEditorOpen}
        onClose={() => { setImageEditorOpen(false); setEditingImageSrc(undefined) }}
        onInsertImage={handleInsertAnnotatedImage}
        initialImage={editingImageSrc}
        initialCaption={editingImageCaption}
        uploadedFiles={uploadedFiles}
      />
    </Pane>
  )
}

export function Center({ snap, info }: StepProps) {
  const { busy, run } = useAction()
  const ragRunning = useRag(isRunning)
  const sow = snap.sow
  const uploadedFiles = snap.uploads.map(u => u.name)
  if (sow) return <SowEditor sow={sow} editable={info.editable && sow.status !== 'regenerating'} info={info} uploadedFiles={uploadedFiles} />
  const failed = snap.sowGeneration.find(s => s.status === 'failed')
  const running = snap.sowGeneration.some(s => s.status === 'running' || s.status === 'queued')
  return (
    <Pane id="center-title" kicker="3.1 · Human review" title="SOW draft" className="center">
      {failed ? <ErrorState title={`${failed.label} failed`} action={info.editable &&
          <button className="btn btn-primary" disabled={!!busy} onClick={() => run('Retry SOW generation', () => api.startSowGeneration(ragPipeline.getState().runId), { step: 1 })}><Icon name="refresh" />Retry SOW generation</button>}>
          {failed.error}
        </ErrorState>
        : running ? <><Banner tone="info" icon="spinner">Generating the SOW from the RAG context. It appears here when generation finishes; you can keep working meanwhile.</Banner><Skeleton rows={9} label="Generating SOW" /></>
        : !snap.uploads.length ? <Empty icon="upload" title="No SOW yet" action={<button className="btn btn-primary" onClick={() => goScreen('1.1')}><Icon name="upload" />Go to 1.1 Intake console</button>}>
            Upload documents in stage 1. The RAG pipeline (stage 2) builds the context, and the SOW is generated from it here.
          </Empty>
        : <Empty icon="clock" title="Ready for SOW synthesis" action={
            <div className="row" style={{ gap: '8px' }}>
              <button
                className="btn btn-primary"
                disabled={!!busy}
                onClick={() => {
                  const modelStatus = getModelGateStatus()
                  if (!modelStatus.ready) {
                    toast(`Inference Model Required: ${modelStatus.reason}`, 'info')
                    openOpenRouterModal()
                    return
                  }
                  const pf = getPreflightSufficiency()
                  if (!pf.isUnlocked) {
                    toast(`Pre-Flight Gate is currently at ${pf.passRate}% (< 80% req). Opening Pre-Flight Cockpit to complete verification.`, 'info')
                    openPreflight()
                    return
                  }
                  run('Generate SOW', () => api.startSowGeneration(ragPipeline.getState().runId), { step: 1 })
                }}
              >
                <Icon name="bolt" />Generate SOW with Certified Context
              </button>
              {(() => {
                const pf = getPreflightSufficiency()
                return (
                  <button className="btn btn-secondary" onClick={openPreflight}>
                    <Icon name={pf.isUnlocked ? 'check' : 'shield'} size={12} />
                    <span>Pre-Flight Gate ({pf.passRate}%)</span>
                  </button>
                )
              })()}
            </div>
          }>
            {ragRunning ? 'The RAG pipeline is running. Click Generate SOW once verified.' : 'Context graph and pre-flight checks are certified. Synthesize the SOW draft from the discovery context.'}
          </Empty>}
    </Pane>
  )
}

/** Accuracy of the current SOW version: overall score, rule checks, judge rubric and the findings behind them. */
function SowAccuracy({ sow }: { sow: Sow }) {
  const ev = sow.evaluation
  if (!ev) return null
  const stale = ev.version !== sow.version
  const tone = (n: number) => (n >= 85 ? 'ok' : n >= 65 ? 'warn' : 'err')
  const avg = (m: 'rule' | 'judge') => { const xs = ev.metrics.filter(x => x.method === m); return xs.length ? Math.round(xs.reduce((n, x) => n + x.score, 0) / xs.length) : 0 }
  return (
    <Section title="SOW accuracy" aside={ev.simulated ? <DemoTag /> : undefined}>
      {ev.status === 'running' || stale
        ? <p className="muted sm acc-running"><Icon name="spinner" size={12} spin /> Evaluating v{sow.version}: rule checks, then {ev.judge} (about a minute on CPU)…</p>
        : <div className="acc">
          <div className="acc-head">
            <span className={`acc-ring tone-${tone(ev.overall!)}`} style={{ '--p': ev.overall } as React.CSSProperties} role="img" aria-label={`Accuracy ${ev.overall} out of 100`}>
              <span className="acc-score">{ev.overall}</span>
            </span>
            <div className="acc-meta">
              <strong>v{ev.version} accuracy</strong>
              <span className="muted xs">Rule checks {avg('rule')} · Judge {avg('judge')}</span>
              <span className="faint xs">{ev.judge}{ev.judgeNote ? ` · ${ev.judgeNote}` : ''}</span>
            </div>
          </div>
          <ul className="acc-metrics">
            {ev.metrics.map(m => (
              <li key={m.key} title={m.detail}>
                <span className="acc-label">{m.label}<span className={`acc-method ${m.method}`}>{m.method === 'rule' ? 'Rule' : 'Judge'}</span></span>
                <span className={`acc-bar tone-${tone(m.score)}`}><span style={{ width: `${m.score}%` }} /></span>
                <span className="acc-n">{m.score}</span>
              </li>
            ))}
          </ul>
          {ev.findings.length > 0
            ? <details className="acc-findings"><summary>{ev.findings.length} finding{ev.findings.length === 1 ? '' : 's'} to fix</summary>
              <ul>{ev.findings.slice(0, 20).map((f, i) => (
                <li key={i}><button className="link xs" onClick={() => setUi({ passage: f.passageId })}>Req {f.requirement}{f.field ? ` · ${f.field}` : ''}</button> <span className="xs">{f.text}</span></li>
              ))}</ul></details>
            : <p className="muted xs"><Icon name="check" size={11} /> No rule findings for v{ev.version}.</p>}
        </div>}
    </Section>
  )
}

// ---- 3.1 Three-Pane Architecture (Workflows Left, Draft Middle, Scope/Evidence Right) ----
export function WorkflowPane({ snap }: StepProps) {
  const sow = snap.sow
  const runId = useRag(s => s.runId)
  const preflight = getPreflightSufficiency()
  const modelStatus = getModelGateStatus()

  return (
    <Pane id="left-title" kicker="3.1 · Contract Architecture" title="ISATVON Contract Specs">
      {/* Pre-Flight Gate Status if locked */}
      {!preflight.isUnlocked ? (
        <div style={{
          padding: '10px 12px', borderRadius: '8px', marginBottom: '10px',
          background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
          border: '1px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--accent)' }}><Icon name="alert" size={13} /></span>
            <strong style={{ fontSize: '12px', color: 'var(--text)' }}>
              Pre-Flight Gate ({preflight.passRate}% / 80% req)
            </strong>
          </div>
          <p className="xs muted" style={{ margin: 0, lineHeight: 1.3 }}>
            Context sufficiency must reach 80% to certify SOW generation against master specifications.
          </p>
          <button
            type="button"
            className="btn btn-primary sm"
            onClick={openPreflight}
            style={{ fontSize: '11px', marginTop: '4px', height: '26px' }}
          >
            <Icon name="bolt" size={11} />
            <span>Open Pre-Flight Cockpit</span>
          </button>
        </div>
      ) : (
        <div style={{
          padding: '8px 12px', borderRadius: '8px', marginBottom: '10px',
          background: 'color-mix(in srgb, var(--st-done) 10%, transparent)',
          border: '1px solid var(--st-done)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--st-done)' }}><Icon name="check" size={13} /></span>
            <strong style={{ fontSize: '12px', color: 'var(--text)' }}>Pre-Flight Certified ({preflight.passRate}%)</strong>
          </div>
          <button type="button" className="btn btn-ghost xs" onClick={openPreflight} style={{ height: '22px', fontSize: '10.5px' }}>
            Cockpit
          </button>
        </div>
      )}

      <Section title="ISATVON 1.4 Architecture Specification">
        <p className="muted xs" style={{ marginBottom: '8px' }}>
          Every requirement in this contract is structured with strict ISATVON taxonomy before skill extraction:
        </p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <li style={{ fontSize: '11.5px', padding: '4px 8px', background: 'var(--surface-2)', borderRadius: '4px' }}>
            <strong style={{ color: 'var(--accent)' }}>I · Instructions:</strong> Algorithmic logic &amp; business directives
          </li>
          <li style={{ fontSize: '11.5px', padding: '4px 8px', background: 'var(--surface-2)', borderRadius: '4px' }}>
            <strong style={{ color: 'var(--accent)' }}>S · Source Data:</strong> Strict S3/DB object URI with line anchors
          </li>
          <li style={{ fontSize: '11.5px', padding: '4px 8px', background: 'var(--surface-2)', borderRadius: '4px' }}>
            <strong style={{ color: 'var(--accent)' }}>A · Automation:</strong> FastMCP agent pattern (LLM / AST / HITL)
          </li>
          <li style={{ fontSize: '11.5px', padding: '4px 8px', background: 'var(--surface-2)', borderRadius: '4px' }}>
            <strong style={{ color: 'var(--accent)' }}>T · Tech Stack:</strong> FastMCP, ClamAV, Repel, PostgreSQL
          </li>
          <li style={{ fontSize: '11.5px', padding: '4px 8px', background: 'var(--surface-2)', borderRadius: '4px' }}>
            <strong style={{ color: 'var(--accent)' }}>V · Variables:</strong> Deterministic tolerances &amp; rate parameters
          </li>
          <li style={{ fontSize: '11.5px', padding: '4px 8px', background: 'var(--surface-2)', borderRadius: '4px' }}>
            <strong style={{ color: 'var(--accent)' }}>O · Outcome:</strong> Pydantic structured output JSON schema
          </li>
          <li style={{ fontSize: '11.5px', padding: '4px 8px', background: 'var(--surface-2)', borderRadius: '4px' }}>
            <strong style={{ color: 'var(--accent)' }}>N · Notify:</strong> Telemetry queues, alerts &amp; HITL triggers
          </li>
        </ul>
      </Section>

      <Section title="Grounding & Model Verification">
        <dl className="kv">
          <div>
            <dt>Active Model</dt>
            <dd className="mono xs">
              <span style={{ color: modelStatus.ready ? 'var(--st-done)' : 'var(--err)' }}>●</span> {modelStatus.modelName}
            </dd>
          </div>
          <div><dt>RAG Run ID</dt><dd className="mono xs">{runId ?? 'certified-run'}</dd></div>
          <div><dt>SOW Status</dt><dd><StatusPill status={sow?.status === 'approved' ? 'done' : sow?.status === 'regenerating' ? 'running' : 'needs_review'} text={sow?.status ?? 'pending'} /></dd></div>
        </dl>
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          <button className="btn btn-ghost xs" onClick={() => goScreen('2.1')} style={{ flex: 1 }}>
            <Icon name="link" size={11} />2.1 Graph
          </button>
          <button className="btn btn-ghost xs" onClick={() => goScreen('3.2')} style={{ flex: 1 }}>
            <Icon name="link" size={11} />3.2 Skills
          </button>
        </div>
      </Section>
    </Pane>
  )
}

export function ScopeAndEvidencePane({ snap }: StepProps) {
  const sow = snap.sow
  const runId = useRag(s => s.runId)
  const synced = useRag(s => s.lastSyncAt)
  return (
    <Pane id="right-title" kicker="Reports & Evidence" title="Context grounding">
      <JevVisionHUD mode="sow" sources={snap.uploads.map(u => u.name)} compact />
      {sow && <SowAccuracy sow={sow} />}
      <Section title="Source references" aside={<span className="muted sm">{snap.uploads.filter(isReleased).length}</span>}>
        {!snap.uploads.some(isReleased) ? <p className="muted sm">No verified documents yet.</p> : (
          <ul className="files">
            {snap.uploads.filter(isReleased).map(u => (
              <li key={u.id} className="file"><Icon name="file" />
                <div className="file-main"><span className="file-name">{u.name}</span><Copy value={u.objectKey} label="object key" /></div>
              </li>
            ))}
          </ul>
        )}
        <button className="link sm" onClick={() => goScreen('1.1')}><Icon name="upload" size={12} />Add documents in 1.1 Intake console</button>
      </Section>
      <Section title="OOMOL Universal Connectors" aside={<span className="pill sm pill-pass">oomol.com</span>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', padding: '4px 6px', background: 'var(--surface-2)', borderRadius: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: '#10b981' }}>●</span>
              <strong>SAP S/4HANA ERP</strong>
            </span>
            <span className="mono xs tone-ok">Verified</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', padding: '4px 6px', background: 'var(--surface-2)', borderRadius: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: '#10b981' }}>●</span>
              <strong>DigiKey Pricing API</strong>
            </span>
            <span className="mono xs tone-ok">Active</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', padding: '4px 6px', background: 'var(--surface-2)', borderRadius: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: '#10b981' }}>●</span>
              <strong>GitHub Enterprise AST</strong>
            </span>
            <span className="mono xs tone-ok">Synced</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary sm"
            onClick={openOpenConnector}
            title="Open OOMOL OpenConnector Hub to inspect credentials, actions, and test connectors"
            style={{ fontSize: '11px', marginTop: '4px', justifyContent: 'center' }}
          >
            <Icon name="link" size={11} />
            <span>Manage OOMOL Connectors Hub</span>
          </button>
        </div>
      </Section>

      <Section title="SOW versions">
        {!sow ? <p className="muted sm">Produced by the SOW generation stage.</p> : (
          <dl className="kv">
            <div><dt>Generated by model</dt><dd className="mono">v{sow.generatedVersion}</dd></div>
            <div><dt>Current</dt><dd className="mono">v{sow.version}</dd></div>
            <div><dt>Approval</dt><dd>{sow.approval ? `v${sow.approval.version} · ${fmtTime(sow.approval.at)}` : 'Not approved'}</dd></div>
            {sow.changeRequest && <div><dt>Last AI regeneration</dt><dd>from v{sow.changeRequest.version} · {fmtTime(sow.changeRequest.at)}</dd></div>}
          </dl>
        )}
      </Section>
    </Pane>
  )
}

// Backward-compatible exports
export const Right = ScopeAndEvidencePane
export const Sources = ScopeAndEvidencePane
export const Left = WorkflowPane

export { Intake } from './Intake'
