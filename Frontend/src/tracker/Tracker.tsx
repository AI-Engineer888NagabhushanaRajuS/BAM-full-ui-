import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
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
      className={`tracker-step-item s-${status} ${open ? 'is-open' : ''} ${isCurrent ? 'is-active' : ''}`}
      onClick={onToggle}
      aria-current={isCurrent ? 'location' : undefined}
      title={`Stage ${item.id}: ${item.label} (${done}/${screens.length} screens complete)`}
    >
      <span className={`tracker-step-dot ${isDone ? 'is-done' : isCurrent ? 'is-active' : 'is-pending'}`}>
        {isDone ? <Icon name="check" size={10} /> : item.id}
      </span>
      <div className="tracker-step-text">
        <span className="tracker-step-label">{item.shortLabel}</span>
        <span className="tracker-step-meta">
          {isDone ? 'Completed' : isCurrent ? `${currentScreen} active` : `${done}/${screens.length}`}
        </span>
      </div>
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
    <div className="status-menu enterprise-status-menu">
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
    <nav id={`tracker-panel-${stage.id}`} className="enterprise-subnav" aria-label={`Stage ${stage.id} procedures`}>
      <div className="subnav-container">
        <span className="subnav-stage-tag">Stage {stage.id}:</span>
        <div className="subnav-tabs">
          {subtasksOf(stage.id).map(s => {
            const st = statuses[s.id] ?? 'not_started'
            const prev = previous.includes(s.id)
            const isCurrent = currentScreen === s.id
            const isSelected = selected === s.id
            const isDone = st === 'done'

            return (
              <button
                key={s.id}
                data-screen={s.id}
                className={`subnav-tab-item s-${st} ${prev ? 'prev' : ''} ${isSelected ? 'is-selected' : ''} ${isCurrent ? 'is-active' : ''}`}
                aria-pressed={isSelected}
                aria-current={isCurrent ? 'page' : undefined}
                title={`${STATUS_LABEL[st]}${prev ? ' (from previous run)' : ''}. ${DONE_RULE[s.id]}`}
                onClick={() => {
                  setTracker({ selected: isSelected ? null : s.id })
                  goScreen(s.id)
                }}
              >
                <span className="subnav-tab-num">{s.id}</span>
                <span className="subnav-tab-label">{s.label}</span>
                {isDone && <Icon name="check" size={10} className="subnav-tab-check" />}
              </button>
            )
          })}
        </div>
        <button type="button" className="subnav-close-btn" onClick={onClose} title="Dismiss sub-navigation">
          <Icon name="x" size={11} />
        </button>
      </div>
      {picked && (
        <div className="subnav-status-drawer">
          <StatusMenu item={picked} />
        </div>
      )}
    </nav>
  )
}

export function TrackerStrip() {
  const [pinned, setPinned] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isManualExpanded, setIsManualExpanded] = useState(false)

  const openTask = useTrackerStore(t => t.openTask)
  const selected = useTrackerStore(t => t.selected)
  const storageError = useTrackerStore(t => t.storageError)
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({})
  const currentScreen = screenByPath(usePath())?.id
  const currentStage = currentScreen?.split('.')[0] || '1'
  const activeStageId = openTask || currentStage
  const openStage = TASKS.find(t => t.id === activeStageId)

  // Only sync openTask if the user has explicitly opened the stage sub-task drawer
  useEffect(() => {
    if (openTask && currentStage && openTask !== currentStage) {
      setTracker({ openTask: currentStage, selected: null })
    }
  }, [currentStage, openTask])

  // Is the staging rail currently revealed?
  const isExpanded = pinned || isHovered || isManualExpanded || !!openTask

  // Opening a stage also opens its first built screen; closing it leaves you where you are.
  const toggle = (id: string) => {
    const opening = openTask !== id
    setTracker({ openTask: opening ? id : null, selected: null })
    if (opening) setIsManualExpanded(true)
    if (opening && currentStage !== id) {
      const first = subtasksOf(id)[0]
      if (first) goScreen(first.id)
    }
  }
  const close = () => {
    const id = openTask
    setTracker({ openTask: null, selected: null })
    if (!pinned) setIsManualExpanded(false)
    if (id) triggers.current[id]?.focus()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !openTask) return
    if (selected) {
      document.querySelector<HTMLElement>(`.subnav-tab-item[data-screen="${selected}"]`)?.focus()
      setTracker({ selected: null })
    } else close()
  }

  return (
    <div
      className={`tracker enterprise-tracker-root ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
      onKeyDown={onKey}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        if (!pinned && !openTask) {
          setIsManualExpanded(false)
        }
      }}
    >
      {/* 1. Continuous Moving Gradient Laser Line */}
      <div
        className="tracker-gradient-line"
        onClick={() => setIsManualExpanded(prev => !prev)}
        title={isExpanded ? 'Click to collapse staging rail into gradient line' : 'Click or hover to expand workflow staging rail'}
      >
        <div className="tracker-moving-laser" />
        {!isExpanded && (
          <div className="tracker-collapsed-meta">
            <div className="tracker-micro-badge">
              <span className="tracker-pulse-dot" />
              <span className="tracker-micro-title">Stage {currentStage}: {openStage?.shortLabel || 'Intake'}</span>
              <span className="tracker-micro-screen">{currentScreen || '1.1'}</span>
            </div>
            <span className="tracker-expand-hint">Hover or click line to view staging</span>
            <div className="tracker-collapsed-toasts">
              <Toasts />
            </div>
          </div>
        )}
      </div>

      {/* 2. Full Staging Rail (revealed when expanded) */}
      {isExpanded && (
        <div className="enterprise-tracker-bar">
          <div className="enterprise-stepper-rail">
            {TASKS.map((t, idx) => (
              <div key={t.id} className="enterprise-step-wrapper">
                {idx > 0 && <div className="enterprise-connector" />}
                <TrackerTask
                  item={t}
                  open={activeStageId === t.id}
                  currentScreen={currentStage === t.id ? currentScreen : undefined}
                  onToggle={() => toggle(t.id)}
                  setRef={el => { triggers.current[t.id] = el }}
                />
              </div>
            ))}
          </div>

          <div className="tracker-bar-right-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className={`btn btn-ghost sm tracker-pin-btn ${pinned ? 'is-pinned' : ''}`}
              onClick={() => {
                const next = !pinned
                setPinned(next)
                if (!next) {
                  setIsManualExpanded(false)
                  setIsHovered(false)
                }
              }}
              title={pinned ? 'Staging rail pinned open. Click to auto-collapse into gradient line.' : 'Auto-collapsing. Click to pin staging rail open.'}
              style={{ height: '26px', padding: '0 8px', fontSize: '11px', gap: '4px', color: pinned ? 'var(--accent)' : 'var(--muted)' }}
            >
              <Icon name={pinned ? 'lock' : 'chevron'} size={11} style={!pinned ? { transform: 'rotate(180deg)' } : undefined} />
              <span>{pinned ? 'Pinned' : 'Collapse'}</span>
            </button>
            <Toasts />
          </div>
        </div>
      )}

      {storageError && (
        <div className="tracker-error" role="alert">
          <Icon name="alert" size={12} />
          {storageError} Progress is kept on this device only, not shared or synced.
        </div>
      )}

      {isExpanded && openStage && (
        <TrackerSubtaskRow stage={openStage} currentScreen={currentScreen} onClose={close} />
      )}
    </div>
  )
}

