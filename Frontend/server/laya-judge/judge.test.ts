// npm test (root): the judge's questions and aggregation, with a stand-in for Laya's systemOne.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { judgeSow, judgeContextSufficiency, type SystemOne } from './judge.ts'

test('Laya judge: typed questions per requirement and per fact, scores aggregated to 0-100', async () => {
  const calls: { state: Record<string, unknown>; q: string[] }[] = []
  const fake: SystemOne = async (state, questions) => {
    calls.push({ state: state as Record<string, unknown>, q: Object.keys(questions) })
    const s = state as Record<string, unknown>
    if ('discovery_fact' in s) return { model: 'laya', usage: { input_tokens: 10 }, answers: { covered: { noul: String(s.discovery_fact).includes('BOM') ? 0.9 : 0.3 } } }
    const weak = s.requirement === 2
    assert.equal(questions.clarity.type, 'score')
    return { model: 'laya', usage: { input_tokens: 20 }, answers: { faithful: { noul: weak ? 0.2 : 0.8 }, clarity: { score: weak ? 0.6 : 3 } } }
  }
  const r = await judgeSow({ requirements: [{ n: 1, fields: { instructions: 'Parse BOM' } }, { n: 2, fields: { instructions: 'Do stuff' } }], facts: ['BOM_RevC: 14 rows', 'Quote due 2026-10-20'] }, fake)
  assert.deepEqual(calls.map(c => c.q), [['faithful', 'clarity'], ['faithful', 'clarity'], ['covered'], ['covered']])
  assert.deepEqual(calls[0].state.discovery_context, ['BOM_RevC: 14 rows', 'Quote due 2026-10-20'], 'requirements are judged against the discovery context')
  assert.deepEqual(r.metrics.map(m => [m.key, m.score]), [['faithfulness', 50], ['coverage', 60], ['clarity', 60]])
  assert.deepEqual(r.findings.map(f => f.requirement), [2, 2], 'the weak requirement gets both findings')
  await assert.rejects(judgeSow({ requirements: [], facts: [] }, fake), /No requirements/)
})

test('Laya/Jev judge: context sufficiency evaluation for IP data', async () => {
  const fake: SystemOne = async (state, questions) => {
    assert.deepEqual(Object.keys(questions), ['sufficiency', 'detail_level', 'domain_coverage', 'gap_risk'])
    return {
      model: 'laya',
      usage: { input_tokens: 45 },
      answers: {
        sufficiency: { noul: 0.88 },
        detail_level: { score: 2.7 },
        domain_coverage: { noul: 0.92 },
        gap_risk: { noul: 0.12 },
      },
    }
  }

  const r = await judgeContextSufficiency({
    sources: [{ name: 'RFQ-0147.pdf', type: 'PDF', size: 102400 }, { name: 'BOM_RevC.xlsx', type: 'XLSX', size: 45000 }],
    facts: ['RFQ requires automated quotation', 'BOM contains 14 line items with supplier codes'],
    entities: [{ name: 'RFQ-2026-0147', type: 'Document' }, { name: 'LineItems', type: 'Table', count: 14 }],
    schemas: ['RFQQuote', 'BOMRecord'],
  }, fake)

  assert.equal(r.verdict, 'sufficient')
  assert.equal(r.metrics.find(m => m.key === 'sufficiency')!.score, 88)
  assert.equal(r.metrics.find(m => m.key === 'domain_coverage')!.score, 92)
  assert.equal(r.metrics.find(m => m.key === 'gap_risk')!.score, 88) // 100 - 12
  assert.ok(r.summary.includes('sufficient detail'))
  assert.equal(r.inputTokens, 45)

  // Empty input returns insufficient immediately
  const empty = await judgeContextSufficiency({ sources: [], facts: [] }, fake)
  assert.equal(empty.verdict, 'insufficient')
  assert.equal(empty.metrics.find(m => m.key === 'sufficiency')!.score, 0)
  assert.ok(empty.findings.some(f => f.severity === 'critical'))
})

