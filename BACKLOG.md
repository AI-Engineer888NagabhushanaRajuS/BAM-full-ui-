# UI-SBAM Project Backlog & Outstanding Technical Debt

> **Tracking Reference**: UI-SBAM Modernized Architecture (ISATVON 1.4, BuLL*Sav Defense, Cognee GraphRAG, Laya & Jev Engines)  
> **Last Updated**: 2026-10-14  
> **Status**: Active Development  

---

## 🎯 Executive Summary
This backlog tracks ongoing engineering enhancements, architectural migrations, and outstanding features to be implemented following initial staging and production release verification.

---

## ✅ Completed in Recent Sprint (2026-10-14)
- **BuLLSav Twin Engine (ClamAV Core + Repel Behavioral Shield)**:
  - Eliminated asterisk across all codebases (`BuLL*Sav` → `BuLLSav`).
  - Unified ClamAV static signature scanning and Repel heuristic behavioral evasion testing into a consolidated **BuLLSav Twin Engine** node (reducing pipeline from 6 to 5 streamlined stages: Upload & Ingest → Quarantine Sandbox → BuLLSav Twin Engine → AST Inspection → Released).
  - Designed and rendered an interactive **Git-Branching Accordion** beneath the Twin Engine node visualizing the parallel inspection tracks:
    - 🌿 `branch: engine/clamav-core` (ClamAV v1.4 static MD5/SHA-256 signatures & macro CVEs)
    - 🌿 `branch: engine/repel-shield` (Repel behavioral payload repulsion & prompt injection defense)
    - `git merge`: Unanimous consensus verdict requiring both engines to pass before release.
- **Minimal Intelligent Intake Command Bar (`.intake-command-bar`)**:
  - Decluttered the textarea action bar by removing the 4 sprawling inline buttons (`[Choose files]`, `[Choose folder]`, `[Upload zip]`, `[Bulk upload]`).
  - Replaced with a single sleek `+ Add / Ingest Files` button, native Windows Voice dictation button, and subtle drop hint pill.
  - Implemented an enhanced **Ingest Mode Modal** (`IngestModal`) with native Drag & Drop landing zone directly inside the dialog and 4 clear modality cards.
  - Selecting or dropping files in `IngestModal` seamlessly routes into `ReviewDialog` (Uppy-style tile dashboard) for wave inspection and auto-fit before quarantine streaming.
- **Strict 3-Pane Discipline & Layout Robustness**:
  - Enforced `min-width: 0;` on `.intake-pane-left`, `.intake-pane-center`, and `.intake-pane-right` with intermediate media breakpoints (`1080px`, `860px`) to prevent 3rd pane ("Intake readiness") from dropping down.
- **Zero Fake Grounding Scores**: Eliminated hardcoded 0.98 pass on ungrounded/nonsense queries in both `server.ts` and `sowEval.ts`. Ungrounded queries now fail closed with `confidence: 0.10` and `passed: false`.
- **FDE Preflight Chat ("Ask BullMind") Integration**: Embedded interactive BullMind conversational query bar directly into Stage 2 Cockpit view. Chatting populates Cognee GraphRAG and allows FDEs to endorse verified spec items into the Master Questionnaire battery.
- **Model & Inference Gating**: Enforced model requirement before RAG & SOW progression. Added dynamic support for free OpenRouter models (`google/gemini-2.0-flash-exp:free`, `meta-llama/llama-3.3-70b-instruct:free`, `deepseek/deepseek-r1:free`, `qwen/qwen-2.5-72b-instruct:free`) with live `/test-key` verification and prominent preflight warning banner.
- **Settings Modal Layout & Zero Cut-Off**: Fixed dialog overflow, horizontal scrollbars, and clipped tab labels in `AppSettingsModal`.
- **Fullscreen Preview**: Added 1-click Fullscreen toggle to SOW draft editor and Excel masters for distraction-free document & workbook editing.
- **Environment Selector Modernization**: Replaced misleading "Staging" label with "Client" vs "FDE" engineering mode.

---

## 🚀 High-Priority Backlog Items

### 1. Jev System-1 Context Sufficiency Live Streaming Model Scoring
- **Objective**: Stream live token-by-token reasoning and Shannon entropy calculations via `/laya/query-context` when `OPENROUTER_API_KEY` is provided.
- **Scope**:
  - Integrate live OpenRouter streaming API calls with server-sent events (SSE).
  - Display raw reasoning tokens and model provenance (`model: google/gemini-2.5-flash` or `deepseek/deepseek-r1:free`).
  - Auto-retry with exponential backoff on 429 rate limit errors with seamless failover to Local Laya ONNX Runtime (`convaiinnovations/laya`).

### 2. High-Capacity Folder Streaming (Up to 15 GB Archives)
- **Objective**: Ingestion pipeline support for deep multi-gigabyte project directories containing nested CAD geometry and software packages.
- **Scope**:
  - Implement Web Worker-based chunked streaming unpacker to avoid main thread UI freezing on multi-gigabyte archives.
  - Add client-side archive pre-flight hash verification and resume tokens.

### 3. Universal Document & Evidence Redline Annotation Studio
- **Objective**: Full lifecycle annotation persistence for insurance claims, forensic accident reports, and engineering drawings.
- **Scope**:
  - Persist modified Filerobot canvas state (shapes, text overlays, measurements, highlight stamps) directly into localStorage and IndexedDB.
  - Add multi-page document pagination inside the markup modal (navigating between pages of multi-page PDFs such as `3_FIR_PoliceAccidentReport.pdf`).
  - Automatically bind annotated evidence figures directly into SOW markdown and S3 audit trail (`s3://bam-intake/pkg-2026-0147/annotated/`).

### 4. ISATVON Skills Grid 3.2 Layout & Density Controls
- **Objective**: Enhance AG Grid 3.2 viewport responsiveness and high-density viewing.
- **Scope**:
  - Implement a three-state density switcher (Compact: 36px, Balanced: 64px, Expanded: autoHeight).
  - Support batch multi-cell copy/paste from Excel/Google Sheets into ISATVON columns.
  - Add native `.xlsx` and `.csv` export with digital signature manifest.

### 5. Stage 4 Automated Validation & BAM_db Temporal Handshake
- **Objective**: Connect Stage 4.1–4.4 Temporal workers to live PostgreSQL `BAM_db` instances.
- **Scope**:
  - Stream live Temporal heartbeat events over WebSocket instead of simulated polling.
  - Implement cryptographic Ed25519 digital signature signing for production releases in Stage 4.4.
  - Build rollback triggers if staging test suites detect latency or compliance regression.

---

## 🛠️ Low-Priority & Nice-to-Have
- [ ] Dark/Light mode theme parity audit across third-party canvas widgets (Filerobot, Uppy).
- [ ] Offline PWA service worker caching for local edge deployments.
- [ ] Automated Playwright end-to-end pipeline recording in CI/CD.
