import { useEffect, useRef, type KeyboardEvent } from 'react'
import { goScreen, usePath } from '../lib/route'
import { Icon } from '../components/ui'
import { Toasts } from '../components/shell'
import {
  STATUS_LABEL, screenByPath, TASKS, TRACKER_ITEMS, TRACKER_STATUSES, doneCount, subtasksOf, taskStatus,
  type TrackerItem, type TrackerStatus,
} from './trackerConfig.ts'
import { setTracker, updateSubtask, useStatuses, useTrackerStore } from './useTrackerStore'
import { DONE_RULE } from './evidence.ts'

// Shape differs per status, so status never relies on colour alone.
const GLYPH: Record<TrackerStatus, string> = {
  not_started: 'circle', in_progress: 'half', needs_review: 'eye', done: 'check', blocked: 'alert',
}

function StatusGlyph({ status }: { status: TrackerStatus }) {
  return <span className={`glyph s-${status}`} title={STATUS_LABEL[status]}><Icon name={GLYPH[status]} size={12} /><span className="sr-only">{STATUS_LABEL[status]}</span></span>
}

/** Hollow circle that fills green as the stage's screens complete; the ring shows the stage status. */
function ProgressPie({ done, total, status }: { done: number; total: number; status: TrackerStatus }) {
  const f = total ? done / total : 0
  const r = 6.5, c = 8
  const a = f * 2 * Math.PI
  const x = c + r * Math.sin(a), y = c - r * Math.cos(a)
  return (
    <span className={`pie s-${status}`} title={`${STATUS_LABEL[status]} · ${done} of ${total} done`}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        {f >= 1 ? <circle cx={c} cy={c} r={r} className="pie-fill" />
          : f > 0 && <path d={`M${c} ${c} L${c} ${c - r} A${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`} className="pie-fill" />}
        <circle cx={c} cy={c} r={r} className="pie-ring" />
        {f >= 1 && <path d="M5 8.2l2 2 4-4.4" className="pie-check" />}
      </svg>
      <span className="sr-only">{STATUS_LABEL[status]}</span>
    </span>
  )
}

function TrackerTask({ item, open, currentScreen, onToggle, setRef }: { item: TrackerItem; open: boolean; currentScreen?: string; onToggle: () => void; setRef: (el: HTMLButtonElement | null) => void }) {
  const statuses = useStatuses()
  const screens = subtasksOf(item.id)
  const status = taskStatus(item.id, statuses)
  const done = doneCount(screens, statuses)
  const isDone = done === screens.length && screens.length > 0
  const isCurrent = !!currentScreen

  return (
    <button
      ref={setRef}
      id={`tracker-stage-${item.id}`}
      aria-expanded={open}
      aria-controls={`tracker-panel-${item.id}`}
      className={`tracker-pill s-${status} ${open ? 'is-open' : ''} ${isCurrent ? 'is-active' : ''}`}
      onClick={onToggle}
      aria-current={isCurrent ? 'location' : undefined}
      title={`Stage ${item.id}: ${item.label} (${done}/${screens.length} screens done)`}
    >
      <span className={`tracker-pill-num ${isDone ? 'done' : isCurrent ? 'active' : ''}`}>
        {isDone ? <Icon name="check" size={10} /> : item.id}
      </span>
      <span className="tracker-pill-label">{item.shortLabel}</span>
      {isCurrent ? (
        <span className="tracker-pill-badge active">{currentScreen}</span>
      ) : isDone ? (
        <span className="tracker-pill-badge done">Done</span>
      ) : (
        <span className="tracker-pill-badge count">{done}/{screens.length}</span>
      )}
      <span className={`tracker-pill-chev ${open ? 'up' : ''}`} aria-hidden>
        <Icon name="down" size={9} />
      </span>
    </button>
  )
}

// Selecting a screen shows its details and manual status; completion only changes through these controls.
function StatusMenu({ item }: { item: TrackerItem }) {
  const current = useStatuses()[item.id] ?? 'not_started'
  const loaded = useTrackerStore(t => t.loaded)
  const prev = useTrackerStore(t => t.previous.includes(item.id))
  const pinned = useTrackerStore(t => t.basis[item.id] !== undefined && t.basis[item.id] === t.evidence[item.id])
  return (
    <div className="status-menu">
      <div className="sm-head">
        <span className="sm-title"><span className="chip-num">{item.id}</span> {item.label}</span>
      </div>
      <p className="sm-desc">{item.description}</p>
      <p className="sm-rule"><Icon name="check" size={11} />{DONE_RULE[item.id]}{prev && ' Its current work is from a previous RAG run, so it counts as not started.'}{pinned && ' Set by hand; it returns to the evidence when the work changes.'}</p>
      <fieldset className="status-options" disabled={!loaded}>
        <legend className="sm-legend">Status{!loaded && ' (loading saved progress…)'} · updates from workflow evidence</legend>
        {TRACKER_STATUSES.map(st => (
          <label key={st} className={`status-opt s-${st} ${current === st ? 'on' : ''}`}>
            <input type="radio" name={`status-${item.id}`} value={st} checked={current === st} onChange={() => void updateSubtask(item.id, st)} />
            <Icon name={GLYPH[st]} size={12} />{STATUS_LABEL[st]}
          </label>
        ))}
      </fieldset>
    </div>
  )
}

function TrackerSubtaskRow({ stage, currentScreen, onClose }: { stage: TrackerItem; currentScreen?: string; onClose: () => void }) {
  const statuses = useStatuses()
  const selected = useTrackerStore(t => t.selected)
  const previous = useTrackerStore(t => t.previous)
  const picked = TRACKER_ITEMS.find(i => i.id === selected && i.parentId === stage.id)
  return (
    <section id={`tracker-panel-${stage.id}`} className="tracker-panel" aria-labelledby={`tracker-stage-${stage.id}`}>
      <div className="tracker-panel-head">
        <span className="tp-title">{stage.id} {stage.label}<span className="muted"> · {stage.description}</span></span>
        <span className="tp-manual"><Icon name="bolt" size={11} />Follows workflow evidence; you can also set a status by hand</span>
        <button className="btn btn-ghost sm tp-close" onClick={onClose}><Icon name="x" size={12} />Close</button>
      </div>
      <div className="tracker-chips">
        {subtasksOf(stage.id).map(s => {
          const st = statuses[s.id] ?? 'not_started'
          const prev = previous.includes(s.id)
          return (
            <button key={s.id} data-screen={s.id} className={`chip s-${st} ${prev ? 'prev' : ''} ${selected === s.id ? 'on' : ''} ${currentScreen === s.id ? 'current' : ''}`}
              aria-pressed={selected === s.id} aria-current={currentScreen === s.id ? 'page' : undefined}
              title={`${STATUS_LABEL[st]}${prev ? ' (from previous run)' : ''}. ${DONE_RULE[s.id]}`}
              aria-label={`${s.id} ${s.label}. ${prev ? 'From previous run' : STATUS_LABEL[st]}. ${DONE_RULE[s.id]}`}
              onClick={() => { setTracker({ selected: selected === s.id ? null : s.id }); goScreen(s.id) }}>
              <span className="chip-num" aria-hidden>{s.id}</span>
              <span className="chip-label" aria-hidden>{s.label}</span>
              {prev ? <span className="chip-prev">from previous run</span> : <StatusGlyph status={st} />}
            </button>
          )
        })}
      </div>
      {picked && <StatusMenu item={picked} />}
    </section>
  )
}

export function TrackerStrip() {
  const openTask = useTrackerStore(t => t.openTask)
  const selected = useTrackerStore(t => t.selected)
  const storageError = useTrackerStore(t => t.storageError)
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({})
  const openStage = TASKS.find(t => t.id === openTask)
  const currentScreen = screenByPath(usePath())?.id
  const currentStage = currentScreen?.split('.')[0]

  // Only sync openTask if the user has explicitly opened the stage sub-task drawer
  useEffect(() => {
    if (openTask && currentStage && openTask !== currentStage) {
      setTracker({ openTask: currentStage, selected: null })
    }
  }, [currentStage, openTask])

  // Opening a stage also opens its first built screen; closing it leaves you where you are.
  const toggle = (id: string) => {
    const opening = openTask !== id
    setTracker({ openTask: opening ? id : null, selected: null })
    if (opening && currentStage !== id) {
      const first = subtasksOf(id)[0]
      if (first) goScreen(first.id)
    }
  }
  const close = () => {
    const id = openTask
    setTracker({ openTask: null, selected: null })
    if (id) triggers.current[id]?.focus()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !openTask) return
    if (selected) {
      // The detail (and any focused control in it) disappears; keep focus on the screen chip.
      document.querySelector<HTMLElement>(`.chip[data-screen="${selected}"]`)?.focus()
      setTracker({ selected: null })
    } else close()
  }

  return (
    <div className="tracker" onKeyDown={onKey}>
      <div className="tracker-line">
        <nav className="tracker-strip" aria-label="BAM stages">
          {TASKS.map((t, i) => (
            <span key={t.id} className="tracker-cell">
              {i > 0 && <span className="tracker-sep" aria-hidden><Icon name="chevron" size={10} /></span>}
              <TrackerTask item={t} open={openTask === t.id} currentScreen={currentStage === t.id ? currentScreen : undefined} onToggle={() => toggle(t.id)} setRef={el => { triggers.current[t.id] = el }} />
            </span>
          ))}
        </nav>
        <Toasts />
      </div>
      {storageError && (
        <div className="tracker-error" role="alert"><Icon name="alert" size={12} />{storageError} Progress is kept on this device only, not shared or synced.</div>
      )}
      {openStage && <TrackerSubtaskRow stage={openStage} currentScreen={currentScreen} onClose={close} />}
    </div>
  )
}
