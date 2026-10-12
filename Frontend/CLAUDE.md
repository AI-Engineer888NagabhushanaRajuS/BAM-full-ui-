# BuLLM BAM Workbench (frontend)

React 19 + Vite + TypeScript. Refine (headless `@refinedev/core`, data layer only), TipTap, AG Grid Community, Monaco, Uppy, React Flow (`@xyflow/react`). Masters, Admin, Client SRI and Jinja2 are out of scope.

## Commands

- `cd server/laya-judge && npm start`: Laya SOW judge on :8787 (first start downloads the ~1.7 GB ONNX model to `~/.cache/receptron-laya`). The dev server proxies `/laya`.
- Real Cognee: run the Cognee API server (`docker compose up` in topoteretes/cognee, `REQUIRE_AUTHENTICATION=false`, an LLM key, S3 read access), then `VITE_RAG_BACKEND=cognee npm run dev` (proxied at `/cognee`; `COGNEE_URL` overrides `http://localhost:8000`).

- `npm run dev`: dev server, always **http://localhost:5174** (`strictPort`; fails instead of switching ports)
- `npm run build`: `tsc --noEmit` + production build
- `npm test`: unit tests (Node built-in runner): 16-screen registry, tracker evidence, RAG pipeline, SOW diff, and `lib/repair.test.ts` (prerequisites, certification/stale hash, SOW comparison, shared drafts, ISATVON names)
- `npm run check`: mock backend gate self-check (`src/api/mock.check.ts`)

Run `npx tsc --noEmit`, `npm test` and `npm run check` after changes. `*.test.ts` and `*.check.ts` run in Node and are excluded from the browser tsconfig; inside files they import, use `.ts` extensions on relative imports.

## Navigation: 4 stages x 4 screens (16 routes)

The tracker's 4 stages (`src/tracker/`) are the app's only navigation. **`TRACKER_ITEMS` in `trackerConfig.ts` is the single screen registry** (label, path, gating step); `SCREEN_ROUTES` is derived from it. Counters always use a denominator of 4 and show the current position ("at 3.2") separately from the done count.

| Stage | Screens (route) | Rendered by |
|---|---|---|
| 1 Data Ingestion | 1.1 Intake console `/ingestion` · 1.2 Ingestion queue/jobs `/ingestion/queue` · 1.3 File detail/preview `/ingestion/file` · 1.4 Ingestion review `/ingestion/review` | `Step1.Intake` (upload only) · `steps/Ingestion.tsx` |
| 2 RAG (Cognee + OKF) | 2.1 Context graph explorer `/rag/graph` · 2.2 Schema generation workbench `/rag/schemas` · 2.3 Retrieval/context quality `/rag/quality` · 2.4 RAG review `/rag/review` | `rag/RagScreens.tsx` |
| 3 FDE Workbench | 3.1 SOW generation and approval `/workbench/sow` · 3.2 ISATVON skills grid `/workbench/skills` · 3.3 Skills/code review `/workbench/review` · 3.4 Manifest and deploy prep `/workbench/release` | `Step1.Sources/Center/Right` · `Step2` · `steps/Review.tsx` |
| 4 Sandbox | 4.1 Activities `/sandbox/validation` · 4.2 Manifest JSON `/sandbox/manifest` · 4.3 Generated code `/sandbox/code` · 4.4 Sandbox and assertions `/sandbox/results` | `Step3` (`ActivitiesCenter` / `ManifestCenter` / `CodeCenter`) · `Step4` |

- `App.tsx`: `PANES` = gated 3-pane screens (3.1, 3.2, 4.1–4.4); `VIEWS` = ungated screens (1.2–1.4, 2.x, 3.3, 3.4) with honest empty/unavailable states.
- Partly backed screens say so: 1.3 parse preview has no backend contract (virus scan/quarantine is a mock adapter only) (shown "Not available", never faked). All four stage 1 screens complete from intake evidence (`tracker/evidence.ts`): 1.2 queue clear, 1.3 every file has a final BuLL*Sav verdict and is released, 1.1 and 1.4 when the ingestion run hands the batch to RAG.

- `/` and unknown paths redirect to `activeScreen(snap)` (`src/lib/route.ts`): 1.1 if nothing is uploaded, then 2.1, then the active workbench step's screen.
- `src/lib/route.ts`: minimal History-API router (`navigate`, `usePath`, `goScreen(id)`, `goStep(step)`). `STEP_SCREEN` maps backend steps to screens (1→3.1, 2→3.2, 3→4.1, 4→4.4).
- Clicking a stage opens its first screen and its chip panel; clicking a chip opens that screen and selects it (manual status). A locked screen renders `LockedScreen`, whose reason AND button come from `prerequisite()` (`lib/prereq.ts`), so they always agree (e.g. "SOW v1 is a draft awaiting approval" → Review SOW → 3.1; no source → Upload documents → 1.1).
- **Stage hand-offs**: 1.1 is upload & virus scan (`steps/Intake.tsx`). Uploads are staged in quarantine and scanned (mock adapter; `api/scanGate.ts` is the shared eligibility rule). RAG starts only from **Start ingestion run** / Extract context once the whole batch is verified (no scanning, blocked or scan-error files); the backend re-checks (`startIngestionRun`). Uploads never auto-start RAG. A finished RAG run for an ingested batch calls `api.startSowGeneration()` (`useStageHandoffs`), which the backend also refuses without an ingestion run.
- User-facing text names screens ("3.1", "4.4"), never "Step N".

## Architecture

- `src/api/adapter.ts`: `BamApi` interface. **The only seam to the backend.** `api` is the mock today; swap it for an HTTP implementation. The Refine `dataProvider.custom` serves reads (`snapshot`, `skills`, `code`).
- `src/api/mock.ts`: in-memory backend. It owns **every gate and status**, including step states (locked / active / needs_review / done / failed), stale flags and the active step. The UI never invents status. Its internal steps 1–4 map to screens via `STEP_SCREEN`.
- `src/api/types.ts`: domain types plus the ISATVON, AUTOMATIONS and upload limit constants. `Snapshot.sowGeneration` holds the SOW generation stages.
- `src/lib/store.ts`: the single UI store (`useSyncExternalStore`): theme, FDE/Staging view, toasts (each links to a screen ID), the tracker slice, plus the one Uppy instance, used only as the uploader (no Uppy UI). 1.1 triages every selection (`triage` / `fit` / `autoPick` in `api/scanGate.ts`): incompatible, empty, system and >250 MB files are filtered out (never fatal), then the user chooses what fits the batch (25 files / 250 MB) and Upload turns green only when it fits; files over 10 MB are sent as 10 MB parts shown as `Name-chunkN` branches; 3 uploads at a time); the mock backend enforces the batch limits too.
- `src/lib/data.ts`: `useSnapshot` (polls every 1 s), `useSkills(rev)`, `useCode(rev)`, `useAction` (runs a command, shows a persistent error toast, invalidates queries).
- `src/App.tsx`: shell. Top bar, then tracker, then the current screen. Workbench screens add the context bar and 3 panes (`PANES` map).
- `src/components/ui.tsx`: icons, `StatusPill`, `Pane`, designed Empty / Skeleton / Error states, `GateButton`, `StageList`, `Dialog` / `Confirm`.

## Workbench gates (backend-driven)

- 3.1: TipTap SOW, generated from the RAG context in the **ISATVON SOW format** (`src/api/sowFormat.ts`, matching the approved-SOW sample): a note, flat "Requirement N" blocks with all 7 ISATVON lines, an Approval clause. No agent/skill grouping in the SOW. SOW ID, client, status and approval are system metadata (`SowMeta`), never document text. The **Changes** switch (on by default) colour-codes edits live inside the editable SOW (`ChangeHighlight` ProseMirror decorations in `components/sow.tsx`; display-only, never saved) against the **previous saved version** by default (`sow.previous`, e.g. v4 → v5; while edits are unsaved, vN → unsaved edits), with a "Compare with" dropdown for the **model-generated** version (`sow.generatedHtml`, audit) (`src/lib/sowDiff.ts`: added, removed, modified).
- 3.2 extraction **parses the approved SOW's Requirement blocks** (`parseRequirements`), so FDE edits flow into the grid; `clusterRequirement` then groups them into Agent > Skill (the post-approval step).
- 3.1 has no regenerate/request-changes button (removed 8 Oct 2026, do not re-add): the FDE edits the SOW directly, then approves. (The backend `requestSowChanges` API remains, unused by the UI.) **SOW accuracy** (right pane, `api/sowEval.ts`) is evaluated by the backend for every version: real rule checks (ISATVON completeness, contract validity via `validateField`, placeholders, format) plus a G-Eval style judge rubric, simulated (tagged) until a judge model is connected. Findings link to their requirement.
- `GateButton` always shows a reason when disabled ("Working…" while its own action runs).
- 3.1 approval: Approval is tied to a version; an edit after approval invalidates it. Toggling editability must not autosave (`setEditable(x, false)`).
- 3.2: AG Grid ISATVON grid (Instructions, Source data, Automation, Tech stack, Variables, Outcome, Notifications), grouped Agent > Skill, with per-cell backend validation. "Mark grid reviewed" comes before "Generate ISATVON Contract".
- 4.1–4.3 are three routes over ONE validation run (backend step 3). **4.2 = Manifest JSON, 4.3 = Generated code** (swapped 8 Oct 2026). 4.1 Activities: A contract, B dependencies, C AST code generation (Jinja2 rendering is part of C), D retry/fallback, each with attempt history (`Activity.history`); a recovered failure is history, not a current failure. 4.2 Manifest JSON / 4.3 Generated code: editable Monaco inline diffs (manifest vs the **certified** baseline when one exists, else the generated manifest; code vs `CodeFile.generated`). Unsaved edits live in `lib/drafts.ts` (one store shared by every screen; `beforeunload` guard), never in component state. Code saves re-run C's AST check; manifest saves validate the JSON (version, agent and skill names editable; hash/createdAt recomputed; the hash covers names, fields and code). The end of all three screens has a validation status row (with **Retry**) and ONE decision: **Start validation** (approves via `approveManifest`, tied to the manifest hash, then starts the 4.4 sandbox + Promptfoo run via `runTests` and opens 4.4; if a run for this hash already exists it only opens 4.4). No View manifest / View generated code steps (removed 8 Oct 2026). Any edit clears the approval. A skill's code file path is fixed at first generation. The old 4.1 tabs remain as links to the canonical routes. No Reopen/Go-to on 4.1–4.3.
- 4.4: certification checklist (`lib/certification.ts`: SOW approval, AST parse, input/output contracts, sandbox/assertions, reviewer approval), then sandbox, Promptfoo, **Mark results reviewed**, commit to BAM_db (the frozen version; JSON contract + AST code), **Deploy to Staging**. Test results carry `manifestHash`; results for another hash are **stale**: kept (`testHistory`), shown, never able to review/commit/certify. All persist/deploy gates compare hashes, not versions. `Snapshot.versions` records draft / certified / frozen / deployed entries (with manifest JSON for comparisons). Certification and frozen evidence are shown separately from "Deployed to Staging". Assertions expand into fixture, input, expected, observed and evidence reference; the skill label is sticky while rows scroll.
- 3.2 grid: **inline cell editing** (double-click, Enter/F2 or type; editors open in the cell, never as popups; the cursor goes to the end). Text cells use `DiffCellEditor` (`steps/Step2.tsx`): live change colours while typing, like the 3.1 TipTap editor (added green, modified amber, removed listed struck through under the field), against the extracted value, following the Changes switch. It overlays the cell (never resizes the row, which would cancel editing). Enter saves, Shift+Enter adds a line. Grid options passed to AG Grid must be stable (module-level), or the 1 s snapshot poll redraws rows and cancels the editor.
- 3.2 grid: column jump chips (I S A T V O N), a changed-row badge, and an inline full-width ISATVON editor per row (all seven fields, before/after diff, Apply to draft; drafts survive grid refreshes). The right rail is draft-vs-certified manifest diff + certification checklist + versions; extraction activity is a secondary collapsible section.
- 3.1: Changes compares with the previous saved version (`lib/sowCompare.ts`); with no earlier version it says so explicitly (never a fake diff). Legend shows baseline → current and one change count (a replacement counts once).

Rules:
- Only the active screen is editable. Reopen marks later screens stale.
- Disabled gates show their reason.
- Background work shows a toast and a "Running in background" chip in the context bar.
- Background completion never moves the view; user actions call `goStep` / `goScreen` explicitly.

## Decisions (do not revert)

- **16 screens** (4x4) per the 7 Oct 2026 build review; this supersedes the earlier "built screens only" (8) decision.
- ISATVON display names: I Instructions, S Source data, A Automation, T Tech stack, **V Variables, O Outcome, N Notify on next** (never Verification / Output / Next / Notifications). The serialized key stays `notifications`; old SOW text with "N — Notifications" still parses by letter.
- No top-bar demo badge and no Cognee sync chip (user removed both, 7 Oct). Stage names are just "RAG" and "FDE Workbench". `simulated` tags (`lib/demo.ts`) stay on certification, frozen and deploy evidence. Simulated-failure controls only with `?demo=1`.
- Data Ingestion (stage 1) is **frozen**: upload only (no connectors). Virus scan after upload is automatic; RAG starts via **Start ingestion run** (or **Extract context**, which also opens 2.1), both scan-gated. "Run again" is only for re-runs. 2.4 ends with **View SOW** (opens 3.1).
- Terminology: **Agent > Skill** (fields `agent`, `name`). Never "macro-skill / sub-skill".
- **No hot-reload / Skill Palette.** Use Deploy to Staging. The FDE/Staging selector is view context only, not a deploy.
- Don't use the name "Instructor" anywhere in the UI or data.
- The database is labelled **BAM_db** only (never "BAM_db (PostgreSQL)") in the UI.
- No second approval after the sandbox; SOW approval is the only approval. Commit additionally requires a clean, reviewed Promptfoo run.

## Tracker (`src/tracker/`)

- `trackerConfig.ts`: 4 stages, built screens only (IDs from the 4×4 UX document, kept stable). `rollup()` order: all done, then blocked, then needs_review, then started, then not_started.
- 4.1–4.4 are navigation order, not execution order. Never gate on the numbers.
- Status = **workflow evidence**, recomputed from the live snapshot (`evidenceStatuses` in `tracker/evidence.ts`, stored by `useTrackerEvidence` as `tracker.evidence`); `effectiveStatuses` (`trackerConfig.ts`) is the one rule every count uses. A manual status is saved with the evidence it overrode (`basis`) and shows only while that evidence is unchanged, so a reset backend or a new run never leaves stale ticks. `DONE_RULE` (same file as the evidence) is the written rule per screen, shown in the chip tooltip and the status panel. Each stage shows a progress pie that fills green per done screen.
- **From previous run**: the SOW records the RAG run it was generated from (`Sow.contextRunId`, passed to `startSowGeneration`). When the current RAG run differs (Run again), `previousRun()` marks 3.1–4.4 as "from previous run" (grey, dashed, no tick, not counted). Only a hand-off from the current RAG run completes 2.2/2.4.
- Persistence lives in `trackerStorage.ts` (async adapter, key `bullm-bam.tracker16.v1`). Never touch the legacy key `bullm-bam.tracker.v1`. Surface storage errors. Has a TODO for a PostgreSQL adapter.
- Completion follows saved gates, never a route visit: 3.3/4.2/4.3 are done only with the manifest+code approval for the current hash; 2.4 with a reviewed hand-off; 1.1-1.4 once the verified batch is handed to RAG.

## Stage 2: RAG (`src/rag/`)

- `ragPipeline.ts`: one shared store plus the `RagPipelineService` interface. The mock simulates Chunk + embed, then Entity extraction (one object at a time), then Graph build (Cognee), then Schema proposals; each step is queued, running, done or failed, with Retry. Swap in a real Cognee/OKF client behind the same interface.
- 2.1: React Flow graph. Nodes appear during extraction, edges only after graph build. Keep the React Flow attribution (free licence).
- 2.2: locked until schema proposals are done. "Send to Workbench" creates a draft hand-off pinned to the run; it never approves anything.
- 2.3: coverage and jobs update live; the GraphRAG answers are canned, with citations that resolve to S3 URIs.
- All stage 2 data is illustrative (EXAMPLE fixture dataset).

## UI conventions

- One token set in `styles.css` `:root` / `[data-theme="light"]`. The **FDE/Staging selector** sets the palette, deployed or not: **FDE = blue**, **Staging = orange** (App sets `<html data-env>`; surfaces, borders, accent, info, tracker and Monaco `bam-*-staging` themes switch). Never hard-code blues: use the tokens. Exception: the top-bar **FDE/Staging glass switch** (`.env-glass` in `components/shell.tsx` / `styles.css`) uses control-local colours (FDE blue #0068A8 family, Staging #FF9800) so it keeps its own colours in either palette. It is two native radios (Staging = left half, FDE = right half; group "Environment mode"); the sphere covers the inactive half and shows the active mode's icon (code / layers). Dark base `#0B1526` / `#101E32`, accent `#5B83F2`. AG Grid, Monaco and React Flow read the same tokens.
- Status is always icon plus text, never colour alone. Every pane has designed empty, loading and error states. No invented metrics (stage 2 mock data is labelled EXAMPLE MOCKUP).
- Keyboard: focus returns to the trigger after dialogs (fallback `#center-title`); touch targets of 44px in the tracker.
- Toasts sit **in the tracker line** (in the page flow, right of the stage strip; they wrap to their own line when narrow), never over a control. Only the newest shows ("+N" for earlier ones); a toast with the same `key` or text replaces the earlier one (the FDE/Staging toast uses `key: 'env'`). "Open X" is hidden while you are on X. (Changed 8 Oct 2026 per the UI change list.)
- Gated footer decisions use `ActionSteps` (numbered steps, state, button, reason, "01 / Test" caption): 4.4 = Test → Review → Commit to BAM_db → Deploy to Staging. 4.1–4.3 end with a single Start validation button.
- **No human-in-the-loop work in the right pane.** All editing and decisions (SOW, grid, code editing, manifest JSON view, Run/Review/Commit/Deploy) live in the centre; the right pane is evidence and status only (links may open things in the centre). 4.1's centre has tabs Activities / Generated code / Manifest JSON.
- The centre pane is the human-in-the-loop work and gets the width: side panes are narrow (left ~250px, right ~300px) and collapsible to 44px rails (`Pane` inside `PanesContext`; state in `store.collapsed`, saved as `bam-panes`). Collapsed panes stay mounted (`hidden`), so drafts survive.
- Layout must hold at 390px (no page-level horizontal scroll) and 1280px on every route. The tracker strip scrolls horizontally on narrow screens (controlled overflow).
- Timestamps: `<Time>` / `fmtTime` (short, `APP_TIMEZONE` = `VITE_APP_TIMEZONE` or the viewer's zone); full value + zone in the tooltip. Long paths, hashes, URIs and run IDs use `<Copy>` (ellipsized, full-value tooltip, copy button with success/failure toast).
- Stacked cards in scrolling views never shrink (`.rag > *, .rag-col > * { flex-shrink: 0 }`), so they cannot overlap.
- A read-only 3.2 grid shows a banner with **Reopen 3.2 to edit**, and an edit attempt (double-click, Enter, F2, typing) explains why instead of doing nothing.
- Editors inside a scrolling pane keep a fixed height (`.pane-body > .code-view`); end-of-content actions must never overlap them.

## Missing backend contracts (don't mock them as working)

Real Cognee/OKF pipeline and GraphRAG query (stage 2 uses the EXAMPLE fixture dataset; uploads are not parsed into it), file parsing/preview for 1.3, malware scan and quarantine release, connector test and backend auth, context pinning for the hand-off, schema review, manifest diff, certification and frozen handover, tracker persistence API, real HTTP adapter.

## Branding, OKF, Cognee, Laya

- The 1.1 antivirus is **BuLL*Sav** (full form: Digibull Security AntiVirus Engine; `AV_NAME` / `AV_VENDOR` in `api/types.ts`). The engine behind it is ClamAV (clamd); that is said only in tooltips and backend notes.
- `rag/okf.ts`: the RAG context as a **Google Open Knowledge Format v0.2** bundle (sources = BuLL*Sav-released uploads, `verified` by `process:bullsav`; entities with keyed footnote provenance; schemas `verified` by a human on the 2.2 hand-off; `status`, `stale_after`). `validateOkf` = spec section 11; `toTar` exports it. Checked against Google's reference parser (knowledge-catalog/okf). Shown in 2.4.
- Entity relations: `relations()` / `contextFacts()` in `rag/ragPipeline.ts` turn Cognee's graph (`graphData`, else the EXAMPLE graph) into triples, shown in 2.1 (graph, inspector, Entity relations card), written as OKF entity Relations links, and sent to Laya as discovery facts.
- `rag/cognee.ts`: real Cognee runner (`/api/v1/add` with OKF concepts + released `s3://` objects, `/cognify`, `/datasets/status`, `/datasets/{id}/graph`). `ragPipeline` uses it when `VITE_RAG_BACKEND=cognee`; otherwise the simulated run. The pipeline card says which.
- SOW accuracy judge = **Laya** (convaiinnovations/laya via `@receptron/laya`, `server/laya-judge`): per requirement P(supported) + clarity level, per discovery fact P(addressed). When the service is down the judge is simulated from the rule results and the card says why (`judgeNote`).

