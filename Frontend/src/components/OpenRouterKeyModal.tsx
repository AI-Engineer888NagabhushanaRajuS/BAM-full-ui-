import { useState, useEffect } from 'react'
import { Dialog, Icon, StatusPill } from './ui'
import { toast } from '../lib/store'

export interface ModelOption {
  id: string
  name: string
  tier: 'free' | 'onnx' | 'cloud' | 'calibrated'
  desc: string
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'laya-onnx', name: 'Laya Decision v1 (ModernBERT ONNX Local)', tier: 'onnx', desc: 'Real local ONNX neural network decision model from convaiinnovations/laya (Always online, zero API costs)' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B Instruct [Free]', tier: 'free', desc: 'Meta Llama 3.3 70B flagship parameter model via OpenRouter Free Tier' },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash Exp [Free]', tier: 'free', desc: 'Google Gemini 2.0 Flash Experimental via OpenRouter Free Tier' },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 Reasoning [Free]', tier: 'free', desc: 'DeepSeek R1 full reasoning chain via OpenRouter Free Tier' },
  { id: 'qwen/qwen-2.5-72b-instruct:free', name: 'Qwen 2.5 72B Instruct [Free]', tier: 'free', desc: 'Alibaba Qwen 2.5 72B via OpenRouter Free Tier' },
  { id: 'liquid/lfm-2.5-2.6b:free', name: 'Liquid LFM 2.5B [Free]', tier: 'free', desc: 'Liquid AI lightweight foundational model [Free]' },
  { id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nvidia Nemotron 3.5 [Free]', tier: 'free', desc: 'Nvidia Nemotron 3.5 Lightning via OpenRouter Free Tier' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (Cloud Standard)', tier: 'cloud', desc: 'Google Gemini 2.5 Flash production model via OpenRouter API' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Cloud Standard)', tier: 'cloud', desc: 'OpenAI GPT-4o-mini fast decision engine' },
  { id: 'laya-multilingual', name: 'Laya Multilingual Decision (ModernBERT)', tier: 'onnx', desc: 'Multilingual checkpoint variant for cross-lingual requirements' },
  { id: 'jev-system-one-simulated', name: 'Jev System-1 Calibrated Engine (Fast)', tier: 'calibrated', desc: 'Ultra-fast calibrated System-1 decision engine matching ModernBERT calibration curves' },
]

export function OpenRouterKeyModal({ open, onClose, onModelChanged }: { open: boolean; onClose: () => void; onModelChanged?: (modelId: string) => void }) {
  const [apiKey, setApiKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('laya-onnx')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ valid?: boolean; error?: string; message?: string } | null>(null)

  useEffect(() => {
    if (open) {
      try {
        const key = localStorage.getItem('bam_openrouter_key') || ''
        setApiKey(key)
        const savedModel = localStorage.getItem('bam_active_model') || 'laya-onnx'
        setSelectedModel(savedModel)
      } catch {}
      setTestResult(null)
    }
  }, [open])

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestResult({ valid: false, error: 'Enter an OpenRouter API key first to test connection.' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/laya/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      })
      const data = await res.json()
      if (data.valid) {
        setTestResult({ valid: true, message: 'OpenRouter API key is verified and ready for cloud & free models!' })
      } else {
        setTestResult({ valid: false, error: data.error || 'Authentication failed. Check your OpenRouter API key.' })
      }
    } catch (err) {
      setTestResult({ valid: false, error: (err as Error).message })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    try {
      localStorage.setItem('bam_openrouter_key', apiKey.trim())
      localStorage.setItem('bam_active_model', selectedModel)
      await fetch('/laya/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), model: selectedModel }),
      }).catch(() => null)
      await fetch('/laya/select-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel }),
      }).catch(() => null)
      onModelChanged?.(selectedModel)
      toast(`Engine settings saved: Active model is ${AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || selectedModel}`, 'success')
      onClose()
    } catch (err) {
      toast(`Failed to save settings: ${(err as Error).message}`, 'error')
    }
  }

  return (
    <Dialog
      open={open}
      title="LLM Engines & OpenRouter Free Models"
      onClose={onClose}
      className="dialog wide openrouter-modal"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <button className="btn btn-secondary sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary sm" onClick={handleSave}>
            <Icon name="check" size={12} />
            <span>Save &amp; Apply Engine</span>
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p className="sm muted" style={{ margin: 0 }}>
          Configure inference engines for Cognee GraphRAG pre-flight verification, FDE Q&amp;A, and ISATVON SOW accuracy evaluation. Choose between zero-cost local ONNX (Laya), OpenRouter Free Models, or cloud standard models.
        </p>

        {/* Model Selector Card */}
        <div className="wb-card" style={{ padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text)' }}>
            Active AI Engine / Model
          </label>
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <optgroup label="Local Neural Decision Model (Free &amp; Offline)">
              <option value="laya-onnx">Laya Decision v1 (ModernBERT ONNX Local) — Active &amp; Verified</option>
              <option value="laya-multilingual">Laya Multilingual Decision (ModernBERT ONNX)</option>
              <option value="jev-system-one-simulated">Jev System-1 Calibrated Engine</option>
            </optgroup>
            <optgroup label="OpenRouter Free Models (Zero Cost)">
              <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B Instruct [Free]</option>
              <option value="google/gemini-2.0-flash-exp:free">Gemini 2.0 Flash Exp [Free]</option>
              <option value="deepseek/deepseek-r1:free">DeepSeek R1 Reasoning [Free]</option>
              <option value="qwen/qwen-2.5-72b-instruct:free">Qwen 2.5 72B Instruct [Free]</option>
              <option value="liquid/lfm-2.5-2.6b:free">Liquid LFM 2.5B [Free]</option>
              <option value="nvidia/nemotron-3.5-lightning:free">Nvidia Nemotron 3.5 [Free]</option>
            </optgroup>
            <optgroup label="Cloud Standard Models">
              <option value="google/gemini-2.5-flash">Google Gemini 2.5 Flash</option>
              <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini</option>
            </optgroup>
          </select>
          <p className="xs muted" style={{ marginTop: '6px', marginBottom: 0 }}>
            {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.desc}
          </p>
        </div>

        {/* API Key Configuration Card */}
        <div className="wb-card" style={{ padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
              OpenRouter API Key (Optional for Local Laya)
            </label>
            <span className="badge sm" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>
              {apiKey.trim() ? 'Configured' : 'Local Only'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="password"
              placeholder="sk-or-v1-..."
              value={apiKey}
              onChange={e => {
                setApiKey(e.target.value)
                setTestResult(null)
              }}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontFamily: 'monospace',
                fontSize: '12px',
              }}
            />
            <button
              type="button"
              className="btn btn-secondary sm"
              onClick={handleTestKey}
              disabled={testing || !apiKey.trim()}
              style={{ whiteSpace: 'nowrap' }}
            >
              <Icon name={testing ? 'spinner' : 'bolt'} size={12} spin={testing} />
              <span>{testing ? 'Testing…' : 'Test Key'}</span>
            </button>
          </div>

          {testResult && (
            <div style={{
              marginTop: '8px',
              padding: '8px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: testResult.valid ? 'color-mix(in srgb, var(--accent) 10%, var(--surface))' : 'color-mix(in srgb, var(--warn) 10%, var(--surface))',
              border: `1px solid ${testResult.valid ? 'var(--accent)' : 'var(--warn)'}`,
              color: testResult.valid ? 'var(--accent)' : 'var(--warn)',
            }}>
              <Icon name={testResult.valid ? 'check' : 'alert'} size={13} />
              <span>{testResult.message || testResult.error}</span>
            </div>
          )}

          <p className="xs muted" style={{ marginTop: '8px', marginBottom: 0, lineHeight: 1.4 }}>
            💡 Free OpenRouter models require a valid free-tier OpenRouter account key. If no key is provided, the system runs with <strong>Local ONNX Laya (ModernBERT fp32)</strong> completely offline with zero latency and zero cost.
          </p>
        </div>
      </div>
    </Dialog>
  )
}
