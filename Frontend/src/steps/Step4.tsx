import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from '../api/adapter'
import type { Assertion, Tests, VersionRef } from '../api/types'
import type { StepProps } from '../App'
import { useAction, useSkills } from '../lib/data'
import { setUi, toast } from '../lib/store'
import { currentTests } from '../lib/certification'
import { CertChecklist, DemoTag, VersionHistory } from '../components/release'
import { ActionSteps, Banner, Confirm, Copy, Empty, Icon, Pane, Section, Skeleton, StageList, StatusPill, Time, fmtTime, shortHash, type ActionStep } from '../components/ui'

const running = (s?: { status: string }) => s?.status === 'running' || s?.status === 'queued'

export function Center({ snap, info }: StepProps) {
  const { rows } = useSkills(snap.skillsRevision)
  const { busy, run } = useAction()
  const [ask, setAsk] = useState<'commit' | 'deploy' | null>(null)
  const m = snap.workflow?.manifest
  // Only results for THIS manifest hash count; an older run is shown as stale history.
  const t = currentTests(snap)
  const staleRun = !t ? snap.tests : undefined
  const shown = t ?? staleRun
  const p = snap.persist
  const testing = running(t?.sandbox) || running(t?.promptfoo)
  const testsPassed = t?.promptfoo.status === 'succeeded'
  const testsFailed = t?.sandbox.status === 'failed' || t?.promptfoo.status === 'failed'
  const reviewed = !!t?.reviewedAt && testsPassed
  const committing = p.artifacts.some(running)
  const isCommitted = !!m && p.committed?.hash === m.hash
  const deploying = running(p.deploy)
  const isDeployed = !!m && p.deployed?.hash === m.hash
  const ro = info.editable ? undefined : 'This screen is read-only'
  const name = (id: string) => rows?.find(r => r.id === id)?.name ?? id

  // When a deploy started here finishes, take the user to the Staging environment view.
  const awaitingDeploy = useRef(false)
  useEffect(() => {
    if (!awaitingDeploy.current || !isDeployed) return
    awaitingDeploy.current = false
    setUi({ env: 'Staging' })
    toast(`Manifest ${m!.version} is live on Staging. You are now viewing the Staging environment.`, 'success', '4.4')
    document.getElementById('deployed-section')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [isDeployed, m])

  const steps: ActionStep[] = [
    { key: 'test', caption: '01 / Test', icon: 'bolt', repeatable: true, busy: busy === 'Run tests',
      state: testing ? 'running' : testsFailed ? 'failed' : testsPassed ? 'done' : 'ready',
      stateText: testing ? 'Running' : testsFailed ? 'Failed' : testsPassed ? 'Passed' : 'Ready to run',
      label: t || staleRun ? 'Re-run tests' : 'Run sandbox and assertions',
      reason: ro ?? (testing ? 'A test run is in progress' : undefined),
      hint: t ? `Last run ${fmtTime(t.startedAt)} for ${t.manifestVersion}` : staleRun ? 'Earlier results are for another manifest hash' : 'Runs against the approved manifest',
      onClick: () => void run('Run tests', () => api.runTests(), { step: 4 }) },
    { key: 'review', caption: '02 / Review', icon: 'check', busy: busy === 'Review results',
      state: reviewed ? 'done' : testsPassed && !testing ? 'ready' : 'locked',
      stateText: reviewed ? 'Reviewed' : testsPassed && !testing ? 'Ready to review' : 'Locked',
      label: 'Mark results reviewed',
      reason: reviewed ? undefined : ro ?? (!t ? (staleRun ? 'Re-run the tests for this manifest first' : 'Run the tests first') : testing ? 'A test run is in progress' : !testsPassed ? 'Fix failing assertions first' : undefined),
      hint: reviewed ? `Reviewed ${fmtTime(t!.reviewedAt)}` : 'Confirm the Promptfoo results before persisting',
      onClick: () => void run('Review results', () => api.markTestsReviewed(), { success: 'Promptfoo results marked reviewed. Commit is now available.', step: 4 }) },
    { key: 'commit', caption: '03 / Commit', icon: 'db', busy: busy === 'Commit',
      state: isCommitted ? 'done' : committing ? 'running' : reviewed ? 'ready' : 'locked',
      stateText: isCommitted ? 'Committed' : committing ? 'Committing' : reviewed ? 'Ready to commit' : 'Locked',
      label: 'Commit to BAM_db',
      reason: isCommitted ? undefined : ro ?? (!reviewed ? 'All assertions must pass and results must be reviewed' : committing ? 'Commit in progress' : undefined),
      hint: isCommitted ? `Committed ${fmtTime(p.committed!.at)}` : 'Writes the JSON contract and AST code',
      onClick: () => setAsk('commit') },
    { key: 'deploy', caption: '04 / Deploy', icon: 'rocket', busy: busy === 'Deploy', action: 'deploy', successKey: isDeployed ? p.deployed!.at : undefined,
      state: isDeployed ? 'done' : deploying ? 'running' : isCommitted ? 'ready' : 'locked',
      stateText: isDeployed ? 'Live on Production' : deploying ? 'Deploying' : isCommitted ? 'Ready to deploy' : 'Locked',
      label: 'Deploy to Production Runtime',
      reason: isDeployed ? undefined : ro ?? (!isCommitted ? 'Commit this manifest to BAM_db first' : deploying ? 'Deployment in progress' : undefined),
      hint: isDeployed ? `Deployed ${fmtTime(p.deployed!.at)}` : 'Releases the committed manifest to production FastMCP cluster',
      onClick: () => setAsk('deploy') },
  ]

  return (
    <Pane id="center-title" kicker="4.4 · Test" title="Sandbox and assertions" className="center"
      actions={m && <span className="mono xs muted">manifest {m.version} · {shortHash(m.hash)}</span>}
>
      <Section title="Certification checklist" aside={<DemoTag />}>
        <CertChecklist snap={snap} />
      </Section>
      {!shown ? <Empty icon="bolt" title="No test run for this manifest">{m ? `Manifest ${m.version} (${shortHash(m.hash)}) is ready to test.` : 'Tests run against the manifest approved in 4.2.'}</Empty> : <>
        {staleRun && <Banner tone="warn" icon="refresh"><strong>Stale results.</strong> This run tested manifest {staleRun.manifestVersion} ({shortHash(staleRun.manifestHash)}); the current manifest is {m?.version} ({m ? shortHash(m.hash) : '—'}). They are kept as history and cannot certify the edited artifact. Re-run tests.</Banner>}
        <dl className="kv inline">
          <div><dt>Test run</dt><dd><Copy value={shown.runId} label="test run ID" /></dd></div>
          <div><dt>Tested manifest</dt><dd><span className="mono">{shown.manifestVersion}</span> · <Copy value={shown.manifestHash} display={shortHash(shown.manifestHash)} label="tested hash" /></dd></div>
          <div><dt>Approved SOW</dt><dd className="mono">v{shown.sowVersion}</dd></div>
          <div><dt>Started</dt><dd><Time iso={shown.startedAt} /></dd></div>
        </dl>
        <StageList stages={[shown.sandbox, shown.promptfoo]} />
        <Assertions t={shown} name={name} testing={testing} />
      </>}
      {snap.testHistory.length > 0 && (
        <details className="accordion history">
          <summary><Icon name="clock" size={12} />Earlier test runs<span className="muted xs">{snap.testHistory.length}</span></summary>
          <ul className="run-history">{snap.testHistory.map(h => (
            <li key={h.runId}><span className="mono xs">{h.runId}</span><span className="mono xs">{h.manifestVersion} · {h.manifestHash.slice(0, 8)}</span>
              <StatusPill status={h.promptfoo.status === 'succeeded' ? 'pass' : h.promptfoo.status === 'failed' ? 'fail' : h.promptfoo.status} text={h.promptfoo.status === 'succeeded' ? `Passed${h.reviewedAt ? ' · reviewed' : ''}` : undefined} />
              <Time iso={h.startedAt} /></li>
          ))}</ul>
        </details>
      )}
      {/* Decisions sit at the end of the content (not pinned), reached by scrolling. */}
      <div className="foot-stack end-actions">
        <p className="muted sm foot-desc">Runs the generated FastMCP tools in an isolated CubeSandbox MicroVM, then the Promptfoo assertion suite. Results update each skill's status in the 3.2 grid (shown with N · Notify on next).</p>
        <ActionSteps label="Test, review, commit and deploy" steps={steps} />
        <Confirm open={ask === 'commit'} title={`Commit manifest ${m?.version} to BAM_db?`} confirmLabel="Commit" onClose={() => setAsk(null)}
          onConfirm={() => { setAsk(null); void run('Commit', () => api.commitToPostgres(), { step: 4 }) }}
          consequences={[
            'Writes two JSONB rows to BAM_db: the JSON contract and the AST Python code.',
            `Rows are tagged with manifest ${m?.version} and hash ${m ? shortHash(m.hash) : ''}. Committed rows are the frozen version: immutable, with the run's evidence references.`,
            `Nothing is deployed yet: Cluster stays on ${p.deployed?.version ?? 'its current state (nothing deployed)'}.`,
          ]} />
        <Confirm open={ask === 'deploy'} title={`Deploy manifest ${m?.version} to Production Runtime?`} confirmLabel="Deploy to Production" onClose={() => setAsk(null)}
          onConfirm={() => { setAsk(null); awaitingDeploy.current = true; void run('Deploy', () => api.deployToStaging(), { step: 4 }) }}
          consequences={[
            `Releases the committed manifest ${m?.version} (hash ${m ? shortHash(m.hash) : ''}) to the live Production FastMCP Runtime cluster.`,
            p.deployed ? `Replaces ${p.deployed.version} on Production. Rollback target: ${p.deployed.version} (still committed in BAM_db).` : 'There is no earlier deployment to roll back to.',
            'When it finishes, the view switches to the live environment. The FDE / Production selector itself never deploys anything.',
          ]} />
      </div>
    </Pane>
  )
}

export function Left({ snap }: StepProps) {
  const { rows, isLoading } = useSkills(snap.skillsRevision)
  const agents = [...new Set((rows ?? []).map(r => r.agent))]
  return (
    <Pane id="left-title" kicker="Context and navigation" title="Skill status">
      {isLoading && !rows ? <Skeleton rows={6} /> : !rows?.length ? <Empty title="No skills">Skills come from the validated contract.</Empty> : agents.map(m => (
        <Section key={m} title={m}>
          <ul className="nav-list">
            {rows.filter(r => r.agent === m).map(r => (
              <li key={r.id} className="nav-item static">
                <span>{r.name}</span>
                <StatusPill status={r.status === 'TEST_FAILED' ? 'fail' : r.status === 'TEST_PASSED' || r.status === 'DEPLOYED' ? 'pass' : 'queued'} text={r.status} />
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </Pane>
  )
}

// Assertions grouped by skill. The skill label is sticky while its rows scroll; every row expands into its evidence.
function Assertions({ t, name, testing }: { t: Tests; name: (id: string) => string; testing: boolean }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(t.assertions.filter(a => a.status === 'fail').map(a => a.id)))
  const toggle = (id: string) => setOpen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const passed = t.assertions.filter(a => a.status === 'pass').length
  const bySkill = [...new Set(t.assertions.map(a => a.skillId))]
  return (
    <Section title="Promptfoo assertions" aside={t.assertions.length > 0 && <span className="muted sm">{passed} of {t.assertions.length} passed · select a row for its evidence</span>}>
      {t.assertions.length === 0 ? (testing ? <Skeleton rows={4} label="Running assertions" /> : <p className="muted sm">No assertion results reported.</p>) : (
        <div className="scroll-box assertions-box" tabIndex={0} aria-label="Assertion results">
          <table className="table assertions">
            <thead><tr><th scope="col">Assertion</th><th scope="col">Result</th></tr></thead>
            {bySkill.map(id => (
              <tbody key={id}>
                <tr className="skill-head"><th colSpan={2} scope="colgroup">{name(id)} <span className="mono xs muted">{id}</span></th></tr>
                {t.assertions.filter(a => a.skillId === id).map(a => (
                  <Fragment key={a.id}>
                    <tr className={`as-row ${a.status === 'fail' ? 'row-fail' : ''}`}>
                      <td>
                        <button className="as-toggle" aria-expanded={open.has(a.id)} aria-controls={`ev-${a.id}`} onClick={() => toggle(a.id)}>
                          <Icon name={open.has(a.id) ? 'down' : 'chevron'} size={12} />{a.name}
                        </button>
                        {a.message && <div className="stage-error xs">{a.message}</div>}
                      </td>
                      <td><StatusPill status={a.status} /></td>
                    </tr>
                    {open.has(a.id) && <tr className="as-evidence" id={`ev-${a.id}`}><td colSpan={2}><AssertionEvidence a={a} /></td></tr>}
                  </Fragment>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </Section>
  )
}

function AssertionEvidence({ a }: { a: Assertion }) {
  return (
    <dl className="evidence">
      <div><dt>Fixture</dt><dd><Copy value={a.fixture} label="fixture path" /></dd></div>
      <div><dt>Input</dt><dd className="mono xs pre">{a.input}</dd></div>
      <div><dt>Expected</dt><dd className="xs">{a.expected}</dd></div>
      <div><dt>Observed</dt><dd className={`mono xs pre ${a.status === 'fail' ? 'tone-err' : ''}`}>{a.observed}</dd></div>
      {a.message && <div><dt>Failure</dt><dd className="stage-error xs">{a.message}</dd></div>}
      <div><dt>Evidence</dt><dd><Copy value={a.evidence} display={`${a.evidence.slice(0, 34)}…`} label="evidence reference" /> <DemoTag /></dd></div>
    </dl>
  )
}

function Rung({ n, title, desc, done, active, refv, children }: { n: number; title: string; desc: string; done: boolean; active: boolean; refv?: VersionRef; children?: ReactNode }) {
  return (
    <li className={`rung ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
      <div className="rung-head">
        <span className="rung-num" aria-hidden>{done ? <Icon name="check" size={12} /> : n}</span>
        <h3>{title}</h3>
        <StatusPill status={done ? 'done' : active ? 'active' : 'locked'} text={done ? 'Reached' : active ? 'Next' : 'Not yet'} />
      </div>
      <p className="muted sm">{desc}</p>
      {refv && <dl className="kv compact">
        <div><dt>Version</dt><dd className="mono">{refv.version}</dd></div>
        <div><dt>Hash</dt><dd><Copy value={refv.hash} display={shortHash(refv.hash)} label="hash" /></dd></div>
        <div><dt>At</dt><dd><Time iso={refv.at} /></dd></div>
        {refv.runId && <div><dt>Run ID</dt><dd><Copy value={refv.runId} label="run ID" /></dd></div>}
      </dl>}
      {children}
    </li>
  )
}

// Evidence only: draft → certified → frozen (committed) → deployed. Certification and the frozen version are
// separate from "Deployed to Staging". Decisions are made in the centre pane.
export function Right({ snap }: StepProps) {
  const p = snap.persist
  const m = snap.workflow?.manifest
  const isCommitted = !!m && p.committed?.hash === m.hash
  const isDeployed = !!m && p.deployed?.hash === m.hash
  const cert = m ? [...snap.versions].reverse().find(v => v.kind === 'certified' && v.hash === m.hash) : undefined
  return (
    <Pane id="right-title" kicker="Evidence and status" title="Certify, freeze, deploy">
      {m ? <dl className="kv">
        <div><dt>Current manifest</dt><dd className="mono">{m.version}</dd></div>
        <div><dt>SHA-256</dt><dd><Copy value={m.hash} display={shortHash(m.hash)} label="manifest hash" /></dd></div>
      </dl> : <Empty title="No manifest">Produced by 4.1 validation.</Empty>}
      <ol className="ladder" aria-label="Release states">
        <Rung n={1} title="Saved draft" done={!!p.draft} active={!p.draft} refv={p.draft}
          desc="Manifest stored in BAM after validation. Not certified, not in BAM_db, not deployed." />
        <Rung n={2} title="Certified" done={!!cert} active={!!p.draft && !cert} refv={cert}
          desc="Clean sandbox + assertion run reviewed for this exact hash. Certification is evidence, not a deployment.">
          {cert && <DemoTag />}
        </Rung>
        <Rung n={3} title="Frozen in BAM_db" done={isCommitted} active={!!cert && !isCommitted} refv={p.committed}
          desc="JSON contract and AST code committed as immutable JSONB rows in BAM_db: the frozen version. Not deployed yet.">
          {p.committed && !isCommitted && <p className="muted xs">Last commit is an older manifest ({p.committed.version}).</p>}
          {p.artifacts.length > 0 && <StageList stages={p.artifacts} />}
          {!!p.draft && !isCommitted && <p className="rung-next"><Icon name="chevron" size={11} />Next: 03 / Commit to BAM_db in the centre pane</p>}
        </Rung>
        <Rung n={4} title="Live on Production Runtime" done={isDeployed} active={isCommitted && !isDeployed} refv={p.deployed}
          desc="The committed manifest and its skills are released to the live Production FastMCP cluster.">
          {p.deployed && !isDeployed && <p className="muted xs">Runtime runs an older manifest ({p.deployed.version}) until you deploy this one.</p>}
          {p.deploy && <StageList stages={[p.deploy]} />}
          {isCommitted && !isDeployed && <p className="rung-next"><Icon name="chevron" size={11} />Next: 04 / Deploy to Production in the centre pane</p>}
        </Rung>
      </ol>
      <Section title="Version history"><VersionHistory snap={snap} limit={6} /></Section>
      <div id="deployed-section" />
      <Section title="Live on Production Runtime" aside={p.deployed && <span className="mono xs muted">{p.deployed.version}</span>}>
        {p.deployedSkills.length === 0 ? <p className="muted sm">Nothing deployed yet. Skills appear here after a production deployment.</p> : p.deployedSkills.map(g => (
          <details key={g.agent} className="accordion" open>
            <summary><Icon name="palette" size={12} />{g.agent}<span className="muted xs">{g.skills.length}</span></summary>
            <ul>{g.skills.map(s => <li key={s}>{s}</li>)}</ul>
          </details>
        ))}
      </Section>
    </Pane>
  )
}
