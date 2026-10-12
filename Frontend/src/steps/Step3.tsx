import { useMemo, useState } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import { api } from '../api/adapter'
import type { Activity, CodeFile, Finding, Snapshot } from '../api/types'
import type { StepProps } from '../App'
import { useAction, useCode, useSkills } from '../lib/data'
import { getDrafts, setCodeDraft, setDrafts, useDrafts } from '../lib/drafts'
import { goScreen, usePath } from '../lib/route'
import { setUi, useUi } from '../lib/store'
import { certifiedBaseline } from '../lib/certification'
import { CertChecklist, VersionHistory } from '../components/release'
import {
  Banner,
  Copy,
  Empty,
  GateButton,
  Icon,
  Pane,
  Section,
  Skeleton,
  StatusPill,
  Time,
  shortHash,
} from '../components/ui'

// ---- Monaco Theme Configuration ------------------------------------------------------------------------

export function defineThemes(monaco: any) {
  monaco.editor.defineTheme('bam-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#0B1526',
      'editor.lineHighlightBackground': '#101E32',
      'editorGutter.background': '#0B1526',
    },
  })
  monaco.editor.defineTheme('bam-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#F8FAFC',
      'editor.lineHighlightBackground': '#EDF2F7',
      'editorGutter.background': '#F8FAFC',
    },
  })
  monaco.editor.defineTheme('bam-dark-staging', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#1B140E',
      'editor.lineHighlightBackground': '#2A1F16',
      'editorGutter.background': '#1B140E',
    },
  })
  monaco.editor.defineTheme('bam-light-staging', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#FFF9F5',
      'editor.lineHighlightBackground': '#FFF0E5',
      'editorGutter.background': '#FFF9F5',
    },
  })
}

export function editorTheme(theme: string, staging: boolean): string {
  return staging
    ? theme === 'light'
      ? 'bam-light-staging'
      : 'bam-dark-staging'
    : theme === 'light'
    ? 'bam-light'
    : 'bam-dark'
}

// ---- Helpers -------------------------------------------------------------------------------------------

export function codeRev(snap: Snapshot): string {
  return `${snap.skillsRevision}-${snap.workflow?.manifest?.hash ?? 'no-hash'}-${snap.workflow?.approval?.hash ?? ''}`
}

export function openCode(path: string, line?: number) {
  setUi({ codeFocus: { file: path, line } })
  goScreen('4.3')
}

// ---- Finding Item --------------------------------------------------------------------------------------

export function FindingItem({ f, files }: { f: Finding; files?: CodeFile[] }) {
  const file = files?.find(x => x.skillId === f.skillId || x.path === f.file)
  const filePath = f.file ?? file?.path
  return (
    <li className={`finding ${f.resolved ? 'resolved' : ''}`}>
      <span className="finding-badge">
        <Icon name={f.severity === 'error' ? 'alert' : 'info'} size={12} />
      </span>
      <span className="finding-msg">{f.message}</span>
      <span className="finding-refs">
        {f.skillId && <span className="mono xs muted">{f.skillId}</span>}
        {filePath && (
          <button className="link xs mono" onClick={() => openCode(filePath, f.line)}>
            {filePath}
            {f.line ? `:${f.line}` : ''}
          </button>
        )}
        {f.resolved && (
          <span className="mark-resolved xs muted">
            <Icon name="check" size={10} /> resolved
          </span>
        )}
      </span>
    </li>
  )
}

// ---- Review & Diff Editor ------------------------------------------------------------------------------

export function ReviewEditor({
  path,
  language,
  original,
  value,
  editable = false,
  lockedReason,
  showChanges = true,
  onChange,
  onSave,
  height = '100%',
}: {
  path: string
  language: string
  original?: string
  value: string
  editable?: boolean
  lockedReason?: string
  showChanges?: boolean
  onChange?: (val: string) => void
  onSave?: (val: string) => void
  height?: string | number
}) {
  const theme = useUi(s => s.theme)
  const staging = useUi(s => s.env === 'Staging')

  if (showChanges && original !== undefined) {
    return (
      <DiffEditor
        height={height}
        language={language}
        original={original}
        modified={value}
        theme={editorTheme(theme, staging)}
        beforeMount={defineThemes}
        onMount={(diffEditor, monaco) => {
          const mod = diffEditor.getModifiedEditor()
          if (editable && onChange) {
            mod.onDidChangeModelContent(() => {
              onChange(mod.getValue())
            })
          }
          if (editable && onSave) {
            mod.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
              onSave(mod.getValue())
            })
          }
        }}
        options={{
          readOnly: !editable,
          renderSideBySide: false, // Inline diff per CLAUDE.md
          minimap: { enabled: false },
          fontSize: 12,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          ariaLabel: path,
        }}
      />
    )
  }

  return (
    <Editor
      height={height}
      language={language}
      path={path}
      value={value}
      theme={editorTheme(theme, staging)}
      beforeMount={defineThemes}
      onChange={v => onChange?.(v ?? '')}
      onMount={(editor, monaco) => {
        if (editable && onSave) {
          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            onSave(editor.getValue())
          })
        }
      }}
      options={{
        readOnly: !editable,
        readOnlyMessage: lockedReason ? { value: lockedReason } : undefined,
        minimap: { enabled: false },
        fontSize: 12,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        ariaLabel: path,
      }}
    />
  )
}

// ---- Shared Sandbox Navigation Tabs --------------------------------------------------------------------

function SandboxTabs({ current }: { current: '4.1' | '4.2' | '4.3' }) {
  const drafts = useDrafts(d => d)
  const hasCodeDrafts = Object.keys(drafts.code).length > 0
  const hasManifestDraft = drafts.manifest !== undefined

  return (
    <nav className="tabs" aria-label="Sandbox validation views">
      <button role="tab" aria-selected={current === '4.1'} onClick={() => goScreen('4.1')}>
        Activities
      </button>
      <button role="tab" aria-selected={current === '4.2'} onClick={() => goScreen('4.2')}>
        Manifest JSON
        {hasManifestDraft && (
          <span className="tab-unsaved" title="Unsaved manifest edits">
            *
          </span>
        )}
      </button>
      <button role="tab" aria-selected={current === '4.3'} onClick={() => goScreen('4.3')}>
        Generated code
        {hasCodeDrafts && (
          <span className="tab-unsaved" title="Unsaved code edits">
            *
          </span>
        )}
      </button>
    </nav>
  )
}

// ---- Shared Validation Footer --------------------------------------------------------------------------

function ValidationFooter({ snap, info }: StepProps) {
  const { busy, run } = useAction()
  const wf = snap.workflow
  const m = wf?.manifest
  const approved = !!m && wf?.approval?.hash === m.hash
  const activitiesPassed = wf?.activities.slice(0, 3).every(a => a.status === 'succeeded') ?? false
  const activitiesFailed = wf?.activities.some(a => a.status === 'failed') ?? false
  const ro = info.editable ? undefined : 'This screen is read-only'
  const testsExist = snap.tests?.manifestHash === m?.hash

  const handleStartValidation = async () => {
    if (testsExist) {
      goScreen('4.4')
      return
    }
    await run(
      'Start validation',
      async () => {
        if (!approved) {
          await api.approveManifest()
        }
        await api.runTests()
        goScreen('4.4')
      },
      { step: 3, success: 'Manifest approved and validation suite started in 4.4 Sandbox.' }
    )
  }

  const handleRetry = (key: 'A' | 'B' | 'C' | 'D') => {
    void run('Retry activity', () => api.retryActivity(key), { step: 3 })
  }

  const failedActivity = wf?.activities.find(a => a.status === 'failed')

  return (
    <footer className="validation-footer" role="region" aria-label="Validation actions">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
        <div className="row" style={{ gap: '10px', alignItems: 'center' }}>
          {activitiesFailed ? (
            <>
              <StatusPill status="fail" text="Validation failed" />
              <span className="muted sm">
                {failedActivity ? `${failedActivity.label} failed${failedActivity.reason ? `: ${failedActivity.reason}` : ''}` : 'One or more activities failed'}
              </span>
              {failedActivity && (
                <button className="btn btn-secondary sm" disabled={!!busy || !info.editable} onClick={() => handleRetry(failedActivity.key)}>
                  <Icon name="refresh" /> Retry {failedActivity.label}
                </button>
              )}
            </>
          ) : activitiesPassed ? (
            <>
              <StatusPill status={approved ? 'done' : 'pass'} text={approved ? 'Manifest approved' : 'Manifest & code ready'} />
              <span className="muted sm">
                {m ? (
                  <>
                    Manifest <span className="mono">{m.version}</span> ({m.hash.slice(0, 8)}) ready for testing
                  </>
                ) : (
                  'Activities passed'
                )}
              </span>
            </>
          ) : (
            <>
              <StatusPill status="queued" text={wf ? wf.status : 'Awaiting run'} />
              <span className="muted sm">{wf?.activities.find(a => a.status === 'running')?.label ?? 'Activities in progress or queued'}</span>
            </>
          )}
        </div>
        <div>
          <GateButton
            variant="primary"
            icon="bolt"
            busy={busy === 'Start validation'}
            reason={ro ?? (!activitiesPassed ? 'Activities A–C must pass before validating' : undefined)}
            onClick={handleStartValidation}
          >
            {testsExist ? 'Go to 4.4 Sandbox' : 'Start validation'}
          </GateButton>
        </div>
      </div>
    </footer>
  )
}

// ---- Left Pane (Navigation & Context) -------------------------------------------------------------------

export function Left({ snap }: StepProps) {
  const path = usePath()
  const wf = snap.workflow
  const { files } = useCode(codeRev(snap))
  const { rows } = useSkills(snap.skillsRevision)
  const drafts = useDrafts(d => d)
  const focusFile = useUi(s => s.codeFocus?.file)
  const activeFile = files?.find(f => f.path === focusFile) ?? files?.[0]
  const isCodeView = path.includes('/sandbox/code')

  const openFindings = (file?: string, skillId?: string) =>
    wf?.activities.flatMap(a => a.findings).filter(f => !f.resolved && ((file && f.file === file) || (skillId && f.skillId === skillId))).length ?? 0

  return (
    <Pane id="left-title" kicker="Context & Navigation" title="Sandbox validation">
      <Section title="Validation screens">
        <ul className="nav-list">
          <li>
            <button className="nav-item" aria-current={path.includes('/sandbox/validation') || undefined} onClick={() => goScreen('4.1')}>
              <span>4.1 Activities</span>
              <StatusPill status={wf?.status === 'succeeded' ? 'pass' : wf?.status === 'failed' ? 'fail' : 'queued'} />
            </button>
          </li>
          <li>
            <button className="nav-item" aria-current={path.includes('/sandbox/manifest') || undefined} onClick={() => goScreen('4.2')}>
              <span>4.2 Manifest JSON</span>
              {drafts.manifest !== undefined ? <span className="mark-unsaved xs">unsaved</span> : wf?.manifest ? <span className="mono xs muted">{wf.manifest.version}</span> : null}
            </button>
          </li>
          <li>
            <button className="nav-item" aria-current={path.includes('/sandbox/code') || undefined} onClick={() => goScreen('4.3')}>
              <span>4.3 Generated code</span>
              {Object.keys(drafts.code).length > 0 ? <span className="mark-unsaved xs">unsaved</span> : <span className="mono xs muted">{files?.length ?? 0} files</span>}
            </button>
          </li>
        </ul>
      </Section>

      {isCodeView ? (
        <Section title="Generated skill files" aside={<span className="muted xs">{files?.length ?? 0} files</span>}>
          {!files?.length ? (
            <p className="muted sm">No code files generated yet.</p>
          ) : (
            <ul className="nav-list">
              {files.map(f => {
                const isSelected = activeFile?.path === f.path
                const hasDraft = drafts.code[f.path] !== undefined && drafts.code[f.path] !== f.content
                const errs = openFindings(f.path, f.skillId)
                const skillName = rows?.find(r => r.id === f.skillId)?.name ?? f.skillId
                return (
                  <li key={f.path}>
                    <button className="nav-item" aria-current={isSelected || undefined} onClick={() => setUi({ codeFocus: { file: f.path } })}>
                      <span className="mono xs" title={f.path}>
                        {skillName}
                      </span>
                      {hasDraft ? (
                        <span className="tab-dot" title="Unsaved edits" />
                      ) : errs > 0 ? (
                        <StatusPill status="fail" text={`${errs}`} />
                      ) : f.edited ? (
                        <span className="mark-edited xs"><Icon name="edit" size={10} /></span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>
      ) : (
        <Section title="Temporal pipeline" aside={<span className="muted xs">A–D</span>}>
          <ul className="nav-list">
            {(wf?.activities ?? []).map(a => (
              <li key={a.key}>
                <div className="nav-item static">
                  <span>
                    <strong>{a.key}</strong> · {a.label}
                  </span>
                  <StatusPill status={a.status === 'succeeded' ? 'pass' : a.status === 'failed' ? 'fail' : a.status === 'running' ? 'active' : 'queued'} />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Pane>
  )
}

// ---- Center Pane: 4.1 Activities -----------------------------------------------------------------------

export function ActivitiesCenter({ snap, info }: StepProps) {
  const wf = snap.workflow
  const { files } = useCode(codeRev(snap))
  const { busy, run } = useAction()

  return (
    <Pane id="center-title" kicker="4.1 · Activities" title="Temporal validation activities" className="center">
      <SandboxTabs current="4.1" />

      {!wf ? (
        <Empty icon="bolt" title="Validation pipeline not started">
          Approve the SOW in 3.1 and generate the contract in 3.2 to run activities A–D.
        </Empty>
      ) : (
        <div className="tabpanel">
          <Banner tone={wf.status === 'failed' ? 'err' : wf.status === 'succeeded' ? 'ok' : 'info'} icon={wf.status === 'failed' ? 'alert' : 'bolt'}>
            Workflow run <span className="mono">{wf.runId.slice(0, 8)}</span>: {wf.status === 'succeeded' ? 'Activities A–C passed successfully.' : wf.status === 'failed' ? 'One or more activities failed.' : 'Activities running in Temporal.'}
          </Banner>

          <ol className="timeline">
            {wf.activities.map(a => {
              const openCount = a.findings.filter(f => !f.resolved).length
              return (
                <li key={a.key} className={`activity st-${a.status}`}>
                  <div className="activity-rail">
                    <div className="activity-key">{a.key}</div>
                  </div>
                  <div className="activity-card">
                    <header>
                      <h3>
                        {a.key} · {a.label}
                      </h3>
                      <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
                        {a.status === 'failed' && (
                          <button className="btn btn-secondary sm" disabled={!!busy || !info.editable} onClick={() => void run('Retry', () => api.retryActivity(a.key), { step: 3 })}>
                            <Icon name="refresh" /> Retry
                          </button>
                        )}
                        <StatusPill status={a.status === 'succeeded' ? 'pass' : a.status === 'failed' ? 'fail' : a.status === 'running' ? 'active' : 'queued'} text={a.status} />
                      </div>
                    </header>

                    <p className="meta muted sm">{a.detail || a.reason || 'Queued'}</p>

                    {a.history && a.history.length > 1 && (
                      <details className="acc-findings" style={{ width: '100%' }}>
                        <summary>Attempt history ({a.history.length} attempts)</summary>
                        <ul className="mini-list" style={{ marginTop: '6px' }}>
                          {a.history.map(h => (
                            <li key={h.attempt} className="row xs muted" style={{ justifyContent: 'space-between' }}>
                              <span>Attempt {h.attempt}: {h.reason || h.status}</span>
                              <StatusPill status={h.status === 'succeeded' ? 'pass' : 'fail'} />
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}

                    {a.findings.length > 0 && (
                      <details className="findings" open={openCount > 0}>
                        <summary>{openCount} open findings ({a.findings.length} total)</summary>
                        <ul className="findings">
                          {a.findings.map(f => (
                            <FindingItem key={f.id} f={f} files={files} />
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      <ValidationFooter snap={snap} info={info} />
    </Pane>
  )
}

// ---- Center Pane: 4.2 Manifest JSON --------------------------------------------------------------------

export function ManifestCenter({ snap, info }: StepProps) {
  const wf = snap.workflow
  const m = wf?.manifest
  const base = certifiedBaseline(snap)
  const drafts = useDrafts(d => d)
  const currentDraft = drafts.manifest
  const originalJson = base?.manifest ?? wf?.generatedManifest ?? (m ? JSON.stringify(m, null, 2) : '')
  const displayJson = currentDraft ?? (m ? JSON.stringify(m, null, 2) : originalJson)
  const hasChanges = currentDraft !== undefined && currentDraft !== (m ? JSON.stringify(m, null, 2) : '')
  const { busy, run } = useAction()

  const handleSave = async (contentToSave?: string) => {
    const text = contentToSave ?? currentDraft
    if (!text) return
    await run(
      'Save manifest',
      async () => {
        await api.saveManifest(text)
        setDrafts({ manifest: undefined })
      },
      { step: 3, success: 'Manifest saved and hash recomputed. Approval reset for re-validation.' }
    )
  }

  const handleDiscard = () => {
    setDrafts({ manifest: undefined })
  }

  return (
    <Pane id="center-title" kicker="4.2 · Manifest JSON" title="Manifest JSON & comparison" className="center">
      <SandboxTabs current="4.2" />

      {!wf?.manifest ? (
        <Empty icon="file" title="Manifest not ready">
          Activities A–C must pass to finalize the initial manifest.
        </Empty>
      ) : (
        <div className="tabpanel code-view">
          <Banner tone="info" icon="info">
            Comparing against {base ? `certified version ${base.version}` : 'initial generated manifest'}. Version, agent, and skill names are editable; saving recalculates the hash and invalidates approvals.
          </Banner>

          <div className="code-bar">
            <span className="mono sm">manifest.json</span>
            {hasChanges && <span className="mark-unsaved"><Icon name="edit" size={10} /> unsaved edits</span>}
            <div className="code-actions">
              {hasChanges && (
                <>
                  <button className="btn btn-ghost sm" onClick={handleDiscard}>Discard</button>
                  <button className="btn btn-primary sm" disabled={!!busy || !info.editable} onClick={() => void handleSave()}>
                    Save manifest
                  </button>
                </>
              )}
            </div>
            <span className="diff-legend">
              <ins className="d-added">Added</ins>
              <del className="d-removed">Removed</del>
            </span>
          </div>

          <div className="monaco-box" style={{ height: '480px' }}>
            <ReviewEditor
              path="manifest.json"
              language="json"
              original={originalJson}
              value={displayJson}
              editable={info.editable && wf.status === 'succeeded'}
              lockedReason={!info.editable ? 'Screen is read-only' : wf.status !== 'succeeded' ? 'Activities must pass before editing manifest' : undefined}
              showChanges
              onChange={val => setDrafts({ manifest: val })}
              onSave={val => void handleSave(val)}
            />
          </div>
        </div>
      )}

      <ValidationFooter snap={snap} info={info} />
    </Pane>
  )
}

// ---- Center Pane: 4.3 Generated Code -------------------------------------------------------------------

export function CodeCenter({ snap, info }: StepProps) {
  const { files } = useCode(codeRev(snap))
  const focusFile = useUi(s => s.codeFocus?.file)
  const activeFile = files?.find(f => f.path === focusFile) ?? files?.[0]
  const drafts = useDrafts(d => d)
  const currentDraft = activeFile ? drafts.code[activeFile.path] : undefined
  const currentValue = currentDraft ?? activeFile?.content ?? ''
  const hasChanges = activeFile && currentDraft !== undefined && currentDraft !== activeFile.content
  const { busy, run } = useAction()

  const handleSave = async (contentToSave?: string) => {
    if (!activeFile) return
    const text = contentToSave ?? currentDraft
    if (text === undefined) return
    await run(
      'Save code',
      async () => {
        const ok = await api.saveCode(activeFile.path, text)
        setCodeDraft(activeFile.path, undefined)
        if (!ok) {
          throw new Error('Code has AST syntax errors. Check activity C findings.')
        }
      },
      { step: 3, success: `${activeFile.path} saved and re-checked by AST parser.` }
    )
  }

  const handleDiscard = () => {
    if (activeFile) setCodeDraft(activeFile.path, undefined)
  }

  const fileFindings = snap.workflow?.activities
    .flatMap(a => a.findings)
    .filter(f => !f.resolved && f.file === activeFile?.path) ?? []

  return (
    <Pane id="center-title" kicker="4.3 · Generated code" title={activeFile ? activeFile.path : 'Generated skill code'} className="center">
      <SandboxTabs current="4.3" />

      {!activeFile ? (
        <Empty icon="code" title="No generated code available">
          Generate the ISATVON Contract in 3.2 to render FastMCP Python skill files.
        </Empty>
      ) : (
        <div className="tabpanel code-view">
          <div className="code-bar">
            <span className="mono sm"><Copy value={activeFile.path} display={activeFile.path} label="file path" /></span>
            {hasChanges && <span className="mark-unsaved"><Icon name="edit" size={10} /> unsaved edits</span>}
            <div className="code-actions">
              {hasChanges && (
                <>
                  <button className="btn btn-ghost sm" onClick={handleDiscard}>Discard</button>
                  <button className="btn btn-primary sm" disabled={!!busy || !info.editable} onClick={() => void handleSave()}>
                    Save code
                  </button>
                </>
              )}
            </div>
            <span className="diff-legend">
              <ins className="d-added">Added</ins>
              <del className="d-removed">Removed</del>
            </span>
          </div>

          {fileFindings.length > 0 && (
            <Banner tone="err" icon="alert">
              AST syntax error detected: {fileFindings[0].message}
            </Banner>
          )}

          <div className="monaco-box" style={{ height: '480px' }}>
            <ReviewEditor
              path={activeFile.path}
              language="python"
              original={activeFile.generated}
              value={currentValue}
              editable={info.editable}
              lockedReason={!info.editable ? 'Screen is read-only' : undefined}
              showChanges
              onChange={val => setCodeDraft(activeFile.path, val)}
              onSave={val => void handleSave(val)}
            />
          </div>
        </div>
      )}

      <ValidationFooter snap={snap} info={info} />
    </Pane>
  )
}

// ---- Right Pane (Evidence & Status) --------------------------------------------------------------------

export function Right({ snap }: StepProps) {
  const wf = snap.workflow
  const m = wf?.manifest
  const approved = !!m && wf?.approval?.hash === m.hash
  const base = certifiedBaseline(snap)
  const openFindings = wf?.activities.flatMap(a => a.findings).filter(f => !f.resolved) ?? []

  return (
    <Pane id="right-title" kicker="Evidence & Status" title="Validation evidence">
      <Section title="Manifest & Approval">
        <dl className="kv">
          <div>
            <dt>Manifest version</dt>
            <dd>{m ? <span className="mono">{m.version}</span> : 'Not generated'}</dd>
          </div>
          <div>
            <dt>Manifest hash</dt>
            <dd>{m ? <Copy value={m.hash} display={shortHash(m.hash)} label="manifest hash" /> : '—'}</dd>
          </div>
          <div>
            <dt>Code approval</dt>
            <dd>
              <StatusPill status={approved ? 'done' : 'pending'} text={approved ? 'Approved' : 'Not approved'} />
            </dd>
          </div>
          <div>
            <dt>Open findings</dt>
            <dd>{openFindings.length > 0 ? <StatusPill status="fail" text={`${openFindings.length} open`} /> : <StatusPill status="pass" text="0 open" />}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Certification checklist">
        <CertChecklist snap={snap} compact />
      </Section>

      <Section title="Release baseline">
        {base ? (
          <dl className="kv">
            <div>
              <dt>Certified version</dt>
              <dd><span className="mono">{base.version}</span></dd>
            </div>
            <div>
              <dt>Certified hash</dt>
              <dd><Copy value={base.hash} display={shortHash(base.hash)} label="certified hash" /></dd>
            </div>
            <div>
              <dt>Certified at</dt>
              <dd><Time iso={base.at} /></dd>
            </div>
          </dl>
        ) : (
          <p className="muted sm">No certified version in BAM_db yet. First release baseline.</p>
        )}
      </Section>

      <Section title="Version history">
        <VersionHistory snap={snap} limit={3} />
      </Section>
    </Pane>
  )
}
