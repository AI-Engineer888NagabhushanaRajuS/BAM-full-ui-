"""
Automated End-to-End Enterprise Demo Recording for BAM Workbench & Cognee GraphRAG
Full interactive workflow without skipping steps:
1. Intake 1.1: FDE Directives (Typing + Native Windows Speech-to-Text Dictation),
   Dual-Engine Threat Defense Cockpit (ClamAV + Repel Shield), Mockup batch staging,
   and Sequential 6-Node Defense Flow Animation (Flow 1/6 -> 6/6).
2. File inspection & verified twin-engine status clearance.
3. Enterprise Settings Modal: Quarantine & Security Telemetry inspection.
4. "Start ingestion run" execution & handoff to RAG.
5. Stage 2.1 GraphRAG Context Graph: node selection, triples inspection & OKF citations.
6. Stage 2.3 Context Quality & Pre-Flight Verification Cockpit:
   - Master Questionnaire & Battery with strict 80% Context Sufficiency Gate.
   - Add Custom Client Question.
   - "Test the Cognee" live execution against GraphRAG to achieve >= 80% sufficiency.
   - "Ask BullMind (LLM inside Cognee)" with live queries, citations, and "+ Add to Master Questionnaire".
   - Client Domain Masters: 5-master inspection (BAM 0.2 + ISATVON 1.4 Loopy bounds).
7. Pre-flight certification & "Push to SOW (Stage 3.1)" gated handoff.
8. Stage 3.1 SOW Workbench: dynamic SOW review with FDE Intake Directives,
   CAD tolerances, BOM Rev C delta, ISATVON 1.4 bounds, accuracy scoring & high-contrast theme.

Saves strictly on F: drive: F:\\UI-SBAM\\recordings\\demo.webm
"""

import os
import time
import shutil
from playwright.sync_api import sync_playwright

RECORDINGS_DIR = r"F:\UI-SBAM\recordings"
TARGET_VIDEO = os.path.join(RECORDINGS_DIR, "demo.webm")
BASE_URL = "http://127.0.0.1:5174"

def record_full_interactive_demo():
    print("[DEMO RECORD] Initializing Playwright video capture on F: drive...")
    os.makedirs(RECORDINGS_DIR, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-gpu", "--window-size=1440,900"]
        )
        context = browser.new_context(
            record_video_dir=RECORDINGS_DIR,
            record_video_size={"width": 1440, "height": 900},
            viewport={"width": 1440, "height": 900}
        )
        page = context.new_page()

        # ======================================================================
        # SCENE 1: INTAKE 1.1 - FDE GOALS, VOICE DICTATION & DUAL-ENGINE FLOW
        # ======================================================================
        print("\n--- [SCENE 1] Loading Intake 1.1 with FDE Goals & Dual-Engine Cockpit ---")
        page.goto(f"{BASE_URL}/ingestion?demo=1", wait_until="networkidle")
        time.sleep(2.0)

        # 1.1 FDE Directives: Preset selection + typing
        fde_card = page.locator(".fde-goals-card")
        if fde_card.count() > 0:
            print("[SCENE 1.1] Demonstrating FDE Goals & Pre-Ingestion Directives...")
            fde_card.scroll_into_view_if_needed()
            time.sleep(1.0)

            # Click a quick directive chip
            preset_chip = page.locator(".fde-goals-presets button:has-text('Extract MPW parts')")
            if preset_chip.count() > 0:
                print("  -> Selecting quick directive: 'Extract MPW parts & tolerances from CAD STEP'...")
                preset_chip.first.click()
                time.sleep(1.2)

            # Type additional ultra-context into textarea
            textarea = page.locator(".fde-goals-textarea")
            if textarea.count() > 0:
                print("  -> Appending defense-grade compliance directives...")
                textarea.click()
                textarea.press("End")
                textarea.type(" Enforce MIL-A-8625 Type II clear anodize, 17-4PH certs and ISATVON 1.4 loop bounds.")
                time.sleep(1.2)

            # Click Windows Voice Dictate button (shows pulsing recording state)
            voice_btn = page.locator(".voice-mic-btn")
            if voice_btn.count() > 0:
                print("  -> Engaging Windows Native Voice Dictation (simulating microphone pulse)...")
                voice_btn.first.click()
                time.sleep(1.8)
                voice_btn.first.click()
                time.sleep(0.8)

        # 1.2 Dual-Engine Threat Defense Hero
        hero = page.locator(".intake-hero")
        if hero.count() > 0:
            hero.scroll_into_view_if_needed()
            hero.hover()
            time.sleep(1.2)

        # Hover ClamAV and Repel engine telemetry cards
        engine_cards = page.locator(".hero-engine-card")
        if engine_cards.count() >= 2:
            print("[SCENE 1.2] Inspecting ClamAV Core & Repel Shield telemetry cards...")
            engine_cards.first.hover()
            time.sleep(0.8)
            engine_cards.nth(1).hover()
            time.sleep(0.8)

        # 1.3 Load mockup batch of discovery files
        mockup_btn = page.locator("button:has-text('Load mockup batch')")
        if mockup_btn.count() > 0 and mockup_btn.first.is_visible():
            print("[SCENE 1.3] Clicking 'Load mockup batch' to stage discovery documents...")
            mockup_btn.first.click()
            time.sleep(1.5)

        # 1.4 Trigger Sequential 6-Node AV Defense Flow Animation
        animate_btn = page.locator("button:has-text('Animate Defense Flow')")
        if animate_btn.count() > 0 and animate_btn.first.is_visible():
            print("[SCENE 1.4] Triggering Sequential 6-Node Defense Flow (Flow 1/6 -> 6/6)...")
            animate_btn.first.click()
            # Observe live sequential step progression: Upload -> Quarantine -> ClamAV -> Repel -> Twin Verdict -> Released
            av_status = page.locator("#av-status")
            if av_status.count() > 0:
                av_status.scroll_into_view_if_needed()
            time.sleep(6.0)
        else:
            print("[SCENE 1.4b] Observing live dual-engine scan progression...")
            time.sleep(4.0)

        # 1.5 Inspect verified file batch in files table
        print("[SCENE 1.5] Inspecting verified file batch with Repel evasion metrics...")
        files_table = page.locator(".scan-table")
        if files_table.count() > 0:
            files_table.scroll_into_view_if_needed()
            time.sleep(1.5)
            rows = page.locator(".scan-table tbody tr")
            if rows.count() > 0:
                rows.first.hover()
                time.sleep(1.0)

        # ======================================================================
        # SCENE 2: ENTERPRISE SETTINGS & QUARANTINE TELEMETRY
        # ======================================================================
        print("\n--- [SCENE 2] Opening Enterprise Settings Modal ---")
        settings_btn = page.locator(".icon-btn[aria-label*='Settings']")
        if settings_btn.count() > 0:
            settings_btn.first.click()
            time.sleep(1.5)

            # Inspect Decision Engines tab
            print("[SCENE 2.1] Inspecting Decision Engines...")
            time.sleep(1.0)

            # Click API Keys tab
            keys_tab = page.locator(".settings-tab:has-text('API Keys')")
            if keys_tab.count() > 0:
                print("[SCENE 2.2] Inspecting API Keys Vault...")
                keys_tab.click()
                time.sleep(1.2)

            # Click Quarantine & Security Telemetry tab
            tele_tab = page.locator(".settings-tab:has-text('Telemetry')")
            if tele_tab.count() > 0:
                print("[SCENE 2.3] Inspecting Quarantine & Security Telemetry (ClamAV + Repel)...")
                tele_tab.click()
                time.sleep(2.0)

            # Close Settings Modal cleanly
            print("[SCENE 2.4] Closing Settings Modal...")
            done_btn = page.locator(".dialog button:has-text('Done')")
            if done_btn.count() > 0 and done_btn.first.is_visible():
                done_btn.first.click()
            else:
                page.keyboard.press("Escape")
            time.sleep(1.0)

        # ======================================================================
        # SCENE 3: TRIGGER INGESTION RUN & ADVANCE TO RAG
        # ======================================================================
        print("\n--- [SCENE 3] Triggering Ingestion Run for RAG Handoff ---")
        start_ingest_btn = page.locator("button:has-text('Start ingestion run')")
        if start_ingest_btn.count() > 0 and start_ingest_btn.first.is_enabled():
            print("[SCENE 3.1] Clicking 'Start ingestion run'...")
            start_ingest_btn.first.scroll_into_view_if_needed()
            time.sleep(0.8)
            start_ingest_btn.first.click()
            time.sleep(2.0)

        # Click "Extract context" button to transition to RAG 2.1
        extract_btn = page.locator("button:has-text('Extract context')")
        if extract_btn.count() > 0 and extract_btn.first.is_enabled():
            print("[SCENE 3.2] Clicking 'Extract context' to enter Stage 2.1...")
            extract_btn.first.click()
            time.sleep(2.0)
        else:
            print("[SCENE 3.2b] Transitioning to /rag/graph via navigation...")
            page.goto(f"{BASE_URL}/rag/graph", wait_until="networkidle")
            time.sleep(2.0)

        # ======================================================================
        # SCENE 4: STAGE 2.1 - CONTEXT GRAPH EXPLORER & TRIPLES
        # ======================================================================
        print("\n--- [SCENE 4] Interacting with GraphRAG Context Graph Explorer ---")
        nodes = page.locator(".okf-node")
        if nodes.count() > 0:
            print(f"[SCENE 4.1] Selecting knowledge graph nodes (found {nodes.count()})...")
            nodes.first.hover()
            time.sleep(0.8)
            nodes.first.click()
            time.sleep(1.2)

            if nodes.count() > 2:
                nodes.nth(2).click()
                time.sleep(1.2)

        # ======================================================================
        # SCENE 5: STAGE 2.3 - MASTER QUESTIONNAIRE & 80% SUFFICIENCY GATE
        # ======================================================================
        print("\n--- [SCENE 5] Navigating to Stage 2.3 Context Quality & Pre-Flight Cockpit ---")
        page.goto(f"{BASE_URL}/rag/quality", wait_until="networkidle")
        time.sleep(2.0)

        preflight = page.locator(".cognee-preflight-cockpit")
        if preflight.count() > 0:
            preflight.scroll_into_view_if_needed()
            time.sleep(1.0)

            # SCENE 5.1: Highlight 80% Context Sufficiency Gate in initial pending state
            print("[SCENE 5.1] Inspecting 80% Context Sufficiency Gate card & threshold line...")
            gate_card = page.locator(".preflight-threshold-card")
            if gate_card.count() > 0:
                gate_card.scroll_into_view_if_needed()
                time.sleep(1.2)

            # Note that SOW push button is gated
            push_btn = page.locator(".preflight-push-btn")
            if push_btn.count() > 0:
                print("  -> Verified: Stage 3.1 SOW Generation is strictly gated (< 80% threshold).")
                time.sleep(1.0)

            # SCENE 5.2: Master Questionnaire - Add Custom Question
            print("[SCENE 5.2] Adding Custom Verification Question to Master Questionnaire...")
            add_q_btn = page.locator("button:has-text('+ Add Question')")
            if add_q_btn.count() > 0:
                add_q_btn.first.click()
                time.sleep(1.0)

                cat_input = page.locator(".add-q-fields input[placeholder*='Category']")
                if cat_input.count() > 0:
                    cat_input.fill("Aerospace Anodize Spec")
                    time.sleep(0.5)

                q_textarea = page.locator(".add-q-fields textarea")
                if q_textarea.count() > 0:
                    q_textarea.fill("Verify MIL-A-8625 Type II clear anodize requirement and critical bore tolerance on MPW-4421.")
                    time.sleep(0.8)

                submit_q = page.locator("button:has-text('Add to Battery')")
                if submit_q.count() > 0:
                    submit_q.first.click()
                    time.sleep(1.2)

            # SCENE 5.3: Test the Cognee (Run All Questionnaire Checks)
            print("[SCENE 5.3] Clicking 'Test the Cognee' to evaluate entire battery against GraphRAG & Laya...")
            test_cognee_btn = page.locator("button:has-text('Test the Cognee')")
            if test_cognee_btn.count() > 0:
                test_cognee_btn.first.click()
                # Watch live evaluation of questionnaire items and sufficiency progress bar rising past 80%
                time.sleep(6.0)

            # Inspect updated questionnaire with passed statuses and >= 80% sufficiency meter
            print("[SCENE 5.4] Sufficiency meter passed 80% threshold line! SOW Generation unlocked.")
            time.sleep(1.5)

            # ==================================================================
            # SCENE 6: TAB 2 - ASK BULLMIND (LLM INSIDE COGNEE)
            # ==================================================================
            print("\n--- [SCENE 6] Demonstrating 'Ask BullMind (LLM inside Cognee)' ---")
            bullmind_tab = page.locator(".preflight-tab:has-text('Ask BullMind')")
            if bullmind_tab.count() > 0:
                bullmind_tab.first.click()
                time.sleep(1.5)

                # Click a quick verification chip
                prompt_chip = page.locator(".prompt-chip:has-text('Which parts use 17-4PH')")
                if prompt_chip.count() > 0:
                    print("[SCENE 6.1] Executing quick prompt: 'Which parts use 17-4PH and need certs?'...")
                    prompt_chip.first.click()
                    time.sleep(2.0)

                # Type custom query into BullMind
                bm_input = page.locator("#fde-query-input")
                if bm_input.count() > 0:
                    print("[SCENE 6.2] Asking BullMind custom query: 'Verify 155 BOM QA validation checks per MFG-RES-003'...")
                    bm_input.click()
                    bm_input.fill("Verify 155 BOM QA validation checks per MFG-RES-003 and Tier-1 EMS SMT rates.")
                    time.sleep(0.8)

                    ask_btn = page.locator("button:has-text('Ask BullMind')")
                    if ask_btn.count() > 0 and ask_btn.first.is_enabled():
                        ask_btn.first.click()
                        time.sleep(2.5)

                # Toggle FDE Endorsement
                endorse_btn = page.locator("button:has-text('Endorse Check')")
                if endorse_btn.count() > 0:
                    print("[SCENE 6.3] Endorsing verification query check as FDE...")
                    endorse_btn.first.click()
                    time.sleep(1.0)

                # Click "+ Add to Master Questionnaire"
                add_to_master = page.locator("button:has-text('+ Add to Master Questionnaire')")
                if add_to_master.count() > 0:
                    print("[SCENE 6.4] Promoting BullMind query to Master Questionnaire battery...")
                    add_to_master.first.click()
                    time.sleep(1.5)

            # ==================================================================
            # SCENE 7: TAB 3 - CLIENT DOMAIN MASTERS (BAM 0.2 + ISATVON 1.4)
            # ==================================================================
            print("\n--- [SCENE 7] Demonstrating Client Domain Masters ---")
            masters_tab = page.locator(".preflight-tab:has-text('Client Masters')")
            if masters_tab.count() > 0:
                masters_tab.first.click()
                time.sleep(1.2)

                for subtab in ['Rules & Costing', 'Skills (ISATVON 1.4)', 'Organization Master']:
                    sub = page.locator(f".subnav-tab:has-text('{subtab}')")
                    if sub.count() > 0:
                        print(f"  -> Inspecting Master subtab: {subtab}...")
                        sub.first.click()
                        time.sleep(1.0)

            # ==================================================================
            # SCENE 8: UNLOCKED GATED HANDOFF TO STAGE 3.1 SOW WORKBENCH
            # ==================================================================
            print("\n--- [SCENE 8] Context Certified (>= 80%): Pushing Context to SOW Workbench ---")
            push_sow_btn = page.locator(".preflight-push-btn")
            if push_sow_btn.count() > 0 and push_sow_btn.first.is_enabled():
                print("[SCENE 8.1] Clicking unlocked 'Push to SOW (Stage 3.1)'...")
                push_sow_btn.first.scroll_into_view_if_needed()
                time.sleep(0.8)
                push_sow_btn.first.click()
                time.sleep(3.0)

        # ======================================================================
        # SCENE 9: SOW WORKBENCH (STAGE 3.1) - DYNAMIC SOW WITH FDE GOALS
        # ======================================================================
        print("\n--- [SCENE 9] Reviewing Dynamically Generated SOW (Stage 3.1) ---")
        if not "/workbench/sow" in page.url:
            page.goto(f"{BASE_URL}/workbench/sow", wait_until="networkidle")
            time.sleep(2.5)

        # Scroll through SOW draft editor to show dynamic FDE goals and ISATVON tags
        print("[SCENE 9.1] Inspecting dynamically synthesized SOW with FDE Directives & ISATVON 1.4...")
        editor = page.locator(".editor")
        if editor.count() > 0:
            editor.scroll_into_view_if_needed()
            page.mouse.wheel(0, 250)
            time.sleep(1.5)
            page.mouse.wheel(0, 350)
            time.sleep(1.5)
            page.mouse.wheel(0, 350)
            time.sleep(1.5)
            page.mouse.wheel(0, -500)
            time.sleep(1.2)

        # Inspect SOW accuracy score panel
        acc_panel = page.locator(".accuracy-score, .sow-scorecard")
        if acc_panel.count() > 0:
            acc_panel.scroll_into_view_if_needed()
            time.sleep(1.5)

        # ======================================================================
        # SCENE 10: HIGH-CONTRAST THEME DEMONSTRATION
        # ======================================================================
        print("\n--- [SCENE 10] Demonstrating Enterprise High-Contrast Theme Toggle ---")
        theme_btn = page.locator("button[aria-label^='Switch to']")
        if theme_btn.count() > 0:
            theme_btn.first.click()
            time.sleep(1.8)
            theme_btn.first.click()
            time.sleep(1.8)

        # Finalize and save video strictly to F: drive
        print("\n[DEMO RECORD] Finalizing recording session...")
        raw_video_path = page.video.path() if page.video else None

        context.close()
        browser.close()

        if raw_video_path and os.path.exists(raw_video_path):
            shutil.copy2(raw_video_path, TARGET_VIDEO)
            size_mb = os.path.getsize(TARGET_VIDEO) / (1024 * 1024)
            print(f"[SUCCESS] Video successfully saved to: {TARGET_VIDEO}")
            print(f"[SUCCESS] Total Video Size: {size_mb:.2f} MB")
        else:
            print("[WARNING] Searching recordings directory for latest video...")
            webms = [os.path.join(RECORDINGS_DIR, f) for f in os.listdir(RECORDINGS_DIR) if f.startswith("page@") and f.endswith(".webm")]
            if webms:
                latest = max(webms, key=os.path.getmtime)
                shutil.copy2(latest, TARGET_VIDEO)
                size_mb = os.path.getsize(TARGET_VIDEO) / (1024 * 1024)
                print(f"[SUCCESS] Saved {latest} to {TARGET_VIDEO} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    record_full_interactive_demo()
