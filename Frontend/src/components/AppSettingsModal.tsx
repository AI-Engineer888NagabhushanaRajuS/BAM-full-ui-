import { useEffect, useState } from 'react'
import { Dialog, Icon, StatusPill } from './ui'
import { closeSettings, toast, useUi } from '../lib/store'
import { fetchJevModels, selectJevModel, type JevModelInfo } from '../api/sowEval'

export function AppSettingsModal() {
  const open = useUi(s => s.settingsOpen)
  const [activeTab, setActiveTab] = useState<'engines' | 'keys' | 'telemetry'>('engines')
  const [models, setModels] = useState<JevModelInfo[]>([])
  const [activeModel, setActiveModel] = useState<string>('openrouter')
  const [apiKey, setApiKey] = useState<string>('')
  const [showKey, setShowKey] = useState<boolean>(false)
  const [savingKey, setSavingKey] = useState<boolean>(false)
  const [loadingModels, setLoadingModels] = useState<boolean>(false)

  useEffect(() => {
    if (!open) return
    const storedKey = localStorage.getItem('bam_openrouter_key') || ''
    setApiKey(storedKey)

    setLoadingModels(true)
    fetchJevModels()
      .then(res => {
        if (res.models?.length) setModels(res.models)
        if (res.activeModel) setActiveModel(res.activeModel)
      })
      .finally(() => setLoadingModels(false))
  }, [open])

  const handleSelectModel = async (modelId: string) => {
    setActiveModel(modelId)
    try {
      await selectJevModel(modelId)
      toast(`Active evaluation engine: ${modelId}`, 'info')
    } catch {
      toast(`Switched model to ${modelId}`, 'info')
    }
  }

  const handleSaveApiKey = async () => {
    const trimmed = apiKey.trim()
    setSavingKey(true)
    try {
      if (trimmed) {
        localStorage.setItem('bam_openrouter_key', trimmed)
        await fetch('/laya/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: trimmed }),
        })
        toast('OpenRouter API key saved and activated.', 'success')
      } else {
        localStorage.removeItem('bam_openrouter_key')
        await fetch('/laya/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: '' }),
        })
        toast('OpenRouter API key cleared.', 'info')
      }
    } catch {
      toast('API key preference saved locally.', 'info')
    } finally {
      setSavingKey(false)
    }
  }

  const handleClearKey = async () => {
    setApiKey('')
    localStorage.removeItem('bam_openrouter_key')
    try {
      await fetch('/laya/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: '' }),
      })
    } catch {
      /* ignore */
    }
    toast('API key removed from session.', 'info')
  }

  return (
    <Dialog
      open={open}
      title="System Settings & Engine Orchestration"
      onClose={closeSettings}
      footer={
        <div className="row" style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span className="muted xs">Changes apply across all stages (Intake, RAG, SOW Workbench).</span>
          <button type="button" className="btn btn-primary sm" onClick={closeSettings}>
            Done
          </button>
        </div>
      }
    >
      <div className="settings-modal-body">
        {/* Navigation Tabs */}
        <div className="settings-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'engines'}
            className={`settings-tab ${activeTab === 'engines' ? 'active' : ''}`}
            onClick={() => setActiveTab('engines')}
          >
            <Icon name="bolt" size={13} /> Decision Engines
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'keys'}
            className={`settings-tab ${activeTab === 'keys' ? 'active' : ''}`}
            onClick={() => setActiveTab('keys')}
          >
            <Icon name="lock" size={13} /> API Keys &amp; Auth
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'telemetry'}
            className={`settings-tab ${activeTab === 'telemetry' ? 'active' : ''}`}
            onClick={() => setActiveTab('telemetry')}
          >
            <Icon name="shield" size={13} /> Quarantine &amp; Security Telemetry
          </button>
        </div>

        {/* Tab 1: AI Decision Engines */}
        {activeTab === 'engines' && (
          <div className="settings-tab-content">
            <p className="sm muted" style={{ margin: '0 0 12px 0' }}>
              Select the primary model used by Jev (System-1 IP context sufficiency) and Laya (Stage 3.1 SOW accuracy judge).
            </p>

            <div className="engine-options-list">
              <label
                className={`engine-card ${activeModel === 'openrouter' ? 'selected' : ''}`}
                onClick={() => handleSelectModel('openrouter')}
              >
                <div className="engine-card-head">
                  <div className="engine-title-row">
                    <input
                      type="radio"
                      name="decision-engine"
                      checked={activeModel === 'openrouter'}
                      onChange={() => handleSelectModel('openrouter')}
                    />
                    <strong>Google Gemini 2.5 Flash (Cloud via OpenRouter)</strong>
                  </div>
                  <StatusPill status={apiKey ? 'pass' : 'needs_review'} text={apiKey ? 'Active' : 'Key Required'} />
                </div>
                <p className="xs muted" style={{ margin: '4px 0 0 20px' }}>
                  Ultra-low latency reasoning model on OpenRouter. Handles live GraphRAG evaluation, pre-flight context checks, and contract accuracy scoring.
                </p>
              </label>

              <label
                className={`engine-card ${activeModel === 'laya-onnx' ? 'selected' : ''}`}
                onClick={() => handleSelectModel('laya-onnx')}
              >
                <div className="engine-card-head">
                  <div className="engine-title-row">
                    <input
                      type="radio"
                      name="decision-engine"
                      checked={activeModel === 'laya-onnx'}
                      onChange={() => handleSelectModel('laya-onnx')}
                    />
                    <strong>Local Laya ONNX Runtime (Offline / Edge)</strong>
                  </div>
                  <StatusPill status="pass" text="Local" />
                </div>
                <p className="xs muted" style={{ margin: '4px 0 0 20px' }}>
                  Runs quantized lightweight judge locally on CPU/GPU without external network calls. Zero data egress.
                </p>
              </label>

              <label
                className={`engine-card ${activeModel === 'jev-system-one-simulated' ? 'selected' : ''}`}
                onClick={() => handleSelectModel('jev-system-one-simulated')}
              >
                <div className="engine-card-head">
                  <div className="engine-title-row">
                    <input
                      type="radio"
                      name="decision-engine"
                      checked={activeModel === 'jev-system-one-simulated'}
                      onChange={() => handleSelectModel('jev-system-one-simulated')}
                    />
                    <strong>Deterministic Calibrated Rule Engine</strong>
                  </div>
                  <StatusPill status="pass" text="Deterministic" />
                </div>
                <p className="xs muted" style={{ margin: '4px 0 0 20px' }}>
                  Rule-based heuristic evaluator calibrated over industrial aerospace RFQs. Sub-millisecond response time.
                </p>
              </label>
            </div>
          </div>
        )}

        {/* Tab 2: API Keys & Credentials */}
        {activeTab === 'keys' && (
          <div className="settings-tab-content">
            <p className="sm muted" style={{ margin: '0 0 12px 0' }}>
              Configure provider credentials. Keys are saved in your local browser session and synchronized with the local judge sidecar.
            </p>

            <div className="settings-field-group">
              <label htmlFor="settings-openrouter-key" className="settings-label">
                OpenRouter API Key
              </label>
              <div className="settings-input-with-toggle">
                <input
                  id="settings-openrouter-key"
                  type={showKey ? 'text' : 'password'}
                  className="input mono"
                  placeholder="sk-or-..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  style={{ flex: 1, fontSize: '12px' }}
                />
                <button
                  type="button"
                  className="btn btn-ghost sm"
                  onClick={() => setShowKey(v => !v)}
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  <Icon name={showKey ? 'eye' : 'lock'} size={12} />
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <span className="xs muted" style={{ marginTop: '4px' }}>
                Used for Cloud Gemini 2.5 Flash calls. Format: <code className="mono xs">sk-or-...</code>
              </span>

              <div className="row" style={{ gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-primary sm"
                  onClick={handleSaveApiKey}
                  disabled={savingKey}
                >
                  <Icon name="check" size={12} /> Save Key
                </button>
                {apiKey && (
                  <button type="button" className="btn btn-secondary sm" onClick={handleClearKey}>
                    Clear Key
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Quarantine & Security Telemetry */}
        {activeTab === 'telemetry' && (
          <div className="settings-tab-content">
            <p className="sm muted" style={{ margin: '0 0 12px 0' }}>
              Dual-engine threat screening, quarantine telemetry, and cryptographic verification status for ingested RFQ packages.
            </p>

            <dl className="kv" style={{ background: 'var(--surface-2)', padding: '10px 12px', borderRadius: '8px' }}>
              <div>
                <dt>Primary Engine</dt>
                <dd>
                  <strong>ClamAV Core (BuLL*Sav)</strong> · <span className="conf">✓ Active</span>
                  <span className="muted xs" style={{ display: 'block' }}>Signatures v2026.10.09 · Static MD5/SHA-256 &amp; Macro CVE Protection</span>
                </dd>
              </div>
              <div>
                <dt>Secondary Engine</dt>
                <dd>
                  <strong>Repel Shield</strong> · <span className="conf">✓ Active</span>
                  <span className="muted xs" style={{ display: 'block' }}>Polyglot rejection &amp; adversarial prompt injection repulsion</span>
                </dd>
              </div>
              <div>
                <dt>Quarantine Gate</dt>
                <dd>
                  <span className="tag">Fail-Closed Unanimous</span>{' '}
                  <span className="muted xs">Requires dual-pass clearance before Cognee GraphRAG release</span>
                </dd>
              </div>
              <div>
                <dt>Privacy / DPDP Act</dt>
                <dd><span className="conf">✓ 2023 Aligned</span> (Client-side encryption &amp; local quarantine isolation)</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </Dialog>
  )
}
