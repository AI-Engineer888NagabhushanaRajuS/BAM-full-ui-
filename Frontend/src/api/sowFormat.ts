// The ISATVON SOW format (see the approved SOW sample): flat "Requirement N" blocks, each tagged with all
// seven ISATVON fields. The SOW has NO agent/skill grouping; that is applied after approval by a separate
// step (`clusterRequirement`). Status and approval lines are system metadata, not document text.
import { ISATVON, type IsatvonField } from './types.ts'

export type RequirementFields = Record<IsatvonField, string>

/** SOW-format labels, in ISATVON order. */
export const SOW_LABELS: Record<IsatvonField, string> = {
  instructions: 'I — Instructions', sourceData: 'S — Source Data', automation: 'A — Automation', techStack: 'T — Tech Stack',
  variables: 'V — Variables', outcome: 'O — Outcome', notifications: 'N — Notify on next',
}
/** Fields rendered as code in the SOW, like the sample. */
const CODE_FIELDS: IsatvonField[] = ['sourceData', 'automation', 'variables']

/** Illustrative LLM output for the RFQ workflow, in requirement order (no grouping). */
export const RFQ_REQUIREMENTS: RequirementFields[] = [
  { instructions: 'Watch the RFQ inbox, accept the package, store each attachment in object storage and register it with the workflow run.',
    sourceData: 's3://client-bucket/rfq/inbox/', automation: 'UNSTRUCTURED_TO_SOW_LLM', techStack: 'FastMCP, PostgreSQL',
    variables: 'max_attachments: 25; accepted_types: pdf,xlsx,csv', outcome: 'RfqPackage JSON: package_id, attachments[], received_at',
    notifications: 'Post to #rfq-intake on receipt' },
  { instructions: 'Classify each attachment as drawing, BOM, specification or commercial terms using the OKF document classes.',
    sourceData: 's3://client-bucket/rfq/inbox/', automation: 'UNSTRUCTURED_TO_SOW_LLM', techStack: 'Cognee, Pydantic',
    variables: 'classes: drawing,bom,spec,terms; min_confidence: 0.8', outcome: 'ClassifiedDocument[] JSON with class and confidence',
    notifications: 'Alert on unclassified attachment' },
  { instructions: 'Validate every BOM line: part_no, qty and material are mandatory; flag lines that fail and keep the reason.',
    sourceData: 's3://client-bucket/rfq/bom_file.xlsx', automation: 'EXCEL_TO_JSON_AST', techStack: 'OpenPyXL, DuckDB, Pydantic',
    variables: 'header_row: 1; required_columns: part_no,qty,material; target_cell: BOM!A2', outcome: 'BOM matrix JSON with per-line validation result',
    notifications: 'Webhook on validation complete' },
  { instructions: 'Route flagged BOM lines to the quality lead; block quotation until every blocking exception is resolved.',
    sourceData: 'db://bam/bom_exceptions', automation: 'HITL_APPROVAL', techStack: 'FastMCP, DBHub',
    variables: 'blocking_severity: high; sla_hours: 24', outcome: 'ExceptionDecision[] JSON: line_id, decision, reviewer',
    notifications: 'HITL sign-off by quality lead; webhook on routing' },
  { instructions: 'Calculate landed cost by adding base price, 4% freight, and local tariffs for each BOM line, then aggregate.',
    sourceData: 'db://erp/pricing.price_list', automation: 'JSON_TO_PYTHON_JINJA2', techStack: 'DuckDB, Pydantic',
    variables: 'freight_rate: 0.04; tariff_table: db://erp/tariffs; total_formula: =SUM(Quote!B2:B11)', outcome: 'Aggregated pricing comparison table (JSON)',
    notifications: 'Post to #rfq-quotes on completion or error' },
  { instructions: 'Present the aggregated quote to the commercial manager and record the approval decision with timestamp.',
    sourceData: 'db://bam/quotes', automation: 'HITL_APPROVAL', techStack: 'PostgreSQL, Apache Superset',
    variables: 'approver_role: commercial_manager', outcome: 'QuoteApproval JSON: quote_id, decision, approved_at',
    notifications: 'HITL sign-off by commercial manager; callback on approval' },
]

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const unesc = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e: string) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' })[e]!)
const text = (html: string) => unesc(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()

export const reqPassage = (n: number) => `req-${n}`

export function renderSowHtml(reqs: RequirementFields[], notes: string[] = [], title?: string) {
  const heading = title
    ? `<h1>Statement of Work — ${esc(title.replace(/^Statement of Work\s*[—–-]\s*/i, ''))}</h1>`
    : '<h1>Statement of Work — RFQ automation</h1>'
  const field = (k: IsatvonField, v: string) => {
    const body = CODE_FIELDS.includes(k) ? `<code>${esc(v)}</code>` : esc(k === 'notifications' ? `PARSED · ${v}` : v)
    return `<li><p><strong>${SOW_LABELS[k]}:</strong> ${body}</p></li>`
  }
  return [
    heading,
    '<blockquote><p><strong>Note on this document:</strong> this SOW contains individually ISATVON-tagged requirements only, in the order they occur. ' +
      'It has no agent or skill grouping; that is applied after approval by a separate step.</p></blockquote>',
    ...reqs.flatMap((r, i) => [
      `<h2 data-passage="${reqPassage(i + 1)}">Requirement ${i + 1}</h2>`,
      `<ul>${ISATVON.map(c => field(c.key, r[c.key])).join('')}</ul>`,
    ]),
    '<h2>Approval</h2>',
    '<p>This Statement of Work is reviewed and approved by the client stakeholder following FDE review and editing in the TipTap editor. ' +
      'Any material change to scope requires a change order and re-approval before implementation proceeds.</p>',
    ...(notes.length ? ['<h2>Revision notes</h2>', ...notes.map(n => `<p>Addressed review request: ${esc(n)}</p>`)] : []),
  ].join('')
}

export interface ParsedRequirement { n: number; passageId: string; fields: RequirementFields }

/** Read the ISATVON blocks back out of (possibly human-edited) SOW HTML. Missing fields come back empty. */
export function parseRequirements(html: string): ParsedRequirement[] {
  const heads = [...html.matchAll(/<h2[^>]*>\s*Requirement\s+(\d+)\s*<\/h2>/gi)]
  return heads.map(h => {
    // A requirement runs until the next <h2> (the next requirement, Approval, or Revision notes).
    const start = h.index! + h[0].length
    const rel = html.slice(start).search(/<h2[\s>]/i)
    const chunk = html.slice(start, rel < 0 ? html.length : start + rel)
    const fields = Object.fromEntries(ISATVON.map(c => [c.key, ''])) as RequirementFields
    for (const m of chunk.matchAll(/<strong>\s*([ISATVON])\s*[—–-][^<:]*:?\s*<\/strong>([\s\S]*?)<\/p>/g)) {
      const key = ISATVON.find(c => c.letter === m[1])!.key
      let v = text(m[2]).replace(/^:\s*/, '')
      if (key === 'automation') v = v.match(/[A-Z][A-Z0-9_]{2,}/)?.[0] ?? v
      if (key === 'notifications') v = v.replace(/^PARSED\s*[·—–-]\s*/, '')
      fields[key] = v
    }
    return { n: Number(h[1]), passageId: reqPassage(Number(h[1])), fields }
  })
}

export interface DynamicSowContext {
  fdeGoals?: string
  releasedFiles?: string[]
  verifiedChecks?: Array<{
    category: string
    question: string
    answer: string
    citations?: Array<{ label: string; s3: string }>
  }>
  notes?: string[]
  client?: string
  workflowTitle?: string
}

function cleanFdeGoal(goal?: string): string {
  if (!goal) return ''
  const g = goal.trim()
  if (g.length < 5) return ''
  if (/^(see what is this|idk|test|asdf|qwerty|n\/a|none|todo|temp|see what is this idk)$/i.test(g)) return ''
  return g
}

export function detectFileDomains(files: string[]) {
  const cadFiles = files.filter(f => /\.(step|stp|cad|dwg|dxf|gerber|gbr|ipc|x_t|iges|igs)$/i.test(f) || /bracket|housing/i.test(f))
  const bomFiles = files.filter(f => /\.(xlsx|xls|csv)$/i.test(f) && (/bom|bill.*material|part|inventory|component/i.test(f) || !/master|rule|org/i.test(f)))
  const masterFiles = files.filter(f => /master|rule|org|organization|skills|tooling|filetype/i.test(f))
  const softwareFiles = files.filter(f => /\.(zip|tar|gz|py|ts|js|jsx|tsx|json|sh|toml|yaml|yml)$/i.test(f) || /django|scanner|flow|app|sys|master|repo|api|service|code|productivity/i.test(f))
  const telemetryFiles = files.filter(f => /space-track|leo|orbit|telemetry|tle|ephemeris|sat/i.test(f))
  const specFiles = files.filter(f => /\.(pdf|docx|doc)$/i.test(f))
  const licenseFiles = files.filter(f => /license/i.test(f))

  const isSoftwareDomain = softwareFiles.length > 0 && cadFiles.length === 0
  const isCadManufacturingDomain = cadFiles.length > 0 || (bomFiles.length > 0 && softwareFiles.length === 0) || (files.some(f => /rfq/i.test(f)) && softwareFiles.length === 0)

  return {
    cadFiles,
    bomFiles,
    masterFiles,
    softwareFiles,
    telemetryFiles,
    specFiles,
    licenseFiles,
    isSoftwareDomain,
    isCadManufacturingDomain,
  }
}

/** Generates rich, ultra-contextual ISATVON requirements dynamically from verified preflight facts, FDE goals, and files. */
export function generateDynamicRequirements(ctx: DynamicSowContext = {}): RequirementFields[] {
  const rawGoal = cleanFdeGoal(ctx.fdeGoals)
  const files = ctx.releasedFiles?.length ? ctx.releasedFiles : ['BOM_RevC.xlsx', 'MPW-4421-bracket.step', 'MPW-4422-housing.step', 'Spec_QA-101.pdf', 'Terms_and_Conditions.pdf']
  const domain = detectFileDomains(files)

  // Identify any custom checks from the questionnaire
  const customChecks = (ctx.verifiedChecks ?? []).filter(c =>
    !c.question.includes('17-4PH') &&
    !c.question.includes('MPW-4421') &&
    !c.question.includes('Rev C') &&
    !c.question.includes('payment terms') &&
    !c.question.includes('tenant certifications') &&
    !c.question.includes('costing standards') &&
    !c.question.includes('FastMCP agents') &&
    !c.question.includes('ISATVON 1.4')
  )

  const reqs: RequirementFields[] = []

  if (domain.isSoftwareDomain) {
    // ---- SOFTWARE / MULTI-MODULE MICROSERVICES DOMAIN ----
    const djangoFile = files.find(f => /django/i.test(f)) || domain.softwareFiles[0] || 'app_service.zip'
    const scannerFile = files.find(f => /scanner/i.test(f)) || '1AutoScanner_Pro_V3.zip'
    const productivityFiles = files.filter(f => /flow|productivity|master/i.test(f))
    const prodRef = productivityFiles.length ? productivityFiles.join('; ') : 'FocusFlow.zip; ProductivityMaster_GPT5_ADVANCED_RUNREADY.zip'
    const telemetryFile = domain.telemetryFiles[0] || 'space-track-leo.txt'
    const versionFile = files.find(f => /version/i.test(f)) || 'app_versions.zip'
    const licenseRef = domain.licenseFiles.length ? domain.licenseFiles.join(', ') : 'LICENSE.txt, LICENSE-MIT.txt'

    reqs.push(
      {
        instructions: `Watch incoming repository and package ingestion stream. Enforce dual-engine threat perimeter (BuLL*Sav ClamAV static signatures paired with Repel behavioral payload repulsion & prompt injection defense). Verify and register all ${files.length} release-ready artifacts into isolated execution workspace.${rawGoal ? ` FDE Objective: "${rawGoal}".` : ''}`,
        sourceData: `s3://bam-intake/pkg-2026-0147/ (${files.join(', ')})`,
        automation: 'UNSTRUCTURED_TO_SOW_LLM',
        techStack: 'FastMCP, ClamAV, Repel, PostgreSQL',
        variables: 'max_batch: 25; air_gapped: true; dual_scan: unanimous; chunk_size: 10MB',
        outcome: 'IngestionPackage JSON: package_id, verified_files[], quarantined_threats[], sha256_digests[]',
        notifications: 'Post to #intake-alerts on quarantine release; notify ops on payload repulsion',
      },
      {
        instructions: `Decompress and parse AST repository structure for Django Application Service (${djangoFile}). Extract URL route mappings, database models, REST API endpoints, and recommendation scoring algorithms. Validate environment dependencies and schema migrations against PostgreSQL/DuckDB.`,
        sourceData: `s3://bam-intake/pkg-2026-0147/${djangoFile}`,
        automation: 'EXCEL_TO_JSON_AST',
        techStack: 'DuckDB, FastMCP, Pydantic, PostgreSQL',
        variables: 'framework: django; extract_models: true; parse_endpoints: true; target_db: postgresql',
        outcome: 'DjangoServiceManifest JSON: routes[], models[], matching_engine_spec, dependency_tree',
        notifications: 'Webhook on schema extraction; alert lead on deprecated library versions',
      },
      {
        instructions: `Ingest and operationalize automated code scanner engine (${scannerFile}). Wire automated heuristic scanning rules, vulnerability pattern matching, and file analysis workers into the FastMCP pipeline. Enforce deterministic timeout limits (120s) and quarantine fail-closed protocols for all suspicious payloads.`,
        sourceData: `s3://bam-intake/pkg-2026-0147/${scannerFile}`,
        automation: 'DYNAMIC_CONTEXT_VERIFIER',
        techStack: 'FastMCP, ClamAV, Repel, PostgreSQL',
        variables: 'worker_concurrency: 4; timeout_sec: 120; quarantine_policy: fail_closed; log_retention_days: 90',
        outcome: 'ScannerEngineConfig JSON: worker_pool, queue_metrics, routing_rules, scan_profiles',
        notifications: 'Emit heartbeat to telemetry bus; alert on worker starvation',
      },
      {
        instructions: `Bind and coordinate workflow task tracker and AI prompt orchestration engines (${prodRef}). Extract task execution graphs, state transition lifecycles, and model prompt orchestration parameters. Persist state handoffs to PostgreSQL JSONB and stream real-time UI execution states.`,
        sourceData: `s3://bam-intake/pkg-2026-0147/${prodRef}`,
        automation: 'JSON_TO_PYTHON_JINJA2',
        techStack: 'BuLLM DMR, FastMCP, PostgreSQL, Jinja2',
        variables: 'state_sync_ms: 1000; session_timeout_min: 60; prompt_template_version: v2.1',
        outcome: 'WorkflowOrchestrationRecord JSON: task_graphs[], prompt_pipeline, pg_jsonb_state',
        notifications: 'Push WebSocket updates to client cockpit; trigger state audit log',
      },
      {
        instructions: `Parse Low Earth Orbit (LEO) orbital ephemeris (${telemetryFile}) and validate multi-module semantic versioning (${versionFile}). Ingest TLE two-line element sets, verify timestamp monotonicity, and cross-reference open-source license compliance (${licenseRef}) across all integrated subsystems.`,
        sourceData: `s3://bam-intake/pkg-2026-0147/${telemetryFile}; ${versionFile}; ${licenseRef}`,
        automation: 'DYNAMIC_CONTEXT_VERIFIER',
        techStack: 'DuckDB, FastMCP, Pandas, PostgreSQL',
        variables: 'catalog_mode: LEO; epoch_tolerance_sec: 3600; tle_validation: strict; license_whitelist: MIT,Apache-2.0',
        outcome: 'OrbitalTelemetryDataset JSON: satellite_count, tle_records[], license_compliance_verified: true',
        notifications: 'Alert flight dynamics on ephemeris variance; sync version tags to registry',
      },
      {
        instructions: 'Execute bounded self-correcting verification cycle per ISATVON 1.4 Loopy framework (max_iterations: 3, budget_limit: 5000ms). Decouple Action Tool from independent Fixed Check Tool. Require cryptographic sign-off and FDE human-in-the-loop approval before promoting verified package bundle to production sandbox.',
        sourceData: `s3://bam-intake/pkg-2026-0147/ (${files.join(', ')})`,
        automation: 'HITL_APPROVAL',
        techStack: 'FastMCP, BuLLM DMR, Apache Superset, PostgreSQL',
        variables: 'max_iterations: 3; budget_limit_ms: 5000; approver_role: fde_lead; gate_policy: unanimous_pass',
        outcome: 'ProductionReleaseApproval JSON: release_id, approver, audit_trail[], signature_hash',
        notifications: 'HITL sign-off alert to FDE lead; publish release event to #deployment-hub',
      }
    )
  } else if (domain.isCadManufacturingDomain) {
    // ---- CAD / AEROSPACE / RFQ MANUFACTURING DOMAIN ----
    const cadPart = domain.cadFiles[0] || 'MPW-4421-bracket.step'
    const bomPart = domain.bomFiles[0] || 'BOM_RevC.xlsx'

    reqs.push(
      {
        instructions: `Watch the RFQ discovery intake bucket and enforce dual-engine threat perimeter (BuLL*Sav ClamAV static signatures paired with Repel behavioral payload repulsion & prompt defense). Only verified, released files are registered with the workflow run.${rawGoal ? ` FDE Objective: "${rawGoal}".` : ''}`,
        sourceData: `s3://bam-intake/rfq-2026-0147/ (${files.join(', ')})`,
        automation: 'UNSTRUCTURED_TO_SOW_LLM',
        techStack: 'FastMCP, ClamAV, Repel, PostgreSQL',
        variables: 'max_batch: 25; air_gapped: true; dual_scan: unanimous; chunk_size: 10MB',
        outcome: 'RfqPackage JSON: package_id, verified_files[], quarantined_threats[], sha256_digests[]',
        notifications: 'Post to #rfq-intake on quarantine release; alert ops on heuristic deviation',
      },
      {
        instructions: `Parse CAD STEP geometry for part ${cadPart} (6061-T6 aluminum bracket). Extract critical bore pattern tolerance (±0.05 mm), general machining tolerance (±0.1 mm), and enforce surface finish Ra 0.8 µm with MIL-A-8625 Type II clear anodize.`,
        sourceData: `s3://bam-intake/rfq-2026-0147/${cadPart}`,
        automation: 'CAD_STEP_TOLERANCE_EXTRACTOR',
        techStack: 'cadquery, OpenCascade, FastMCP, Pydantic',
        variables: 'part_id: MPW-4421; critical_bore_tol: ±0.05mm; surface_finish: Ra 0.8µm; spec: MIL-A-8625-II',
        outcome: 'CADFeatureModel JSON: 102 faces, 1 body, verified bore alignment matrix, coating spec',
        notifications: 'Flag dimensional deviation > 0.05mm to engineering lead',
      },
      {
        instructions: `Reconcile BOM ${bomPart} delta changes against baseline: line 2 housing MPW-4422 upgraded to 17-4PH stainless steel and bracket MPW-4421 quantity increased to 250 units. Mandatory verification of EN 10204 3.1 inspection certification and Spec QA-101 mill cert per lot.`,
        sourceData: `s3://bam-intake/rfq-2026-0147/${bomPart}#line=2; Spec_QA-101.pdf#spec-qa-101`,
        automation: 'EXCEL_TO_JSON_AST',
        techStack: 'OpenPyXL, DuckDB, Pydantic, FastMCP',
        variables: 'bom_revision: Rev C; cert_type: EN 10204 3.1; lot_cert_mandatory: true; part_housing: MPW-4422',
        outcome: 'BOMReconciliation JSON: 14 rows parsed, 17-4PH cert status verified, 0 uncertified lots',
        notifications: 'Block quotation if mill cert or EN 10204 3.1 is absent',
      },
      {
        instructions: 'Calculate manufacturing costs per Organization (ORG-EMS / BU-AERO-01) and Rules Master (Rule #1): SMT line at $120/hr, manual assembly at $45/hr, testing at $65/hr, X-Ray at $150/lot. Factor 1.5% standard scrap and 2.0% waste. Execute 155 BOM QA validation checks per MFG-RES-003.',
        sourceData: 's3://bam-intake/masters/Rules.xlsx#RULE-01; MFG-RES-003',
        automation: 'PCBA_COSTING_ENGINE',
        techStack: 'DuckDB, Jinja2, PostgreSQL, FastMCP',
        variables: 'smt_rate: 120.00; manual_rate: 45.00; test_rate: 65.00; scrap_rate: 0.015; waste_rate: 0.020; total_cost_formula: =SUM(Costing!C2:C10)',
        outcome: 'CostBreakdown JSON: line-item SMT, labor, scrap, NRE, landed piece cost',
        notifications: 'Trigger commercial review gate if piece price variance > 5%',
      },
      {
        instructions: 'Execute bounded self-correcting validation cycle per ISATVON 1.4 Loopy framework: Action-and-Check cycle with max_iterations: 3, budget_limit: 5000ms. Decouple Action Tool from independent Fixed Check Tool. O-Outcome persists state handoff to PostgreSQL JSONB; N-Notification streams real-time UI states (Verifying -> Looping [Pass 2/3] -> Completed), DB updates, and escalation alerts.',
        sourceData: 's3://bam-intake/masters/Skills.xlsx; ISATVON_1.4_Loopy_Spec.md',
        automation: 'ISATVON_LOOPY_ROUTER',
        techStack: 'BuLLM DMR, FastMCP, PostgreSQL',
        variables: 'max_iterations: 3; budget_limit_ms: 5000; success_gate: all_checks_passed; timeout_escalate: true',
        outcome: 'WorkflowExecutionRecord JSON: iteration_count, audit_trail, pg_jsonb_state',
        notifications: 'WebSocket push on every loop iteration; alert ops on escalation',
      },
      {
        instructions: 'Enforce delivery within 4 weeks ARO, ASTM D3951 industrial packaging with vapor corrosion inhibitor (VCI) bags, and Net 45 commercial terms. Route aggregated quote package to commercial manager for final HITL approval and cryptographic signature.',
        sourceData: 's3://bam-intake/rfq-2026-0147/RFQ_Package_Meridian.pdf; Terms_and_Conditions.pdf',
        automation: 'HITL_APPROVAL',
        techStack: 'FastMCP, Apache Superset, PostgreSQL',
        variables: 'lead_time_weeks: 4; packaging_spec: ASTM-D3951; payment_terms: Net 45; approver: commercial_manager',
        outcome: 'QuoteApprovalRecord JSON: quote_id, decision, signature, approved_at',
        notifications: 'HITL sign-off alert to commercial manager; webhook on approval',
      }
    )
  } else {
    // ---- ENTERPRISE DOCUMENT & DATA INTELLIGENCE DOMAIN ----
    reqs.push(
      {
        instructions: `Watch the discovery intake bucket and enforce dual-engine threat perimeter (BuLL*Sav ClamAV static signatures paired with Repel behavioral payload repulsion & prompt defense). Register all ${files.length} verified objects with the workflow run.${rawGoal ? ` FDE Objective: "${rawGoal}".` : ''}`,
        sourceData: `s3://bam-intake/docs-2026-0147/ (${files.join(', ')})`,
        automation: 'UNSTRUCTURED_TO_SOW_LLM',
        techStack: 'FastMCP, ClamAV, Repel, PostgreSQL',
        variables: 'max_batch: 25; air_gapped: true; dual_scan: unanimous; chunk_size: 10MB',
        outcome: 'IngestionPackage JSON: package_id, verified_files[], quarantined_threats[], sha256_digests[]',
        notifications: 'Post to #docs-intake on quarantine release; alert ops on heuristic deviation',
      },
      {
        instructions: `Extract tabular schemas, structured entities, and key-value records from ingested files (${files.slice(0, 3).join(', ')}). Perform type inference, null-check constraints, and structural schema validation.`,
        sourceData: `s3://bam-intake/docs-2026-0147/ (${files.slice(0, 3).join(', ')})`,
        automation: 'EXCEL_TO_JSON_AST',
        techStack: 'DuckDB, Pydantic, FastMCP, PostgreSQL',
        variables: 'schema_inference: strict; null_threshold: 0.05; date_format: ISO-8601',
        outcome: 'DatasetSchemaRecord JSON: tables[], columns[], row_counts[], constraints[]',
        notifications: 'Webhook on schema extraction; alert on schema mismatch',
      },
      {
        instructions: 'Construct Cognee GraphRAG knowledge graph linking extracted entities, document references, and cross-file dependencies. Enforce semantic consistency and vector search index synchronization.',
        sourceData: `s3://bam-intake/docs-2026-0147/ (${files.join(', ')})`,
        automation: 'DYNAMIC_CONTEXT_VERIFIER',
        techStack: 'Cognee, FastMCP, DuckDB, LanceDB',
        variables: 'embedding_dim: 1536; min_similarity: 0.82; chunk_overlap: 150',
        outcome: 'GraphTopology JSON: nodes[], edges[], communities[], index_status',
        notifications: 'Push graph sync status to client cockpit',
      },
      {
        instructions: 'Validate cross-document semantic consistency and verify fact extraction against knowledge ontology rules. Flag anomalies, missing references, and threshold deviations.',
        sourceData: `s3://bam-intake/docs-2026-0147/ (${files.join(', ')})`,
        automation: 'DYNAMIC_CONTEXT_VERIFIER',
        techStack: 'DuckDB, Pydantic, FastMCP, LanceDB',
        variables: 'consistency_check: strict; anomaly_threshold: 0.15; ontology_version: v1.2',
        outcome: 'SemanticValidationReport JSON: verified_facts[], anomalies[], confidence_score: 0.94',
        notifications: 'Post validation status to telemetry queue; alert on semantic anomalies',
      },
      {
        instructions: 'Execute bounded self-correcting validation cycle per ISATVON 1.4 Loopy framework: Action-and-Check cycle with max_iterations: 3, budget_limit: 5000ms. Decouple Action Tool from independent Fixed Check Tool.',
        sourceData: `s3://bam-intake/docs-2026-0147/ (${files.join(', ')})`,
        automation: 'ISATVON_LOOPY_ROUTER',
        techStack: 'BuLLM DMR, FastMCP, PostgreSQL',
        variables: 'max_iterations: 3; budget_limit_ms: 5000; success_gate: all_checks_passed; timeout_escalate: true',
        outcome: 'WorkflowExecutionRecord JSON: iteration_count, audit_trail, pg_jsonb_state',
        notifications: 'WebSocket push on every loop iteration; alert ops on escalation',
      },
      {
        instructions: 'Route aggregated dataset extraction package to lead reviewer for final HITL approval and cryptographic signature before sandbox handoff.',
        sourceData: `s3://bam-intake/docs-2026-0147/ (${files.join(', ')})`,
        automation: 'HITL_APPROVAL',
        techStack: 'FastMCP, Apache Superset, PostgreSQL',
        variables: 'approver_role: fde_lead; gate_policy: unanimous_pass',
        outcome: 'ProductionReleaseApproval JSON: release_id, approver, audit_trail[], signature_hash',
        notifications: 'HITL sign-off alert to FDE lead; publish release event to #deployment-hub',
      }
    )
  }

  for (const cc of customChecks) {
    reqs.push({
      instructions: `Validate custom client requirement: "${cc.question}". Contextual findings: "${cc.answer}".`,
      sourceData: cc.citations?.map(c => c.s3).join('; ') || `s3://bam-intake/pkg-2026-0147/`,
      automation: 'DYNAMIC_CONTEXT_VERIFIER',
      techStack: 'Cognee, FastMCP, Pydantic',
      variables: `category: "${cc.category}"; custom_rule: true; min_confidence: 0.90`,
      outcome: `CustomRequirementVerification JSON: status: verified, category: "${cc.category}"`,
      notifications: 'Alert FDE on custom requirement anomaly or mismatch',
    })
  }

  return reqs
}

export function produceDynamicSowHtml(ctx: DynamicSowContext = {}): string {
  const reqs = generateDynamicRequirements(ctx)
  const files = ctx.releasedFiles ?? []
  const domain = detectFileDomains(files)
  const defaultTitle = domain.isSoftwareDomain
    ? 'Distributed Microservices & Automated Processing Pipeline'
    : domain.isCadManufacturingDomain
      ? 'RFQ Engineering & Contract Manufacturing Automation'
      : 'Enterprise Document Intelligence & Automation'

  return renderSowHtml(reqs, ctx.notes, ctx.workflowTitle || defaultTitle)
}

const SOFTWARE_CLUSTERS: [agent: string, name: string][] = [
  ['Security & Intake Agent', 'Threat perimeter & package intake'],
  ['Backend Architecture Agent', 'Application AST & service schema'],
  ['Code Analysis Agent', 'Automated scanner & vulnerability engine'],
  ['Workflow Agent', 'Task graph & prompt orchestration'],
  ['Data & Compliance Agent', 'Orbital telemetry & license audit'],
  ['Release & Deployment Agent', 'ISATVON loop & HITL release sign-off'],
]

const CAD_CLUSTERS: [agent: string, name: string][] = [
  ['Intake Agent', 'Receive RFQ package'],
  ['Engineering Agent', 'Parse CAD STEP tolerances'],
  ['Quality Agent', 'Validate BOM'],
  ['Quote Agent', 'Calculate landed manufacturing cost'],
  ['Orchestration Agent', 'ISATVON 1.4 bounded loop check'],
  ['Commercial Agent', 'Commercial terms & HITL approval'],
]

const DOC_CLUSTERS: [agent: string, name: string][] = [
  ['Intake & Security Agent', 'Document perimeter & ingestion'],
  ['Schema Extraction Agent', 'Tabular schema & entity typing'],
  ['GraphRAG Agent', 'Cognee knowledge graph synchronization'],
  ['Semantic Audit Agent', 'Cross-document semantic verification'],
  ['Orchestration Agent', 'Self-correcting bounded loop execution'],
  ['Release & Governance Agent', 'HITL governance & compliance sign-off'],
]

export function clusterRequirement(n: number, fields: RequirementFields): { agent: string; name: string } {
  const text = (fields.instructions + ' ' + fields.automation + ' ' + fields.sourceData).toLowerCase()

  if (/django|scanner|focus|flow|productivity|telemetry|orbit|space-track|autoscanner|tree-sitter/i.test(text)) {
    const known = SOFTWARE_CLUSTERS[n - 1]
    if (known) return { agent: known[0], name: known[1] }
  } else if (/cad|step|geometry|toleran|bom|cert|smt|scrap|17-4|housing|bracket|rfq/i.test(text)) {
    const known = CAD_CLUSTERS[n - 1]
    if (known) return { agent: known[0], name: known[1] }
  } else {
    const known = DOC_CLUSTERS[n - 1]
    if (known) return { agent: known[0], name: known[1] }
  }

  const words = fields.instructions.split(/\s+/).slice(0, 4).join(' ').replace(/[^\w\s-]/g, '')
  return { agent: `Custom Agent ${n}`, name: words ? `${words} (${n})` : `Requirement ${n}` }
}
