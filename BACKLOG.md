# UI-SBAM Project Backlog & Outstanding Technical Debt

> **Tracking Reference**: UI-SBAM Modernized Architecture (ISATVON 1.4, BuLL*Sav Defense, Cognee GraphRAG, Laya & Jev Engines)  
> **Last Updated**: 2026-10-14  
> **Status**: Active Development  

---

## 🎯 Executive Summary
This backlog tracks ongoing engineering enhancements, architectural migrations, and outstanding features to be implemented following initial staging and production release verification.

---

## 🚀 High-Priority Backlog Items

### 1. Jev System-1 Context Sufficiency Live Model Scoring
- **Objective**: Replace simulated / heuristic fallback with live model execution for context sufficiency checks in Stage 2 Pre-Flight Cockpit.
- **Scope**:
  - Integrate live OpenRouter streaming API calls via `/laya/query-context` when `OPENROUTER_API_KEY` is provided.
  - Dynamically calculate Shannon entropy and token confidence across extracted context snippets.
  - Display raw reasoning tokens and model provenance (`model: google/gemini-2.5-flash` or `deepseek/deepseek-r1:free`).
  - Provide auto-retry on 429 rate limit errors with seamless failover to Local Laya ONNX Runtime (`convaiinnovations/laya`).

### 2. Universal Document & Evidence Redline Annotation Studio
- **Objective**: Full lifecycle annotation persistence for insurance claims, forensic accident reports, and engineering drawings.
- **Scope**:
  - Persist modified Filerobot canvas state (shapes, text overlays, measurements, highlight stamps) directly into localStorage and IndexedDB.
  - Add multi-page document pagination inside the markup modal (navigating between pages of multi-page PDFs such as `3_FIR_PoliceAccidentReport.pdf`).
  - Automatically bind annotated evidence figures directly into SOW markdown and S3 audit trail (`s3://bam-intake/pkg-2026-0147/annotated/`).

### 3. ISATVON Skills Grid 3.2 Layout & Density Controls
- **Objective**: Enhance AG Grid 3.2 viewport responsiveness and high-density viewing.
- **Scope**:
  - Implement a three-state density switcher:
    - **Compact**: 36px fixed row height with single-line truncation and tooltip previews.
    - **Balanced**: 64px row height (default) showing 2-3 lines of text.
    - **Expanded**: Dynamic `autoHeight` for thorough review.
  - Support batch multi-cell copy/paste from Excel/Google Sheets into ISATVON columns.
  - Add native `.xlsx` and `.csv` export with digital signature manifest.

### 4. Stage 4 Automated Validation & BAM_db Temporal Handshake
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
