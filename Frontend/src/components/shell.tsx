import { useEffect, useRef } from 'react'
import { useUppyState } from '@uppy/react'
import type { Snapshot } from '../api/types'
import { dismissToast, openSettings, setUi, toast, uppy, useUi } from '../lib/store'
import { goScreen, navigate, usePath } from '../lib/route'
import { TASKS, screenByPath, screenLabel } from '../tracker/trackerConfig.ts'
import { Icon, fmtFull, fmtTime } from './ui'
import { AppSettingsModal } from './AppSettingsModal'

export const useUploadsInFlight = () =>
  useUppyState(uppy, s => Object.values(s.files).filter(f => f.progress.uploadStarted && !f.progress.uploadComplete && !f.error).length)

export function TopBar({ syncedAt, offline, screenId }: { snap?: Snapshot; syncedAt: number; offline: boolean; screenId?: string }) {
  const stage = TASKS.find(t => t.id === screenId?.split('.')[0])
  const theme = useUi(s => s.theme)
  const env = useUi(s => s.env)
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo" aria-hidden>B</span>
        {/* Each crumb can shrink and ellipsize; the full text is in its tooltip. The screen name keeps priority. */}
        <nav aria-label="Breadcrumb" className="crumbs">
          <button className="link crumb-link crumb" onClick={() => navigate('/')} title="Projects">Projects</button>
          {stage && <><Icon name="chevron" size={12} /><span className="crumb" title={`Stage ${stage.id}: ${stage.label}`}>{stage.id} · {stage.label}</span></>}
          {screenId && <><Icon name="chevron" size={12} /><strong className="crumb crumb-current" title={screenLabel(screenId)} aria-current="page">{screenLabel(screenId)}</strong></>}
        </nav>
      </div>
      <div className="topbar-right">
        <span className={`sync ${offline ? 'tone-err' : 'tone-muted'}`} role="status" title={syncedAt ? `Last backend sync ${fmtFull(new Date(syncedAt).toISOString())}` : undefined}>
          <Icon name={offline ? 'alert' : 'db'} size={12} />
          {offline ? `Backend unreachable. Status unknown since ${syncedAt ? fmtTime(new Date(syncedAt).toISOString()) : 'start'}` : `Synced ${syncedAt ? fmtTime(new Date(syncedAt).toISOString()) : '—'}`}
        </span>
        {/* Glass mode switch: native radios (Staging = left half, FDE = right half); the sphere sits over the inactive half. */}
        <fieldset className="env-glass" data-env={env} aria-describedby="env-hint" title="View context, not a deploy">
          <legend className="sr-only">Environment mode</legend>
          <span className="eg-track" aria-hidden />
          <span className="eg-sphere" aria-hidden>
            <span className="eg-ghost">{env === 'FDE' ? 'Staging' : 'FDE'}</span>
            {env === 'FDE'
              ? <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9 3 7 13" /></svg>
              : <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 1.8 14.5 5 8 8.2 1.5 5z" /><path d="m3.2 7.6 4.8 2.4 4.8-2.4 1.7.85L8 11.6 1.5 8.45z" opacity=".85" /><path d="m3.2 10.6 4.8 2.4 4.8-2.4 1.7.85L8 14.6 1.5 11.45z" opacity=".7" /></svg>}
          </span>
          <span className="eg-text" aria-hidden>{env}</span>
          {(['Staging', 'FDE'] as const).map(e => (
            <label key={e} className={`eg-opt eg-${e.toLowerCase()} ${env === e ? 'on' : ''}`}>
              <input type="radio" name="env" value={e} checked={env === e} aria-label={e}
                onChange={() => { setUi({ env: e }); toast(`Viewing ${e} context. This changes what you see, it does not deploy anything.`, 'info', undefined, 'env') }} />
            </label>
          ))}
        </fieldset>
        <span id="env-hint" className="env-hint">View context, not a deploy</span>
        <button className="icon-btn" aria-pressed={theme === 'light'} onClick={() => setUi({ theme: theme === 'dark' ? 'light' : 'dark' })}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <button className="icon-btn" onClick={openSettings} aria-label="Settings & AI Decision Engines" title="Settings & AI Decision Engines">
          <Icon name="gear" />
        </button>
      </div>
      <AppSettingsModal />
    </header>
  )
}

// Toasts live in the tracker line (in the page flow, never over a control). Only the newest shows; dismissing it,
// or its timeout, reveals the one before. "Open X" is hidden while you are on X.
export function Toasts({ floating }: { floating?: boolean }) {
  const toasts = useUi(s => s.toasts)
  const here = screenByPath(usePath())?.id
  const t = toasts.at(-1)
  return (
    <div className={`toasts ${floating ? 'floating' : ''}`} aria-live="polite" aria-relevant="additions">
      {t && (
        <div key={t.id} className={`toast tone-${t.tone === 'error' ? 'err' : t.tone === 'success' ? 'ok' : 'info'}`} role={t.tone === 'error' ? 'alert' : undefined}>
          <Icon name={t.tone === 'error' ? 'alert' : t.tone === 'success' ? 'check' : 'bolt'} />
          <span className="toast-text" title={t.text}>{t.text}</span>
          {toasts.length > 1 && <span className="toast-more" title={toasts.slice(0, -1).map(x => x.text).reverse().join('\n')}>+{toasts.length - 1}</span>}
          {t.screen && t.screen !== here && <button className="link" onClick={() => { goScreen(t.screen!); dismissToast(t.id) }}>Open {t.screen}</button>}
          <button className="icon-btn sm" aria-label="Dismiss notification" onClick={() => dismissToast(t.id)}><Icon name="x" size={12} /></button>
        </div>
      )}
    </div>
  )
}
