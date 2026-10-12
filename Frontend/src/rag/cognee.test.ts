// npm test: the Cognee runner against a local stand-in that answers with Cognee's response shapes
// (PipelineRunInfo, the dataset status map, GraphDTO) taken from topoteretes/cognee's API routers.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import { cogneeRunner } from './cognee.ts'
import { contextFacts, createMockRagService, relations } from './ragPipeline.ts'
import { buildOkfBundle, validateOkf } from './okf.ts'

const body = (req: IncomingMessage) => new Promise<string>(r => { let b = ''; req.on('data', c => (b += c)); req.on('end', () => r(b)) })
const until = async (cond: () => boolean) => { for (let i = 0; i < 800; i++) { if (cond()) return; await new Promise(r => setTimeout(r, 5)) } throw new Error('timeout') }

test('Cognee runner: add OKF concepts + released objects, cognify, poll status, read the graph', async () => {
  const seen: string[] = []
  let polls = 0, failCognify = false
  const server = createServer(async (req, res) => {
    const b = await body(req)
    seen.push(`${req.method} ${req.url}`)
    const json = (code: number, v: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(v)) }
    if (req.url === '/api/v1/add') {
      assert.match(req.headers['content-type']!, /multipart\/form-data/)
      assert.match(b, /name="data"; filename="sources__rfq-pdf.md"/)
      assert.match(b, /name="raw_data"\r\n\r\ns3:\/\/bam-intake\/obj-1\/rfq.pdf/)
      assert.match(b, /name="datasetName"\r\n\r\nbam-rfq/)
      return json(200, { status: 'PipelineRunCompleted', pipeline_run_id: 'r1', dataset_id: 'ds-1', dataset_name: 'bam-rfq' })
    }
    if (req.url === '/api/v1/cognify') {
      assert.deepEqual(JSON.parse(b), { datasets: ['bam-rfq'], run_in_background: true })
      return failCognify ? json(500, { detail: 'LLM key missing' }) : json(200, {})
    }
    if (req.url === '/api/v1/datasets/status?dataset=ds-1') return json(200, { 'ds-1': ++polls < 3 ? 'DATASET_PROCESSING_STARTED' : 'DATASET_PROCESSING_COMPLETED' })
    if (req.url === '/api/v1/datasets/ds-1/graph') return json(200, { nodes: [{ id: 'a', label: 'RFQ', type: 'Entity', properties: {} }, { id: 'b', label: 'BOM', type: 'Entity', properties: {} }], edges: [{ source: 'a', target: 'b', label: 'has_document' }] })
    json(404, { detail: 'not found' })
  })
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  try {
    const rag = createMockRagService({ loadDelay: 1, engine: 'cognee', runner: cogneeRunner(base, { pollMs: 5 }) })
    rag.start({ input: { files: [{ path: 'sources/rfq-pdf.md', content: '---\ntype: Source Document\n---\n' }], objects: ['s3://bam-intake/obj-1/rfq.pdf'] } })
    await until(() => !!rag.getState().lastSyncAt)
    const s = rag.getState()
    assert.deepEqual(s.steps.map(x => x.status), ['done', 'done', 'done', 'done'])
    assert.equal(s.datasetId, 'ds-1')
    assert.deepEqual(s.graph, { nodes: 2, edges: 1 })
    assert.equal(s.steps[2].detail, '2 nodes · 1 relations')
    assert.deepEqual(seen.filter(x => !x.includes('status')), ['POST /api/v1/add', 'POST /api/v1/cognify', 'GET /api/v1/datasets/ds-1/graph'])
    assert.equal(polls, 3, 'polls status until completed')

    // Entity relations from Cognee drive the relations view, the judge's discovery facts and the OKF bundle.
    assert.deepEqual(relations(s), [{ from: 'RFQ', fromType: 'Entity', label: 'has_document', to: 'BOM', toType: 'Entity' }])
    assert.deepEqual(contextFacts(s), ['RFQ has document BOM'])
    const okf = buildOkfBundle([], s, new Date().toISOString())
    assert.deepEqual(validateOkf(okf), [])
    const rfq = okf.find(f => f.path === 'entities/entity/rfq.md')!
    assert.match(rfq.content, /\* has_document: \[BOM\]\(\/entities\/entity\/bom\.md\)/, 'relations become links between concepts')
    assert.match(rfq.content, /resource: cognee:\/\/datasets\/ds-1\n/, 'provenance points at the Cognee dataset')

    // A server error is a failed step with the server's reason, and Retry resumes from that step.
    failCognify = true
    rag.start()
    await until(() => rag.getState().steps[1].status === 'failed')
    assert.match(rag.getState().steps[1].error!, /Cognee: POST \/api\/v1\/cognify -> HTTP 500: .*LLM key missing/)
    failCognify = false; polls = 0
    rag.retry('extract')
    await until(() => rag.getState().steps.every(x => x.status === 'done'))
  } finally { server.close() }
})
