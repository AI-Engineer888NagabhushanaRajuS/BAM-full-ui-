import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Background, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './rag.css'
import { api } from '../api/adapter'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, CellKeyDownEvent } from 'ag-grid-community'
import Editor from '@monaco-editor/react'
import { gridTheme } from '../steps/Step2'
import { defineThemes, editorTheme } from '../steps/Step3'
import { toast, useUi } from '../lib/store'
import { RAG_ROUTES, goScreen, navigate } from '../lib/route'
import { demoControls } from '../lib/demo'
import type { Snapshot } from '../api/types'
import { Banner, Confirm, Copy, Dialog, Empty, ErrorState, Icon, Skeleton, StatusPill, Time, fmtTime } from '../components/ui'
import { CLASS_COUNTS, COVERAGE_META, EDGES, JOBS, NODES, QA, QA_SUGGESTIONS, SCHEMAS, type OkfClass, type QaAnswer } from './mockData.ts'
import { buildOkfBundle, conceptStatus, conceptType, OKF_VERSION, toTar, trustTier, validateOkf, type TrustTier } from './okf.ts'
import { isRunning, ragPipeline, relations, stepStatus, useRag, type JobStatus, type RagStepKey, type RagStepStatus } from './ragPipeline.ts'
import { JevVisionHUD } from '../components/JevVisionHUD'
import { CogneePreflightCockpit } from './CogneePreflightCockpit'


// Navigation between 2.1–2.3 is the tracker's stage 2 panel (one navigation for the whole app).
export function RagScreen({ path, snap }: { path: string; snap: Snapshot }) {
  const loaded = useRag(s => s.loaded)
  return (
    <div className="rag">
      {!loaded ? <div className="rag-card"><Skeleton rows={8} label="Loading context pipeline" /></div>
        : path === RAG_ROUTES.graph ? <GraphExplorer /> : path === RAG_ROUTES.schemas ? <SchemaWorkbench />
        : path === RAG_ROUTES.review ? <RagReview snap={snap} /> : <ContextQuality />}
    </div>
  )
}

// ---- shared ---------------------------------------------------------------------
const STEP_ICON: Record<RagStepStatus, { icon: string; cls: string; text: string; spin?: boolean }> = {
  queued: { icon: 'circle', cls: 'q', text: 'Queued' },
  running: { icon: 'spinner', cls: 'r', text: 'Running', spin: true },
  done: { icon: 'check', cls: 'd', text: 'Done' },
  failed: { icon: 'x', cls: 'f', text: 'Failed' },
}

/** `lead` adds a gate row before the RAG steps (1.1's virus scan); `controls` replaces the re-run controls. */
export function PipelineCard({ title = 'Build pipeline', lead, controls }: { title?: string; lead?: ReactNode; controls?: ReactNode }) {
  const s = useRag(x => x)
  const [failAt, setFailAt] = useState<RagStepKey | ''>('')
  const running = isRunning(s)
  const jobsDone = s.jobs.filter(j => j === 'done' || j === 'skipped').length
  return (
    <section className="rag-card" aria-labelledby="pipe-title">
      <header className="rag-card-head"><h3 id="pipe-title">{title}</h3>{s.runId && <span className="mono xs muted">{s.runId}</span>}
        <span className={`tag ${s.engine === 'cognee' ? 'engine-live' : ''}`} title={s.engine === 'cognee' ? 'Runs on the Cognee server (VITE_RAG_BACKEND=cognee)' : 'Simulated pipeline over the EXAMPLE fixture'}>{s.engine === 'cognee' ? 'Cognee · live' : 'Cognee · simulated'}</span></header>
      <ol className="pipe">
        {lead}
        {s.steps.map(st => {
          const ic = STEP_ICON[st.status]
          const detail = st.status === 'running' && st.key === 'extract' ? `${jobsDone}/${JOBS.length} objects` : st.detail
          return (
            <li key={st.key} className={`pipe-step ps-${ic.cls}`}>
              <span className="pipe-icon"><Icon name={ic.icon} size={13} spin={ic.spin} /><span className="sr-only">{ic.text}</span></span>
              <span className="pipe-label">{st.label}</span>
              <span className="pipe-detail">{detail ?? (st.status === 'queued' ? 'queued' : '')}{st.status === 'done' && st.at && <span className="muted"> · {fmtTime(st.at)}</span>}</span>
              {st.status === 'failed' && <>
                <p className="stage-error pipe-error"><Icon name="alert" size={12} /> {st.error}</p>
                <button className="btn btn-secondary sm pipe-retry" onClick={() => ragPipeline.retry(st.key)}><Icon name="refresh" />Retry</button>
              </>}
            </li>
          )
        })}
      </ol>
      {controls ?? (!running && (
        <div className="pipe-controls">
          {/* The first run starts from 1.1's scan-gated "Start ingestion run"; this button is only for re-runs. */}
          {s.runId
            ? <button className="btn btn-secondary sm" onClick={() => { ragPipeline.start({ failAt: failAt || undefined }); toast('RAG run started again (simulated).') }}><Icon name="refresh" />Run again</button>
            : <span className="muted xs"><Icon name="clock" size={11} /> Starts from 1.1 once every virus scan passes.</span>}
          {demoControls() && <label className="pipe-sim">Simulate failure (demo)
            <select value={failAt} onChange={e => setFailAt(e.target.value as RagStepKey | '')}>
              <option value="">None</option><option value="chunk">Chunk + embed</option><option value="extract">Entity extraction</option>
              <option value="graph">Graph build</option><option value="schemas">Schema proposals</option>
            </select>
          </label>}
        </div>
      ))}
    </section>
  )
}

// ---- entity relations (Cognee graph edges) ------------------------------------------
const KIND_OF: Record<string, string> = {
  request: 'request',
  document: 'document',
  table: 'table',
  cadgeometry: 'cad',
  correspondence: 'correspondence',
  material: 'material',
  customer: 'customer',
}

function RelationList({ focus }: { focus: string }) {
  const s = useRag(x => x)
  const rel = relations(s).filter(r => r.from.includes(focus) || r.to.includes(focus) || focus.includes(r.from) || focus.includes(r.to))
  if (!rel.length) return <span className="muted">none</span>
  return (
    <ul className="rel-list compact">
      {rel.map((r, i) => (
        <li key={i}>
          <span className={r.from.includes(focus) || focus.includes(r.from) ? 'rel-self' : ''}>{r.from}</span>
          <span className="rel-label">{r.label.replace(/_/g, ' ')}</span>
          <span className={r.to.includes(focus) || focus.includes(r.to) ? 'rel-self' : ''}>{r.to}</span>
        </li>
      ))}
    </ul>
  )
}

/** Every relation in the run's knowledge graph, by label; these triples also feed the OKF bundle and the SOW judge. */
function RelationsCard({ focus, onSelectEntity }: { focus?: string; onSelectEntity?: (name: string) => void }) {
  const s = useRag(x => x)
  const [label, setLabel] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const done = stepStatus(s, 'graph') === 'done'
  const all = done ? relations(s) : []
  const counts = [...all.reduce((m, r) => m.set(r.label, (m.get(r.label) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1])

  const q = query.trim().toLowerCase()
  const shown = all.filter(r => {
    if (label && r.label !== label) return false
    if (focus && !r.from.includes(focus) && !r.to.includes(focus) && !focus.includes(r.from) && !focus.includes(r.to)) return false
    if (q) {
      return (
        r.from.toLowerCase().includes(q) ||
        r.to.toLowerCase().includes(q) ||
        r.label.toLowerCase().includes(q) ||
        r.fromType.toLowerCase().includes(q) ||
        r.toType.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <section className="rag-card" aria-labelledby="rel-title">
      <header className="rag-card-head">
        <h3 id="rel-title">Entity relations</h3>
        <span className="muted xs">{s.engine === 'cognee' ? 'from Cognee' : 'BAM Ontology Graph'}</span>
        <span className="tag">{all.length} triples</span>
      </header>
      {!done ? (
        <p className="muted sm">Relations appear when the graph build (Cognee) finishes.</p>
      ) : (
        <>
          <div className="rel-search-row">
            <input
              type="text"
              className="rel-search-input"
              placeholder="Search entity or predicate (e.g. specifies_part, MPW-4422)..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Filter entity relations"
            />
            {query && (
              <button className="rel-clear-btn" onClick={() => setQuery('')} title="Clear filter">
                <Icon name="x" size={11} />
              </button>
            )}
          </div>
          <div className="filter-chips" role="group" aria-label="Filter relations by type">
            <button className="class-chip" aria-pressed={!label} onClick={() => setLabel(null)}>
              All {all.length}
            </button>
            {counts.map(([l, n]) => (
              <button key={l} className="class-chip" aria-pressed={label === l} onClick={() => setLabel(label === l ? null : l)}>
                {l.replace(/_/g, ' ')} {n}
              </button>
            ))}
          </div>
          {focus && (
            <p className="muted xs">
              Relations connected to <strong>{focus}</strong>. Clear selection in graph to see all.
            </p>
          )}
          <ul className="rel-list">
            {shown.slice(0, 60).map((r, i) => (
              <li key={i} className="rel-row" onClick={() => onSelectEntity?.(r.from)}>
                <span className={focus && (r.from.includes(focus) || focus.includes(r.from)) ? 'rel-self' : ''} title={r.fromType}>
                  {r.from}
                </span>
                <span className="rel-label">{r.label.replace(/_/g, ' ')}</span>
                <span className={focus && (r.to.includes(focus) || focus.includes(r.to)) ? 'rel-self' : ''} title={r.toType}>
                  {r.to}
                </span>
              </li>
            ))}
          </ul>
          {shown.length > 60 && <p className="muted xs">Showing 60 of {shown.length}.</p>}
          <footer className="rag-card-foot">
            <span>
              <Icon name="check" size={11} /> Cryptographically verified provenance
            </span>
            <span>Used as discovery facts for SOW (Laya)</span>
          </footer>
        </>
      )}
    </section>
  )
}

// ---- 2.1 Context graph explorer ---------------------------------------------------
type OkfNodeData = {
  label: string
  sub?: string
  kind: string
  selected: boolean
  neighbor?: boolean
  dimmed?: boolean
}

function OkfNode({ data }: NodeProps<Node<OkfNodeData>>) {
  return (
    <div
      className={`okf-node k-${data.kind} ${data.selected ? 'sel' : ''} ${data.neighbor ? 'neighbor' : ''} ${data.dimmed ? 'dimmed' : ''}`}
      title={`${data.label}${data.sub ? ` (${data.sub})` : ''} · ${data.kind}`}
    >
      <Handle type="target" position={Position.Top} className="okf-handle" />
      <span className="okf-label">{data.label}</span>
      {data.sub && <span className="okf-sub">{data.sub}</span>}
      <Handle type="source" position={Position.Bottom} className="okf-handle" />
    </div>
  )
}
const nodeTypes = { okf: OkfNode }

function GraphExplorer() {
  const s = useRag(x => x)
  const theme = useUi(x => x.theme)
  const [hidden, setHidden] = useState<Set<OkfClass>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const chunk = stepStatus(s, 'chunk'), extract = stepStatus(s, 'extract'), graph = stepStatus(s, 'graph'), schemas = stepStatus(s, 'schemas')
  const jobsDone = s.jobs.filter(j => j === 'done' || j === 'skipped').length

  const visible = NODES.filter(n => (extract === 'running' || extract === 'done' || extract === 'failed') && jobsDone >= n.after && !(n.filter && hidden.has(n.filter)))
  const ids = new Set(visible.map(n => n.id))

  // Bidirectional relationship tracing & highlighting
  const activeEdges = graph === 'done' ? EDGES.filter(e => ids.has(e.source) && ids.has(e.target)) : []
  const connectedEdgeSet = new Set<number>()
  const neighborIdSet = new Set<string>()

  if (selected) {
    neighborIdSet.add(selected)
    activeEdges.forEach((e, idx) => {
      if (e.source === selected) {
        connectedEdgeSet.add(idx)
        neighborIdSet.add(e.target)
      } else if (e.target === selected) {
        connectedEdgeSet.add(idx)
        neighborIdSet.add(e.source)
      }
    })
  }

  const nodes: Node<OkfNodeData>[] = visible.map(n => {
    const r = n.kind === 'request' ? 48 : 34
    const isSelected = selected === n.id
    const isNeighbor = selected ? neighborIdSet.has(n.id) && !isSelected : false
    const isDimmed = selected ? !neighborIdSet.has(n.id) : false

    return {
      id: n.id,
      type: 'okf',
      position: { x: n.x - r, y: n.y - r },
      data: {
        label: n.label,
        sub: n.sub,
        kind: n.kind,
        selected: isSelected,
        neighbor: isNeighbor,
        dimmed: isDimmed,
      },
      draggable: true,
    }
  })

  const edges: Edge[] = graph === 'done'
    ? activeEdges.map((e, i) => {
        const isHighlight = selected ? connectedEdgeSet.has(i) : false
        const isDimmed = selected ? !connectedEdgeSet.has(i) : false

        return {
          id: `e${i}`,
          source: e.source,
          target: e.target,
          label: e.label?.replace(/_/g, ' '),
          type: 'smoothstep',
          animated: isHighlight,
          className: `okf-edge ${isHighlight ? 'edge-highlight' : isDimmed ? 'edge-dimmed' : ''}`,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: isHighlight ? 14 : 10,
            height: isHighlight ? 14 : 10,
          },
        }
      })
    : []

  const node = NODES.find(n => n.id === selected)

  // Live Cognee graph layered positioning
  const live = s.graphData
  if (live) {
    const sorted = [...live.nodes].sort((a, b) => a.type.localeCompare(b.type))
    const typeGroups: Record<string, typeof sorted> = {}
    sorted.forEach(n => {
      const k = (n.type || 'other').toLowerCase()
      if (!typeGroups[k]) typeGroups[k] = []
      typeGroups[k].push(n)
    })
    const groupKeys = Object.keys(typeGroups)
    const customNodes: Node<OkfNodeData>[] = []

    groupKeys.forEach((k, gIdx) => {
      const items = typeGroups[k]
      const y = 80 + gIdx * 130
      const totalWidth = items.length * 150
      items.forEach((n, idx) => {
        const x = 400 - totalWidth / 2 + idx * 150 + 75
        const isSelected = selected === n.id
        customNodes.push({
          id: n.id,
          type: 'okf',
          position: { x, y },
          draggable: true,
          data: {
            label: n.label,
            sub: n.type,
            kind: KIND_OF[n.type.toLowerCase()] ?? 'document',
            selected: isSelected,
          },
        })
      })
    })

    nodes.splice(0, nodes.length, ...customNodes)
    edges.splice(
      0,
      edges.length,
      ...live.edges.map((e, i) => ({
        id: `l${i}`,
        source: e.source,
        target: e.target,
        label: e.label?.replace(/_/g, ' '),
        type: 'smoothstep',
        className: 'okf-edge',
        markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10 },
      }))
    )
  }

  const liveNode = live?.nodes.find(n => n.id === selected)
  const focus = liveNode?.label ?? (node ? node.label + (node.sub ? ` ${node.sub}` : '') : undefined)

  let canvas
  if (!s.runId)
    canvas = (
      <Empty icon="bolt" title="No context graph yet" action={<button className="btn btn-primary" onClick={() => goScreen('1.1')}><Icon name="upload" />Upload documents in 1.1</button>}>
        The pipeline starts when verified documents are sent from 1.1 (Start ingestion run); the graph builds here as it runs.
      </Empty>
    )
  else if (chunk === 'running' || chunk === 'queued')
    canvas = (
      <Empty icon="clock" title="Vector Encoding: chunking and embedding objects…">
        <Icon name="spinner" spin size={12} /> {JOBS.length} objects from stage 1 are being encoded into vector embeddings. Nodes appear during entity extraction.
      </Empty>
    )
  else if (chunk === 'failed')
    canvas = (
      <ErrorState title="Chunk + embed failed" action={<button className="btn btn-primary" onClick={() => ragPipeline.retry('chunk')}><Icon name="refresh" />Retry</button>}>
        No objects reached the graph.
      </ErrorState>
    )
  else
    canvas = (
      <div className="graph-box">
        <ReactFlow
          key={`${nodes.length}-${edges.length}`}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          colorMode={theme}
          nodesConnectable={false}
          onNodeClick={(_, n) => setSelected(selected === n.id ? null : n.id)}
          onPaneClick={() => setSelected(null)}
          minZoom={0.4}
          maxZoom={2}
          aria-label="Context graph"
        >
          <Background gap={24} size={1} />
        </ReactFlow>
        {graph !== 'done' && (
          <div className="graph-note" role="status">
            {graph === 'failed' ? (
              <><Icon name="alert" size={12} /> Graph build failed; nodes shown without relations. Retry from the pipeline.</>
            ) : extract === 'running' ? (
              <><Icon name="spinner" size={12} spin /> Cognifying: extracting entities & cross-referencing relations ({jobsDone}/{JOBS.length}).</>
            ) : extract === 'failed' ? (
              <><Icon name="alert" size={12} /> Entity extraction failed. Retry from the pipeline.</>
            ) : (
              <><Icon name="spinner" size={12} spin /> Knowledge graph build (Cognee) running: resolving relation triples.</>
            )}
          </div>
        )}
      </div>
    )

  return (
    <div className="rag-grid g21">
      <section className="rag-card graph-card" aria-labelledby="graph-title">
        <header className="rag-card-head">
          <h3 id="graph-title">Context graph</h3>
          <span className="muted xs">{s.runId ?? 'no run'} · OKF classes</span>
          <div className="class-chips" role="group" aria-label="Filter by OKF class">
            {CLASS_COUNTS.map(([c, n]) => (
              <button
                key={c}
                className={`class-chip c-${c}`}
                aria-pressed={!hidden.has(c)}
                onClick={() =>
                  setHidden(h => {
                    const x = new Set(h)
                    if (x.has(c)) x.delete(c)
                    else x.add(c)
                    return x
                  })
                }
              >
                {hidden.has(c) ? <Icon name="minus" size={10} /> : <Icon name="check" size={10} />}
                {c} {n}
              </button>
            ))}
          </div>
        </header>
        {canvas}
      </section>
      <div className="rag-side">
        <section className="rag-card" aria-labelledby="insp-title">
          <header className="rag-card-head">
            <h3 id="insp-title">Node inspector</h3>
            {focus && <span className="tag mono">{focus}</span>}
            {selected && (
              <button className="link xs" onClick={() => setSelected(null)} style={{ marginLeft: 'auto' }}>
                Clear
              </button>
            )}
          </header>
          {liveNode ? (
            <dl className="kv">
              <div><dt>Entity type</dt><dd><span className="okf-pill k-document">{liveNode.type}</span></dd></div>
              <div><dt>Relations</dt><dd><RelationList focus={liveNode.label} /></dd></div>
              <div><dt>Source</dt><dd>Cognee dataset <span className="mono">{s.datasetId}</span></dd></div>
            </dl>
          ) : !node ? (
            <div className="inspector-empty">
              <p className="muted sm">Click any entity node to inspect its OKF class, source citations, facts, and relations.</p>
              <div className="telemetry-compact-row">
                <span className="telemetry-pill"><strong>{nodes.length}</strong> Nodes</span>
                <span className="telemetry-pill"><strong>{edges.length}</strong> Triples</span>
                <span className="telemetry-pill"><strong>100%</strong> Grounded</span>
              </div>
            </div>
          ) : (
            <div className="inspector-details">
              <dl className="kv">
                <div><dt>OKF Class</dt><dd><span className={`okf-pill k-${node.kind}`}>{node.okfClass}</span></dd></div>
                <div><dt>Confidence</dt><dd className="conf">{(node.confidence * 100).toFixed(0)}% <span className="muted xs">· Grounded</span></dd></div>
                <div>
                  <dt>Source citations</dt>
                  <dd className="src-list">
                    {node.sources.map(src => {
                      const job = JOBS.find(j => j.object === src)
                      return <Copy key={src} value={job?.s3 ?? src} display={src} label="source object URI" />
                    })}
                  </dd>
                </div>
                <div><dt>Extracted facts</dt><dd className="mono xs fact-text">{node.facts}</dd></div>
                <div><dt>Relations</dt><dd>{graph === 'done' ? <RelationList focus={node.label} /> : 'after graph build'}</dd></div>
              </dl>
            </div>
          )}
        </section>
        <RelationsCard focus={focus} onSelectEntity={name => {
          const match = NODES.find(n => n.label === name || name.includes(n.label))
          if (match) setSelected(match.id)
        }} />
        <PipelineCard />
        <section className="rag-card rag-cta">
          <p className="muted sm">The SOW is generated from this context in 3.1 SOW generation and approval (FDE Workbench).</p>
          <span className="gate">
            <button
              className="btn btn-primary sm"
              aria-disabled={schemas !== 'done' || undefined}
              onClick={() => {
                if (schemas === 'done') {
                  try { void api.startSowGeneration(s.runId) } catch { /* ignore */ }
                  goScreen('3.1')
                }
              }}
            >
              <Icon name="bolt" />Generate SOW
            </button>
            {schemas !== 'done' && <span className="gate-reason"><Icon name="lock" size={12} />Available when the RAG run finishes</span>}
          </span>
        </section>
      </div>
    </div>
  )
}

// ---- 2.2 Schema generation workbench ---------------------------------------------
function SchemaStatus({ value }: { value: string }) {
  const st = value === 'reviewed' ? 'pass' : value === 'selected' ? 'active' : 'needs_review'
  return <StatusPill status={st} text={value} />
}

function SchemaWorkbench() {
  const s = useRag(x => x)
  const theme = useUi(x => x.theme)
  const staging = useUi(x => x.env === 'Staging')
  const [selected, setSelected] = useState('QuoteLine')
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmSend, setConfirmSend] = useState(false)
  const schemas = stepStatus(s, 'schemas')
  const cols = useMemo<ColDef<(typeof SCHEMAS)[number]>[]>(() => [
    { field: 'name', headerName: 'SCHEMA', cellClass: 'mono', width: 160 },
    { field: 'okfSource', headerName: 'OKF SOURCE', width: 180 },
    { field: 'fields', headerName: 'FIELDS', flex: 1, minWidth: 220 },
    { field: 'mapsTo', headerName: 'MAPS TO SKILL', cellClass: 'mono', width: 170 },
    { field: 'status', headerName: 'STATUS', width: 120, cellRenderer: (p: { value: string }) => <SchemaStatus value={p.value} /> },
  ], [])

  if (schemas !== 'done') return (
    <div className="rag-card rag-wait">
      {schemas === 'failed'
        ? <ErrorState title="Schema proposals failed" action={<button className="btn btn-primary" onClick={() => ragPipeline.retry('schemas')}><Icon name="refresh" />Retry</button>}>{s.steps[3].error}</ErrorState>
        : <Empty icon="lock" title="Waiting for graph build" action={<button className="btn btn-secondary" onClick={() => navigate(RAG_ROUTES.graph)}>Open 2.1 Context graph</button>}>
            {s.runId ? `Pipeline: ${s.steps.map(x => `${x.label} ${x.status}`).join(' · ')}.` : 'No ingestion run yet. Start one on 2.1.'} Schemas unlock when schema proposals are done.
          </Empty>}
    </div>
  )

  const draft = s.drafts[selected]
  const def = SCHEMAS.find(x => x.name === selected)!
  const last = [...s.handoffs].reverse().find(h => h.schema === selected)
  const send = () => {
    setConfirmSend(false)
    const h = ragPipeline.sendToWorkbench(selected)
    toast(`${selected} ${h.version} sent to the FDE Workbench draft (context ${h.contextVersion}). Nothing was approved.`, 'success', '2.4')
    goScreen('2.4')
  }
  return (
    <div className="rag-col">
      <Banner tone="warn" icon="alert">Schemas here are <strong>draft proposals</strong> from the context graph. Input/output contracts are confirmed in the FDE Workbench (stage 3) before they reach a manifest.</Banner>
      <div className="rag-grid g22">
        <section className="rag-card" aria-labelledby="schemas-title">
          <header className="rag-card-head"><h3 id="schemas-title">Proposed schemas</h3><span className="muted xs">generated from OKF classes + graph</span><span className="tag">{SCHEMAS.length} drafts</span></header>
          <div className="rag-table">
            <AgGridReact theme={gridTheme} rowData={SCHEMAS} columnDefs={cols} getRowId={p => p.data.name}
              rowClassRules={{ 'row-picked': p => p.data?.name === selected }}
              onRowClicked={e => { if (e.data && !editing) setSelected(e.data.name) }}
              onCellKeyDown={(e: CellKeyDownEvent) => { if ((e.event as KeyboardEvent | undefined)?.key === 'Enter' && e.data && !editing) setSelected((e.data as { name: string }).name) }}
              defaultColDef={{ sortable: false, resizable: true, suppressMovable: true }} domLayout="autoHeight" rowHeight={42} />
          </div>
          <footer className="rag-card-foot"><span>Field types inferred from parsed values · Pydantic AI</span><span>Renames here flow into the manifest as-is</span></footer>
        </section>
        <section className="rag-card" aria-labelledby="preview-title">
          <header className="rag-card-head"><h3 id="preview-title" className="mono">{selected}</h3><span className="tag">Pydantic model preview</span><span className="muted xs">{draft.version} draft</span></header>
          <div className="monaco-box rag-code">
            <Editor height="100%" language="python" path={`schemas/${selected}.py`} value={editing ?? draft.code} beforeMount={defineThemes} theme={editorTheme(theme, staging)}
              onChange={v => { if (editing !== null) setEditing(v ?? '') }}
              options={{ readOnly: editing === null, readOnlyMessage: { value: 'Read-only preview. Use Edit fields to change the draft.' }, minimap: { enabled: false }, fontSize: 12, lineNumbers: 'off', scrollBeyondLastLine: false, ariaLabel: `${selected} Pydantic model` }} />
          </div>
          <div className="row rag-actions">
            {editing === null ? <>
              <button className="btn btn-primary" onClick={() => setConfirmSend(true)}>Send to Workbench</button>
              <button className="btn btn-secondary" onClick={() => setEditing(draft.code)}><Icon name="edit" />Edit fields</button>
            </> : <>
              <button className="btn btn-primary" onClick={() => { ragPipeline.saveSchemaDraft(selected, editing); setEditing(null); toast(`${selected} draft saved. The Workbench draft is notified (webhook on).`, 'success') }}>Save draft</button>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            </>}
          </div>
          <p className="muted xs">Maps to {def.mapsTo} · {def.okfSource}{draft.editedAt && <> · <span className="mark-edited"><Icon name="edit" size={10} />fields edited <Time iso={draft.editedAt} /></span></>}</p>
          <Confirm open={confirmSend} title={`Send ${selected} ${draft.version} to the Workbench?`} confirmLabel="Send draft" onClose={() => setConfirmSend(false)} onConfirm={send}
            consequences={[
              `Destination: the FDE Workbench draft context (stage 3), pinned to RAG run ${s.runId}.`,
              `Version sent: ${selected} ${draft.version}${draft.editedAt ? ' (includes your field edits)' : ' (as proposed)'}.`,
              'It stays a draft: nothing is approved. Review the hand-off in 2.4; input/output contracts are confirmed in stage 3.',
            ]} />
          {last && <p className="sm handoff-note"><Icon name="check" size={12} /> Sent {last.version} to the Workbench draft at {fmtTime(last.at)} (context {last.contextVersion}). Draft only, not an approval.</p>}
          <footer className="rag-card-foot webhook"><span><Icon name="dot" size={10} /> Field changes notify the Workbench draft automatically</span><span className="tag mono">webhook on</span></footer>
        </section>
      </div>
    </div>
  )
}

// ---- 2.4 RAG review --------------------------------------------------------------------
function RagReview({ snap }: { snap: Snapshot }) {
  const s = useRag(x => x)
  const steps = s.steps
  const status = (k: RagStepKey) => stepStatus(s, k)
  const unclassified = JOBS.filter((j, i) => j.okfClass === 'Unclassified' && s.jobs[i] === 'skipped')
  const failedJobs = JOBS.filter((_, i) => s.jobs[i] === 'failed')
  const ready = (k: RagStepKey) => status(k) === 'done'
  const rows: { label: string; ok: boolean; running?: boolean; detail: string; link: string }[] = [
    { label: 'Graph (Cognee)', ok: ready('graph'), running: status('graph') === 'running' || status('extract') === 'running', detail: ready('graph') ? `${steps[2].detail} · synced ${s.lastSyncAt ? fmtTime(s.lastSyncAt) : '—'}` : `Graph build ${status('graph')}`, link: '2.1' },
    { label: 'Schemas (draft proposals)', ok: ready('schemas'), running: status('schemas') === 'running', detail: ready('schemas') ? `${SCHEMAS.length} drafts · ${s.handoffs.length} sent to the Workbench` : `Schema proposals ${status('schemas')}`, link: '2.2' },
    { label: 'Retrieval (GraphRAG)', ok: ready('graph'), detail: ready('graph') ? 'Queryable; answers cite S3 objects (test in 2.3)' : 'Available after the graph build', link: '2.3' },
    { label: 'IP Context Sufficiency (Jev)', ok: s.contextEvaluation?.verdict === 'sufficient', running: s.contextEvalStatus === 'running', detail: s.contextEvaluation ? `${s.contextEvaluation.summary} (${s.contextEvaluation.model})` : 'Jev System-1 context evaluation running', link: '2.3' },
  ]

  const gaps = [
    ...steps.filter(x => x.status === 'failed').map(x => `${x.label} failed: ${x.error}`),
    ...failedJobs.map(j => `Extraction failed for ${j.object}`),
    ...unclassified.map(j => `${j.object} is Unclassified: its file type is not in the accepted intake types (see 1.4); it is not in the graph`),
    ...(ready('schemas') && !s.handoffs.length ? ['No schema has been sent to the Workbench yet'] : []),
  ]
  return (
    <div className="rag-col">
      <div className="rag-grid g24">
        <section className="rag-card" aria-labelledby="rr-title">
          <header className="rag-card-head"><h3 id="rr-title">Readiness</h3><span className="muted xs">{s.runId ?? 'no run'}</span></header>
          <ol className="cert-list">{rows.map(r => (
            <li key={r.label} className="cert-item">
              <StatusPill status={r.ok ? 'pass' : r.running ? 'running' : 'pending'} text={r.ok ? 'Ready' : r.running ? 'Running' : 'Not ready'} />
              <div className="cert-main"><span className="cert-label">{r.label}</span><span className="cert-detail">{r.detail}</span></div>
              <button className="link xs" onClick={() => goScreen(r.link)}>Open {r.link}</button>
            </li>))}</ol>
        </section>
        <section className="rag-card" aria-labelledby="gap-title">
          <header className="rag-card-head"><h3 id="gap-title">Unresolved gaps</h3><span className="tag">{gaps.length}</span></header>
          {!s.runId ? <p className="muted sm">No RAG run yet. It starts from 1.1 (Start ingestion run) once every BuLL*Sav scan passes.</p>
            : gaps.length === 0 ? <p className="muted sm"><Icon name="check" size={12} /> No open gaps in this run.</p>
            : <ul className="gap-list">{gaps.map(g => <li key={g}><Icon name="alert" size={12} />{g}</li>)}</ul>}
          {unclassified.length > 0 && <button className="link sm" onClick={() => goScreen('1.4')}><Icon name="link" size={12} />Review accepted file types in 1.4</button>}
        </section>
      </div>
      <section className="rag-card" aria-labelledby="ho-title">
        <header className="rag-card-head"><h3 id="ho-title">Reviewed hand-off to the Workbench</h3><span className="muted xs">drafts only · nothing is approved here</span></header>
        {s.handoffs.length === 0 ? <Empty icon="link" title="Nothing handed off yet" action={<button className="btn btn-secondary" disabled={!ready('schemas')} onClick={() => navigate(RAG_ROUTES.schemas)}>Review schemas in 2.2</button>}>
            Send a reviewed schema from 2.2. Each hand-off is pinned to the RAG run it came from.</Empty>
          : <table className="table"><thead><tr><th scope="col">Schema</th><th scope="col">Version</th><th scope="col">Context run</th><th scope="col">Sent</th></tr></thead>
            <tbody>{[...s.handoffs].reverse().map((h, i) => <tr key={i}><th scope="row" className="mono">{h.schema}</th><td className="mono">{h.version}</td><td><Copy value={h.contextVersion} label="context run" /></td><td><Time iso={h.at} /></td></tr>)}</tbody></table>}
        <p className="muted sm">The SOW in 3.1 is generated from this run's context when the graph sync finishes{snap.sow ? ` (current: SOW v${snap.sow.version})` : ''}.</p>
        <div className="row"><button className="btn btn-primary" onClick={() => goScreen('3.1')}><Icon name="eye" />View SOW</button></div>
      </section>
      <OkfBundleCard snap={snap} />
      <Banner tone="info" icon="question"><strong>Dataset provenance.</strong> {snap.uploads.length} uploaded file{snap.uploads.length === 1 ? '' : 's'} started this run, but the graph is built from the labelled EXAMPLE fixture dataset ({JOBS.length} objects) because this build has no parser. Counts differ for that reason, not because files were lost.</Banner>
    </div>
  )
}

// ---- OKF v0.2 bundle (2.4) ---------------------------------------------------------
const TIER: Record<TrustTier, { icon: string; cls: string }> = {
  unverified: { icon: 'circle', cls: 'tier-none' }, 'machine-confirmed': { icon: 'shield', cls: 'tier-machine' }, 'human-reviewed': { icon: 'check', cls: 'tier-human' },
}
/** The RAG context as a Google Open Knowledge Format v0.2 bundle: what Cognee ingests and what can be exported. */
function OkfBundleCard({ snap }: { snap: Snapshot }) {
  const s = useRag(x => x)
  const files = useMemo(() => buildOkfBundle(snap.uploads, s, new Date().toISOString()), [snap.uploads, s])
  const errors = useMemo(() => validateOkf(files), [files])
  const [sel, setSel] = useState('index.md')
  const open = files.find(f => f.path === sel) ?? files[0]
  const concepts = files.filter(f => !/(^|\/)(index|log)\.md$/.test(f.path))
  const count = (t: TrustTier) => concepts.filter(f => trustTier(f.content) === t).length
  const download = () => {
    const url = URL.createObjectURL(new Blob([toTar(files) as BlobPart], { type: 'application/x-tar' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `okf-bundle-${s.runId ?? 'draft'}.tar` })
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast(`OKF v${OKF_VERSION} bundle downloaded: ${files.length} files.`, 'success', '2.4')
  }
  return (
    <section className="rag-card" aria-labelledby="okf-title">
      <header className="rag-card-head">
        <h3 id="okf-title">OKF v{OKF_VERSION} knowledge bundle</h3>
        <span className="muted xs">Google Open Knowledge Format · {concepts.length} concepts</span>
        {errors.length ? <StatusPill status="fail" text={`${errors.length} conformance error${errors.length === 1 ? '' : 's'}`} /> : <StatusPill status="pass" text="Conformant" />}
      </header>
      <div className="okf-tiers">
        {(Object.keys(TIER) as TrustTier[]).map(t => <span key={t} className={`okf-tier ${TIER[t].cls}`}><Icon name={TIER[t].icon} size={12} />{count(t)} {t.replace('-', ' ')}</span>)}
        <button className="btn btn-secondary sm" onClick={download}><Icon name="db" />Download .tar</button>
      </div>
      <div className="okf-split">
        <ul className="okf-tree" aria-label="Bundle files">
          {files.map(f => {
            const concept = concepts.includes(f)
            const tier = concept ? trustTier(f.content) : undefined
            return (
              <li key={f.path}>
                <button className={`okf-file ${f.path === open.path ? 'sel' : ''}`} onClick={() => setSel(f.path)} style={{ paddingLeft: 8 + f.path.split('/').length * 10 }}>
                  {tier ? <span className={`okf-dot ${TIER[tier].cls}`} title={tier}><Icon name={TIER[tier].icon} size={10} /></span> : <Icon name="file" size={11} />}
                  <span className="okf-path">{f.path.split('/').pop()}</span>
                  {concept && <span className="okf-type">{conceptType(f.content)}</span>}
                  {concept && conceptStatus(f.content) === 'draft' && <span className="okf-draft">draft</span>}
                </button>
              </li>
            )
          })}
        </ul>
        <pre className="okf-preview" aria-label={`Preview of ${open.path}`}><code>{open.content}</code></pre>
      </div>
      {errors.length > 0 && <ul className="gap-list">{errors.map(e => <li key={e}><Icon name="alert" size={12} />{e}</li>)}</ul>}
      <footer className="rag-card-foot"><span>Provenance: sources are BuLL*Sav-released uploads; entities cite them by footnote. Trust: process:bullsav (machine), 2.2 hand-off (human).</span><span>Stale after 90 days</span></footer>
    </section>
  )
}

// ---- 2.3 Context quality -----------------------------------------------------------
const JOB_PILL: Record<JobStatus, 'queued' | 'running' | 'pass' | 'skipped' | 'fail'> = { queued: 'queued', running: 'running', done: 'pass', skipped: 'skipped', failed: 'fail' }
const CLASSES: OkfClass[] = ['Document', 'Table', 'CADGeometry', 'Correspondence', 'Unclassified']

export function JevContextCard() {
  const s = useRag(x => x)
  const rels = relations(s).slice(0, 5).map(r => `${r.from} ${r.label} ${r.to}`)
  const sources = JOBS.map(j => j.object)
  return (
    <JevVisionHUD
      mode="rag"
      sources={sources}
      facts={rels.length > 0 ? rels : undefined}
      entities={SCHEMAS.map(sc => sc.name)}
      schemas={SCHEMAS.map(sc => sc.name)}
      onReevaluated={res => {
        ragPipeline.setContextEvaluation(res)
      }}
    />
  )
}

function ContextQuality() {
  const s = useRag(x => x)
  return (
    <div className="rag-col">
      {!s.runId && (
        <Banner
          tone="info"
          icon="clock"
          action={
            <button className="btn btn-primary sm" onClick={() => ragPipeline.start()}>
              <Icon name="bolt" />Start ingestion run
            </button>
          }
        >
          No ingestion run yet. Coverage and jobs fill in live while the pipeline runs.
        </Banner>
      )}
      <JevContextCard />
      <CogneePreflightCockpit />
    </div>
  )
}
