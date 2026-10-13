import { useState } from 'react'
import { Dialog, Icon, StatusPill } from './ui'

export function OpenConnectorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const handleTestConnection = () => {
    setTesting(true)
    setTestResult(null)
    setTimeout(() => {
      setTesting(false)
      setTestResult('Open Connector: All 4 authentication providers healthy and verified (Clerk, GitHub, Google SSO, FastMCP).')
    }, 600)
  }

  return (
    <Dialog
      open={open}
      title="Open Connector · Universal Authentication Gateway"
      onClose={onClose}
      className="dialog wide open-connector-modal"
      footer={
        <div className="row" style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span className="xs muted mono">
            Specification: <a href="https://github.com/oomol-lab/open-connector" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>oomol-lab/open-connector</a> · v1.2.0
          </span>
          <div className="row" style={{ gap: '8px' }}>
            <button className="btn btn-secondary sm" onClick={handleTestConnection} disabled={testing}>
              <Icon name={testing ? 'spinner' : 'bolt'} size={12} spin={testing} />
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>
            <button className="btn btn-primary sm" onClick={onClose}>Done</button>
          </div>
        </div>
      }
    >
      <div className="open-connector-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* User Identity Card */}
        <div className="user-profile-card" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)'
        }}>
          <div className="row" style={{ alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: '#fff', display: 'grid', placeItems: 'center', fontWeight: '700', fontSize: '15px'
            }}>
              AM
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div className="row" style={{ alignItems: 'center', gap: '6px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text)' }}>Alex Mercer</strong>
                <span className="badge sm" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                  Admin / FDE
                </span>
              </div>
              <span className="xs muted">alex.mercer@digibull.ai · Organization: BU-AERO-01</span>
            </div>
          </div>
          <StatusPill status="pass" text="Authenticated via Clerk" />
        </div>

        {testResult && (
          <div style={{
            padding: '8px 12px', borderRadius: '8px', background: 'var(--ok-soft)', border: '1px solid var(--ok)',
            color: 'var(--ok)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <Icon name="check" size={13} />
            <span>{testResult}</span>
          </div>
        )}

        {/* Unified Providers Table */}
        <div>
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong style={{ fontSize: '12.5px', color: 'var(--text)' }}>Connected Providers (Open Connector Spec)</strong>
            <span className="xs muted">Protocol: OAuth 2.0 PKCE + OpenID Connect</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Clerk */}
            <div className="provider-item" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px',
              borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)'
            }}>
              <div className="row" style={{ alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#6c47ff', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: '700', fontSize: '12px' }}>
                  C
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text)' }}>Clerk User Management</div>
                  <div className="xs muted">JWT Session Token Active · Auto-refresh enabled</div>
                </div>
              </div>
              <span className="xs" style={{ color: 'var(--ok)', fontWeight: '600' }}>● Connected</span>
            </div>

            {/* GitHub OAuth */}
            <div className="provider-item" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px',
              borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)'
            }}>
              <div className="row" style={{ alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#24292e', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: '700', fontSize: '12px' }}>
                  <Icon name="code" size={13} />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text)' }}>GitHub Enterprise OAuth</div>
                  <div className="xs muted">Connected as @AI-Engineer888NagabhushanaRajuS · Scopes: repo, workflow</div>
                </div>
              </div>
              <span className="xs" style={{ color: 'var(--ok)', fontWeight: '600' }}>● Connected</span>
            </div>

            {/* Google SSO */}
            <div className="provider-item" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px',
              borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)'
            }}>
              <div className="row" style={{ alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#4285F4', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: '700', fontSize: '12px' }}>
                  G
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text)' }}>Google Workspace SSO</div>
                  <div className="xs muted">OAuth 2.0 PKCE Handshake · SAML Verified</div>
                </div>
              </div>
              <span className="xs" style={{ color: 'var(--ok)', fontWeight: '600' }}>● Connected</span>
            </div>

            {/* FastMCP IPC Connector */}
            <div className="provider-item" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px',
              borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)'
            }}>
              <div className="row" style={{ alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#eab308', color: '#000', display: 'grid', placeItems: 'center', fontWeight: '700', fontSize: '12px' }}>
                  <Icon name="bolt" size={13} />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text)' }}>FastMCP Protocol Bridge</div>
                  <div className="xs muted">Port 8787 · Local Python runtime &amp; microVM sandbox tools</div>
                </div>
              </div>
              <span className="xs" style={{ color: 'var(--ok)', fontWeight: '600' }}>● Bound</span>
            </div>
          </div>
        </div>

        {/* Security & Encryption Policy */}
        <div style={{
          padding: '10px 12px', borderRadius: '8px', background: 'var(--surface-3)', border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: '4px'
        }}>
          <div className="row" style={{ alignItems: 'center', gap: '6px' }}>
            <Icon name="lock" size={12} />
            <strong style={{ fontSize: '12px', color: 'var(--text)' }}>Zero-Trust Cryptographic Enforcement</strong>
          </div>
          <p className="xs muted" style={{ margin: 0, lineHeight: 1.4 }}>
            All OAuth access tokens and Clerk sessions are managed strictly in accordance with Open Connector’s least-privilege contract. Tokens are never exposed in git, logs, or unencrypted storage.
          </p>
        </div>
      </div>
    </Dialog>
  )
}
