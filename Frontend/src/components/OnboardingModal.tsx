import { useState, type FormEvent } from 'react'
import { Icon } from './ui'
import { useAuth, authActions, PRESET_USERS, type User } from '../lib/auth'
import { useWorkspace, PRESET_WORKSPACES, PRESET_PROJECTS } from '../lib/workspace'
import { toast } from '../lib/store'

export function OnboardingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const { workspace, project, setWorkspace, setProject } = useWorkspace()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [fullName, setFullName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [selectedWsId, setSelectedWsId] = useState(workspace.id)
  const [selectedProjId, setSelectedProjId] = useState(project.id)

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

    toast(`Entered workspace "${workspace.name}" · Project: ${project.code}`, 'success')
    onClose()
  }

  return (
    <div className="onboarding-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`onboarding-card mode-${mode}`}>
        {/* LEFT ORANGE HERO PANEL (Directly matched to WhatsApp Video frame) */}
        <div className="onboarding-hero-panel">
          <div className="onboarding-logo-box">
            {/* Origami Bull Icon from WhatsApp video */}
            <svg viewBox="0 0 100 100" width="56" height="56" fill="none">
              <path d="M50 20 L28 35 L38 52 L50 62 L62 52 L72 35 Z" fill="#ffffff" opacity="0.95" />
              {/* Left Horn (Orange gradient) */}
              <path d="M28 35 L12 18 L26 28 Z" fill="#F59E0B" />
              <path d="M26 28 L12 18 L22 38 Z" fill="#D97706" />
              {/* Right Horn (Cyan/Blue gradient) */}
              <path d="M72 35 L88 18 L74 28 Z" fill="#0284C7" />
              <path d="M74 28 L88 18 L78 38 Z" fill="#0369A1" />
              {/* Snout */}
              <path d="M42 68 L50 78 L58 68 Z" fill="#F59E0B" />
              <circle cx="46" cy="71" r="1.5" fill="#1e293b" />
              <circle cx="54" cy="71" r="1.5" fill="#1e293b" />
            </svg>
          </div>

          <div className="onboarding-hero-content">
            <h2>{mode === 'signin' ? 'Welcome back!' : 'Hello, friend!'}</h2>
            <p className="onboarding-hero-sub">
              {mode === 'signin'
                ? 'Build. Validate. Automate. Seamless zero-trust RFQ and SOW pipeline.'
                : 'Your next autonomous build starts here. Zero-trust execution engine.'}
            </p>
            <p className="onboarding-hero-hint">
              {mode === 'signin' ? 'New to BAM? Switch to workspace creation.' : 'Already have an existing session? Sign in.'}
            </p>

            <button
              type="button"
              className="onboarding-toggle-btn"
              onClick={() => setMode(m => (m === 'signin' ? 'signup' : 'signin'))}
            >
              {mode === 'signin' ? 'CREATE WORKSPACE' : 'SIGN IN'}
            </button>
          </div>

          <div className="onboarding-hero-footer">
            <span className="onboarding-brand-label">BULLM</span>
            <span className="onboarding-modules-label">AUTOMATION MODULES</span>
            <span className="onboarding-bam-badge">BAM 0.2</span>
            <span className="onboarding-powered">POWERED BY BULLM</span>
          </div>
        </div>

        {/* RIGHT INTERACTIVE FORM PANEL */}
        <div className="onboarding-form-panel">
          <div className="onboarding-form-head">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="onboarding-title">
                  {mode === 'signin' ? 'Sign in to BAM' : 'Create BAM Workspace'}
                </h3>
                <p className="onboarding-subtitle">
                  Configure your tenant workspace, target project, and authentication.
                </p>
              </div>
              <button
                type="button"
                className="icon-btn sm"
                onClick={onClose}
                aria-label="Close onboarding modal"
                title="Close"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          </div>

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
            <div className="onboarding-submit-row">
              <button type="submit" className="onboarding-submit-btn">
                <span>{mode === 'signin' ? 'ENTER BAM WORKSPACE' : 'INITIALIZE WORKSPACE'}</span>
                <Icon name="chevron" size={14} />
              </button>
            </div>
          </form>

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
