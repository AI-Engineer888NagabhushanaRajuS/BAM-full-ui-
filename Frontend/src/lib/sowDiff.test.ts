// npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { diffBlocks, diffWords, editCount } from './sowDiff.ts'
import { RFQ_REQUIREMENTS, parseRequirements, renderSowHtml } from '../api/sowFormat.ts'

const words = (segs: { kind: string; text: string }[]) => segs.map(s => `${s.kind}:${s.text}`)

test('identical text has no edits', () => {
  assert.deepEqual(words(diffWords('a b c', 'a b c')), ['same:a b c'])
})

test('pure insertion is added, pure deletion is removed, replacement is removed + modified', () => {
  assert.deepEqual(words(diffWords('route it', 'route it now')).filter(s => !s.startsWith('same')), ['added:now'])
  assert.deepEqual(words(diffWords('route it now', 'route it')).filter(s => !s.startsWith('same')), ['removed:now'])
  assert.deepEqual(words(diffWords('weekly summary email', 'audit log email')).filter(s => !s.startsWith('same')),
    ['removed:weekly summary', 'modified:audit log'])
})

test('non-removed segments reproduce the new text exactly (editor highlight offsets depend on it)', () => {
  const cases: [string, string][] = [['the OKF document classes.', 'the OKF ontology classes.'], ['route it now please', 'route it please'],
    ['a weekly summary email', 'an audit log email today'], ['x', 'completely different words here']]
  for (const [a, b] of cases) assert.equal(diffWords(a, b).filter(s => s.kind !== 'removed').map(s => s.text).join(''), b, `${a} → ${b}`)
})

test('blocks: unchanged, changed, added section and removed block with counts', () => {
  const oldB = [{ tag: 'h1', text: 'SOW' }, { tag: 'p', text: 'keep this' }, { tag: 'p', text: 'quote in 5 days' }, { tag: 'p', text: 'drop me' }]
  const newB = [{ tag: 'h1', text: 'SOW' }, { tag: 'p', text: 'keep this' }, { tag: 'p', text: 'quote in 4 days' },
    { tag: 'h2', text: 'Scope' }, { tag: 'p', text: 'In scope: BOM.' }]
  const { blocks, counts } = diffBlocks(oldB, newB)
  assert.deepEqual(blocks.map(b => `${b.tag}:${b.kind}`), ['h1:same', 'p:same', 'p:changed', 'p:removed', 'h2:added', 'p:added'])
  assert.deepEqual(counts, { added: 2, removed: 1, modified: 1 }, '"5"→"4" is one modification; the new section and its text are additions')
  assert.equal(editCount(counts), 4)
})

test('SOW format round-trips: rendered requirements parse back exactly', () => {
  const html = renderSowHtml(RFQ_REQUIREMENTS, ['add freight terms'])
  const parsed = parseRequirements(html)
  assert.equal(parsed.length, RFQ_REQUIREMENTS.length)
  assert.deepEqual(parsed.map(p => p.fields), RFQ_REQUIREMENTS)
  assert.deepEqual(parsed.map(p => p.passageId), RFQ_REQUIREMENTS.map((_, i) => `req-${i + 1}`))
  assert.ok(!/macro|sub-skill|agent/i.test(html.replace(/no agent or skill grouping/i, '')), 'SOW carries no agent/skill grouping')
})

test('parsing picks up human edits and new requirements', () => {
  const html = renderSowHtml(RFQ_REQUIREMENTS.slice(0, 1))
    .replace('store each attachment', 'store and virus-scan each attachment')
    .replace('<h2>Approval</h2>', '<h2>Requirement 2</h2><ul><li><p><strong>I — Instructions:</strong> Log every failure visibly to the user.</p></li></ul><h2>Approval</h2>')
  const parsed = parseRequirements(html)
  assert.equal(parsed.length, 2)
  assert.match(parsed[0].fields.instructions, /virus-scan/)
  assert.equal(parsed[1].fields.instructions, 'Log every failure visibly to the user.')
  assert.equal(parsed[1].fields.sourceData, '', 'missing fields come back empty (and fail validation)')
})
