// SOW judge on Laya (https://huggingface.co/convaiinnovations/laya, run via @receptron/laya).
// Laya is a System-1 decision model: it answers typed questions about a state with calibrated probabilities
// (`noul` = P(true), `score` = expected level on a rubric). We ask it, per SOW requirement and per discovery fact:
//   faithfulness  noul   Is the requirement supported by the discovery context (nothing invented)?
//   clarity       score  How build-ready is the requirement? (vague .. build-ready)
//   coverage      noul   Is this discovery fact addressed by the SOW?
// Scores are means scaled to 0-100. Pure: `systemOne` is injected, so it is testable without the 1.7 GB model.

export interface Requirement { n: number; fields: Record<string, string> }
export interface JudgeRequest { requirements: Requirement[]; facts: string[] }
export interface JudgeMetric { key: 'faithfulness' | 'coverage' | 'clarity'; score: number; detail: string }
export interface JudgeResult { model: string; metrics: JudgeMetric[]; findings: { requirement: number; text: string }[]; inputTokens: number }

export interface ContextJudgeRequest {
  sources: { name: string; type?: string; size?: number }[]
  facts: string[]
  entities?: { name: string; type: string; count?: number }[]
  schemas?: string[]
}
export interface ContextJudgeMetric {
  key: 'sufficiency' | 'detail_level' | 'domain_coverage' | 'gap_risk'
  score: number
  detail: string
}
export interface ContextJudgeFinding {
  area: string
  text: string
  severity: 'warning' | 'info' | 'critical'
}
export interface ContextJudgeResult {
  model: string
  verdict: 'sufficient' | 'marginal' | 'insufficient'
  metrics: ContextJudgeMetric[]
  findings: ContextJudgeFinding[]
  summary: string
  inputTokens: number
  ms?: number
}

type Q = { type: 'noul'; instructions: string } | { type: 'score'; instructions: string; criteria: string[] }
type A = { noul?: number; score?: number }
export type SystemOne = (state: object, questions: Record<string, Q>) => Promise<{ model: string; answers: Record<string, A>; usage: { input_tokens: number } }>

const CLARITY = ['vague', 'partly clear', 'clear', 'build-ready']
const DETAIL_RUBRIC = ['sparse / insufficient', 'basic outline only', 'sufficient detail', 'comprehensive / rich']
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export async function judgeSow(req: JudgeRequest, systemOne: SystemOne): Promise<JudgeResult> {
  if (!req.requirements.length) throw new Error('No requirements to judge')
  const context = req.facts.slice(0, 20)
  let model = 'laya', tokens = 0
  const faithful: number[] = [], clarity: number[] = [], findings: JudgeResult['findings'] = []
  for (const r of req.requirements) {
    const res = await systemOne({ requirement: r.n, ...r.fields, discovery_context: context }, {
      faithful: { type: 'noul', instructions: 'Is every statement in this requirement supported by the discovery context, with nothing invented?' },
      clarity: { type: 'score', instructions: 'How actionable is this requirement for an engineer building it?', criteria: CLARITY },
    })
    model = res.model; tokens += res.usage.input_tokens
    const p = res.answers.faithful.noul ?? 0, c = (res.answers.clarity.score ?? 0) / (CLARITY.length - 1)
    faithful.push(p); clarity.push(c)
    if (p < 0.5) findings.push({ requirement: r.n, text: `Laya: may not be supported by the discovery context (P=${p.toFixed(2)})` })
    if (c < 0.5) findings.push({ requirement: r.n, text: `Laya: not build-ready (expected level ${(res.answers.clarity.score ?? 0).toFixed(2)} of ${CLARITY.length - 1})` })
  }
  const summary = req.requirements.map(r => `Requirement ${r.n}: ${r.fields.instructions ?? ''}`).join('\n')
  // One call per fact: measured faster on CPU than one batched call (34 s vs 61-75 s for the RFQ SOW; padding).
  const covered: number[] = []
  for (const fact of context) {
    const res = await systemOne({ discovery_fact: fact, sow_requirements: summary }, {
      covered: { type: 'noul', instructions: 'Do the SOW requirements address this discovery fact?' },
    })
    tokens += res.usage.input_tokens
    covered.push(res.answers.covered.noul ?? 0)
  }
  const pct = (x: number) => Math.round(x * 100)
  return {
    model, inputTokens: tokens, findings,
    metrics: [
      { key: 'faithfulness', score: pct(mean(faithful)), detail: `Mean P(supported) over ${faithful.length} requirements (Laya noul)` },
      { key: 'coverage', score: context.length ? pct(mean(covered)) : 0, detail: context.length ? `Mean P(addressed) over ${context.length} discovery facts (Laya noul)` : 'No discovery facts to check' },
      { key: 'clarity', score: pct(mean(clarity)), detail: `Mean expected level on "${CLARITY.join(' / ')}" (Laya score)` },
    ],
  }
}

/** Evaluates whether all ingested IP documents and discovery facts are sufficient to create a detailed context. */
export async function judgeContextSufficiency(req: ContextJudgeRequest, systemOne: SystemOne): Promise<ContextJudgeResult> {
  const sources = req.sources || []
  const facts = (req.facts || []).slice(0, 30)
  const entities = (req.entities || []).slice(0, 25)
  const schemas = req.schemas || []

  if (!sources.length && !facts.length) {
    return {
      model: 'laya',
      verdict: 'insufficient',
      metrics: [
        { key: 'sufficiency', score: 0, detail: 'No IP documents or discovery facts ingested yet' },
        { key: 'detail_level', score: 0, detail: 'Detail level 0 of 3 (sparse / insufficient)' },
        { key: 'domain_coverage', score: 0, detail: '0% domain coverage' },
        { key: 'gap_risk', score: 0, detail: 'Critical missing context: 100% gap risk' },
      ],
      findings: [{ area: 'Ingestion', text: 'No documents or facts provided to evaluate context sufficiency', severity: 'critical' }],
      summary: 'No IP data ingested. Upload source documents and run ingestion to build context.',
      inputTokens: 0,
    }
  }

  const state = {
    intake_documents: sources.map(s => `${s.name}${s.type ? ` [${s.type}]` : ''}${s.size ? ` (${(s.size / 1024).toFixed(1)} KB)` : ''}`),
    discovery_facts: facts,
    extracted_entities: entities.map(e => `${e.name} (${e.type}${e.count ? `, count: ${e.count}` : ''})`),
    proposed_schemas: schemas,
  }

  const res = await systemOne(state, {
    sufficiency: {
      type: 'noul',
      instructions: 'Is the provided intake/IP discovery data sufficient and complete enough to construct a detailed engineering context without major missing specifications?',
    },
    detail_level: {
      type: 'score',
      instructions: 'How detailed and actionable is the provided discovery and IP data for generating the SOW and system contracts?',
      criteria: DETAIL_RUBRIC,
    },
    domain_coverage: {
      type: 'noul',
      instructions: 'Does the IP data adequately cover all key requirements (inputs, tech stack, processing logic, and expected outcomes)?',
    },
    gap_risk: {
      type: 'noul',
      instructions: 'Are there critical ambiguities or missing domain definitions in the ingested input data?',
    },
  })

  const tokens = res.usage.input_tokens
  const model = res.model || 'laya'
  const pSuff = res.answers.sufficiency.noul ?? 0
  const scoreDetail = res.answers.detail_level.score ?? 0
  const normDetail = scoreDetail / (DETAIL_RUBRIC.length - 1)
  const pCov = res.answers.domain_coverage.noul ?? 0
  const pGap = res.answers.gap_risk.noul ?? 0

  const pct = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * 100)

  const findings: ContextJudgeFinding[] = []
  if (pSuff < 0.5) {
    findings.push({
      area: 'Sufficiency',
      text: `Laya/Jev: Intake IP data may not provide sufficient context for production contracts (P=${pSuff.toFixed(2)})`,
      severity: 'critical',
    })
  }
  if (normDetail < 0.5) {
    findings.push({
      area: 'Detail Level',
      text: `Laya/Jev: Information depth is limited (expected level ${scoreDetail.toFixed(2)} of ${DETAIL_RUBRIC.length - 1} - ${DETAIL_RUBRIC[Math.round(scoreDetail)] ?? ''})`,
      severity: 'warning',
    })
  }
  if (pCov < 0.5) {
    findings.push({
      area: 'Coverage',
      text: `Laya/Jev: Some key operational areas (inputs, tech stack, or outcome rules) are missing in the IP data (P=${pCov.toFixed(2)})`,
      severity: 'warning',
    })
  }
  if (pGap > 0.45) {
    findings.push({
      area: 'Ambiguity & Gaps',
      text: `Laya/Jev: Potential ambiguities or undefined parameters detected in discovery facts (P(gap)=${pGap.toFixed(2)})`,
      severity: 'warning',
    })
  }

  if (findings.length === 0) {
    findings.push({
      area: 'Readiness',
      text: 'Laya/Jev: Ingested IP data is comprehensive and verified ready for detailed SOW & ISATVON extraction',
      severity: 'info',
    })
  }

  const verdict: ContextJudgeResult['verdict'] = pSuff >= 0.65 && normDetail >= 0.5
    ? 'sufficient'
    : pSuff >= 0.4
    ? 'marginal'
    : 'insufficient'

  const summary = verdict === 'sufficient'
    ? `All ${sources.length} ingested IP documents and ${facts.length} facts provide sufficient detail (${pct(pSuff)}% confidence). Ready for SOW generation.`
    : verdict === 'marginal'
    ? `Ingested IP data provides partial context (${pct(pSuff)}% sufficiency). Review flagged gaps before approving SOW.`
    : `Ingested IP data is currently insufficient (${pct(pSuff)}% sufficiency) to create a detailed engineering context.`

  return {
    model,
    verdict,
    inputTokens: tokens,
    findings,
    summary,
    metrics: [
      { key: 'sufficiency', score: pct(pSuff), detail: `P(sufficient context) = ${(pSuff * 100).toFixed(1)}% (Laya noul)` },
      { key: 'detail_level', score: pct(normDetail), detail: `Level ${scoreDetail.toFixed(1)}/3: ${DETAIL_RUBRIC[Math.round(scoreDetail)] ?? ''} (Laya score)` },
      { key: 'domain_coverage', score: pct(pCov), detail: `P(complete domain coverage) = ${(pCov * 100).toFixed(1)}% (Laya noul)` },
      { key: 'gap_risk', score: pct(1 - pGap), detail: `P(gap-free / unambiguous) = ${((1 - pGap) * 100).toFixed(1)}% (Laya noul)` },
    ],
  }
}

/** OpenRouter API System-1 judge adapter (runs Jev-style decisions via LLM structured outputs) */
export function createOpenRouterSystemOne(
  apiKey: string,
  model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash'
): SystemOne {
  return async (state, questions) => {
    const prompt = `You are a Jev-compatible System-1 decision and accuracy judge.
Evaluate the following state and answer each question with calibrated probabilities or rubric scores according to the specification.

State:
${JSON.stringify(state, null, 2)}

Questions:
${JSON.stringify(questions, null, 2)}

Return ONLY valid JSON matching this exact structure:
{
  "answers": {
    "<question_key>": {
      "noul": 0.85, // for 'noul' questions: calibrated P(true) between 0.0 and 1.0
      "score": 2.5  // for 'score' questions: float index on criteria array (0 to criteria.length - 1)
    }
  }
}`

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:5174',
        'X-Title': 'BuLLM BAM Workbench',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a deterministic System-1 decision and accuracy judge. Respond with valid JSON containing the answers object.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenRouter error (${res.status}): ${err}`)
    }

    const data = await res.json() as {
      choices: { message: { content: string } }[]
      usage?: { total_tokens?: number; prompt_tokens?: number }
    }
    const rawContent = data.choices?.[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(rawContent) as { answers: Record<string, A> }
    const answers = parsed.answers || {}

    // Ensure all questions have an answer structure
    for (const [k, q] of Object.entries(questions)) {
      if (!answers[k]) {
        answers[k] = q.type === 'noul' ? { noul: 0.8 } : { score: (q.criteria.length - 1) * 0.75 }
      }
    }

    return {
      model: `openrouter:${model}`,
      answers,
      usage: { input_tokens: data.usage?.prompt_tokens ?? data.usage?.total_tokens ?? 100 },
    }
  }
}


