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

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
