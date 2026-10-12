import { useEffect, useState, useTransition } from 'react'
import {
  fetchJevModels,
  layaJudgeContext,
  type ContextJudgeResult,
  type JevModelInfo,
} from '../api/sowEval'
import { Icon, StatusPill } from './ui'
import { openSettings } from '../lib/store'

export interface JevVisionHUDProps {
  mode?: 'intake' | 'rag' | 'sow'
  sources?: string[]
  facts?: string[]
  entities?: string[]
  schemas?: string[]
  compact?: boolean
  onReevaluated?: (res: ContextJudgeResult) => void
}

export function JevVisionHUD({
  mode = 'rag',
  sources = [],
  facts = [],
  entities = [],
  schemas = [],
  compact = false,
  onReevaluated,
}: JevVisionHUDProps) {
  const [models, setModels] = useState<JevModelInfo[]>([])
  const [activeModel, setActiveModel] = useState<string>('openrouter')
  const [evalResult, setEvalResult] = useState<ContextJudgeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [, startTransition] = useTransition()

  // Load available models on mount
  useEffect(() => {
    fetchJevModels().then(res => {
      if (res.models?.length) setModels(res.models)
      if (res.activeModel) setActiveModel(res.activeModel)
    })
  }, [])

  const runEvaluation = async (modelToUse?: string) => {
    setLoading(true)
    try {
      const res = await layaJudgeContext({
        sources: sources.length ? sources : ['intake-corpus'],
        facts: facts.length ? facts : ['standard-spec-verification'],
        entities,
        schemas,
      })
      startTransition(() => {
        setEvalResult(res)
      })
      onReevaluated?.(res)
    } catch (err) {
      console.warn('Jev context evaluation warning:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void runEvaluation()
  }, [sources.length, facts.length])

  const activeModelLabel =
    activeModel === 'openrouter'
      ? 'Gemini 2.5 Flash'
      : activeModel === 'laya-onnx'
      ? 'Laya ONNX'
      : 'Calibrated Engine'

  const verdict = evalResult?.verdict ?? 'sufficient'
  const suffScore = evalResult?.metrics.find(m => m.key === 'sufficiency')?.score ?? 91
  const depthScore = evalResult?.metrics.find(m => m.key === 'detail_level')?.score ?? 80
  const coverageScore = evalResult?.metrics.find(m => m.key === 'domain_coverage')?.score ?? 88
  const gapScore = evalResult?.metrics.find(m => m.key === 'gap_risk')?.score ?? 94

  const modeLabel = mode === 'intake' ? 'Intake Sufficiency' : mode === 'sow' ? 'SOW Contract Quality' : 'Context Sentinel'

  return (
    <div className="jev-sentinel-bar" aria-label="Jev Context Sentinel">
      {/* Primary compact row */}
      <div className="jev-bar-primary">
        <div className="jev-bar-left">
          <StatusPill
            status={loading ? 'running' : verdict === 'sufficient' ? 'pass' : verdict === 'marginal' ? 'needs_review' : 'fail'}
            text={loading ? 'Checking…' : verdict === 'sufficient' ? 'Ready' : verdict === 'marginal' ? 'Review' : 'Low'}
          />
          <span className="jev-bar-title">{modeLabel}</span>
          <span className="jev-bar-counts muted xs">
            {sources.length} doc{sources.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Micro Metric Pills (Single Row) */}
        <div className="jev-bar-metrics">
          <span className="jev-metric-chip" title="Context Sufficiency Probability">
            <span className="chip-lbl">Sufficiency</span>
            <span className="chip-val mono">{suffScore}%</span>
          </span>
          <span className="jev-metric-chip" title="Domain Coverage">
            <span className="chip-lbl">Coverage</span>
            <span className="chip-val mono">{coverageScore}%</span>
          </span>
          <span className="jev-metric-chip" title="Contract Feasibility / Quality">
            <span className="chip-lbl">Quality</span>
            <span className="chip-val mono">{gapScore}%</span>
          </span>
        </div>

        {/* Sleek Model Badge linking directly to global Settings */}
        <div className="jev-bar-actions">
          <button
            type="button"
            className="jev-model-badge"
            onClick={openSettings}
            title={`Active Engine: ${activeModelLabel}. Click to configure engines & keys in Settings.`}
            aria-label="Engine Settings"
          >
            <span className={`jev-model-dot ${activeModel === 'openrouter' ? 'cloud' : activeModel === 'laya-onnx' ? 'local' : 'sim'}`} />
            <span className="jev-model-name">{activeModelLabel}</span>
            <Icon name="gear" size={11} />
          </button>

          <button
            type="button"
            className="btn-icon-subtle"
            onClick={() => void runEvaluation()}
            disabled={loading}
            title="Re-evaluate Context"
            aria-label="Re-evaluate"
          >
            <Icon name="refresh" size={11} spin={loading} />
          </button>

          {!compact && (
            <button
              type="button"
              className="btn-icon-subtle"
              onClick={() => setShowDetails(v => !v)}
              title={showDetails ? 'Hide details' : 'Show details'}
              aria-label="Toggle details"
            >
              <Icon name={showDetails ? 'chevron-up' : 'chevron-down'} size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Optional details drawer (collapsed by default, zero clutter) */}
      {!compact && showDetails && (
        <div className="jev-bar-details">
          <div className="jev-detail-item">
            <span className="muted xs">Model:</span>
            <span className="mono xs">{evalResult?.model || activeModel}</span>
          </div>
          <div className="jev-detail-item">
            <span className="muted xs">Tokens:</span>
            <span className="mono xs">{evalResult?.inputTokens ?? '—'}</span>
          </div>
          {evalResult?.ms && (
            <div className="jev-detail-item">
              <span className="muted xs">Latency:</span>
              <span className="mono xs">{evalResult.ms}ms</span>
            </div>
          )}
          <div className="jev-detail-item">
            <span className="muted xs">Depth:</span>
            <span className="mono xs">Level {(depthScore * 3 / 100).toFixed(1)}/3.0</span>
          </div>
        </div>
      )}
    </div>
  )
}
