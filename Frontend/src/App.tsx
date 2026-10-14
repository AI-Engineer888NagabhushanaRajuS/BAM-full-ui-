import { useEffect, useRef, useState } from 'react'
import { Refine } from '@refinedev/core'
import { api, dataProvider } from './api/adapter'
import type { Snapshot, StepId, StepInfo } from './api/types'
import { useAction, useSnapshot } from './lib/data'
import { getUi, toast, useUi } from './lib/store'
import { activeScreen, goScreen, navigate, usePath } from './lib/route'
import { Toasts, TopBar, useUploadsInFlight } from './components/shell'
import { Banner, Confirm, Empty, ErrorState, Icon, PanesContext, Skeleton } from './components/ui'
import * as Step1 from './steps/Step1'
import * as Step2 from './steps/Step2'
import * as Step3 from './steps/Step3'
import * as Step4 from './steps/Step4'
import { FileDetail, IngestionQueue, IngestionReview } from './steps/Ingestion'
import { ReleasePrep, SkillReview } from './steps/Review'
import { TrackerStrip } from './tracker/Tracker'
import { SCREEN_ROUTES, STEP_SCREEN, screenByPath, screenLabel } from './tracker/trackerConfig.ts'
import { RagScreen } from './rag/RagScreens'
import { isRunning, ragPipeline, useRag } from './rag/ragPipeline.ts'
import { evidenceStatuses, previousRun } from './tracker/evidence.ts'
import { setTracker } from './tracker/useTrackerStore'
import { prerequisite } from './lib/prereq'
import { getDrafts } from './lib/drafts'
import { PreflightModal } from './rag/PreflightModal'
import { OpenRouterKeyModal } from './components/OpenRouterKeyModal'
import { closeOpenRouterModal } from './lib/store'

export interface StepProps { snap: Snapshot; info: StepInfo }

// Gated screens (a backend step locks them) rendered in the 3-pane shell, by screen ID.
const PANES: Record<string, { Left: (p: StepProps) => React.ReactNode; Center: (p: StepProps) => React.ReactNode; Right: (p: StepProps) => React.ReactNode }> = {
  '3.1': { Left: Step1.WorkflowPane, Center: Step1.Center, Right: Step1.ScopeAndEvidencePane },
  '3.2': Step2,
  '4.1': { Left: Step3.Left, Center: Step3.ActivitiesCenter, Right: Step3.Right },
  '4.3': { Left: Step3.Left, Center: Step3.CodeCenter, Right: Step3.Right },
  '4.2': { Left: Step3.Left, Center: Step3.ManifestCenter, Right: Step3.Right },
  '4.4': Step4,
}
// Ungated screens: always viewable, with honest empty/unavailable states.
const VIEWS: Record<string, (p: { snap: Snapshot; path: string }) => React.ReactNode> = {
  '1.2': IngestionQueue, '1.3': FileDetail, '1.4': IngestionReview,
  '2.1': RagScreen, '2.2': RagScreen, '2.3': RagScreen, '2.4': RagScreen,
  '3.3': SkillReview, '3.4': ReleasePrep,
}

export default function App() {
  return (
    <Refine dataProvider={dataProvider} options={{ disableTelemetry: true, reactQuery: { clientConfig: { defaultOptions: { queries: { refetchOnWindowFocus: false } } } } }}>
      <Workbench />
    </Refine>
  )
}

// Toast when background work finishes, so long runs never trap the user.
function useCompletionToasts(snap?: Snapshot) {
  const prev = useRef<Snapshot | undefined>(undefined)
  useEffect(() => {
    if (snap && prev.current) for (const s of snap.steps) {
      const before = prev.current.steps[s.id - 1]
      if (before.background > 0 && s.background === 0)
        toast(`${screenLabel(STEP_SCREEN[s.id])}: ${s.reason}`, s.state === 'failed' ? 'error' : 'success', STEP_SCREEN[s.id])
    }
    prev.current = snap
  }, [snap])
}

// Stage hand-off: RAG (2.x) starts only from 1.1's scan-gated "Start ingestion run", never on upload.
// A finished RAG run for an ingested batch generates the SOW (3.1).
function useStageHandoffs(snap?: Snapshot) {
  const synced = useRag(s => s.lastSyncAt)
  const prevSync = useRef(synced)
  useEffect(() => {
    if (synced === prevSync.current) return
    prevSync.current = synced
    if (!synced || !snap?.steps[0].editable || !snap.ingestion) return
    api.startSowGeneration(ragPipeline.getState().runId).then(
      () => toast('RAG context ready. Generating the SOW in 3.1.', 'info', '3.1'),
      (e: Error) => toast(`SOW generation could not start: ${e.message}`, 'error', '3.1'))
  }, [synced, snap])
}

// The tracker shows workflow evidence (recomputed from the live snapshot, so a reset backend or a new RAG run
// never leaves stale ticks); a manual status only shows while the evidence it overrode is unchanged.
function useTrackerEvidence(snap?: Snapshot) {
  const rag = useRag(s => s)
  useEffect(() => {
    if (!snap) return
    const evidence = evidenceStatuses(snap, rag), previous = previousRun(snap, rag)
    const t = getUi().tracker
    if (JSON.stringify([evidence, previous]) !== JSON.stringify([t.evidence, t.previous])) setTracker({ evidence, previous })
  }, [snap, rag])
}

function Workbench() {
  const { snap, error, syncedAt, refetch } = useSnapshot()
  const theme = useUi(s => s.theme)
  const env = useUi(s => s.env)
  const path = usePath()
  const screen = screenByPath(path)
  const collapsed = useUi(s => s.collapsed)
  const openRouterModalOpen = useUi(s => !!s.openRouterModalOpen)
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  // The FDE/Staging selector sets the palette: FDE = blue (default), Staging = orange. Deployed or not.
  useEffect(() => { document.documentElement.dataset.env = env }, [env])
  // Unsaved 4.3/4.2 drafts survive route changes (shared store); only leaving the app can lose them.
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => { const d = getDrafts(); if (d.manifest !== undefined || Object.keys(d.code).length) e.preventDefault() }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [])
  useCompletionToasts(snap)
  useStageHandoffs(snap)
  useTrackerEvidence(snap)
  // "/" and unknown paths open wherever the work is right now.
  useEffect(() => { if (snap && !screen) navigate(SCREEN_ROUTES[activeScreen(snap)]!.path, { replace: true }) }, [snap, screen])

  if (!snap || !screen) return (
    <div className="app">
      <TopBar syncedAt={syncedAt} offline={!!error} />
      <main className="boot">
        {error
          ? <ErrorState title="Could not load the workflow" action={<button className="btn btn-primary" onClick={() => refetch()}><Icon name="refresh" />Retry</button>}>
              The backend did not respond ({error.message}). Nothing has been changed.
            </ErrorState>
          : <Skeleton rows={6} label="Loading workflow state" />}
      </main>
      <Toasts floating />
    </div>
  )

  const info = screen.step ? snap.steps[screen.step - 1] : undefined
  let body
  if (!info) {
    const View = VIEWS[screen.id]
    body = <><ContextBar snap={snap} screenId={screen.id} /><PanesContext.Provider value><View snap={snap} path={path} /></PanesContext.Provider></>
  }
  else if (info.state === 'locked') body = <LockedScreen id={screen.id} info={info} snap={snap} />
  else if (screen.id === '1.1') body = <><ContextBar snap={snap} info={info} screenId="1.1" /><Step1.Intake snap={snap} info={info} /></>
  else {
    const P = PANES[screen.id]
    body = <>
      <ContextBar snap={snap} info={info} screenId={screen.id} />
      <PanesContext.Provider value>
        <main className="panes" data-step={info.id} data-left={collapsed.left ? 'collapsed' : undefined} data-right={collapsed.right ? 'collapsed' : undefined}>
          <P.Left snap={snap} info={info} />
          <P.Center snap={snap} info={info} />
          <P.Right snap={snap} info={info} />
        </main>
      </PanesContext.Provider>
    </>
  }
  return (
    <div className="app" data-env={env}>
      <a className="skip" href="#center-title">Skip to screen content</a>
      <TopBar snap={snap} syncedAt={syncedAt} offline={!!error} screenId={screen.id} />
      <TrackerStrip />
      {body}
      <PreflightModal />
      <OpenRouterKeyModal open={openRouterModalOpen} onClose={closeOpenRouterModal} />
    </div>
  )
}

// The reason and the action come from the same prerequisite check, so they always agree.
function LockedScreen({ id, info, snap }: { id: string; info: StepInfo; snap: Snapshot }) {
  const rag = useRag(s => s)
  const b = prerequisite(snap, rag, info.id)
  return (
    <main className="locked-screen">
      <Empty icon="lock" title={`${screenLabel(id)} is locked`}
        action={b ? <button className="btn btn-primary" onClick={() => goScreen(b.target)}>{b.label}</button>
          : <button className="btn btn-primary" onClick={() => goScreen(activeScreen(snap))}>Go to {screenLabel(activeScreen(snap))}</button>}>
        {b?.reason ?? `${info.reason}.`}
      </Empty>
    </main>
  )
}

function ContextBar({ snap, info, screenId }: { snap: Snapshot; info?: StepInfo; screenId: string }) {
  const [confirm, setConfirm] = useState(false)
  const { busy, run } = useAction()
  // The Reopen button disappears once the screen is editable; keep keyboard focus on the screen instead of <body>.
  const reopening = useRef(false)
  useEffect(() => {
    if (reopening.current && info?.editable) { reopening.current = false; document.getElementById('center-title')?.focus() }
  }, [info?.editable])
  const uploading = useUploadsInFlight()
  // Long work keeps a visible count per screen while it runs in the background.
  const running = [
    ...(uploading ? [{ id: '1.1', n: uploading }] : []),
    ...snap.steps.filter(s => s.background > 0).map(s => ({ id: STEP_SCREEN[s.id], n: s.background })),
  ]
  const name = screenLabel(screenId)
  const stepId = info?.id ?? 1
  const owner = STEP_SCREEN[stepId]
  const canReopen = !!info && info.id < snap.activeStep && info.state !== 'locked'
  const later = ([2, 3, 4] as StepId[]).filter(n => n > stepId).map(n => STEP_SCREEN[n]).join(', ')
  const active = activeScreen(snap)
  const sandbox = ['4.1', '4.2', '4.3'].includes(screenId)
  // Only shown when it has something to say: a read-only notice (with Reopen) or background work.
  const empty = (!info || info.editable) && running.length === 0
  return (
    <div className={`contextbar ${empty ? 'is-empty' : ''}`}>
      {info && !info.editable &&
        <Banner tone={info.stale ? 'warn' : 'ok'} icon={info.stale ? 'refresh' : 'lock'}
            action={<span className="row">
              {canReopen && !sandbox && <button className="btn btn-secondary sm" onClick={() => setConfirm(true)} disabled={!!busy}><Icon name="refresh" />Reopen {owner}</button>}
              {active !== screenId && !sandbox && <button className="btn btn-ghost sm" onClick={() => goScreen(active)}>Go to {active}</button>}
            </span>}>
            <strong>{name} is read-only.</strong> {info.reason}.
          </Banner>}
      {running.length > 0 && (
        <div className="bg-work" role="status">
          <span className="muted xs">Running in background:</span>
          {running.map(r => (
            <button key={r.id} className="bg-chip" onClick={() => goScreen(r.id)}>
              <Icon name="spinner" size={11} spin />{screenLabel(r.id)}<span className="bg-count">{r.n}</span>
            </button>
          ))}
        </div>
      )}
      <Confirm open={confirm} title={`Reopen ${screenLabel(owner)}?`} confirmLabel={`Reopen ${owner}`} onClose={() => setConfirm(false)}
        onConfirm={() => { setConfirm(false); reopening.current = true; void run('Reopen', () => api.reopen(stepId), { success: `${owner} reopened.${later ? ` ${later} marked stale.` : ''}`, step: stepId }).then(() => goScreen(owner)) }}
        consequences={[
          `${screenLabel(owner)} becomes editable again${stepId === 1 ? ', and uploads in 1.1 reopen' : ''}.`,
          ...(later ? [`${later} will be marked stale and must be reviewed or re-run before the workflow can be deployed again.`] : []),
          ...(stepId === 1 ? ['The current SOW approval stays valid until you edit the document; any edit invalidates it.'] : []),
          'Whatever is deployed to Staging stays deployed until you deploy a new version.',
        ]} />
    </div>
  )
}
