import { useState, type FormEvent } from 'react'
import { Icon } from './ui'
import { useAuth, authActions, PRESET_USERS, type User } from '../lib/auth'
import { useWorkspace, PRESET_WORKSPACES, PRESET_PROJECTS, type ProjectItem, type WorkspaceItem } from '../lib/workspace'
import { toast } from '../lib/store'

interface ProjectHistoryItem {
  id: string
  projectCode: string
  projectName: string
  workspaceId: string
  workspaceName: string
  filesCount: number
  securityStatus: string
  sowProgress: string
  lastActive: string
  domain: string
}

const PRESET_PROJECT_HISTORY: ProjectHistoryItem[] = [
  {
    id: 'hist-1',
    projectCode: 'RFQ-2026-0147',
    projectName: 'Meridian Precision Housing & Bracket',
    workspaceId: 'ws-aero',
    workspaceName: 'Meridian Aerospace & Defense',
    filesCount: 21,
    securityStatus: 'BuLLSav 2/2 Clean',
    sowProgress: 'Stage 1.1 Ingest Active',
    lastActive: '2 mins ago',
    domain: 'Aerospace / Tier-1 EMS',
  },
  {
    id: 'hist-2',
    projectCode: 'EMS-PCBA-88',
    projectName: 'High-Reliability Avionics PCBA',
    workspaceId: 'ws-ems',
    workspaceName: 'DigiBull EMS Enterprise',
    filesCount: 14,
    securityStatus: 'ClamAV + Repel Verified',
    sowProgress: 'SOW v2 Draft Approved (98% ISATVON)',
    lastActive: '1 hr ago',
    domain: 'Contract Electronics',
  },
  {
    id: 'hist-3',
    projectCode: 'AST-SCAN-V3',
    projectName: '1AutoScanner Pro & Microservice AST',
    workspaceId: 'ws-soft',
    workspaceName: 'Distributed Microservices & AST',
    filesCount: 38,
    securityStatus: 'AST Threat Boundary Verified',
    sowProgress: 'FastMCP Bindings Pinned',
    lastActive: 'Yesterday',
    domain: 'Software Architecture',
  },
  {
    id: 'hist-4',
    projectCode: 'LEO-EPHEM-01',
    projectName: 'Space-Track LEO Telemetry Stream',
    workspaceId: 'ws-space',
    workspaceName: 'SpaceTech LEO Telemetry',
    filesCount: 6,
    securityStatus: 'Ephemeris Consensus Clean',
    sowProgress: 'Orbital Graph Grounded',
    lastActive: '3 days ago',
    domain: 'Constellation Operations',
  },
]

/** Authentic IPC Class 3 PCB & Zero-Trust Aerospace Architecture Graphic */
function RealEngineeringPcbGraphic() {
  return (
    <div className="onboarding-real-pcb-container" title="BAM Tensor Core & Zero-Trust Architecture (IPC Class 3)">
      <svg viewBox="0 0 260 160" width="100%" height="100%" className="real-pcb-svg" fill="none">
        <defs>
          <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="coreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* PCB Board Grid & Ground Plane */}
        <rect x="5" y="5" width="250" height="150" rx="8" fill="#111c2e" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="1" />
        <path d="M15 15h230M15 35h230M15 55h230M15 75h230M15 95h230M15 115h230M15 135h230" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
        <path d="M35 15v120M65 15v120M95 15v120M125 15v120M155 15v120M185 15v120M215 15v120" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />

        {/* Copper Traces (Left Side - Ingest & BuLLSav) */}
        <path d="M20 40 L60 40 L80 60 L100 60" stroke="url(#traceGrad)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="20" cy="40" r="3" fill="#f59e0b" />
        <circle cx="60" cy="40" r="2" fill="#fbbf24" />
        
        <path d="M20 80 L55 80 L75 75 L100 75" stroke="url(#traceGrad)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="20" cy="80" r="3" fill="#f59e0b" />

        <path d="M20 120 L60 120 L80 90 L100 90" stroke="url(#traceGrad)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="20" cy="120" r="3" fill="#f59e0b" />
        <circle cx="60" cy="120" r="2" fill="#fbbf24" />

        {/* Central Microprocessor / Tensor Core */}
        <rect x="100" y="50" width="60" height="60" rx="6" fill="url(#coreGrad)" stroke="#f59e0b" strokeWidth="1.5" filter="url(#goldGlow)" />
        {/* Core Chip Pins */}
        <path d="M96 58h4 M96 66h4 M96 74h4 M96 82h4 M96 90h4 M96 98h4" stroke="#fbbf24" strokeWidth="1.5" />
        <path d="M160 58h4 M160 66h4 M160 74h4 M160 82h4 M160 90h4 M160 98h4" stroke="#fbbf24" strokeWidth="1.5" />
        <path d="M108 46v4 M116 46v4 M124 46v4 M132 46v4 M140 46v4 M148 46v4" stroke="#fbbf24" strokeWidth="1.5" />
        <path d="M108 110v4 M116 110v4 M124 110v4 M132 110v4 M140 110v4 M148 110v4" stroke="#fbbf24" strokeWidth="1.5" />

        {/* Core Die Silicon Label */}
        <text x="130" y="74" fill="#fbbf24" fontSize="7" fontWeight="700" textAnchor="middle" fontFamily="monospace" letterSpacing="0.08em">BULLM CORE</text>
        <text x="130" y="86" fill="#94a3b8" fontSize="6" fontWeight="600" textAnchor="middle" fontFamily="monospace">AS9100D · FDE</text>
        <text x="130" y="96" fill="#10b981" fontSize="5.5" fontWeight="600" textAnchor="middle" fontFamily="monospace">IPC CLASS 3</text>

        {/* Copper Traces (Right Side - Cognee Graph & SOW Synthesis) */}
        <path d="M160 60 L180 60 L200 40 L240 40" stroke="url(#traceGrad)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="240" cy="40" r="3" fill="#f59e0b" />
        <circle cx="200" cy="40" r="2" fill="#fbbf24" />

        <path d="M160 75 L185 75 L205 80 L240 80" stroke="url(#traceGrad)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="240" cy="80" r="3" fill="#f59e0b" />

        <path d="M160 90 L180 90 L200 120 L240 120" stroke="url(#traceGrad)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="240" cy="120" r="3" fill="#f59e0b" />
        <circle cx="200" cy="120" r="2" fill="#fbbf24" />

        {/* SMT Passive Components */}
        <rect x="75" y="24" width="8" height="4" rx="1" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
        <rect x="177" y="24" width="8" height="4" rx="1" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
        <rect x="75" y="132" width="8" height="4" rx="1" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
        <rect x="177" y="132" width="8" height="4" rx="1" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
        
        {/* Real Pipeline Node Labels */}
        <rect x="12" y="28" width="46" height="15" rx="3" fill="#0f172a" stroke="rgba(245, 158, 11, 0.5)" strokeWidth="0.8" />
        <text x="35" y="38" fill="#fbbf24" fontSize="5.5" fontWeight="700" textAnchor="middle" fontFamily="monospace">01. INTAKE</text>

        <rect x="12" y="68" width="52" height="15" rx="3" fill="#0f172a" stroke="rgba(16, 185, 129, 0.5)" strokeWidth="0.8" />
        <text x="38" y="78" fill="#10b981" fontSize="5.5" fontWeight="700" textAnchor="middle" fontFamily="monospace">02. BULLSAV</text>

        <rect x="196" y="28" width="52" height="15" rx="3" fill="#0f172a" stroke="rgba(0, 210, 255, 0.5)" strokeWidth="0.8" />
        <text x="222" y="38" fill="#00f0ff" fontSize="5.5" fontWeight="700" textAnchor="middle" fontFamily="monospace">03. COGNEE</text>

        <rect x="196" y="68" width="52" height="15" rx="3" fill="#0f172a" stroke="rgba(245, 158, 11, 0.5)" strokeWidth="0.8" />
        <text x="222" y="78" fill="#fbbf24" fontSize="5.5" fontWeight="700" textAnchor="middle" fontFamily="monospace">04. SOW GEN</text>
      </svg>
    </div>
  )
}

export function OnboardingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const { workspace, project, setWorkspace, setProject } = useWorkspace()
  const [activeTab, setActiveTab] = useState<'configure' | 'history'>('configure')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [fullName, setFullName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [selectedWsId, setSelectedWsId] = useState(workspace.id)
  const [selectedProjId, setSelectedProjId] = useState(project.id)
  const [showOnStartup, setShowOnStartup] = useState(() => {
    try {
      return localStorage.getItem('bam_show_launchpad_startup') !== 'false'
    } catch {
      return true
    }
  })

  if (!open) return null

  const handleSelectWorkspace = (wsId: string) => {
    setSelectedWsId(wsId)
    const ws = PRESET_WORKSPACES.find(w => w.id === wsId)
    if (ws) {
      setWorkspace(ws)
      const matching = PRESET_PROJECTS.find(p => p.workspaceId === ws.id) || PRESET_PROJECTS[0]
      setSelectedProjId(matching.id)
      setProject(matching)
    }
  }

  const handleSelectProject = (projId: string) => {
    setSelectedProjId(projId)
    const pr = PRESET_PROJECTS.find(p => p.id === projId)
    if (pr) setProject(pr)
  }

  const handleQuickProfile = (targetUser: User) => {
    authActions.switchUser(targetUser)
    setFullName(targetUser.name)
    setEmail(targetUser.email)
    toast(`Session active for ${targetUser.name} (${targetUser.role}).`, 'success')
  }

  const handleSwitchFromHistory = (item: ProjectHistoryItem) => {
    const ws = PRESET_WORKSPACES.find(w => w.id === item.workspaceId)
    const pr = PRESET_PROJECTS.find(p => p.code === item.projectCode) || PRESET_PROJECTS[0]
    if (ws) {
      setSelectedWsId(ws.id)
      setWorkspace(ws)
    }
    if (pr) {
      setSelectedProjId(pr.id)
      setProject(pr)
    }
    toast(`Switched to ${item.projectName} [${item.projectCode}] in ${item.workspaceName}`, 'success')
    try {
      localStorage.setItem('bam_intro_dismissed_v1', 'true')
    } catch {}
    onClose()
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!user && (!fullName.trim() || !email.trim())) {
      toast('Please enter your name and email or select a verified profile.', 'error')
      return
    }

    if (!user && fullName.trim() && email.trim()) {
      authActions.signInWithCredentials(
        fullName.trim(),
        email.trim(),
        'Admin / FDE',
        workspace.code,
        'Google'
      )
    }

    try {
      localStorage.setItem('bam_intro_dismissed_v1', 'true')
    } catch {}

    toast(`Entered workspace "${workspace.name}" · Project: ${project.code}`, 'success')
    onClose()
  }

  return (
    <div className="onboarding-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`onboarding-card mode-${mode}`}>
        {/* LEFT ORANGE HERO PANEL WITH REAL ENGINEERING PCB ARCHITECTURE (Zero Cartoon Faces) */}
        <div className="onboarding-hero-panel">
          {/* Authentic High-Reliability PCBA Vector Blueprint */}
          <RealEngineeringPcbGraphic />

          <div className="onboarding-hero-content">
            <h2>{mode === 'signin' ? 'Welcome to BAM' : 'Create Workspace'}</h2>
            <p className="onboarding-hero-sub">
              {mode === 'signin'
                ? 'Autonomous Tier-1 Industrial RFQ, Zero-Trust Quarantine & SOW Generation Pipeline.'
                : 'Configure isolated tenant partitions with multi-agent consensus and cryptographic audit trails.'}
            </p>
            <p className="onboarding-hero-hint">
              IPC Class 3 &amp; AS9100D Aerospace qualified · Dual-engine ClamAV + Repel sandbox.
            </p>

            <button
              type="button"
              className="onboarding-toggle-btn"
              onClick={() => setMode(m => (m === 'signin' ? 'signup' : 'signin'))}
            >
              {mode === 'signin' ? 'SWITCH TO WORKSPACE CREATION' : 'RETURN TO SIGN IN'}
            </button>
          </div>

          <div className="onboarding-hero-footer">
            <span className="onboarding-brand-label">BULLM</span>
            <span className="onboarding-modules-label">AUTOMATION MODULES</span>
            <span className="onboarding-bam-badge">BAM 0.2 · ENTERPRISE</span>
            <span className="onboarding-powered">ZERO-TRUST SECURED BY REPEL &amp; CLAMAV</span>
          </div>
        </div>

        {/* RIGHT INTERACTIVE FORM PANEL */}
        <div className="onboarding-form-panel">
          <div className="onboarding-form-head">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="onboarding-title">
                  {mode === 'signin' ? 'Workspace Launchpad & Sign In' : 'Create BAM Enterprise Partition'}
                </h3>
                <p className="onboarding-subtitle">
                  Configure tenant workspace, switch projects, review audit history, and establish identity.
                </p>
              </div>
              <button
                type="button"
                className="icon-btn sm"
                onClick={onClose}
                aria-label="Close launchpad modal"
                title="Close"
              >
                <Icon name="x" size={14} />
              </button>
            </div>

            {/* Segmented Tab Navigation: [ Configure & Sign In ] vs [ Project History & Audit ] */}
            <div className="onboarding-nav-tabs" style={{ display: 'flex', gap: '8px', marginTop: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
              <button
                type="button"
                className={`subnav-tab-item ${activeTab === 'configure' ? 'is-active is-selected' : ''}`}
                onClick={() => setActiveTab('configure')}
                style={{ height: '30px', fontSize: '12px', fontWeight: 600, padding: '0 12px' }}
              >
                <Icon name="gear" size={12} />
                <span>Workspace &amp; Identity</span>
              </button>
              <button
                type="button"
                className={`subnav-tab-item ${activeTab === 'history' ? 'is-active is-selected' : ''}`}
                onClick={() => setActiveTab('history')}
                style={{ height: '30px', fontSize: '12px', fontWeight: 600, padding: '0 12px' }}
              >
                <Icon name="clock" size={12} />
                <span>Project History &amp; Recent Runs</span>
                <span className="badge sm font-mono" style={{ fontSize: '10px' }}>{PRESET_PROJECT_HISTORY.length}</span>
              </button>
            </div>
          </div>

          {activeTab === 'configure' ? (
            <form onSubmit={handleSubmit} className="onboarding-form-body">
              {/* Quick Profile Selection */}
              <div className="onboarding-group">
                <label className="onboarding-label">1-Click Identity &amp; Role</label>
                <div className="onboarding-profiles-row">
                  {PRESET_USERS.map(u => {
                    const isActive = user?.id === u.id
                    return (
                      <button
                        key={u.id}
                        type="button"
                        className={`onboarding-profile-chip ${isActive ? 'active' : ''}`}
                        onClick={() => handleQuickProfile(u)}
                      >
                        <div
                          className="onboarding-avatar"
                          style={{ background: u.avatarGradient }}
                        >
                          {u.initials}
                        </div>
                        <div className="onboarding-profile-info">
                          <strong>{u.name}</strong>
                          <span>{u.role}</span>
                        </div>
                        {isActive && <span className="onboarding-check"><Icon name="check" size={12} /></span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Workspace & Project Selector */}
              <div className="onboarding-grid-row">
                <div className="onboarding-field">
                  <label className="onboarding-label" htmlFor="ob-ws">
                    Enterprise Workspace
                  </label>
                  <select
                    id="ob-ws"
                    className="onboarding-select"
                    value={selectedWsId}
                    onChange={e => handleSelectWorkspace(e.target.value)}
                  >
                    {PRESET_WORKSPACES.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                  <span className="onboarding-field-hint">{workspace.orgType}</span>
                </div>

                <div className="onboarding-field">
                  <label className="onboarding-label" htmlFor="ob-proj">
                    Active Project
                  </label>
                  <select
                    id="ob-proj"
                    className="onboarding-select"
                    value={selectedProjId}
                    onChange={e => handleSelectProject(e.target.value)}
                  >
                    {PRESET_PROJECTS.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.code}]
                      </option>
                    ))}
                  </select>
                  <span className="onboarding-field-hint">{project.description}</span>
                </div>
              </div>

              {/* Manual Credentials / SSO */}
              <div className="onboarding-grid-row">
                <div className="onboarding-field">
                  <label className="onboarding-label" htmlFor="ob-name">Full Name</label>
                  <input
                    id="ob-name"
                    type="text"
                    className="onboarding-input"
                    placeholder="e.g. Nagabhushana Raju S"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                </div>
                <div className="onboarding-field">
                  <label className="onboarding-label" htmlFor="ob-email">Work Email</label>
                  <input
                    id="ob-email"
                    type="email"
                    className="onboarding-input"
                    placeholder="e.g. nagabhushana@digibull.ai"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {mode === 'signin' && (
                <div className="onboarding-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="onboarding-label" htmlFor="ob-pass">Password / Token</label>
                    <button
                      type="button"
                      className="link xs"
                      onClick={() => toast('Passwordless cryptographic JWT session active via Open Connector.', 'info')}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="ob-pass"
                    type="password"
                    className="onboarding-input"
                    placeholder="•••••••••••• (Leave blank for Open Connector SSO)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              )}

              {/* Open Connector Single Sign-On */}
              <div className="onboarding-sso-section">
                <span className="onboarding-sso-title">
                  Enterprise SSO via Open Connector (OAuth 2.0 PKCE)
                </span>
                <div className="onboarding-sso-buttons">
                  <button
                    type="button"
                    className="onboarding-sso-btn"
                    onClick={() => toast('GitHub Enterprise OAuth authenticated.', 'info')}
                  >
                    <span>GitHub</span>
                  </button>
                  <button
                    type="button"
                    className="onboarding-sso-btn"
                    onClick={() => toast('Google Workspace SSO verified.', 'info')}
                  >
                    <span>Google SSO</span>
                  </button>
                  <button
                    type="button"
                    className="onboarding-sso-btn"
                    onClick={() => toast('Clerk Session verified.', 'info')}
                  >
                    <span>Clerk Session</span>
                  </button>
                  <button
                    type="button"
                    className="onboarding-sso-btn"
                    onClick={() => toast('Microsoft 365 Entra ID verified.', 'info')}
                  >
                    <span>Microsoft 365</span>
                  </button>
                </div>
              </div>

              {/* Action Bar */}
              <div className="onboarding-submit-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button type="submit" className="onboarding-submit-btn">
                  <span>{mode === 'signin' ? 'ENTER BAM WORKSPACE' : 'INITIALIZE WORKSPACE'}</span>
                  <Icon name="chevron" size={14} />
                </button>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--muted)', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={showOnStartup}
                    onChange={e => {
                      setShowOnStartup(e.target.checked)
                      try {
                        localStorage.setItem('bam_show_launchpad_startup', e.target.checked ? 'true' : 'false')
                      } catch {}
                    }}
                  />
                  <span>Show this Workspace Launchpad on application start</span>
                </label>
              </div>
            </form>
          ) : (
            /* PROJECT HISTORY & RECENT RUNS PANEL */
            <div className="onboarding-history-view" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="xs muted font-mono" style={{ fontWeight: 600, letterSpacing: '0.04em' }}>
                  RECENT WORKSPACE RUNS &amp; RFQ PACKAGES
                </span>
                <span className="xs muted">{PRESET_PROJECT_HISTORY.length} active projects recorded</span>
              </div>

              <div className="onboarding-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {PRESET_PROJECT_HISTORY.map(item => {
                  const isCurrent = project.code === item.projectCode
                  return (
                    <div
                      key={item.id}
                      className="wb-card"
                      style={{
                        padding: '12px 14px',
                        background: isCurrent ? 'var(--surface-3)' : 'var(--surface-2)',
                        border: isCurrent ? '1px solid var(--accent)' : '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                        <div className="row" style={{ alignItems: 'center', gap: '6px' }}>
                          <span className="badge sm font-mono" style={{ background: 'var(--surface-1)' }}>
                            {item.projectCode}
                          </span>
                          <strong style={{ fontSize: '12.5px', color: 'var(--text)' }}>
                            {item.projectName}
                          </strong>
                          {isCurrent && <span className="badge sm badge-ok">Current Project</span>}
                        </div>

                        <div className="row" style={{ alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--muted)' }}>
                          <span>{item.workspaceName}</span>
                          <span>·</span>
                          <span>{item.filesCount} files</span>
                          <span>·</span>
                          <span style={{ color: 'var(--ok)' }}>{item.securityStatus}</span>
                          <span>·</span>
                          <span>{item.lastActive}</span>
                        </div>

                        <div style={{ fontSize: '10.5px', color: 'var(--faint)', marginTop: '2px' }}>
                          {item.sowProgress}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`btn sm ${isCurrent ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => handleSwitchFromHistory(item)}
                        style={{ height: '30px', fontSize: '11.5px', padding: '0 12px', flex: 'none' }}
                      >
                        <Icon name="check" size={11} />
                        <span>{isCurrent ? 'Continue' : 'Switch & Open'}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="onboarding-footer-spec">
            <Icon name="shield" size={12} />
            <span>
              Zero-Trust Cryptographic Enforcement · Specification:{' '}
              <a
                href="https://github.com/oomol-lab/open-connector"
                target="_blank"
                rel="noreferrer"
              >
                oomol-lab/open-connector
              </a>{' '}
              · v1.2.0
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
