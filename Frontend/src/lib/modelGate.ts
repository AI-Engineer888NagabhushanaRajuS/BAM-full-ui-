// Model & Inference Gating: Enforces model readiness across the pipeline.
// Blocks progression if no model is selected or if OpenRouter is active without credentials.

export interface ModelGateStatus {
  ready: boolean
  modelId: string
  modelName: string
  isFreeOrLocal: boolean
  requiresApiKey: boolean
  hasApiKey: boolean
  reason?: string
}

const LOCAL_MODELS = new Set(['laya-onnx', 'laya-multilingual', 'jev-system-one-simulated'])

export function getModelGateStatus(): ModelGateStatus {
  let modelId = 'laya-onnx'
  let apiKey = ''

  try {
    if (typeof localStorage !== 'undefined') {
      modelId = localStorage.getItem('bam_active_model') || 'laya-onnx'
      apiKey = localStorage.getItem('bam_openrouter_key')?.trim() || ''
    }
  } catch {}

  const isLocal = LOCAL_MODELS.has(modelId)
  const isFree = modelId.endsWith(':free')
  const isFreeOrLocal = isLocal || isFree
  const requiresApiKey = !isLocal // Cloud and free OpenRouter models need key unless using local Laya
  const hasApiKey = !!apiKey

  // If local model is selected, it's always ready with 0 API key required
  if (isLocal) {
    return {
      ready: true,
      modelId,
      modelName: modelId === 'laya-onnx' ? 'Laya ModernBERT ONNX (Local)' : 'Jev System-1 Calibrated Engine',
      isFreeOrLocal: true,
      requiresApiKey: false,
      hasApiKey,
    }
  }

  // If an OpenRouter model is chosen (free or cloud), check for API key
  if (!isLocal && !hasApiKey) {
    return {
      ready: false,
      modelId,
      modelName: isFree ? `${modelId.split('/')[1]?.replace(':free', '') || modelId} [Free]` : modelId,
      isFreeOrLocal: false,
      requiresApiKey: true,
      hasApiKey: false,
      reason: isFree
        ? 'OpenRouter free model selected. Please provide your OpenRouter API key, or switch to Local Laya ONNX.'
        : 'OpenRouter API key required for cloud models. Connect key or switch to Local Laya ONNX.',
    }
  }

  return {
    ready: true,
    modelId,
    modelName: isFree ? `${modelId.split('/')[1]?.replace(':free', '') || modelId} [Free]` : modelId,
    isFreeOrLocal,
    requiresApiKey,
    hasApiKey,
  }
}
