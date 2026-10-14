import { useEffect, useRef, useState } from 'react'
import { useUppyState } from '@uppy/react'
import type { Snapshot } from '../api/types'
import { dismissToast, openSettings, openPreflight, openOpenConnector, closeOpenConnector, setUi, toast, uppy, useUi } from '../lib/store'
import { goScreen, navigate, usePath } from '../lib/route'
import { TASKS, screenByPath, screenLabel } from '../tracker/trackerConfig.ts'
import { Icon, fmtFull, fmtTime } from './ui'
import { AppSettingsModal } from './AppSettingsModal'
import { OpenConnectorModal } from './OpenConnectorModal'
import { OnboardingModal } from './OnboardingModal'
import { useAuth } from '../lib/auth'
import { useWorkspace } from '../lib/workspace'
import { getPreflightSufficiency } from '../rag/CogneePreflightCockpit'

export const useUploadsInFlight = () =>
  useUppyState(uppy, s => Object.values(s.files).filter(f => f.progress.uploadStarted && !f.progress.uploadComplete && !f.error).length)

export function TopBar({ syncedAt, offline, screenId }: { snap?: Snapshot; syncedAt: number; offline: boolean; screenId?: string }) {
  const stage = TASKS.find(t => t.id === screenId?.split('.')[0])
  const theme = useUi(s => s.theme)
  const env = useUi(s => s.env)
  const connectorOpen = useUi(s => !!s.openConnectorModalOpen)
  const { user } = useAuth()
  const { workspace, project } = useWorkspace()
  const [showConnector, setShowConnector] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      const dismissed = localStorage.getItem('bam_intro_dismissed_v1')
      const pref = localStorage.getItem('bam_show_launchpad_startup')
      if (pref === 'false') return false
      return !dismissed
    } catch {
      return false
    }
  })

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-logo-group" onClick={() => setShowOnboarding(true)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', flex: 'none', whiteSpace: 'nowrap' }}>
          <span className="logo" aria-hidden title="Click to open BAM Workspace Onboarding & Projects">B</span>
          <span className="brand-title" style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)', letterSpacing: '-0.02em', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            BuLLM <span style={{ fontWeight: '500', color: 'var(--accent)', fontSize: '11.5px', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--accent)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>/ {workspace.name}</span>
          </span>
        </div>
        {/* Interactive Workspace & Project Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="crumbs">
          <button className="link crumb-link crumb" onClick={() => setShowOnboarding(true)} title={`Active Project: ${project.name} [${project.code}]. Click to switch.`}>
            <strong>{project.code}</strong>
          </button>
          {stage && <><Icon name="chevron" size={12} /><span className="crumb" title={`Stage ${stage.id}: ${stage.label}`}>{stage.id} · {stage.label}</span></>}
          {screenId && <><Icon name="chevron" size={12} /><strong className="crumb crumb-current" title={screenLabel(screenId)} aria-current="page">{screenLabel(screenId)}</strong></>}
        </nav>
      </div>
      <div className="topbar-right">
        {/* Workspace & History Launchpad Pill */}
        <button
          type="button"
          className="badge sm topbar-ws-pill"
          onClick={() => setShowOnboarding(true)}
          title={`Active Workspace: ${workspace.name} · Active Project: ${project.code}. Click to open Workspace Launchpad & History.`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontSize: '11px',
            fontWeight: '600',
            padding: '2px 9px',
            borderRadius: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <Icon name="folder" size={12} />
          <span>Workspaces &amp; History</span>
        </button>

        {/* Topbar Simulation Mode Pill */}
        <span className="badge sm topbar-sim-badge" style={{
          background: 'color-mix(in srgb, var(--warn) 15%, transparent)',
          border: '1px solid color-mix(in srgb, var(--warn) 40%, transparent)',
          color: 'var(--warn)', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '6px'
        }}>
          Simulation mode
        </span>

        {/* Topbar Pre-Flight Gate Fast-Launcher Pill */}
        {(() => {
          const preflight = getPreflightSufficiency()
          const pass = preflight.isUnlocked
          return (
            <button
              type="button"
              className="badge sm preflight-gate-badge"
              onClick={openPreflight}
              title={`Pre-Flight Verification Gate: ${preflight.passRate}% (${preflight.passCount}/${preflight.totalCount} passed). Click to open Pre-Flight Cockpit.`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                background: pass ? 'color-mix(in srgb, #10b981 15%, transparent)' : 'color-mix(in srgb, var(--accent) 15%, transparent)',
                border: `1px solid ${pass ? 'color-mix(in srgb, #10b981 45%, transparent)' : 'color-mix(in srgb, var(--accent) 40%, transparent)'}`,
                color: pass ? '#10b981' : 'var(--accent)',
                fontSize: '11px',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{pass ? '🛡️' : '⚡'}</span>
              <span>Gate: {preflight.passRate}% {pass ? 'PASS' : 'LOCKED'}</span>
            </button>
          )
        })()}

        {/* Backend Sync Indicator */}
        <span className={`sync ${offline ? 'tone-err' : 'tone-muted'}`} role="status" title={syncedAt ? `Last backend sync ${fmtFull(new Date(syncedAt).toISOString())}` : undefined}>
          <Icon name={offline ? 'alert' : 'db'} size={12} />
          {offline ? `Backend unreachable` : `Synced`}
        </span>

        {/* Glass mode switch: native radios (Client = left half, FDE = right half) */}
        <fieldset className="env-glass" data-env={env} aria-describedby="env-hint" title="Switch between Client view and FDE Engineering mode">
          <legend className="sr-only">Environment mode</legend>
          <span className="eg-track" aria-hidden />
          <span className="eg-sphere" aria-hidden>
            <span className="eg-ghost">{env === 'FDE' ? 'Client' : 'FDE'}</span>
            {env === 'FDE'
              ? <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5M9 3 7 13" /></svg>
              : <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 1.8 14.5 5 8 8.2 1.5 5z" /><path d="m3.2 7.6 4.8 2.4 4.8-2.4 1.7.85L8 11.6 1.5 8.45z" opacity=".85" /><path d="m3.2 10.6 4.8 2.4 4.8-2.4 1.7.85L8 14.6 1.5 11.45z" opacity=".7" /></svg>}
          </span>
          <span className="eg-text" aria-hidden>{env === 'Staging' ? 'Client' : env}</span>
          {(['Client', 'FDE'] as const).map(e => (
            <label key={e} className={`eg-opt eg-${e.toLowerCase()} ${env === e || (e === 'Client' && env === 'Staging') ? 'on' : ''}`}>
              <input type="radio" name="env" value={e} checked={env === e || (e === 'Client' && env === 'Staging')} aria-label={e}
                onChange={() => { setUi({ env: e }); toast(`Viewing ${e} mode.`, 'info', undefined, 'env') }} />
            </label>
          ))}
        </fieldset>

        {/* Help button */}
        <button
          className="btn btn-ghost sm topbar-help-btn"
          onClick={() => toast('BAM Zero-Trust Autonomous Manufacturing: Stage 1 Intake -> Stage 2 GraphRAG -> Stage 3 Dynamic SOW -> Stage 4 Temporal Sandbox.', 'info')}
          title="Workflow help & documentation"
          style={{ fontSize: '12px', padding: '0 8px', height: '30px' }}
        >
          <Icon name="question" size={13} />
          <span>Help</span>
        </button>

        {/* Notifications Bell */}
        <button
          className="icon-btn sm"
          onClick={() => toast('No unread security or pipeline alerts.', 'info')}
          title="Security alerts & notifications"
          style={{ position: 'relative' }}
        >
          <Icon name="bell" size={13} />
        </button>

        {/* Open Connector User Profile Chip */}
        {user ? (
          <button
            type="button"
            className="user-profile-chip"
            onClick={() => setShowOnboarding(true)}
            title={`Active: ${user.name} (${user.role}) via ${user.provider}. Click to manage workspace & switch identities.`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '3px 8px 3px 4px',
              borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--surface-2)',
              cursor: 'pointer', color: 'var(--text)', transition: 'all 0.15s ease'
            }}
          >
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%', background: user.avatarGradient,
              color: '#fff', display: 'grid', placeItems: 'center', fontWeight: '700', fontSize: '11px'
            }}>
              {user.initials}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', lineHeight: 1.1 }}>
              <span style={{ fontSize: '11.5px', fontWeight: '600' }}>{user.name}</span>
              <span className="xs muted" style={{ fontSize: '9.5px' }}>{user.role} · {user.provider}</span>
            </div>
            <Icon name="chevron" size={10} />
          </button>
        ) : (
          <button
            type="button"
            className="btn xs"
            onClick={() => setShowOnboarding(true)}
            title="Sign in to BAM, configure tenant workspace, or choose 1-click identity"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              borderRadius: '20px', padding: '4px 10px',
              border: '1px solid var(--primary)', background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
              color: 'var(--text)', fontWeight: '600', cursor: 'pointer'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
            <span>Sign In</span>
          </button>
        )}

        {/* Light / Dark Mode Toggle */}
        <button className="icon-btn sm" aria-pressed={theme === 'light'} onClick={() => setUi({ theme: theme === 'dark' ? 'light' : 'dark' })}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={13} />
        </button>

        {/* Settings Button */}
        <button className="icon-btn sm" onClick={() => openSettings()} aria-label="Settings & AI Decision Engines" title="Settings & AI Decision Engines">
          <Icon name="gear" size={13} />
        </button>
      </div>
      <AppSettingsModal />
      <OpenConnectorModal open={showConnector || connectorOpen} onClose={() => { setShowConnector(false); closeOpenConnector(); }} />
      <OnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
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
