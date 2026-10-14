// High-precision engineering drawing templates for BAM RFQ-2026-0147 & 5 Masters.
// Rendered into canvas/PNG data URLs for Filerobot Image Editor annotation.

export interface CadDrawingTemplate {
  id: string
  name: string
  partNumber: string
  spec: string
  description: string
  svg: string
}

export const CAD_TEMPLATES: CadDrawingTemplate[] = [
  {
    id: 'mpw-4421-cad',
    name: 'MPW-4421 Structural Bracket',
    partNumber: 'MPW-4421 (Rev C)',
    spec: '6061-T6 Aluminum · MIL-A-8625 Type II Clear Anodize',
    description: 'CAD Orthographic Drawing. Critical bore pattern Ø25.40 ±0.05 mm, general profile tolerance ±0.10 mm.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650" style="background:#0f172a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.8"/>
        </pattern>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8"/>
        </marker>
        <marker id="arrow-warn" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#f59e0b"/>
        </marker>
      </defs>
      <rect width="900" height="650" fill="#090d16"/>
      <rect width="900" height="650" fill="url(#grid)"/>

      <!-- Drawing Title Block (Standard ASME Y14.5) -->
      <rect x="520" y="520" width="360" height="110" fill="#111827" stroke="#38bdf8" stroke-width="1.5"/>
      <line x1="520" y1="555" x2="880" y2="555" stroke="#1e293b" stroke-width="1"/>
      <line x1="520" y1="590" x2="880" y2="590" stroke="#1e293b" stroke-width="1"/>
      <line x1="700" y1="520" x2="700" y2="590" stroke="#1e293b" stroke-width="1"/>
      
      <text x="530" y="542" fill="#94a3b8" font-size="11" font-weight="bold">DRAWING TITLE:</text>
      <text x="635" y="542" fill="#38bdf8" font-size="12" font-weight="bold">BRACKET, STRUCTURAL MOUNT</text>
      <text x="530" y="575" fill="#94a3b8" font-size="11">PART NO: <tspan fill="#f1f5f9" font-weight="bold">MPW-4421</tspan></text>
      <text x="710" y="575" fill="#94a3b8" font-size="11">REV: <tspan fill="#22c55e" font-weight="bold">C (BOM_RevC.xlsx)</tspan></text>
      <text x="530" y="612" fill="#94a3b8" font-size="11">MATERIAL: <tspan fill="#e2e8f0">AL 6061-T6 (QQ-A-250/11)</tspan></text>
      <text x="710" y="612" fill="#94a3b8" font-size="11">FINISH: <tspan fill="#e2e8f0">MIL-A-8625 Type II</tspan></text>

      <!-- Border Frame -->
      <rect x="20" y="20" width="860" height="610" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="8 4"/>

      <!-- Engineering Geometry: Top View -->
      <g transform="translate(100, 100)">
        <rect x="0" y="0" width="340" height="220" rx="12" fill="#1e293b" fill-opacity="0.3" stroke="#38bdf8" stroke-width="2.5"/>
        <rect x="40" y="30" width="260" height="160" rx="8" fill="none" stroke="#64748b" stroke-width="1.2" stroke-dasharray="4 2"/>
        
        <!-- Critical Bore Center Pattern -->
        <circle cx="170" cy="110" r="48" fill="#0f172a" stroke="#f59e0b" stroke-width="2.5"/>
        <circle cx="170" cy="110" r="3" fill="#f59e0b"/>
        <line x1="100" y1="110" x2="240" y2="110" stroke="#f59e0b" stroke-width="1" stroke-dasharray="6 3"/>
        <line x1="170" y1="40" x2="170" y2="180" stroke="#f59e0b" stroke-width="1" stroke-dasharray="6 3"/>

        <!-- 4x Corner Mount Holes -->
        <circle cx="30" cy="30" r="9" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
        <circle cx="310" cy="30" r="9" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
        <circle cx="30" cy="190" r="9" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
        <circle cx="310" cy="190" r="9" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>

        <!-- Dimension Lines -->
        <line x1="0" y1="-25" x2="340" y2="-25" stroke="#38bdf8" stroke-width="1.2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="170" y="-32" fill="#38bdf8" font-size="12" text-anchor="middle" font-weight="bold">340.00 ±0.10 mm</text>

        <line x1="-25" y1="0" x2="-25" y2="220" stroke="#38bdf8" stroke-width="1.2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="-32" y="115" fill="#38bdf8" font-size="12" text-anchor="middle" font-weight="bold" transform="rotate(-90 -32 115)">220.00 ±0.10 mm</text>

        <!-- Critical Tolerance Callout Arrow -->
        <line x1="205" y1="80" x2="290" y2="30" stroke="#f59e0b" stroke-width="1.5" marker-start="url(#arrow-warn)"/>
        <line x1="290" y1="30" x2="420" y2="30" stroke="#f59e0b" stroke-width="1.5"/>
        <text x="295" y="22" fill="#f59e0b" font-size="11.5" font-weight="bold">CRITICAL BORE: Ø25.40 ±0.05 mm</text>
        <text x="295" y="44" fill="#94a3b8" font-size="10">Surface Finish Ra 0.8 µm</text>
      </g>

      <!-- Side Cross Section View -->
      <g transform="translate(100, 390)">
        <polygon points="0,0 340,0 340,55 240,55 240,85 100,85 100,55 0,55" fill="#1e293b" fill-opacity="0.4" stroke="#38bdf8" stroke-width="2"/>
        <line x1="170" y1="-10" x2="170" y2="95" stroke="#f59e0b" stroke-width="1" stroke-dasharray="6 3"/>
        <text x="170" y="110" fill="#94a3b8" font-size="11" text-anchor="middle">SECTION A-A (SIDE ELEVATION)</text>
      </g>

      <!-- Watermark Stamp -->
      <g transform="translate(70, 560)">
        <rect x="0" y="0" width="220" height="42" fill="#0f766e" fill-opacity="0.2" stroke="#14b8a6" stroke-width="1.5" rx="4"/>
        <text x="110" y="26" fill="#14b8a6" font-size="12" text-anchor="middle" font-weight="bold">CAD GEOMETRY GROUNDED</text>
      </g>
    </svg>`
  },
  {
    id: 'mpw-4422-housing',
    name: 'MPW-4422 Housing Cross-Section',
    partNumber: 'MPW-4422 (Rev C)',
    spec: '17-4PH Stainless Steel (H1025) · Spec QA-101 §3.2 Lot Mill Cert',
    description: '17-4PH Precipitation Hardened Steel Housing with EN 10204 3.1 Certified Test Report requirement.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650" style="background:#090d16;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">
      <defs>
        <pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.8"/>
        </pattern>
        <marker id="arr2" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#ec4899"/>
        </marker>
      </defs>
      <rect width="900" height="650" fill="#090d16"/>
      <rect width="900" height="650" fill="url(#grid2)"/>

      <!-- Border Frame -->
      <rect x="20" y="20" width="860" height="610" fill="none" stroke="#ec4899" stroke-width="1.5" stroke-dasharray="8 4"/>

      <!-- Title Block -->
      <rect x="520" y="520" width="360" height="110" fill="#111827" stroke="#ec4899" stroke-width="1.5"/>
      <text x="530" y="545" fill="#f472b6" font-size="12" font-weight="bold">PART: MPW-4422 PRESSURE HOUSING</text>
      <text x="530" y="570" fill="#94a3b8" font-size="11">MATERIAL: <tspan fill="#f1f5f9" font-weight="bold">17-4PH SS (Condition H1025)</tspan></text>
      <text x="530" y="595" fill="#94a3b8" font-size="11">CERT: <tspan fill="#22c55e" font-weight="bold">EN 10204 3.1 Mill Cert Req (QA-101 §3.2)</tspan></text>
      <text x="530" y="618" fill="#94a3b8" font-size="11">TENANT: ORG-EMS / BU-AERO-01 (ITAR)</text>

      <!-- Geometry: Cylindrical Chamber Cross Section -->
      <g transform="translate(150, 100)">
        <path d="M 50 40 L 450 40 L 450 90 L 380 90 L 380 270 L 450 270 L 450 320 L 50 320 L 50 270 L 120 270 L 120 90 L 50 90 Z" 
              fill="#374151" fill-opacity="0.4" stroke="#ec4899" stroke-width="3"/>
        
        <!-- Internal Chamber -->
        <rect x="120" y="90" width="260" height="180" fill="#0f172a" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4 2"/>
        <line x1="20" y1="180" x2="480" y2="180" stroke="#f472b6" stroke-width="1" stroke-dasharray="8 4"/>

        <!-- O-Ring Seal Groove Details -->
        <rect x="105" y="85" width="10" height="10" fill="#ec4899"/>
        <rect x="385" y="85" width="10" height="10" fill="#ec4899"/>

        <!-- Dimension Indicators -->
        <line x1="50" y1="340" x2="450" y2="340" stroke="#ec4899" stroke-width="1.2" marker-start="url(#arr2)" marker-end="url(#arr2)"/>
        <text x="250" y="360" fill="#ec4899" font-size="12" text-anchor="middle" font-weight="bold">LENGTH: 400.00 ±0.15 mm</text>

        <!-- Material Callout -->
        <line x1="250" y1="90" x2="250" y2="20" stroke="#ec4899" stroke-width="1.5" marker-start="url(#arr2)"/>
        <line x1="250" y1="20" x2="420" y2="20" stroke="#ec4899" stroke-width="1.5"/>
        <text x="260" y="12" fill="#ec4899" font-size="12" font-weight="bold">17-4PH STAINLESS STEEL SPEC</text>
        <text x="260" y="35" fill="#94a3b8" font-size="10.5">Tensile 1070 MPa, Yield 1000 MPa · NACE MR0175</text>
      </g>

      <!-- Inspection Badge -->
      <g transform="translate(60, 540)">
        <rect x="0" y="0" width="280" height="60" fill="#831843" fill-opacity="0.3" stroke="#f43f5e" stroke-width="1.5" rx="6"/>
        <text x="140" y="25" fill="#f43f5e" font-size="11.5" text-anchor="middle" font-weight="bold">QA-101 MANDATORY LOT CERT</text>
        <text x="140" y="45" fill="#cbd5e1" font-size="10" text-anchor="middle">Heat Treat cert + Chemical analysis per melt lot</text>
      </g>
    </svg>`
  },
  {
    id: 'pcba-smt-xray',
    name: 'PCBA SMT Solder X-Ray Inspection',
    partNumber: 'ASSY-PCBA-0147',
    spec: 'AS9100D · IPC-A-610 Class 3 High Reliability · Rule #1 ($150/lot)',
    description: 'High-density BGA X-Ray radiograph verifying solder ball coplanarity and voiding analysis.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650" style="background:#020617;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">
      <rect width="900" height="650" fill="#020617"/>
      
      <!-- X-Ray Screen Frame -->
      <rect x="30" y="30" width="840" height="590" rx="8" fill="#090d16" stroke="#10b981" stroke-width="2"/>
      
      <!-- BGA Solder Balls Array Grid -->
      <g transform="translate(100, 80)">
        ${Array.from({ length: 6 }).map((_, r) =>
          Array.from({ length: 9 }).map((_, c) => {
            const cx = c * 70 + 40
            const cy = r * 70 + 40
            const isDefect = (r === 2 && c === 4)
            return `<g key="${r}-${c}">
              <circle cx="${cx}" cy="${cy}" r="24" fill="${isDefect ? '#7f1d1d' : '#064e3b'}" stroke="${isDefect ? '#ef4444' : '#10b981'}" stroke-width="2"/>
              <circle cx="${cx}" cy="${cy}" r="${isDefect ? '14' : '6'}" fill="${isDefect ? '#ef4444' : '#34d399'}" fill-opacity="${isDefect ? '0.8' : '0.4'}"/>
              ${isDefect ? `<text x="${cx}" y="${cy - 30}" fill="#ef4444" font-size="10" text-anchor="middle" font-weight="bold">VOIDING 22% (FAIL)</text>` : ''}
            </g>`
          }).join('')
        ).join('')}
      </g>

      <!-- Inspection Header & Rate Info -->
      <rect x="50" y="520" width="800" height="80" rx="6" fill="#0f172a" stroke="#10b981" stroke-width="1"/>
      <text x="70" y="548" fill="#10b981" font-size="13" font-weight="bold">BU-AERO-01 PCBA AUTOMATED X-RAY INSPECTION (AXI)</text>
      <text x="70" y="572" fill="#94a3b8" font-size="11">RULE #1 RATES: <tspan fill="#f1f5f9">SMT Line: $120/hr · Manual: $45/hr · Testing: $65/hr · X-Ray: $150/lot</tspan></text>
      <text x="70" y="590" fill="#94a3b8" font-size="10.5">ALLOWABLE BGA VOIDING: &lt; 15% PER IPC-7095C · AS9100D FLIGHT REQ</text>
    </svg>`
  },
  {
    id: 'astm-packaging',
    name: 'Industrial Packaging & VCI Barrier',
    partNumber: 'PKG-ASTM-D3951',
    spec: 'ASTM D3951 Commercial Packaging Standard · MIL-PRF-22019 VCI',
    description: 'Vapor Corrosion Inhibitor (VCI) sealed multi-pack carton with moisture barrier for 4-week delivery.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650" style="background:#0b1120;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">
      <rect width="900" height="650" fill="#0b1120"/>
      <rect x="25" y="25" width="850" height="600" rx="8" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="6 3"/>

      <!-- Master Carton Isometric View -->
      <g transform="translate(220, 100)">
        <polygon points="180,40 380,100 200,200 0,140" fill="#1e1b4b" stroke="#818cf8" stroke-width="2"/>
        <polygon points="0,140 200,200 200,380 0,320" fill="#312e81" stroke="#818cf8" stroke-width="2"/>
        <polygon points="200,200 380,100 380,280 200,380" fill="#4338ca" stroke="#818cf8" stroke-width="2"/>
        
        <!-- VCI Film Layer Label -->
        <text x="90" y="280" fill="#c7d2fe" font-size="13" font-weight="bold" transform="rotate(-15 90 280)">VCI BARRIER BAG</text>
        <text x="90" y="300" fill="#a5b4fc" font-size="10" transform="rotate(-15 90 300)">MIL-PRF-22019 Class 1</text>
      </g>

      <!-- Specifications Banner -->
      <rect x="50" y="520" width="800" height="85" rx="6" fill="#1e1b4b" stroke="#6366f1" stroke-width="1.2"/>
      <text x="70" y="550" fill="#a5b4fc" font-size="13" font-weight="bold">ASTM D3951 PACKAGING &amp; COMMERCIAL TERMS</text>
      <text x="70" y="572" fill="#e0e7ff" font-size="11">DELIVERY SCHEDULE: <tspan fill="#22c55e" font-weight="bold">4 WEEKS ARO (Purchase Order Receipt)</tspan> · PAYMENT: <tspan fill="#38bdf8" font-weight="bold">Net 45 Days</tspan></text>
      <text x="70" y="592" fill="#94a3b8" font-size="10.5">Desiccant Units per MIL-D-3464 · Barcode UID per MIL-STD-130N</text>
    </svg>`
  }
]

export const CLAIMS_TEMPLATES: CadDrawingTemplate[] = [
  {
    id: 'fir-police-report',
    name: 'Police Accident FIR Report',
    partNumber: '3_FIR_PoliceAccidentReport.pdf',
    spec: 'Traffic Investigation Report # FIR-2026-0914 · Sec 279 & 338 IPC',
    description: 'Official First Information Report (FIR) from Traffic Police Station with accident scene sketch, vehicle registration, and driver statements.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650" style="background:#0f172a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">
      <rect width="900" height="650" fill="#090d16"/>
      <!-- Header Banner -->
      <rect x="25" y="25" width="850" height="90" rx="6" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5"/>
      <circle cx="70" cy="70" r="28" fill="#1d4ed8" stroke="#60a5fa" stroke-width="2"/>
      <text x="70" y="75" fill="#ffffff" font-size="18" text-anchor="middle" font-weight="bold">POLICE</text>
      <text x="115" y="58" fill="#f8fafc" font-size="16" font-weight="bold">STATE TRAFFIC POLICE DEPT · MOTOR ACCIDENT INVESTIGATION REPORT</text>
      <text x="115" y="80" fill="#94a3b8" font-size="11.5">CRIME / FIR NO: <tspan fill="#60a5fa" font-weight="bold">FIR-2026-0914</tspan> · DATE OF OCCURRENCE: <tspan fill="#f1f5f9">2026-01-12 14:35 IST</tspan> · IPC SECTIONS: <tspan fill="#ef4444" font-weight="bold">279, 338</tspan></text>
      <text x="115" y="98" fill="#94a3b8" font-size="11">INCIDENT LOCATION: <tspan fill="#e2e8f0">KM 42.8 Highway Bypass Junction · Weather: Clear, Dry Asphalt</tspan></text>

      <!-- Collision Sketch Diagram Box -->
      <g transform="translate(30, 130)">
        <rect width="520" height="370" rx="6" fill="#111827" stroke="#334155" stroke-width="1.5"/>
        <text x="20" y="30" fill="#94a3b8" font-size="12" font-weight="bold">FORENSIC ACCIDENT SKETCH &amp; IMPACT VECTOR MAP:</text>
        
        <!-- Road Layout -->
        <rect x="40" y="60" width="440" height="120" fill="#1f2937" stroke="#475569" stroke-width="1"/>
        <line x1="40" y1="120" x2="480" y2="120" stroke="#facc15" stroke-width="2" stroke-dasharray="12 8"/>
        <line x1="260" y1="180" x2="260" y2="340" stroke="#475569" stroke-width="1"/>
        <line x1="310" y1="180" x2="310" y2="340" stroke="#475569" stroke-width="1"/>
        
        <!-- Vehicle A (Insured) -->
        <rect x="180" y="80" width="75" height="42" rx="4" fill="#1d4ed8" stroke="#60a5fa" stroke-width="2"/>
        <text x="217" y="105" fill="#ffffff" font-size="10" text-anchor="middle" font-weight="bold">VEH-A (INS)</text>
        <line x1="255" y1="101" x2="300" y2="101" stroke="#ef4444" stroke-width="2"/>

        <!-- Vehicle B (Third Party) -->
        <rect x="300" y="90" width="70" height="40" rx="4" fill="#b91c1c" stroke="#f87171" stroke-width="2"/>
        <text x="335" y="114" fill="#ffffff" font-size="10" text-anchor="middle" font-weight="bold">VEH-B</text>

        <!-- Impact Point Star -->
        <circle cx="277" cy="101" r="14" fill="#ef4444" fill-opacity="0.4" stroke="#ef4444" stroke-width="2"/>
        <text x="277" y="105" fill="#fef08a" font-size="10" text-anchor="middle" font-weight="bold">IMPACT</text>

        <!-- Annotations -->
        <rect x="20" y="210" width="220" height="140" rx="4" fill="#0f172a" stroke="#3b82f6" stroke-width="1"/>
        <text x="30" y="232" fill="#60a5fa" font-size="11" font-weight="bold">VEHICLE A DETAILS (CLAIMANT):</text>
        <text x="30" y="252" fill="#cbd5e1" font-size="10.5">Reg: <tspan fill="#f8fafc" font-weight="bold">KA-01-MJ-8821</tspan></text>
        <text x="30" y="270" fill="#cbd5e1" font-size="10.5">VIN: <tspan fill="#f8fafc">MA3EWFB1S0029182</tspan></text>
        <text x="30" y="288" fill="#cbd5e1" font-size="10.5">DL: <tspan fill="#f8fafc">DL-0420110029381 (Valid)</tspan></text>
        <text x="30" y="306" fill="#cbd5e1" font-size="10.5">Impact: Front-Right Quarter Panel</text>
        <text x="30" y="324" fill="#22c55e" font-size="10.5">Alcohol BAC Test: 0.00% (Clean)</text>

        <!-- Skid Mark Measurement -->
        <line x1="120" y1="101" x2="180" y2="101" stroke="#f97316" stroke-width="2" stroke-dasharray="4 2"/>
        <text x="150" y="94" fill="#f97316" font-size="9" text-anchor="middle">Skid: 8.4m</text>
      </g>

      <!-- Legal Summary & Signature Block -->
      <g transform="translate(565, 130)">
        <rect width="310" height="370" rx="6" fill="#111827" stroke="#334155" stroke-width="1.5"/>
        <text x="15" y="28" fill="#f8fafc" font-size="12" font-weight="bold">POLICE OFFICER FINDINGS:</text>
        <rect x="15" y="40" width="280" height="150" rx="4" fill="#1e293b"/>
        <text x="25" y="60" fill="#94a3b8" font-size="10.5">Statement: Driver of Veh-B made</text>
        <text x="25" y="78" fill="#94a3b8" font-size="10.5">an abrupt lane ingress without</text>
        <text x="25" y="96" fill="#94a3b8" font-size="10.5">indicator. Veh-A applied brakes</text>
        <text x="25" y="114" fill="#94a3b8" font-size="10.5">promptly as verified by skid trace.</text>
        <text x="25" y="134" fill="#22c55e" font-size="11" font-weight="bold">Primary Liability: Vehicle B</text>
        <text x="25" y="152" fill="#60a5fa" font-size="10">No contributory negligence by Veh-A</text>

        <!-- Station Seal Stamp -->
        <rect x="25" y="210" width="260" height="140" rx="6" fill="#1e293b" stroke="#1d4ed8" stroke-width="1.5"/>
        <circle cx="155" cy="265" r="35" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="6 3"/>
        <text x="155" y="260" fill="#3b82f6" font-size="9.5" text-anchor="middle" font-weight="bold">STATE TRAFFIC POLICE</text>
        <text x="155" y="274" fill="#60a5fa" font-size="8.5" text-anchor="middle">FORENSIC VERIFIED</text>
        <text x="155" y="325" fill="#94a3b8" font-size="10" text-anchor="middle">Sub-Inspector Investigating Officer #481</text>
      </g>

      <!-- Footer Bar -->
      <rect x="25" y="520" width="850" height="85" rx="6" fill="#1e293b" stroke="#3b82f6" stroke-width="1"/>
      <text x="45" y="548" fill="#60a5fa" font-size="12" font-weight="bold">EVIDENCE ATTACHMENT: 3_FIR_PoliceAccidentReport.pdf</text>
      <text x="45" y="570" fill="#e2e8f0" font-size="11">CERTIFIED FORENSIC RECORD · SHA-256: 9b2d84f1a238e017 · CROSS-REFERENCED WITH 4_DrivingLicence.pdf &amp; 5_RC.pdf</text>
      <text x="45" y="590" fill="#94a3b8" font-size="10.5">Ready for Filerobot Redline Annotation: Draw impact callouts, highlight IPC sections, or add surveyor stamps.</text>
    </svg>`
  },
  {
    id: 'repair-damage-estimate',
    name: 'Bodyshop Repair Estimate',
    partNumber: '7_RepairEstimate.pdf',
    spec: 'Authorized Bodyshop Appraisal · Repair Worksheet EST-2026-4412',
    description: 'Itemized parts replacement and labor repair worksheet with OEM part numbers, metal/plastic depreciation schedules, and salvage deductions.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650" style="background:#090d16;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">
      <rect width="900" height="650" fill="#090d16"/>
      <!-- Header -->
      <rect x="25" y="25" width="850" height="85" rx="6" fill="#111827" stroke="#10b981" stroke-width="1.5"/>
      <text x="45" y="55" fill="#10b981" font-size="15" font-weight="bold">PREMIER COLLISION REPAIR CENTER · DAMAGE APPRAISAL WORKSHEET</text>
      <text x="45" y="78" fill="#94a3b8" font-size="11.5">ESTIMATE NO: <tspan fill="#f1f5f9" font-weight="bold">EST-2026-4412</tspan> · VEHICLE: <tspan fill="#38bdf8">2023 Sedan 1.5L Turbo (KA-01-MJ-8821)</tspan> · DATE: <tspan fill="#f1f5f9">2026-01-14</tspan></text>
      <text x="45" y="96" fill="#94a3b8" font-size="11">INSURANCE CLAIM NO: <tspan fill="#a7f3d0">CLM-2026-8812</tspan> · POLICY: <tspan fill="#a7f3d0">Allied Global Gold Private Car Comprehensive</tspan></text>

      <!-- Table Header -->
      <rect x="25" y="125" width="850" height="35" rx="4" fill="#1e293b"/>
      <text x="40" y="147" fill="#64748b" font-size="11" font-weight="bold">LINE</text>
      <text x="90" y="147" fill="#64748b" font-size="11" font-weight="bold">PART DESCRIPTION / OPERATION</text>
      <text x="380" y="147" fill="#64748b" font-size="11" font-weight="bold">OEM PART #</text>
      <text x="520" y="147" fill="#64748b" font-size="11" font-weight="bold">PART ($)</text>
      <text x="630" y="147" fill="#64748b" font-size="11" font-weight="bold">LABOR (HRS)</text>
      <text x="760" y="147" fill="#64748b" font-size="11" font-weight="bold">NET TOTAL</text>

      <!-- Line Items -->
      <g transform="translate(25, 165)">
        <!-- Row 1 -->
        <rect x="0" y="0" width="850" height="38" fill="#111827"/>
        <text x="15" y="24" fill="#94a3b8" font-size="11">01</text>
        <text x="65" y="24" fill="#f8fafc" font-size="11.5" font-weight="bold">Front Bumper Cover Fascia (Replace)</text>
        <text x="355" y="24" fill="#a5b4fc" font-size="11">71101-TBA-A00ZA</text>
        <text x="495" y="24" fill="#f8fafc" font-size="11.5">$385.00</text>
        <text x="605" y="24" fill="#cbd5e1" font-size="11.5">2.5 hrs ($137.50)</text>
        <text x="735" y="24" fill="#34d399" font-size="11.5" font-weight="bold">$522.50</text>
        <line x1="0" y1="38" x2="850" y2="38" stroke="#1e293b" stroke-width="1"/>

        <!-- Row 2 -->
        <rect x="0" y="40" width="850" height="38" fill="#0f172a"/>
        <text x="15" y="64" fill="#94a3b8" font-size="11">02</text>
        <text x="65" y="64" fill="#f8fafc" font-size="11.5" font-weight="bold">Right Headlamp LED Assembly (Replace)</text>
        <text x="355" y="64" fill="#a5b4fc" font-size="11">33100-TBA-A11</text>
        <text x="495" y="64" fill="#f8fafc" font-size="11.5">$620.00</text>
        <text x="605" y="64" fill="#cbd5e1" font-size="11.5">1.2 hrs ($66.00)</text>
        <text x="735" y="64" fill="#34d399" font-size="11.5" font-weight="bold">$686.00</text>
        <line x1="0" y1="78" x2="850" y2="78" stroke="#1e293b" stroke-width="1"/>

        <!-- Row 3 -->
        <rect x="0" y="80" width="850" height="38" fill="#111827"/>
        <text x="15" y="104" fill="#94a3b8" font-size="11">03</text>
        <text x="65" y="104" fill="#f8fafc" font-size="11.5" font-weight="bold">Radiator Support &amp; Condenser Core (Replace)</text>
        <text x="355" y="104" fill="#a5b4fc" font-size="11">71140-TBA-A00</text>
        <text x="495" y="104" fill="#f8fafc" font-size="11.5">$410.00</text>
        <text x="605" y="104" fill="#cbd5e1" font-size="11.5">3.5 hrs ($192.50)</text>
        <text x="735" y="104" fill="#34d399" font-size="11.5" font-weight="bold">$602.50</text>
        <line x1="0" y1="118" x2="850" y2="118" stroke="#1e293b" stroke-width="1"/>

        <!-- Row 4 -->
        <rect x="0" y="120" width="850" height="38" fill="#0f172a"/>
        <text x="15" y="144" fill="#94a3b8" font-size="11">04</text>
        <text x="65" y="144" fill="#f8fafc" font-size="11.5" font-weight="bold">Right Fender Sheetmetal Panel (Repair &amp; Paint)</text>
        <text x="355" y="144" fill="#a5b4fc" font-size="11">60211-TBA-A00ZZ</text>
        <text x="495" y="144" fill="#f8fafc" font-size="11.5">$180.00</text>
        <text x="605" y="144" fill="#cbd5e1" font-size="11.5">4.0 hrs ($220.00)</text>
        <text x="735" y="144" fill="#34d399" font-size="11.5" font-weight="bold">$400.00</text>
        <line x1="0" y1="158" x2="850" y2="158" stroke="#1e293b" stroke-width="1"/>

        <!-- Row 5 (Paint Booth) -->
        <rect x="0" y="160" width="850" height="38" fill="#111827"/>
        <text x="15" y="184" fill="#94a3b8" font-size="11">05</text>
        <text x="65" y="184" fill="#f8fafc" font-size="11.5" font-weight="bold">Base Coat / Clear Coat 3-Stage Refinish</text>
        <text x="355" y="184" fill="#a5b4fc" font-size="11">PAINT-SYS-PPG</text>
        <text x="495" y="184" fill="#f8fafc" font-size="11.5">$180.00</text>
        <text x="605" y="184" fill="#cbd5e1" font-size="11.5">3.0 hrs ($165.00)</text>
        <text x="735" y="184" fill="#34d399" font-size="11.5" font-weight="bold">$345.00</text>
        <line x1="0" y1="198" x2="850" y2="198" stroke="#1e293b" stroke-width="1"/>

        <!-- Row 6 (Consumables) -->
        <rect x="0" y="200" width="850" height="38" fill="#0f172a"/>
        <text x="15" y="224" fill="#94a3b8" font-size="11">06</text>
        <text x="65" y="224" fill="#f8fafc" font-size="11.5" font-weight="bold">Shop Supplies, Fasteners, Clip Kit &amp; Coolant</text>
        <text x="355" y="224" fill="#a5b4fc" font-size="11">HARDWARE-KIT</text>
        <text x="495" y="224" fill="#f8fafc" font-size="11.5">$95.00</text>
        <text x="605" y="224" fill="#cbd5e1" font-size="11.5">0.5 hrs ($27.50)</text>
        <text x="735" y="224" fill="#34d399" font-size="11.5" font-weight="bold">$122.50</text>
      </g>

      <!-- Totals & Surveyor Sign-Off Box -->
      <g transform="translate(25, 435)">
        <rect width="850" height="170" rx="6" fill="#111827" stroke="#10b981" stroke-width="1"/>
        <rect x="520" y="15" width="310" height="140" rx="4" fill="#064e3b" fill-opacity="0.2" stroke="#059669" stroke-width="1"/>
        <text x="540" y="42" fill="#a7f3d0" font-size="12">Gross Total Parts: <tspan fill="#f8fafc" font-weight="bold">$1,870.00</tspan></text>
        <text x="540" y="65" fill="#a7f3d0" font-size="12">Gross Labor &amp; Paint: <tspan fill="#f8fafc" font-weight="bold">$808.50</tspan></text>
        <text x="540" y="88" fill="#fca5a5" font-size="12">Compulsory Policy Deductible: <tspan fill="#ef4444" font-weight="bold">-$150.00</tspan></text>
        <line x1="535" y1="102" x2="815" y2="102" stroke="#10b981" stroke-width="1"/>
        <text x="540" y="130" fill="#34d399" font-size="15" font-weight="bold">NET CLAIM PAYABLE: $2,528.50</text>

        <text x="25" y="45" fill="#f8fafc" font-size="12" font-weight="bold">SURVEYOR REMARKS &amp; ASSESSMENT:</text>
        <text x="25" y="70" fill="#94a3b8" font-size="11">Damage consistent with single front-right impact described in FIR # FIR-2026-0914.</text>
        <text x="25" y="90" fill="#94a3b8" font-size="11">No preexisting structural corrosion. Radiator replaced per OEM crash-safety directive.</text>
        <text x="25" y="115" fill="#22c55e" font-size="11.5" font-weight="bold">SURVEYOR RECOMMENDATION: APPROVED FOR CLAIM SETTLEMENT</text>
        <text x="25" y="135" fill="#94a3b8" font-size="10.5">Insurance Surveyor License # IRDA/SURV/2026/8192 · Digitally Signed</text>
      </g>
    </svg>`
  },
  {
    id: 'forensic-crash-photo',
    name: 'Accident Evidence & Damage Survey',
    partNumber: '6_AccidentEvidence.pdf',
    spec: 'Photographic Damage Photogrammetry · Incident Scene Evidence',
    description: 'High-resolution frontal crash evidence survey with collision impact vectors, panel crush measurements, and forensic annotations.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650" style="background:#090d16;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">
      <rect width="900" height="650" fill="#090d16"/>
      <!-- Photo Viewport Frame -->
      <rect x="25" y="25" width="850" height="500" rx="8" fill="#111827" stroke="#e11d48" stroke-width="2"/>
      
      <!-- Vehicle Front Contour Graphic -->
      <g transform="translate(140, 70)">
        <!-- Vehicle Hood & Grille Profile -->
        <polygon points="50,120 180,60 400,60 530,120 540,280 40,280" fill="#1f2937" stroke="#475569" stroke-width="2.5"/>
        <rect x="180" y="160" width="220" height="90" rx="6" fill="#030712" stroke="#64748b" stroke-width="1.5"/>
        <line x1="180" y1="190" x2="400" y2="190" stroke="#334155" stroke-width="1"/>
        <line x1="180" y1="220" x2="400" y2="220" stroke="#334155" stroke-width="1"/>

        <!-- Left Headlamp (Intact) -->
        <polygon points="70,140 160,150 150,210 65,190" fill="#047857" fill-opacity="0.4" stroke="#10b981" stroke-width="2"/>
        <text x="105" y="180" fill="#34d399" font-size="10" text-anchor="middle" font-weight="bold">INTACT (OK)</text>

        <!-- Right Headlamp & Bumper (CRUSHED / IMPACT ZONE) -->
        <polygon points="420,150 515,140 500,240 405,250" fill="#881337" fill-opacity="0.6" stroke="#f43f5e" stroke-width="3"/>
        <line x1="430" y1="160" x2="495" y2="230" stroke="#ef4444" stroke-width="2"/>
        <line x1="480" y1="160" x2="420" y2="220" stroke="#ef4444" stroke-width="2"/>
        <text x="460" y="195" fill="#fecdd3" font-size="11" text-anchor="middle" font-weight="bold">SHATTERED</text>

        <!-- Deformed Bumper Line -->
        <path d="M 40,280 Q 200,290 350,290 Q 450,330 520,350" fill="none" stroke="#ef4444" stroke-width="4" stroke-dasharray="8 4"/>

        <!-- Impact Callout 1 -->
        <circle cx="475" cy="275" r="16" fill="#e11d48" fill-opacity="0.4" stroke="#fb7185" stroke-width="2"/>
        <line x1="495" y1="275" x2="580" y2="240" stroke="#fb7185" stroke-width="1.5"/>
        <rect x="580" y="220" width="200" height="50" rx="4" fill="#0f172a" stroke="#e11d48" stroke-width="1"/>
        <text x="590" y="240" fill="#f43f5e" font-size="11" font-weight="bold">PRIMARY IMPACT ZONE</text>
        <text x="590" y="258" fill="#94a3b8" font-size="10">Crush Depth: 145mm inward</text>

        <!-- Measurement Tape -->
        <line x1="40" y1="380" x2="520" y2="380" stroke="#facc15" stroke-width="2"/>
        <text x="280" y="372" fill="#facc15" font-size="11" text-anchor="middle" font-weight="bold">FRONTAL SPAN: 1,820 mm</text>
      </g>

      <!-- Forensic EXIF Watermark -->
      <rect x="40" y="40" width="340" height="75" rx="4" fill="#030712" fill-opacity="0.8" stroke="#374151" stroke-width="1"/>
      <text x="55" y="62" fill="#f43f5e" font-size="11" font-weight="bold">FORENSIC EXIF METADATA VERIFIED:</text>
      <text x="55" y="80" fill="#cbd5e1" font-size="10">Capture Time: 2026-01-12 15:12:44 IST (GPS Synced)</text>
      <text x="55" y="98" fill="#cbd5e1" font-size="10">Camera: Sony IMX Sensor · Lat 12.9716° N, Lon 77.5946° E</text>

      <!-- Evidence Description Footer -->
      <rect x="25" y="540" width="850" height="85" rx="6" fill="#111827" stroke="#e11d48" stroke-width="1"/>
      <text x="45" y="568" fill="#f43f5e" font-size="13" font-weight="bold">DAMAGE APPRAISAL EVIDENCE: 6_AccidentEvidence.pdf</text>
      <text x="45" y="590" fill="#e2e8f0" font-size="11">Reconciles 100% with Bodyshop Estimate EST-2026-4412 (Line 01 Bumper &amp; Line 02 Right Headlamp Replacement).</text>
      <text x="45" y="608" fill="#94a3b8" font-size="10.5">Use Filerobot to annotate damage callouts, redline impact vectors, or circle micro-fractures.</text>
    </svg>`
  }
]

export const SOFTWARE_TEMPLATES: CadDrawingTemplate[] = [
  {
    id: 'microservices-arch',
    name: 'Distributed Microservices AST Architecture',
    partNumber: 'ARCH-SERVICES-0147',
    spec: 'FastMCP · DuckDB · PostgreSQL · BuLLSav ClamAV & Repel',
    description: 'System architectural blueprint of distributed microservices, dual-engine threat perimeter, AST parser, and WebSocket telemetry stream.',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="650" viewBox="0 0 900 650" style="background:#090d16;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">
      <rect width="900" height="650" fill="#090d16"/>
      <rect x="25" y="25" width="850" height="590" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="45" y="60" fill="#38bdf8" font-size="15" font-weight="bold">BAM DISTRIBUTED MICROSERVICES &amp; SECURE PIPELINE TOPOLOGY</text>

      <!-- Client Tier -->
      <rect x="50" y="100" width="200" height="180" rx="6" fill="#1e293b" stroke="#60a5fa" stroke-width="1.5"/>
      <text x="65" y="130" fill="#60a5fa" font-size="12" font-weight="bold">CLIENT &amp; INTAKE</text>
      <rect x="65" y="150" width="170" height="40" rx="4" fill="#0f172a"/>
      <text x="75" y="175" fill="#f8fafc" font-size="11">Browser Cockpit UI</text>
      <rect x="65" y="205" width="170" height="40" rx="4" fill="#0f172a"/>
      <text x="75" y="230" fill="#f8fafc" font-size="11">OOMOL Action Gateway</text>

      <!-- Security Perimeter -->
      <rect x="330" y="100" width="240" height="180" rx="6" fill="#1e1b4b" stroke="#a855f7" stroke-width="1.5"/>
      <text x="345" y="130" fill="#c084fc" font-size="12" font-weight="bold">DUAL-ENGINE DEFENSE</text>
      <rect x="345" y="150" width="210" height="40" rx="4" fill="#0f172a"/>
      <text x="355" y="175" fill="#f8fafc" font-size="11">BuLLSav ClamAV (Static)</text>
      <rect x="345" y="205" width="210" height="40" rx="4" fill="#0f172a"/>
      <text x="355" y="230" fill="#f8fafc" font-size="11">Repel Heuristic Evasion</text>

      <!-- Knowledge & Storage Tier -->
      <rect x="630" y="100" width="220" height="180" rx="6" fill="#064e3b" stroke="#10b981" stroke-width="1.5"/>
      <text x="645" y="130" fill="#34d399" font-size="12" font-weight="bold">GRAPHRAG &amp; PERSIST</text>
      <rect x="645" y="150" width="190" height="40" rx="4" fill="#0f172a"/>
      <text x="655" y="175" fill="#f8fafc" font-size="11">Cognee LanceDB Vector</text>
      <rect x="645" y="205" width="190" height="40" rx="4" fill="#0f172a"/>
      <text x="655" y="230" fill="#f8fafc" font-size="11">PostgreSQL JSONB Enclave</text>

      <!-- Execution Pipeline Box -->
      <rect x="50" y="320" width="800" height="170" rx="6" fill="#111827" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="70" y="350" fill="#f59e0b" font-size="13" font-weight="bold">ISATVON 1.4 SELF-CORRECTING EXECUTION LOOP</text>
      
      <rect x="70" y="375" width="220" height="85" rx="4" fill="#1e293b"/>
      <text x="85" y="405" fill="#f1f5f9" font-size="11.5" font-weight="bold">Action Tool (Worker Pool)</text>
      <text x="85" y="425" fill="#94a3b8" font-size="10.5">AST Generation &amp; AST Parse</text>
      <text x="85" y="445" fill="#60a5fa" font-size="10">DuckDB + FastMCP</text>

      <line x1="290" y1="417" x2="330" y2="417" stroke="#f59e0b" stroke-width="2"/>

      <rect x="330" y="375" width="220" height="85" rx="4" fill="#1e293b"/>
      <text x="345" y="405" fill="#f1f5f9" font-size="11.5" font-weight="bold">Fixed Check Tool (Gate)</text>
      <text x="345" y="425" fill="#94a3b8" font-size="10.5">Preflight Grounding &amp; Sufficiency</text>
      <text x="345" y="445" fill="#10b981" font-size="10">&gt;= 80% Context Sufficiency</text>

      <line x1="550" y1="417" x2="590" y2="417" stroke="#f59e0b" stroke-width="2"/>

      <rect x="590" y="375" width="240" height="85" rx="4" fill="#1e293b"/>
      <text x="605" y="405" fill="#f1f5f9" font-size="11.5" font-weight="bold">HITL Governance Release</text>
      <text x="605" y="425" fill="#94a3b8" font-size="10.5">Cryptographic Signature Hash</text>
      <text x="605" y="445" fill="#a855f7" font-size="10">Promote to Sandbox</text>

      <!-- Footer Bar -->
      <rect x="50" y="515" width="800" height="75" rx="6" fill="#1e293b"/>
      <text x="70" y="542" fill="#38bdf8" font-size="11.5" font-weight="bold">SECURITY BOUNDARY: Zero unverified bytes enter Cognee GraphRAG</text>
      <text x="70" y="565" fill="#94a3b8" font-size="10.5">FastMCP agents execute in isolated MicroVM sandbox with 120s timeout and fail-closed security policy.</text>
    </svg>`
  }
]

export const ALL_DOCUMENT_TEMPLATES: CadDrawingTemplate[] = [
  ...CLAIMS_TEMPLATES,
  ...CAD_TEMPLATES,
  ...SOFTWARE_TEMPLATES,
]

export function getDocumentTemplates(files: string[] = []): CadDrawingTemplate[] {
  const isClaims = files.some(f => /claim|policy|fir|police|accident|licen[cs]e|vehicle|damage|repair|estimate|surveyor/i.test(f))
  const isCad = files.some(f => /\.(step|stp|cad|dwg)$/i.test(f) || /bracket|housing/i.test(f))
  const isSoftware = files.some(f => /\.(zip|py|ts|sh|json)$/i.test(f) || /django|scanner|flow|microservice/i.test(f))

  if (isClaims) {
    return [...CLAIMS_TEMPLATES, ...CAD_TEMPLATES, ...SOFTWARE_TEMPLATES]
  } else if (isCad) {
    return [...CAD_TEMPLATES, ...CLAIMS_TEMPLATES, ...SOFTWARE_TEMPLATES]
  } else if (isSoftware) {
    return [...SOFTWARE_TEMPLATES, ...CLAIMS_TEMPLATES, ...CAD_TEMPLATES]
  }
  return ALL_DOCUMENT_TEMPLATES
}

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
