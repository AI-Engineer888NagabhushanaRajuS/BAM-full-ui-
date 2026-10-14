import { useEffect, useMemo, useRef, useState } from 'react'
import { AgGridReact, type CustomCellEditorProps, type CustomCellRendererProps } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, themeQuartz, type CellKeyDownEvent, type ColDef, type FullWidthCellKeyDownEvent, type GridApi } from 'ag-grid-community'
import { api } from '../api/adapter'
import { AUTOMATIONS, ISATVON, type IsatvonField, type SkillRow } from '../api/types'
import type { StepProps } from '../App'
import { useAction, useSkills } from '../lib/data'
import { setUi, toast, useUi } from '../lib/store'
import { addCounts, countSegs, diffWords, editCount, type Seg } from '../lib/sowDiff'
import { goScreen, goStep } from '../lib/route'
import { ReadonlySow, SowMeta } from '../components/sow'
import { CertChecklist, ManifestCompare, VersionHistory } from '../components/release'
import { Banner, Confirm, Empty, ErrorState, GateButton, Icon, Pane, Section, Skeleton, StageList, StatusPill, Time, fmtTime } from '../components/ui'

ModuleRegistry.registerModules([AllCommunityModule])

// One token set drives both themes: the grid reads the same CSS variables as the app.
export const gridTheme = themeQuartz.withParams({
  backgroundColor: 'var(--surface)', foregroundColor: 'var(--text)', headerBackgroundColor: 'var(--surface-2)',
  chromeBackgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', accentColor: 'var(--accent)',
  rowHoverColor: 'var(--hover)', selectedRowBackgroundColor: 'var(--accent-soft)', fontFamily: 'inherit',
  fontSize: 13, headerFontWeight: 600, spacing: 6, wrapperBorderRadius: 8, cellHorizontalPadding: 10,
})

type GroupRow = { kind: 'group'; id: string; agent: string; count: number; errors: number }
type DetailRow = { kind: 'detail'; id: string; skill: SkillRow }
type Row = GroupRow | DetailRow | (SkillRow & { kind: 'skill' })
interface Ctx {
  expanded: Set<string>; collapsed: Set<string>; showChanges: boolean; editable: boolean
  toggleRow: (id: string) => void; toggleGroup: (m: string) => void; save: (id: string, field: IsatvonField, value: string) => Promise<boolean>
  /** Unsaved row-editor values by skill id. Outside the cell so a grid refresh (which recreates the cell) never drops typing. */
  drafts: Record<string, Partial<Record<IsatvonField, string>>>
}
const editedFields = (r: SkillRow) => ISATVON.filter(c => r.fields[c.key] !== r.original[c.key])


function GroupCell({ data, context }: CustomCellRendererProps<Row, unknown, Ctx>) {
  const g = data as GroupRow
  const open = !context.collapsed.has(g.agent)
  return (
    <button className="group-row" aria-expanded={open} onClick={() => context.toggleGroup(g.agent)}>
      <span className={`chev ${open ? 'open' : ''}`}><Icon name="chevron" size={12} /></span>
      <span className="group-kicker">Agent</span>
      <strong>{g.agent}</strong>
      <span className="muted sm">{g.count} skill{g.count === 1 ? '' : 's'}</span>
      {g.errors > 0 && <StatusPill status="fail" text={`${g.errors} with errors`} />}
    </button>
  )
}

function SkillCell({ data, context }: CustomCellRendererProps<Row, unknown, Ctx>) {
  const r = data as SkillRow
  const open = context.expanded.has(r.id)
  const changed = editedFields(r)
  return (
    <div className="skill-cell">
      <button className="icon-btn sm" tabIndex={-1} aria-label={`${open ? 'Close' : 'Open'} the ISATVON editor for ${r.name}`} aria-expanded={open} onClick={() => context.toggleRow(r.id)}>
        <Icon name={open ? 'down' : 'chevron'} size={12} />
      </button>
      <div className="skill-name">
        <span>{r.name}</span>
        <span className="mono xs muted">{r.id}</span>
        {changed.length > 0 && <button className="row-changed" tabIndex={-1} onClick={() => context.toggleRow(r.id)}
          title={`Edited since extraction: ${changed.map(c => c.label).join(', ')}. Open the row to see before/after.`}>
          <Icon name="edit" size={10} />{changed.length} field{changed.length === 1 ? '' : 's'} edited</button>}
      </div>
      <button className="link xs" tabIndex={-1} onClick={() => setUi({ passage: r.passageId })} title={r.passageExcerpt}>
        <Icon name="link" size={11} />SOW
      </button>
    </div>
  )
}

function IsatvonCell({ data, colDef, context }: CustomCellRendererProps<Row, unknown, Ctx>) {
  const r = data as SkillRow
  const key = colDef!.colId as IsatvonField
  const value = r.fields[key]
  const edited = value !== r.original[key]
  const err = r.errors[key]
  return (
    <div className={`isatvon-cell ${context.expanded.has(r.id) ? 'open' : ''}`}>
      {key === 'notifications' && <StatusPill status={r.status === 'TEST_FAILED' ? 'fail' : r.status === 'PARSED' ? 'queued' : 'pass'} text={r.status} />}
      <span className="cell-text" title={edited ? `Extracted value: ${r.original[key] || '(empty)'}` : undefined}>
        {edited && context.showChanges ? <DiffText segs={diffWords(r.original[key], value)} /> : value || <em className="muted">empty</em>}
      </span>
      {((edited && !context.showChanges) || err) && (
        <span className="cell-marks">
          {edited && !context.showChanges && <span className="mark-edited" title={`Extracted value: ${r.original[key] || '(empty)'}`}><Icon name="edit" size={10} />edited</span>}
          {err && <span className="mark-error"><Icon name="alert" size={10} />{err}</span>}
        </span>
      )}
    </div>
  )
}

// Inline ISATVON editor: a full-width row under the skill with all seven fields and a before/after diff per edited field.
function DetailCell({ data, context }: CustomCellRendererProps<Row, unknown, Ctx>) {
  const r = (data as DetailRow).skill
  const [vals, setVals] = useState(() => ({ ...r.fields, ...context.drafts[r.id] }))
  const [saving, setSaving] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { setVals({ ...r.fields, ...context.drafts[r.id] }) }, [r.fields, context.drafts, r.id])
  const change = (k: IsatvonField, v: string) => { context.drafts[r.id] = { ...context.drafts[r.id], [k]: v }; setVals(x => ({ ...x, [k]: v })) }
  // Typing in the editor must not drive the grid's keyboard navigation (AG Grid listens on its own element).
  useEffect(() => {
    const el = box.current
    const stop = (e: KeyboardEvent) => { if (e.key !== 'Escape') e.stopPropagation() }
    el?.addEventListener('keydown', stop)
    return () => el?.removeEventListener('keydown', stop)
  }, [])
  const pending = ISATVON.filter(c => vals[c.key] !== r.fields[c.key])
  const apply = async () => {
    setSaving(true)
    for (const c of pending) {
      if (!(await context.save(r.id, c.key, vals[c.key]))) break
      const d = { ...context.drafts[r.id] }; delete d[c.key]; context.drafts[r.id] = d
    }
    setSaving(false)
  }
  return (
    <div ref={box} className="detail-editor" role="group" aria-label={`ISATVON editor for ${r.name}`}>
      <div className="de-head">
        <strong>{r.agent} › {r.name}</strong><span className="mono xs muted">{r.id}</span>
        <span className="muted xs">{editedFields(r).length ? `${editedFields(r).length} field(s) differ from the extracted values` : 'No edits since extraction'}</span>
        <button className="icon-btn sm" aria-label="Close editor" onClick={() => context.toggleRow(r.id)}><Icon name="x" size={12} /></button>
      </div>
      <div className="de-fields">
        {ISATVON.map(c => {
          const before = r.original[c.key], now = vals[c.key]
          return (
            <label key={c.key} className={`de-field ${r.errors[c.key] ? 'has-error' : ''} ${now !== before ? 'is-edited' : ''}`}>
              <span className="de-label"><span className="isatvon-letter">{c.letter}</span>{c.label}{now !== before && <span className="mark-edited"><Icon name="edit" size={10} />edited</span>}</span>
              {c.key === 'automation'
                ? <select value={now} disabled={!context.editable} onChange={e => change(c.key, e.target.value)}>
                    {!AUTOMATIONS.includes(now as never) && <option value={now}>{now || '(empty)'}</option>}
                    {AUTOMATIONS.map(a => <option key={a}>{a}</option>)}
                  </select>
                : <textarea rows={c.key === 'instructions' ? 3 : 2} value={now} readOnly={!context.editable} onChange={e => change(c.key, e.target.value)} />}
              {r.errors[c.key] && <span className="mark-error"><Icon name="alert" size={10} />{r.errors[c.key]}</span>}
              {now !== before && <span className="de-diff"><span className="muted xs">Extracted → current:</span> <DiffText segs={diffWords(before, now)} /></span>}
            </label>
          )
        })}
      </div>
      {context.editable && <div className="de-actions">
        <span className="muted xs">{pending.length ? `${pending.length} unsaved field change(s)` : 'Saved fields validate against the ISATVON contract.'}</span>
        <button className="btn btn-ghost sm" disabled={!pending.length || saving} onClick={() => { context.drafts[r.id] = {}; setVals(r.fields) }}>Discard</button>
        <button className="btn btn-primary sm" disabled={!pending.length || saving} onClick={() => void apply()}>{saving ? <Icon name="spinner" spin /> : <Icon name="check" />}Apply to draft</button>
      </div>}
    </div>
  )
}

export function DiffText({ segs }: { segs: Seg[] }) {
  return <>{segs.map((s, i) => s.kind === 'same' ? <span key={i}>{s.text}</span>
    : s.kind === 'removed' ? <del key={i} className="d-removed" title="Removed">{s.text}</del>
    : s.kind === 'added' ? <ins key={i} className="d-added" title="Added">{s.text}</ins>
    : <mark key={i} className="d-modified" title="Modified">{s.text}</mark>)}</>
}

// Inline cell editor with live change colours (like the 3.1 SOW editor): a highlight layer behind a transparent
// textarea colours added and modified words as you type; removed words are listed struck through under it.
// Joining the non-removed segments reproduces the text exactly (diffWords), so the layer lines up with the textarea.
function DiffCellEditor({ value, onValueChange, data, colDef, eventKey, context }: CustomCellEditorProps<Row, string, Ctx>) {
  const v = value ?? ''
  const orig = (data as SkillRow).original[colDef.colId as IsatvonField]
  const segs = context.showChanges ? diffWords(orig, v) : []
  const removed = segs.filter(s => s.kind === 'removed')
  const ta = useRef<HTMLTextAreaElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const t = ta.current!
    // Typing to start editing appends the key instead of wiping the cell; the cursor goes to the end.
    const start = eventKey?.length === 1 ? v + eventKey : v
    if (start !== v) onValueChange(start)
    t.focus(); t.setSelectionRange(start.length, start.length)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="diff-editor">
      <div className="diff-field">
        <div ref={layer} className="diff-layer" aria-hidden>
          {segs.length ? segs.map((s, i) => s.kind === 'removed' ? null : <span key={i} className={s.kind === 'same' ? undefined : `hl-${s.kind}`}>{s.text}</span>) : v}{'\n'}
        </div>
        <textarea ref={ta} value={v} aria-label={`Edit ${colDef.headerName}`} spellCheck
          onChange={e => onValueChange(e.target.value)}
          onScroll={e => { if (layer.current) layer.current.scrollTop = e.currentTarget.scrollTop }} />
      </div>
      {removed.length > 0 && <div className="diff-removed"><span className="muted">Removed:</span> {removed.map((s, i) => <del key={i} className="d-removed">{s.text}</del>)}</div>}
    </div>
  )
}
// Enter saves (grid default); Shift+Enter adds a line inside the editor.
const shiftEnterInEditor = (p: { editing: boolean; event: KeyboardEvent }) => p.editing && p.event.key === 'Enter' && p.event.shiftKey

// Grid options must be stable: the screen re-renders on every 1 s snapshot poll, and a new function or object here
// makes AG Grid redraw its rows, which cancels an open cell editor.
const DEFAULT_COL: ColDef<Row> = { resizable: true, sortable: false, wrapText: true, suppressMovable: true }
const getRowId = (p: { data: Row }) => p.data.id
const isFullWidthRow = (p: { rowNode: { data?: Row } }) => p.rowNode.data?.kind === 'group' || p.rowNode.data?.kind === 'detail'
const getRowHeight = (p: { data?: Row }) => (p.data?.kind === 'group' ? 40 : p.data?.kind === 'detail' ? 470 : undefined)
/** Inline editing keeps the existing text: put the cursor at the end instead of selecting (and replacing) everything. */
const cursorToEnd = () => requestAnimationFrame(() => {
  const el = document.activeElement
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) el.setSelectionRange(el.value.length, el.value.length)
})
const FullWidthCell = (p: CustomCellRendererProps<Row, unknown, Ctx>) => (p.data?.kind === 'detail' ? <DetailCell {...p} /> : <GroupCell {...p} />)

function SkillGrid({ rows, setRows, editable, showChanges, onLockedEdit }: { rows: SkillRow[]; setRows: (f: (r: SkillRow[]) => SkillRow[]) => void; editable: boolean; showChanges: boolean; onLockedEdit: () => void }) {
  const [expanded, setExpanded] = useState(new Set<string>())
  const [collapsed, setCollapsed] = useState(new Set<string>())
  const gridApi = useRef<GridApi<Row>>(null)
  const detailDrafts = useRef<Ctx['drafts']>({})
  const toggle = (set: Set<string>, id: string) => { const n = new Set(set); if (n.has(id)) n.delete(id); else n.add(id); return n }
  const context: Ctx = {
    expanded, collapsed, showChanges, editable,
    toggleRow: id => setExpanded(s => toggle(s, id)),
    toggleGroup: m => setCollapsed(s => toggle(s, m)),
    save: (id, field, value) => onEdit(id, field, value),
    drafts: detailDrafts.current,
  }

  const data: Row[] = useMemo(() => {
    const agents = [...new Set(rows.map(r => r.agent))]
    return agents.flatMap(m => {
      const agentSkills = rows.filter(r => r.agent === m)
      const group: GroupRow = { kind: 'group', id: `group:${m}`, agent: m, count: agentSkills.length, errors: agentSkills.filter(r => Object.keys(r.errors).length).length }
      return [group, ...(collapsed.has(m) ? [] : agentSkills.flatMap(r => [
        { ...r, kind: 'skill' as const },
        ...(expanded.has(r.id) ? [{ kind: 'detail' as const, id: `detail:${r.id}`, skill: r }] : []),
      ]))]
    })
  }, [rows, collapsed, expanded])

  // Errors and expand state live outside cell values, so AG Grid won't re-render cells on its own.
  useEffect(() => { gridApi.current?.refreshCells({ force: true }) }, [expanded, data, showChanges])

  const columns: ColDef<Row>[] = useMemo(() => [
    { colId: 'skill', headerName: 'Agent › Skill', pinned: 'left', width: 230, cellRenderer: SkillCell, autoHeight: true },
    ...ISATVON.map((c): ColDef<Row> => ({
      colId: c.key, headerName: `${c.letter} · ${c.label}`, headerTooltip: `${c.letter} = ${c.label}`, minWidth: c.key === 'instructions' ? 280 : c.key === 'automation' ? 240 : 200, flex: c.key === 'instructions' ? 2 : 1,
      editable: p => editable && p.data?.kind === 'skill',
      tooltipValueGetter: p => p.data?.kind === 'skill' ? p.data.fields[c.key] : undefined,
      valueGetter: p => p.data?.kind === 'skill' ? p.data.fields[c.key] : '',
      valueSetter: p => { if (p.data.kind !== 'skill') return false; p.data.fields = { ...p.data.fields, [c.key]: p.newValue ?? '' }; return true },
      cellRenderer: IsatvonCell, autoHeight: true,
      cellEditor: c.key === 'automation' ? 'agSelectCellEditor' : DiffCellEditor,
      suppressKeyboardEvent: c.key === 'automation' ? undefined : shiftEnterInEditor,
      // Inline editing: the editor opens inside the cell (double-click, Enter/F2 or just type); long fields get a textarea.
      cellEditorPopup: false,
      cellEditorParams: c.key === 'automation' ? { values: [...AUTOMATIONS] } : undefined,
      cellClassRules: {
        'cell-edited': p => p.data?.kind === 'skill' && p.data.fields[c.key] !== p.data.original[c.key],
        'cell-error': p => p.data?.kind === 'skill' && !!p.data.errors[c.key],
        'cell-editable': () => editable,
      },
    })),
  ], [editable])

  async function onEdit(id: string, field: IsatvonField, value: string) {
    try {
      const row = await api.updateSkillField(id, field, value)
      setRows(rs => rs.map(r => r.id === id ? row : r))
      return true
    } catch (e) {
      toast(`Edit not saved: ${(e as Error).message}`, 'error', '3.2')
      setRows(rs => [...rs]) // grid edited a copy; rebuilding from rows restores the saved value
      return false
    }
  }
  const jump = (key: string) => { gridApi.current?.ensureColumnVisible(key, 'start'); gridApi.current?.flashCells({ columns: [key] }) }

  function onKey(e: CellKeyDownEvent<Row> | FullWidthCellKeyDownEvent<Row>) {
    const ev = e.event as KeyboardEvent | undefined
    if (!ev || !e.data) return
    // A read-only grid says why instead of silently ignoring the edit attempt.
    if (!editable && e.data.kind === 'skill' && 'column' in e && e.column.getColId() !== 'skill' && (ev.key === 'Enter' || ev.key === 'F2' || ev.key.length === 1)) { onLockedEdit(); return }
    if (e.data.kind === 'group' && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); context.toggleGroup(e.data.agent) }
    if (e.data.kind === 'skill' && 'column' in e && e.column.getColId() === 'skill' && ev.key === 'Enter') {
      ev.preventDefault()
      if (ev.shiftKey) setUi({ passage: e.data.passageId }); else context.toggleRow(e.data.id)
    }
  }

  return (
    <>
    <div className="col-jump" role="toolbar" aria-label="Jump to an ISATVON column">
      <span className="muted xs">Columns</span>
      {ISATVON.map(c => <button key={c.key} className="col-chip" onClick={() => jump(c.key)} title={`Scroll to ${c.letter} · ${c.label}`}><strong>{c.letter}</strong> {c.label}</button>)}
      <span className="muted xs scroll-hint"><Icon name="chevron" size={10} />Scroll the grid sideways, or open a row for all seven fields</span>
    </div>
    <div className="grid-wrap">
      <AgGridReact<Row>
        theme={gridTheme} rowData={data} columnDefs={columns} context={context}
        getRowId={getRowId} isFullWidthRow={isFullWidthRow} fullWidthCellRenderer={FullWidthCell} getRowHeight={getRowHeight}
        tooltipShowDelay={400}
        defaultColDef={DEFAULT_COL}
        undoRedoCellEditing stopEditingWhenCellsLoseFocus enterNavigatesVerticallyAfterEdit
        onGridReady={e => { gridApi.current = e.api }}
        onCellKeyDown={onKey}
        onCellEditingStarted={cursorToEnd}
        onCellDoubleClicked={e => { if (!editable && e.data?.kind === 'skill' && e.colDef.colId !== 'skill') onLockedEdit() }}
        onCellValueChanged={e => { if (e.data.kind === 'skill' && e.oldValue !== e.newValue) void onEdit(e.data.id, e.colDef.colId as IsatvonField, String(e.newValue ?? '')) }}
      />
    </div>
    </>
  )
}

export function Center({ snap, info }: StepProps) {
  const { rows: fetched, error, isLoading, refetch } = useSkills(snap.skillsRevision)
  const [rows, setRows] = useState<SkillRow[]>([])
  const [confirm, setConfirm] = useState(false)
  const [reopen, setReopen] = useState(false)
  const lockedEdit = () => toast('3.2 is read-only because the workflow has moved on. Use “Reopen 3.2 to edit” above the grid.', 'info', '3.2')
  const [showChanges, setShowChanges] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { busy, run } = useAction()
  useEffect(() => { if (fetched) setRows(fetched) }, [fetched])
  // Edits against the extracted (model) values, counted the same way as the SOW.
  const cellCounts = rows.reduce((c, r) => {
    for (const col of ISATVON) if (r.fields[col.key] !== r.original[col.key]) addCounts(c, countSegs(diffWords(r.original[col.key], r.fields[col.key])))
    return c
  }, { added: 0, removed: 0, modified: 0 })
  const cellEdits = editCount(cellCounts)

  const extracting = snap.extraction.some(s => s.status === 'running' || s.status === 'queued')
  const failed = snap.extraction.find(s => s.status === 'failed')
  const withErrors = rows.filter(r => Object.keys(r.errors).length).length
  const editedCells = rows.reduce((n, r) => n + ISATVON.filter(c => r.fields[c.key] !== r.original[c.key]).length, 0)
  const agents = new Set(rows.map(r => r.agent)).size

  const reviewReason = !info.editable ? 'The grid is read-only' : extracting ? 'Extraction still running'
    : withErrors ? `Fix validation errors in ${withErrors} row${withErrors === 1 ? '' : 's'} first` : snap.gridReviewedAt ? `Reviewed ${fmtTime(snap.gridReviewedAt)}` : undefined
  const generateReason = !info.editable ? 'The grid is read-only' : !snap.gridReviewedAt ? 'Mark the grid reviewed first' : undefined

  let body
  if (failed) body = <ErrorState title={`${failed.label} failed`}>{failed.error}</ErrorState>
  else if (error) body = <ErrorState title="Could not load skills" action={<button className="btn btn-primary" onClick={() => refetch()}><Icon name="refresh" />Retry</button>}>{error.message}</ErrorState>
  else if (extracting || (isLoading && !rows.length)) body = <><Banner tone="info" icon="spinner">Extracting agents and their skills from the approved SOW. Rows appear when the spreadsheet update finishes.</Banner><Skeleton rows={8} label="Extracting skills" /></>
  else if (!rows.length) body = <Empty icon="file" title="No skills extracted">Skills come from the extraction run that starts when the SOW is approved in 3.1.</Empty>
  else body = <>
    <div className="editor-bar grid-bar">
      <label className="switch" title="Colour-code edits against the extracted values">
        <input type="checkbox" role="switch" checked={showChanges} onChange={e => setShowChanges(e.target.checked)} />
        <span className="switch-track" aria-hidden><span /></span>Changes
      </label>
      <span className={`edits-chip ${cellEdits ? 'has' : ''}`}>{cellEdits ? `${cellEdits} edit${cellEdits === 1 ? '' : 's'} since extraction` : 'No edits since extraction'}</span>
      {showChanges && <div className="diff-legend">
        <ins className="d-added">Added</ins><del className="d-removed">Removed</del><mark className="d-modified">Modified</mark>
        <span className="muted xs">Comparing extracted (model) → current{cellEdits ? ` · ${cellCounts.added} added, ${cellCounts.removed} removed, ${cellCounts.modified} modified` : ''}</span>
      </div>}
    </div>
    {!info.editable && info.state !== 'locked' && (
      <Banner tone="warn" icon="lock" action={snap.activeStep > 2 && <button className="btn btn-secondary sm" disabled={!!busy} onClick={() => setReopen(true)}><Icon name="edit" />Reopen 3.2 to edit</button>}>
        <strong>Read-only.</strong> Cells can't be edited because the workflow has moved past 3.2{snap.activeStep > 2 ? ` (now at ${['', '3.1', '3.2', '4.1', '4.4'][snap.activeStep]})` : ''}.
      </Banner>)}
    <SkillGrid rows={rows} setRows={setRows} editable={info.editable} showChanges={showChanges} onLockedEdit={lockedEdit} />
  </>

  return (
    <Pane id="center-title" kicker="3.2 · Skill review" title="ISATVON skill workbench" className={`center grid-pane ${isFullscreen ? 'is-fullscreen' : ''}`}
      actions={rows.length > 0 && <div className="stats" aria-label="Grid summary" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          className={`btn ${isFullscreen ? 'btn-primary' : 'btn-secondary'} xs`}
          onClick={() => setIsFullscreen(f => !f)}
          title="Toggle Fullscreen Grid View"
          style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}
        >
          <Icon name="expand" size={11} />
          <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
        <span><strong>{agents}</strong> agents</span><span><strong>{rows.length}</strong> skills</span>
        <span className={withErrors ? 'tone-err' : ''}><Icon name={withErrors ? 'alert' : 'check'} size={12} /><strong>{withErrors}</strong> with errors</span>
        <span><Icon name="edit" size={12} /><strong>{editedCells}</strong> edited cells</span>
      </div>}
      footer={<>
        <div className="foot-info">
          <span className="muted sm kbd-hint">Double-click a cell or start typing to edit in place · Tab/Enter saves · Esc cancels · Enter on Skill expands · Shift+Enter shows SOW passage · Ctrl+Z undoes</span>
        </div>
        <div className="row">
          <GateButton variant="secondary" reason={reviewReason} busy={busy === 'Mark reviewed'} icon="check"
            onClick={() => run('Mark reviewed', () => api.markGridReviewed(), { success: 'Grid marked reviewed.', step: 2 })}>Mark grid reviewed</GateButton>
          <GateButton action="generate" reason={generateReason} busy={busy === 'Generate contract'} successKey={snap.workflow?.runId} onClick={() => setConfirm(true)}>Generate ISATVON Contract</GateButton>
        </div>
      </>}>
      {snap.gridReviewedAt && info.editable && <Banner tone="ok" icon="check">Grid reviewed at {fmtTime(snap.gridReviewedAt)}. Any further edit clears the review.</Banner>}
      {body}
      <Confirm open={reopen} title="Reopen 3.2 ISATVON skills grid?" confirmLabel="Reopen 3.2" onClose={() => setReopen(false)}
        onConfirm={() => { setReopen(false); void run('Reopen', () => api.reopen(2), { success: '3.2 reopened: the grid is editable. 4.1–4.4 are marked stale.', step: 2 }) }}
        consequences={[
          'The grid becomes editable again; the grid review is cleared when you edit.',
          'Validation (4.1–4.3) and testing (4.4) are marked stale and must be re-run before deploying again.',
          'Whatever is deployed to Staging stays deployed until you deploy a new version.',
        ]} />
      <Confirm open={confirm} title="Generate ISATVON Contract?" confirmLabel="Start validation workflow" onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false)
          void run('Generate contract', () => api.generateContract(), { success: 'Temporal validation workflow started. It keeps running in the background.', step: 3 })
            .then(() => goStep(3))
        }}
        consequences={[
          `Starts a Temporal validation workflow for ${rows.length} skills across ${agents} agents, based on approved SOW v${snap.sow?.approval?.version}.`,
          'Runs A contract validation, B dependency check and C AST code generation; D retry/fallback runs only if C fails.',
          'The grid becomes read-only and 4.1 shows live activity status from Temporal.',
          'Nothing is written to BAM_db or deployed. That happens in 4.4.',
        ]} />
    </Pane>
  )
}

export function Left({ snap }: StepProps) {
  const passage = useUi(s => s.passage)
  const sow = snap.sow
  return (
    <Pane id="left-title" kicker="Context · read-only" title="Approved SOW"
      actions={sow?.approval && <StatusPill status="done" text={`v${sow.approval.version}`} />}>
      {!sow?.approval ? <Empty icon="lock" title="No approved SOW">Approve the SOW in 3.1 to see it here.</Empty> : <>
        <p className="muted sm">Approved <Time iso={sow.approval.at} /> by {sow.approval.by}. Select <strong>SOW</strong> on a skill row to jump to its passage.</p>
        <SowMeta sow={sow} compact />
        <ReadonlySow html={sow.html} highlight={passage} />
      </>}
    </Pane>
  )
}

// Evidence only: draft-vs-certified manifest, certification and version history; extraction is secondary.
export function Right({ snap }: StepProps) {
  const extracting = snap.extraction.some(s => s.status === 'running' || s.status === 'queued' || s.status === 'failed')
  return (
    <Pane id="right-title" kicker="Evidence and status" title="Manifest and certification">
      <Section title="Manifest diff · draft vs certified"><ManifestCompare snap={snap} /></Section>
      <Section title="Certification"><CertChecklist snap={snap} compact /></Section>
      <Section title="Versions" aside={<button className="link xs" onClick={() => goScreen('3.4')}>All in 3.4 →</button>}><VersionHistory snap={snap} limit={4} /></Section>
      <Section title="Review gate">
        <dl className="kv">
          <div><dt>SOW approval</dt><dd>{snap.sow?.approval ? <>v{snap.sow.approval.version} · <Time iso={snap.sow.approval.at} /></> : 'Not approved'}</dd></div>
          <div><dt>Grid review</dt><dd>{snap.gridReviewedAt ? <Time iso={snap.gridReviewedAt} prefix="Reviewed " /> : 'Not reviewed'}</dd></div>
          <div><dt>Contract</dt><dd>{snap.workflow ? <span className="mono xs">{snap.workflow.workflowId}</span> : 'Not generated'}</dd></div>
        </dl>
      </Section>
      <details className="accordion" open={extracting}>
        <summary><Icon name="clock" size={12} />Extraction activity<span className="muted xs">{snap.extraction.length ? `${snap.extraction.filter(s => s.status === 'succeeded').length}/${snap.extraction.length}` : 'not run'}</span></summary>
        {snap.extraction.length === 0
          ? <p className="muted sm">Starts when the SOW is approved: approval gate, dual-context parsing, agent / skill extraction, spreadsheet update. Extraction success is not certification.</p>
          : <StageList stages={snap.extraction} />}
      </details>
    </Pane>
  )
}
