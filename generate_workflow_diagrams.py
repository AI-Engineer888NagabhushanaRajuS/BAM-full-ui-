r"""
Generates enterprise-grade vector SVG diagrams for all UI-SBAM system workflows.
Outputs to: F:\UI-SBAM\assets\workflows\
"""

import os

OUTPUT_DIR = r"F:\UI-SBAM\assets\workflows"
os.makedirs(OUTPUT_DIR, exist_ok=True)

COMMON_STYLES = """
    <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0b0f17" />
            <stop offset="100%" stop-color="#111827" />
        </linearGradient>
        <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#161f30" />
            <stop offset="100%" stop-color="#1a253a" />
        </linearGradient>
        <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1f6feb" />
            <stop offset="100%" stop-color="#388bfd" />
        </linearGradient>
        <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#238636" />
            <stop offset="100%" stop-color="#2ea043" />
        </linearGradient>
        <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8957e5" />
            <stop offset="100%" stop-color="#a371f7" />
        </linearGradient>
        <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#d29922" />
            <stop offset="100%" stop-color="#e3b341" />
        </linearGradient>
        <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.4" />
        </filter>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#58a6ff" />
        </marker>
        <marker id="arrowGreen" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#3fb950" />
        </marker>
        <marker id="arrowPurple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#bc8cff" />
        </marker>
    </defs>
    <style>
        .title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 700; fill: #f0f6fc; }
        .subtitle { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; fill: #8b949e; }
        .node-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 600; fill: #f0f6fc; }
        .node-desc { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; fill: #8b949e; }
        .badge-text { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px; font-weight: 600; }
        .tag { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 10.5px; fill: #79c0ff; font-weight: 500; }
    </style>
"""

def save_svg(name, svg_content):
    path = os.path.join(OUTPUT_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Generated: {path}")

# ==============================================================================
# 1. END-TO-END SYSTEM ARCHITECTURE
# ==============================================================================
svg_e2e = f"""<svg width="1000" height="420" viewBox="0 0 1000 420" xmlns="http://www.w3.org/2000/svg">
    {COMMON_STYLES}
    <rect width="1000" height="420" rx="12" fill="url(#bgGrad)" stroke="#30363d" stroke-width="1.5" />
    
    <text x="30" y="38" class="title">BAM Full-Cycle Architecture: Intake to MicroVM Sandbox</text>
    <text x="30" y="58" class="subtitle">Autonomous Enterprise RFQ-to-FastMCP Execution Pipeline with Fail-Closed Verification</text>

    <!-- STAGE 1: INTAKE & THREAT DEFENSE -->
    <g filter="url(#shadow)">
        <rect x="30" y="85" width="210" height="295" rx="8" fill="url(#cardGrad)" stroke="#388bfd" stroke-width="1.2" />
        <rect x="42" y="97" width="80" height="20" rx="4" fill="#1f6feb" fill-opacity="0.2" />
        <text x="50" y="111" fill="#58a6ff" class="badge-text">STAGE 1.1</text>
        <text x="42" y="138" class="node-title">Intake &amp; Threat Perimeter</text>
        <text x="42" y="156" class="node-desc">• FDE Scope Directives</text>
        <text x="42" y="172" class="node-desc">• Native Voice Dictation</text>
        <text x="42" y="188" class="node-desc">• Air-gapped Quarantine</text>
        <text x="42" y="204" class="node-desc">• ClamAV Signature Scan</text>
        <text x="42" y="220" class="node-desc">• Repel Evasion Shield</text>
        <text x="42" y="236" class="node-desc">• Unanimous Twin Verdict</text>
        <rect x="42" y="255" width="186" height="38" rx="5" fill="#0d1117" stroke="#30363d" />
        <text x="50" y="272" class="tag">Release Gate: 100% Clean</text>
        <text x="50" y="286" class="node-desc">Fail-Closed on Scanner Outage</text>
    </g>

    <!-- Connector 1 -> 2 -->
    <line x1="240" y1="230" x2="270" y2="230" stroke="#58a6ff" stroke-width="2" marker-end="url(#arrow)" />

    <!-- STAGE 2: GRAPHRAG & PRE-FLIGHT -->
    <g filter="url(#shadow)">
        <rect x="275" y="85" width="210" height="295" rx="8" fill="url(#cardGrad)" stroke="#8957e5" stroke-width="1.2" />
        <rect x="287" y="97" width="80" height="20" rx="4" fill="#8957e5" fill-opacity="0.2" />
        <text x="295" y="111" fill="#bc8cff" class="badge-text">STAGE 2.1-2.3</text>
        <text x="287" y="138" class="node-title">GraphRAG &amp; Pre-Flight</text>
        <text x="287" y="156" class="node-desc">• Cognee Ingestion &amp; OKF v0.2</text>
        <text x="287" y="172" class="node-desc">• Triples &amp; Entity Resolution</text>
        <text x="287" y="188" class="node-desc">• Master Questionnaire Battery</text>
        <text x="287" y="204" class="node-desc">• "Ask BullMind" LLM Inquiries</text>
        <text x="287" y="220" class="node-desc">• 5 Client Domain Masters</text>
        <text x="287" y="236" class="node-desc">• 80% Context Sufficiency Gate</text>
        <rect x="287" y="255" width="186" height="38" rx="5" fill="#0d1117" stroke="#30363d" />
        <text x="295" y="272" fill="#bc8cff" class="tag">Gate: &gt;= 80% Sufficiency</text>
        <text x="295" y="286" class="node-desc">Evaluated by Laya / Jev Judge</text>
    </g>

    <!-- Connector 2 -> 3 -->
    <line x1="485" y1="230" x2="515" y2="230" stroke="#bc8cff" stroke-width="2" marker-end="url(#arrowPurple)" />

    <!-- STAGE 3: SOW & ISATVON -->
    <g filter="url(#shadow)">
        <rect x="520" y="85" width="210" height="295" rx="8" fill="url(#cardGrad)" stroke="#2ea043" stroke-width="1.2" />
        <rect x="532" y="97" width="80" height="20" rx="4" fill="#238636" fill-opacity="0.2" />
        <text x="540" y="111" fill="#3fb950" class="badge-text">STAGE 3.1-3.2</text>
        <text x="532" y="138" class="node-title">Dynamic SOW &amp; Contract</text>
        <text x="532" y="156" class="node-desc">• Non-hardcoded SOW Synthesis</text>
        <text x="532" y="172" class="node-desc">• FDE Directives Embedded</text>
        <text x="532" y="188" class="node-desc">• CAD STEP Tolerance &amp; Ra</text>
        <text x="532" y="204" class="node-desc">• BOM Rev C &amp; 17-4PH Delta</text>
        <text x="532" y="220" class="node-desc">• 7-Field ISATVON 1.4 Schema</text>
        <text x="532" y="236" class="node-desc">• Loopy Bounded Router Cycles</text>
        <rect x="532" y="255" width="186" height="38" rx="5" fill="#0d1117" stroke="#30363d" />
        <text x="540" y="272" fill="#3fb950" class="tag">Approval &amp; Hash Freeze</text>
        <text x="540" y="286" class="node-desc">Edits invalidate prior certs</text>
    </g>

    <!-- Connector 3 -> 4 -->
    <line x1="730" y1="230" x2="760" y2="230" stroke="#3fb950" stroke-width="2" marker-end="url(#arrowGreen)" />

    <!-- STAGE 4: TEMPORAL & SANDBOX -->
    <g filter="url(#shadow)">
        <rect x="765" y="85" width="205" height="295" rx="8" fill="url(#cardGrad)" stroke="#d29922" stroke-width="1.2" />
        <rect x="777" y="97" width="80" height="20" rx="4" fill="#d29922" fill-opacity="0.2" />
        <text x="785" y="111" fill="#e3b341" class="badge-text">STAGE 4.1-4.4</text>
        <text x="777" y="138" class="node-title">Execution &amp; Testing</text>
        <text x="777" y="156" class="node-desc">• Temporal Workflows A-D</text>
        <text x="777" y="172" class="node-desc">• AST Code Gen (skill.py.j2)</text>
        <text x="777" y="188" class="node-desc">• Self-Healing Fallback (Act D)</text>
        <text x="777" y="204" class="node-desc">• CubeSandbox MicroVM</text>
        <text x="777" y="220" class="node-desc">• Promptfoo Assertion Matrix</text>
        <text x="777" y="236" class="node-desc">• Staging / BAM_db Commit</text>
        <rect x="777" y="255" width="181" height="38" rx="5" fill="#0d1117" stroke="#30363d" />
        <text x="785" y="272" fill="#e3b341" class="tag">Deploy Certification</text>
        <text x="785" y="286" class="node-desc">SHA-256 Manifest Lock</text>
    </g>
</svg>"""
save_svg("01_end_to_end_architecture.svg", svg_e2e)

# ==============================================================================
# 2. FDE DIRECTIVES & VOICE INPUT PIPELINE
# ==============================================================================
svg_fde = f"""<svg width="860" height="360" viewBox="0 0 860 360" xmlns="http://www.w3.org/2000/svg">
    {COMMON_STYLES}
    <rect width="860" height="360" rx="12" fill="url(#bgGrad)" stroke="#30363d" stroke-width="1.5" />
    <text x="30" y="38" class="title">FDE Directives &amp; Windows Speech-to-Text Pipeline (Stage 1.1)</text>
    <text x="30" y="58" class="subtitle">Multi-Modal Pre-Ingestion Intent Capture &amp; Context Propagation</text>

    <!-- Left Box: Dual Input Methods -->
    <g filter="url(#shadow)">
        <rect x="30" y="90" width="220" height="230" rx="8" fill="url(#cardGrad)" stroke="#30363d" />
        <text x="45" y="118" class="node-title">1. FDE Input Modes</text>
        <rect x="45" y="135" width="190" height="45" rx="6" fill="#0d1117" stroke="#388bfd" stroke-width="1" />
        <text x="55" y="153" fill="#58a6ff" class="node-title">⌨ Manual Keyboard Input</text>
        <text x="55" y="168" class="node-desc">Directives &amp; Domain Directives</text>

        <rect x="45" y="195" width="190" height="45" rx="6" fill="#0d1117" stroke="#2ea043" stroke-width="1" />
        <text x="55" y="213" fill="#3fb950" class="node-title">⚡ 1-Click Defense Presets</text>
        <text x="55" y="228" class="node-desc">CAD, 17-4PH, SMT, ISATVON 1.4</text>

        <rect x="45" y="255" width="190" height="45" rx="6" fill="#0d1117" stroke="#d29922" stroke-width="1" />
        <text x="55" y="273" fill="#e3b341" class="node-title">🎙 Native Windows Voice</text>
        <text x="55" y="288" class="node-desc">webkitSpeechRecognition API</text>
    </g>

    <line x1="250" y1="205" x2="300" y2="205" stroke="#58a6ff" stroke-width="2" marker-end="url(#arrow)" />

    <!-- Center Box: Reactive Store & State -->
    <g filter="url(#shadow)">
        <rect x="305" y="90" width="240" height="230" rx="8" fill="url(#cardGrad)" stroke="#388bfd" />
        <text x="320" y="118" class="node-title">2. Reactive State &amp; Storage</text>
        <text x="320" y="145" class="node-desc">• Store Key: fdeGoals in UiStore</text>
        <text x="320" y="165" class="node-desc">• LocalStorage: 'bam-fde-goals'</text>
        <text x="320" y="185" class="node-desc">• Live Speech Interim Streaming</text>
        <text x="320" y="205" class="node-desc">• Pulsing Visual Feedback Dot</text>
        <rect x="320" y="225" width="210" height="75" rx="6" fill="#0d1117" stroke="#30363d" />
        <text x="330" y="245" class="tag">Captured Directives Payload:</text>
        <text x="330" y="263" class="node-desc">"Enforce MIL-A-8625 Type II clear</text>
        <text x="330" y="278" class="node-desc">anodize, 17-4PH certs and loopy..."</text>
    </g>

    <line x1="545" y1="205" x2="595" y2="205" stroke="#58a6ff" stroke-width="2" marker-end="url(#arrow)" />

    <!-- Right Box: Consumer Subsystems -->
    <g filter="url(#shadow)">
        <rect x="600" y="90" width="230" height="230" rx="8" fill="url(#cardGrad)" stroke="#2ea043" />
        <text x="615" y="118" class="node-title">3. Downstream Subsystems</text>
        
        <rect x="615" y="135" width="200" height="70" rx="6" fill="#0d1117" stroke="#8957e5" stroke-width="1" />
        <text x="625" y="155" fill="#bc8cff" class="node-title">Cognee GraphRAG (Stage 2)</text>
        <text x="625" y="172" class="node-desc">Guides retrieval queries &amp;</text>
        <text x="625" y="187" class="node-desc">context graph clustering</text>

        <rect x="615" y="220" width="200" height="80" rx="6" fill="#0d1117" stroke="#2ea043" stroke-width="1" />
        <text x="625" y="240" fill="#3fb950" class="node-title">Dynamic SOW (Stage 3.1)</text>
        <text x="625" y="257" class="node-desc">Synthesized into Requirement 1:</text>
        <text x="625" y="272" class="node-desc">"Align with FDE Intake Directives:"</text>
    </g>
</svg>"""
save_svg("02_fde_voice_directives_flow.svg", svg_fde)

# ==============================================================================
# 3. DUAL-ENGINE THREAT DEFENSE FLOW (6-NODES)
# ==============================================================================
svg_threat = f"""<svg width="980" height="340" viewBox="0 0 980 340" xmlns="http://www.w3.org/2000/svg">
    {COMMON_STYLES}
    <rect width="980" height="340" rx="12" fill="url(#bgGrad)" stroke="#30363d" stroke-width="1.5" />
    <text x="30" y="38" class="title">Dual-Engine Threat Defense Perimeter &amp; 6-Node Pipeline</text>
    <text x="30" y="58" class="subtitle">BuLL*Sav (ClamAV) + Repel Evasion Shield with Fail-Closed Consensus Verdict</text>

    <!-- Node 1: Upload -->
    <g filter="url(#shadow)">
        <rect x="30" y="95" width="130" height="190" rx="8" fill="url(#cardGrad)" stroke="#30363d" />
        <text x="42" y="125" class="node-title">Node 1</text>
        <text x="42" y="145" fill="#58a6ff" class="node-title">Upload</text>
        <text x="42" y="175" class="node-desc">Discovery files</text>
        <text x="42" y="193" class="node-desc">Multi-part stream</text>
        <text x="42" y="211" class="node-desc">10 MB chunking</text>
        <rect x="42" y="240" width="106" height="24" rx="4" fill="#0d1117" />
        <text x="50" y="256" class="tag">Flow 1/6</text>
    </g>

    <line x1="160" y1="190" x2="185" y2="190" stroke="#58a6ff" stroke-width="2" marker-end="url(#arrow)" />

    <!-- Node 2: Quarantine -->
    <g filter="url(#shadow)">
        <rect x="190" y="95" width="130" height="190" rx="8" fill="url(#cardGrad)" stroke="#30363d" />
        <text x="202" y="125" class="node-title">Node 2</text>
        <text x="202" y="145" fill="#d29922" class="node-title">Quarantine</text>
        <text x="202" y="175" class="node-desc">Air-gapped S3</text>
        <text x="202" y="193" class="node-desc">SHA-256 digest</text>
        <text x="202" y="211" class="node-desc">Isolated sandbox</text>
        <rect x="202" y="240" width="106" height="24" rx="4" fill="#0d1117" />
        <text x="210" y="256" fill="#e3b341" class="tag">Flow 2/6</text>
    </g>

    <line x1="320" y1="190" x2="345" y2="190" stroke="#58a6ff" stroke-width="2" marker-end="url(#arrow)" />

    <!-- Node 3: ClamAV -->
    <g filter="url(#shadow)">
        <rect x="350" y="85" width="135" height="210" rx="8" fill="url(#cardGrad)" stroke="#1f6feb" stroke-width="1.5" />
        <text x="362" y="115" class="node-title">Node 3</text>
        <text x="362" y="135" fill="#58a6ff" class="node-title">ClamAV Core</text>
        <text x="362" y="165" class="node-desc">• BuLL*Sav engine</text>
        <text x="362" y="183" class="node-desc">• MD5 / SHA256</text>
        <text x="362" y="201" class="node-desc">• Macro AST check</text>
        <text x="362" y="219" class="node-desc">• Known CVEs</text>
        <rect x="362" y="250" width="111" height="24" rx="4" fill="#0d1117" />
        <text x="370" y="266" class="tag">Flow 3/6</text>
    </g>

    <line x1="485" y1="190" x2="510" y2="190" stroke="#58a6ff" stroke-width="2" marker-end="url(#arrow)" />

    <!-- Node 4: Repel -->
    <g filter="url(#shadow)">
        <rect x="515" y="85" width="140" height="210" rx="8" fill="url(#cardGrad)" stroke="#8957e5" stroke-width="1.5" />
        <text x="527" y="115" class="node-title">Node 4</text>
        <text x="527" y="135" fill="#bc8cff" class="node-title">Repel Shield</text>
        <text x="527" y="165" class="node-desc">• Heuristic defense</text>
        <text x="527" y="183" class="node-desc">• Prompt injection</text>
        <text x="527" y="201" class="node-desc">• Polyglot detection</text>
        <text x="527" y="219" class="node-desc">• Adversarial score</text>
        <rect x="527" y="250" width="116" height="24" rx="4" fill="#0d1117" />
        <text x="535" y="266" fill="#bc8cff" class="tag">Flow 4/6</text>
    </g>

    <line x1="655" y1="190" x2="680" y2="190" stroke="#58a6ff" stroke-width="2" marker-end="url(#arrow)" />

    <!-- Node 5: Twin Verdict -->
    <g filter="url(#shadow)">
        <rect x="685" y="95" width="125" height="190" rx="8" fill="url(#cardGrad)" stroke="#30363d" />
        <text x="697" y="125" class="node-title">Node 5</text>
        <text x="697" y="145" fill="#d29922" class="node-title">Twin Verdict</text>
        <text x="697" y="175" class="node-desc">Unanimous Pass</text>
        <text x="697" y="193" class="node-desc">ClamAV == clean</text>
        <text x="697" y="211" class="node-desc">Repel == clean</text>
        <rect x="697" y="240" width="101" height="24" rx="4" fill="#0d1117" />
        <text x="705" y="256" fill="#e3b341" class="tag">Flow 5/6</text>
    </g>

    <line x1="810" y1="190" x2="835" y2="190" stroke="#3fb950" stroke-width="2" marker-end="url(#arrowGreen)" />

    <!-- Node 6: Released -->
    <g filter="url(#shadow)">
        <rect x="840" y="95" width="115" height="190" rx="8" fill="url(#cardGrad)" stroke="#2ea043" stroke-width="1.5" />
        <text x="852" y="125" class="node-title">Node 6</text>
        <text x="852" y="145" fill="#3fb950" class="node-title">Released</text>
        <text x="852" y="175" class="node-desc">Move to clean</text>
        <text x="852" y="193" class="node-desc">s3://bam-intake/</text>
        <text x="852" y="211" class="node-desc">RAG Admission</text>
        <rect x="852" y="240" width="91" height="24" rx="4" fill="#0d1117" />
        <text x="860" y="256" fill="#3fb950" class="tag">Flow 6/6</text>
    </g>
</svg>"""
save_svg("03_dual_engine_defense_flow.svg", svg_threat)

# ==============================================================================
# 4. MASTER QUESTIONNAIRE & 80% SUFFICIENCY GATE
# ==============================================================================
svg_gate = f"""<svg width="880" height="370" viewBox="0 0 880 370" xmlns="http://www.w3.org/2000/svg">
    {COMMON_STYLES}
    <rect width="880" height="370" rx="12" fill="url(#bgGrad)" stroke="#30363d" stroke-width="1.5" />
    <text x="30" y="38" class="title">Master Questionnaire Battery &amp; 80% Context Sufficiency Gate</text>
    <text x="30" y="58" class="subtitle">Stage 2.3 Pre-Flight Cockpit: Strict Guardrail Unlocking Stage 3.1 SOW Synthesis</text>

    <!-- Column 1: Master Questionnaire -->
    <g filter="url(#shadow)">
        <rect x="30" y="90" width="240" height="245" rx="8" fill="url(#cardGrad)" stroke="#388bfd" />
        <text x="45" y="118" class="node-title">1. Master Questionnaire</text>
        <text x="45" y="138" class="node-desc">8 Excel Master baseline checks:</text>
        <text x="45" y="156" class="node-desc">• 17-4PH housing cert requirement</text>
        <text x="45" y="172" class="node-desc">• MPW-4421 tolerances &amp; Ra 0.8µm</text>
        <text x="45" y="188" class="node-desc">• BOM Rev C delta reconciliation</text>
        <text x="45" y="204" class="node-desc">• Net 45 commercial &amp; packaging</text>
        <text x="45" y="220" class="node-desc">• BU-AERO-01 ITAR/AS9100D certs</text>
        <text x="45" y="236" class="node-desc">• PCBA costing &amp; scrap rates</text>
        <text x="45" y="252" class="node-desc">• FastMCP Agent responsibilities</text>
        <text x="45" y="268" class="node-desc">• ISATVON 1.4 loop bounds</text>
        <rect x="45" y="285" width="210" height="32" rx="4" fill="#0d1117" stroke="#30363d" />
        <text x="55" y="305" class="tag">+ Add Custom Client Question</text>
    </g>

    <line x1="270" y1="210" x2="310" y2="210" stroke="#58a6ff" stroke-width="2" marker-end="url(#arrow)" />

    <!-- Column 2: Test the Cognee Engine -->
    <g filter="url(#shadow)">
        <rect x="315" y="90" width="240" height="245" rx="8" fill="url(#cardGrad)" stroke="#8957e5" />
        <text x="330" y="118" class="node-title">2. "Test the Cognee" Battery</text>
        <rect x="330" y="135" width="210" height="42" rx="6" fill="#0d1117" stroke="#8957e5" />
        <text x="340" y="153" fill="#bc8cff" class="node-title">⚡ Query Context Graph</text>
        <text x="340" y="168" class="node-desc">GraphRAG + OKF triples traversal</text>

        <rect x="330" y="190" width="210" height="42" rx="6" fill="#0d1117" stroke="#388bfd" />
        <text x="340" y="208" fill="#58a6ff" class="node-title">⚖ Laya / Jev Evaluation</text>
        <text x="340" y="223" class="node-desc">P(supported) &amp; P(covered) check</text>

        <rect x="330" y="245" width="210" height="70" rx="6" fill="#0d1117" stroke="#30363d" />
        <text x="340" y="265" class="tag">Sufficiency Gauge Meter:</text>
        <text x="340" y="283" class="node-desc">Initial: 0% (Pending Evaluation)</text>
        <text x="340" y="300" fill="#3fb950" class="node-desc">Tested: 100% (All Checks Pass)</text>
    </g>

    <line x1="555" y1="210" x2="595" y2="210" stroke="#bc8cff" stroke-width="2" marker-end="url(#arrowPurple)" />

    <!-- Column 3: The 80% Gate Decision -->
    <g filter="url(#shadow)">
        <rect x="600" y="90" width="250" height="245" rx="8" fill="url(#cardGrad)" stroke="#2ea043" />
        <text x="615" y="118" class="node-title">3. The 80% Gate Decision</text>

        <rect x="615" y="135" width="220" height="65" rx="6" fill="#0d1117" stroke="#d29922" />
        <text x="625" y="155" fill="#e3b341" class="node-title">Pass Rate &lt; 80%</text>
        <text x="625" y="172" class="node-desc">🔒 SOW Gated (Disabled Button)</text>
        <text x="625" y="187" class="node-desc">Blocks unverified synthesis</text>

        <rect x="615" y="215" width="220" height="95" rx="6" fill="#0d1117" stroke="#2ea043" />
        <text x="625" y="235" fill="#3fb950" class="node-title">Pass Rate &gt;= 80%</text>
        <text x="625" y="252" class="node-desc">🔓 Push to SOW (Stage 3.1) Unlocked</text>
        <text x="625" y="268" class="node-desc">Transfers verified facts &amp; FDE</text>
        <text x="625" y="284" class="node-desc">directives to dynamic generator</text>
    </g>
</svg>"""
save_svg("04_master_questionnaire_80pct_gate.svg", svg_gate)

# ==============================================================================
# 5. DYNAMIC SOW SYNTHESIS ENGINE
# ==============================================================================
svg_sow = f"""<svg width="920" height="420" viewBox="0 0 920 420" xmlns="http://www.w3.org/2000/svg">
    {COMMON_STYLES}
    <rect width="920" height="420" rx="12" fill="url(#bgGrad)" stroke="#30363d" stroke-width="1.5" />
    <text x="30" y="38" class="title">Dynamic SOW Synthesis Engine: Non-Hardcoded Multi-Stream Generation</text>
    <text x="30" y="58" class="subtitle">produceDynamicSowHtml() Fusing FDE Intent, Verified Discovery, CAD Tolerances &amp; ISATVON 1.4</text>

    <!-- 6 Input Feeds on Left -->
    <g filter="url(#shadow)">
        <rect x="30" y="85" width="260" height="42" rx="6" fill="url(#cardGrad)" stroke="#388bfd" />
        <text x="42" y="103" class="node-title">1. FDE Scope Directives</text>
        <text x="42" y="118" class="node-desc">Typed &amp; Windows Voice Dictation</text>

        <rect x="30" y="137" width="260" height="42" rx="6" fill="url(#cardGrad)" stroke="#2ea043" />
        <text x="42" y="155" class="node-title">2. Released Clean Files</text>
        <text x="42" y="170" class="node-desc">s.uploads.filter(isReleased)</text>

        <rect x="30" y="189" width="260" height="42" rx="6" fill="url(#cardGrad)" stroke="#8957e5" />
        <text x="42" y="207" class="node-title">3. CAD STEP Tolerances</text>
        <text x="42" y="222" class="node-desc">±0.05mm bore, Ra 0.8µm, MIL-A-8625</text>

        <rect x="30" y="241" width="260" height="42" rx="6" fill="url(#cardGrad)" stroke="#d29922" />
        <text x="42" y="259" class="node-title">4. BOM Rev C Delta</text>
        <text x="42" y="274" class="node-desc">17-4PH housing, EN 10204 3.1 certs</text>

        <rect x="30" y="293" width="260" height="42" rx="6" fill="url(#cardGrad)" stroke="#388bfd" />
        <text x="42" y="311" class="node-title">5. Rules Master &amp; Costing</text>
        <text x="42" y="326" class="node-desc">$120/hr SMT, 1.5% scrap, =SUM() formula</text>

        <rect x="30" y="345" width="260" height="42" rx="6" fill="url(#cardGrad)" stroke="#2ea043" />
        <text x="42" y="363" class="node-title">6. Verified Facts &amp; Custom Qs</text>
        <text x="42" y="378" class="node-desc">Cognified checks passing &gt;= 80% gate</text>
    </g>

    <!-- Convergence Lines -->
    <line x1="290" y1="106" x2="350" y2="235" stroke="#58a6ff" stroke-width="1.5" />
    <line x1="290" y1="158" x2="350" y2="235" stroke="#3fb950" stroke-width="1.5" />
    <line x1="290" y1="210" x2="350" y2="235" stroke="#bc8cff" stroke-width="1.5" />
    <line x1="290" y1="262" x2="350" y2="235" stroke="#e3b341" stroke-width="1.5" />
    <line x1="290" y1="314" x2="350" y2="235" stroke="#58a6ff" stroke-width="1.5" />
    <line x1="290" y1="366" x2="350" y2="235" stroke="#3fb950" stroke-width="1.5" />

    <!-- Center Engine Box -->
    <g filter="url(#shadow)">
        <rect x="355" y="140" width="230" height="190" rx="10" fill="url(#cardGrad)" stroke="#58a6ff" stroke-width="2" />
        <text x="375" y="170" fill="#58a6ff" class="node-title">Synthesis Engine</text>
        <text x="375" y="195" class="node-desc">• generateDynamicRequirements()</text>
        <text x="375" y="215" class="node-desc">• 7-Field ISATVON Tagging</text>
        <text x="375" y="235" class="node-desc">• Parameter Injection</text>
        <text x="375" y="255" class="node-desc">• SOW HTML Structuring</text>
        <rect x="370" y="275" width="200" height="36" rx="5" fill="#0d1117" stroke="#30363d" />
        <text x="380" y="293" class="tag">produceDynamicSowHtml()</text>
        <text x="380" y="305" class="node-desc">Full contract compliance</text>
    </g>

    <line x1="585" y1="235" x2="635" y2="235" stroke="#58a6ff" stroke-width="2" marker-end="url(#arrow)" />

    <!-- Right Box: Output SOW Requirements -->
    <g filter="url(#shadow)">
        <rect x="640" y="85" width="250" height="305" rx="8" fill="url(#cardGrad)" stroke="#30363d" />
        <text x="655" y="115" class="node-title">Generated SOW Structure</text>
        
        <text x="655" y="145" fill="#58a6ff" class="node-title">Req 1: Threat Perimeter</text>
        <text x="655" y="160" class="node-desc">FDE Scope Directives &amp; Dual Scan</text>

        <text x="655" y="185" fill="#58a6ff" class="node-title">Req 2: CAD STEP Geometry</text>
        <text x="655" y="200" class="node-desc">±0.05mm bore tol, Ra 0.8µm, MIL Spec</text>

        <text x="655" y="225" fill="#58a6ff" class="node-title">Req 3: BOM Delta &amp; Certs</text>
        <text x="655" y="240" class="node-desc">17-4PH housing, EN 10204 3.1 certs</text>

        <text x="655" y="265" fill="#58a6ff" class="node-title">Req 4: Manufacturing Costing</text>
        <text x="655" y="280" class="node-desc">SMT $120/hr, 1.5% scrap, =SUM()</text>

        <text x="655" y="305" fill="#bc8cff" class="node-title">Req 5: ISATVON 1.4 Loopy</text>
        <text x="655" y="320" class="node-desc">max_iter: 3, budget: 5s, decoupled tool</text>

        <text x="655" y="345" fill="#3fb950" class="node-title">Req 6+: Commercial &amp; Custom</text>
        <text x="655" y="360" class="node-desc">ASTM packaging, Net 45, custom rules</text>
    </g>
</svg>"""
save_svg("05_dynamic_sow_synthesis_engine.svg", svg_sow)

# ==============================================================================
# 6. ISATVON 1.4 LOOPY CONTRACT & TEMPORAL EXECUTION
# ==============================================================================
svg_loopy = f"""<svg width="860" height="360" viewBox="0 0 860 360" xmlns="http://www.w3.org/2000/svg">
    {COMMON_STYLES}
    <rect width="860" height="360" rx="12" fill="url(#bgGrad)" stroke="#30363d" stroke-width="1.5" />
    <text x="30" y="38" class="title">ISATVON 1.4 Loopy Framework &amp; Temporal Validation</text>
    <text x="30" y="58" class="subtitle">Declarative Bounded Self-Correcting Execution with Decoupled Check Tools</text>

    <!-- Box 1: 7 ISATVON Elements -->
    <g filter="url(#shadow)">
        <rect x="30" y="90" width="220" height="235" rx="8" fill="url(#cardGrad)" stroke="#388bfd" />
        <text x="45" y="118" class="node-title">ISATVON 1.4 Manifest</text>
        <text x="45" y="142" class="node-desc">• <tspan fill="#58a6ff">I - Instructions:</tspan> Business logic</text>
        <text x="45" y="162" class="node-desc">• <tspan fill="#58a6ff">S - Source Data:</tspan> s3://, db:// URI</text>
        <text x="45" y="182" class="node-desc">• <tspan fill="#58a6ff">A - Automation:</tspan> Execution Engine</text>
        <text x="45" y="202" class="node-desc">• <tspan fill="#58a6ff">T - Tech Stack:</tspan> Registry libraries</text>
        <text x="45" y="222" class="node-desc">• <tspan fill="#58a6ff">V - Variables:</tspan> max_iter: 3, budget</text>
        <text x="45" y="242" class="node-desc">• <tspan fill="#58a6ff">O - Outcome:</tspan> Pydantic BaseModel</text>
        <text x="45" y="262" class="node-desc">• <tspan fill="#58a6ff">N - Notification:</tspan> Real-time state</text>
        <rect x="45" y="280" width="190" height="30" rx="4" fill="#0d1117" stroke="#30363d" />
        <text x="55" y="300" class="tag">Decoupled Action vs Check Tool</text>
    </g>

    <line x1="250" y1="205" x2="295" y2="205" stroke="#58a6ff" stroke-width="2" marker-end="url(#arrow)" />

    <!-- Box 2: Temporal 4-Activity Lifecycle -->
    <g filter="url(#shadow)">
        <rect x="300" y="90" width="260" height="235" rx="8" fill="url(#cardGrad)" stroke="#8957e5" />
        <text x="315" y="118" class="node-title">Temporal Validation Workflow</text>
        
        <rect x="315" y="132" width="230" height="34" rx="5" fill="#0d1117" stroke="#30363d" />
        <text x="325" y="153" class="node-desc"><tspan fill="#58a6ff" font-weight="600">Activity A:</tspan> ISATVON Schema Check</text>

        <rect x="315" y="172" width="230" height="34" rx="5" fill="#0d1117" stroke="#30363d" />
        <text x="325" y="193" class="node-desc"><tspan fill="#58a6ff" font-weight="600">Activity B:</tspan> Registry Dependency Gate</text>

        <rect x="315" y="212" width="230" height="34" rx="5" fill="#0d1117" stroke="#30363d" />
        <text x="325" y="233" class="node-desc"><tspan fill="#58a6ff" font-weight="600">Activity C:</tspan> AST Code Gen (skill.py.j2)</text>

        <rect x="315" y="252" width="230" height="58" rx="5" fill="#0d1117" stroke="#d29922" stroke-width="1" />
        <text x="325" y="271" fill="#e3b341" class="node-title">Activity D (Self-Healing Fallback)</text>
        <text x="325" y="287" class="node-desc">Engages if C fails: LLM quotes</text>
        <text x="325" y="301" class="node-desc">spreadsheet formula strings, re-runs C</text>
    </g>

    <line x1="560" y1="205" x2="605" y2="205" stroke="#bc8cff" stroke-width="2" marker-end="url(#arrowPurple)" />

    <!-- Box 3: Test Sandbox -->
    <g filter="url(#shadow)">
        <rect x="610" y="90" width="220" height="235" rx="8" fill="url(#cardGrad)" stroke="#2ea043" />
        <text x="625" y="118" class="node-title">MicroVM Testing &amp; Deploy</text>
        
        <text x="625" y="150" class="node-desc">• CubeSandbox MicroVM</text>
        <text x="625" y="170" class="node-desc">• FastMCP Tool Execution</text>
        <text x="625" y="190" class="node-desc">• Promptfoo Assertions Matrix</text>
        <text x="625" y="210" class="node-desc">• Zero unhandled exceptions</text>
        <text x="625" y="230" class="node-desc">• Outcome schema conformity</text>
        
        <rect x="625" y="255" width="190" height="55" rx="6" fill="#0d1117" stroke="#2ea043" />
        <text x="635" y="275" fill="#3fb950" class="node-title">Commit to BAM_db</text>
        <text x="635" y="293" class="node-desc">Deploy to Staging Environment</text>
    </g>
</svg>"""
save_svg("06_isatvon_loopy_contract_validation.svg", svg_loopy)

# ==============================================================================
# 7. DUAL SYSTEM-1 JUDGE ARCHITECTURE
# ==============================================================================
svg_judge = f"""<svg width="840" height="340" viewBox="0 0 840 340" xmlns="http://www.w3.org/2000/svg">
    {COMMON_STYLES}
    <rect width="840" height="340" rx="12" fill="url(#bgGrad)" stroke="#30363d" stroke-width="1.5" />
    <text x="30" y="38" class="title">Dual System-1 Decision Judge (Laya ONNX + Cloud Jev)</text>
    <text x="30" y="58" class="subtitle">Sub-100ms Calibrated Decision Making &amp; SOW Quality Governance</text>

    <!-- Left Box: Inputs -->
    <g filter="url(#shadow)">
        <rect x="30" y="95" width="200" height="205" rx="8" fill="url(#cardGrad)" stroke="#30363d" />
        <text x="45" y="125" class="node-title">Judge Inputs</text>
        <text x="45" y="155" class="node-desc">• SOW Requirements</text>
        <text x="45" y="175" class="node-desc">• Retrieved RAG Facts</text>
        <text x="45" y="195" class="node-desc">• Verified Discovery Docs</text>
        <text x="45" y="215" class="node-desc">• Domain Rules &amp; Certs</text>
        <rect x="45" y="240" width="170" height="40" rx="4" fill="#0d1117" stroke="#30363d" />
        <text x="55" y="258" class="tag">REST API: /judge</text>
        <text x="55" y="271" class="node-desc">Port 8787 Proxy Service</text>
    </g>

    <line x1="230" y1="195" x2="280" y2="195" stroke="#58a6ff" stroke-width="2" marker-end="url(#arrow)" />

    <!-- Center Box: Dual Model Architecture -->
    <g filter="url(#shadow)">
        <rect x="285" y="85" width="270" height="225" rx="8" fill="url(#cardGrad)" stroke="#8957e5" stroke-width="1.5" />
        <text x="300" y="115" class="node-title">Decision Judge Router</text>

        <rect x="300" y="130" width="240" height="65" rx="6" fill="#0d1117" stroke="#1f6feb" />
        <text x="312" y="150" fill="#58a6ff" class="node-title">Local ONNX Decision v1</text>
        <text x="312" y="167" class="node-desc">convaiinnovations/laya (ModernBERT)</text>
        <text x="312" y="182" class="node-desc">Zero external API dependencies</text>

        <rect x="300" y="205" width="240" height="65" rx="6" fill="#0d1117" stroke="#2ea043" />
        <text x="312" y="225" fill="#3fb950" class="node-title">Cloud Jev Judge (OpenRouter)</text>
        <text x="312" y="242" class="node-desc">Gemini 2.5 Flash / GPT-4o-mini</text>
        <text x="312" y="257" class="node-desc">Extended reasoning &amp; cross-lingual</text>
    </g>

    <line x1="555" y1="195" x2="605" y2="195" stroke="#bc8cff" stroke-width="2" marker-end="url(#arrowPurple)" />

    <!-- Right Box: Criteria & Outputs -->
    <g filter="url(#shadow)">
        <rect x="610" y="95" width="200" height="205" rx="8" fill="url(#cardGrad)" stroke="#2ea043" />
        <text x="625" y="125" class="node-title">Evaluation Output</text>
        <text x="625" y="155" class="node-desc">• <tspan fill="#3fb950" font-weight="600">Faithfulness:</tspan> P(supported)</text>
        <text x="625" y="175" class="node-desc">• <tspan fill="#3fb950" font-weight="600">Coverage:</tspan> P(covered)</text>
        <text x="625" y="195" class="node-desc">• <tspan fill="#3fb950" font-weight="600">Clarity:</tspan> Actionable logic</text>
        <text x="625" y="215" class="node-desc">• Overall Accuracy (0-100)</text>
        <rect x="625" y="240" width="170" height="40" rx="4" fill="#0d1117" stroke="#30363d" />
        <text x="635" y="258" fill="#3fb950" class="tag">Calibrated Confidence</text>
        <text x="635" y="271" class="node-desc">G-Eval Style Rubric</text>
    </g>
</svg>"""
save_svg("07_dual_system_one_judge.svg", svg_judge)

print("All SVG workflow diagrams successfully generated!")
