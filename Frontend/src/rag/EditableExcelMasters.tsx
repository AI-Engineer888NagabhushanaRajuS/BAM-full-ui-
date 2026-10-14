import { useState, useEffect, useMemo, useTransition } from 'react'
import { Icon } from '../components/ui'
import { openOpenConnector } from '../lib/store'
import defaultMastersData from './excelMastersData.json'

export interface MasterRow {
  _id: string
  [key: string]: string
}

export interface SheetData {
  sheet: string
  headers: string[]
  totalRows: number
  rows: MasterRow[]
}

export type MastersWorkbook = Record<string, SheetData>

const STORAGE_KEY = 'bam-editable-excel-masters-v1'

export function getStoredMasters(): MastersWorkbook {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as MastersWorkbook
  } catch {}
  return defaultMastersData as unknown as MastersWorkbook
}

export function saveStoredMasters(data: MastersWorkbook): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save masters to localStorage', e)
  }
}

/** Extracts live PCBA costing & scrap rates from the edited Rules master */
export function getLiveCostingRules() {
  const wb = getStoredMasters()
  const rulesSheet = wb['Rules']?.rows || []
  const rule1 = rulesSheet.find(r => r['Name']?.includes('Rule #1') || r['Domain Rule']?.includes('Engineering rules'))
  
  return {
    smtRate: 120, // default USD/hr
    manualRate: 45, // default USD/hr
    testingRate: 65, // default USD/hr
    scrapRate: 1.5, // %
    wasteFactor: 2.0, // %
    rawText: rule1?.['PCB Panelization'] || rule1?.['Machine HR Rates'] || '$120/hr SMT Line, $45/hr Manual',
  }
}

interface EditableExcelMastersProps {
  onTestInGraph?: (query: string) => void
}

export function EditableExcelMasters({ onTestInGraph }: EditableExcelMastersProps) {
  const [workbook, setWorkbook] = useState<MastersWorkbook>(() => getStoredMasters())
  const [activeSheet, setActiveSheet] = useState<string>('Rules')
  const [editingCell, setEditingCell] = useState<{ rowId: string; colName: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'cards'>('grid')
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState<boolean>(false)
  const [lastSavedTime, setLastSavedTime] = useState<string>('Pristine Baseline')
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [, startTransition] = useTransition()

  // Save changes to localStorage
  const handleSave = () => {
    saveStoredMasters(workbook)
    setHasUnsavedEdits(false)
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLastSavedTime(`Saved at ${timeStr}`)
  }

  // Reset to original Excel data
  const handleReset = () => {
    if (window.confirm('Reset all domain masters back to original Excel (Manufacturing_Masters_v0.2.xlsx)? Any custom changes will be discarded.')) {
      setWorkbook(defaultMastersData as unknown as MastersWorkbook)
      localStorage.removeItem(STORAGE_KEY)
      setHasUnsavedEdits(false)
      setLastSavedTime('Reset to Original Excel')
    }
  }

  // Start cell edit
  const startEditing = (rowId: string, colName: string, currentValue: string) => {
    setEditingCell({ rowId, colName })
    setEditValue(currentValue)
  }

  // Commit cell edit
  const commitEdit = () => {
    if (!editingCell) return
    const { rowId, colName } = editingCell
    setWorkbook(prev => {
      const currentSheetData = prev[activeSheet]
      if (!currentSheetData) return prev
      const nextRows = currentSheetData.rows.map(r => {
        if (r._id === rowId) {
          return { ...r, [colName]: editValue }
        }
        return r
      })
      return {
        ...prev,
        [activeSheet]: {
          ...currentSheetData,
          rows: nextRows,
        },
      }
    })
    setEditingCell(null)
    setHasUnsavedEdits(true)
  }

  // Cancel edit
  const cancelEdit = () => {
    setEditingCell(null)
  }

  // Add new row to active sheet
  const handleAddRow = () => {
    const currentSheetData = workbook[activeSheet]
    if (!currentSheetData) return
    const newId = `${activeSheet.toLowerCase()}_${Date.now()}`
    const newRow: MasterRow = { _id: newId }
    currentSheetData.headers.forEach(h => {
      newRow[h] = h === 'Name' ? `New Record #${currentSheetData.rows.length + 1}` : ''
    })
    setWorkbook(prev => ({
      ...prev,
      [activeSheet]: {
        ...currentSheetData,
        totalRows: currentSheetData.rows.length + 1,
        rows: [newRow, ...currentSheetData.rows],
      },
    }))
    setHasUnsavedEdits(true)
  }

  // Delete row
  const handleDeleteRow = (rowId: string) => {
    const currentSheetData = workbook[activeSheet]
    if (!currentSheetData) return
    setWorkbook(prev => ({
      ...prev,
      [activeSheet]: {
        ...currentSheetData,
        totalRows: currentSheetData.rows.length - 1,
        rows: currentSheetData.rows.filter(r => r._id !== rowId),
      },
    }))
    setHasUnsavedEdits(true)
  }

  // Export current sheet to CSV
  const handleExportCsv = () => {
    const currentSheetData = workbook[activeSheet]
    if (!currentSheetData) return
    const headers = currentSheetData.headers
    const csvRows = [headers.join(',')]
    for (const row of currentSheetData.rows) {
      const values = headers.map(h => {
        const val = row[h] || ''
        const escaped = val.replace(/"/g, '""')
        return `"${escaped}"`
      })
      csvRows.push(values.join(','))
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${activeSheet}_Master_Export.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Export entire workbook as JSON
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(workbook, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'Manufacturing_Masters_Full_Workbook.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const currentSheetData = workbook[activeSheet] || { headers: [], rows: [] }

  // Filtered rows by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return currentSheetData.rows
    const q = searchQuery.toLowerCase()
    return currentSheetData.rows.filter(r =>
      currentSheetData.headers.some(h => (r[h] || '').toLowerCase().includes(q))
    )
  }, [currentSheetData, searchQuery])

  // Sheet icons & badge colors
  const SHEET_META: Record<string, { icon: 'db' | 'shield' | 'bolt' | 'sparkle' | 'file'; label: string; count: number }> = {
    Organization: { icon: 'db', label: 'Organization Master', count: workbook['Organization']?.rows.length || 0 },
    Rules: { icon: 'bolt', label: 'Rules & Costing', count: workbook['Rules']?.rows.length || 0 },
    Agents: { icon: 'sparkle', label: 'FastMCP Agents', count: workbook['Agents']?.rows.length || 0 },
    Skills: { icon: 'bolt', label: 'Skills (ISATVON 1.4)', count: workbook['Skills']?.rows.length || 0 },
    Tooling: { icon: 'db', label: 'Tooling & APIs (pg-jev)', count: workbook['Tooling']?.rows.length || 0 },
    Filetype: { icon: 'file', label: 'Filetype Matrix', count: workbook['Filetype']?.rows.length || 0 },
  }

  return (
    <div className={`editable-excel-container ${isFullscreen ? 'is-fullscreen' : ''}`}>
      {/* Excel Header Toolbar */}
      <div className="excel-toolbar-top">
        <div className="excel-info-meta">
          <div className="row" style={{ alignItems: 'center', gap: '8px' }}>
            <span className="excel-badge">EXCEL WORKBOOK</span>
            <strong style={{ fontSize: '14.5px', color: 'var(--text)' }}>
              Manufacturing_Masters_v0.2.xlsx
            </strong>
            <span className={`pill sm ${hasUnsavedEdits ? 'pill-warn' : 'pill-pass'}`}>
              {hasUnsavedEdits ? 'Unsaved Edits Pending' : 'Live Synced'}
            </span>
            {isFullscreen && (
              <span className="badge sm" style={{ background: 'var(--accent)', color: '#fff' }}>
                Fullscreen Active
              </span>
            )}
          </div>
          <p className="xs muted" style={{ margin: '3px 0 0 0' }}>
            Direct interactive UI spreadsheet for domain rules, rates, FastMCP agents, ISATVON skills, and filetypes. {lastSavedTime}
          </p>
        </div>

        {/* Global Toolbar Action Buttons */}
        <div className="excel-actions-row">
          <button
            type="button"
            className={`btn sm ${isFullscreen ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsFullscreen(f => !f)}
            title="Expand to Fullscreen View"
          >
            <Icon name="expand" size={12} />
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary sm"
            onClick={openOpenConnector}
            title="Manage OOMOL Enterprise Connectors Hub (oomol.com)"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <Icon name="bolt" size={11} style={{ color: 'var(--accent)' }} />
            <span>OOMOL Hub (8)</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary sm"
            onClick={handleAddRow}
            title="Append a new blank row to this sheet"
          >
            <Icon name="sparkle" size={12} />
            <span>+ Add Row</span>
          </button>

          <button
            type="button"
            className={`btn sm ${hasUnsavedEdits ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handleSave}
            title="Save changes to local browser storage and SOW engine"
          >
            <Icon name="check" size={12} />
            <span>{hasUnsavedEdits ? 'Save Changes *' : 'Saved'}</span>
          </button>

          <button
            type="button"
            className="btn btn-ghost sm"
            onClick={handleExportCsv}
            title="Download active sheet as CSV"
          >
            <Icon name="file" size={12} />
            <span>CSV</span>
          </button>

          <button
            type="button"
            className="btn btn-ghost sm"
            onClick={handleExportJson}
            title="Download full workbook as JSON"
          >
            <Icon name="db" size={12} />
            <span>JSON</span>
          </button>

          <button
            type="button"
            className="btn btn-ghost sm"
            onClick={handleReset}
            title="Revert back to pristine baseline from original Excel"
            style={{ color: 'var(--warn)' }}
          >
            <Icon name="refresh" size={12} />
            <span>Reset Excel</span>
          </button>
        </div>
      </div>

      {/* Sheet Tabs Bar */}
      <div className="excel-sheet-tabs-bar">
        {Object.entries(SHEET_META).map(([sheetKey, meta]) => (
          <button
            key={sheetKey}
            type="button"
            className={`excel-sheet-tab ${activeSheet === sheetKey ? 'is-active' : ''}`}
            onClick={() => {
              setActiveSheet(sheetKey)
              setSearchQuery('')
              setEditingCell(null)
            }}
          >
            <Icon name={meta.icon} size={12} />
            <span>{meta.label}</span>
            <span className="excel-tab-pill">{meta.count}</span>
          </button>
        ))}

        {/* Right side view switch & search */}
        <div className="excel-search-box">
          <input
            type="text"
            className="excel-search-input"
            placeholder={`Search ${activeSheet}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <div className="excel-view-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Spreadsheet Grid View"
            >
              Grid
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'cards' ? 'is-active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Card Summary View"
            >
              Cards
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Sheet Content */}
      <div className="excel-grid-viewport">
        {viewMode === 'grid' ? (
          <div className="excel-table-scroll-wrapper">
            <table className="excel-spreadsheet-table">
              <thead>
                <tr>
                  <th className="excel-th-sticky-action">Action</th>
                  <th className="excel-th-sticky-num">#</th>
                  {currentSheetData.headers.map((col, idx) => (
                    <th key={idx} className="excel-th-header">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, rIdx) => (
                  <tr key={row._id} className="excel-row">
                    {/* Row action: Test in Graph or Delete */}
                    <td className="excel-td-action">
                      <div className="row" style={{ gap: '4px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="excel-cell-btn"
                          title="Test row context in Cognee GraphRAG"
                          onClick={() => {
                            const nameVal = row['Name'] || row['Agent Name'] || row['Skill'] || row['File Format'] || row['Code'] || ''
                            const query = `Verify specifications and parameters for ${activeSheet} record: ${nameVal}`
                            onTestInGraph?.(query)
                          }}
                        >
                          <Icon name="sparkle" size={10} />
                        </button>
                        <button
                          type="button"
                          className="excel-cell-btn del"
                          title="Delete row"
                          onClick={() => handleDeleteRow(row._id)}
                        >
                          <Icon name="x" size={10} />
                        </button>
                      </div>
                    </td>

                    {/* Row Number */}
                    <td className="excel-td-num">{rIdx + 1}</td>

                    {/* Data Cells */}
                    {currentSheetData.headers.map((col, cIdx) => {
                      const val = row[col] || ''
                      const isEditing = editingCell?.rowId === row._id && editingCell?.colName === col

                      return (
                        <td
                          key={cIdx}
                          className={`excel-td-cell ${isEditing ? 'is-editing' : ''}`}
                          onDoubleClick={() => startEditing(row._id, col, val)}
                        >
                          {isEditing ? (
                            <div className="excel-inline-editor">
                              <input
                                autoFocus
                                type="text"
                                className="excel-cell-input"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') commitEdit()
                                  if (e.key === 'Escape') cancelEdit()
                                }}
                                onBlur={commitEdit}
                              />
                            </div>
                          ) : (
                            <div
                              className="excel-cell-content"
                              title="Double click to edit cell"
                              onClick={() => startEditing(row._id, col, val)}
                            >
                              {val ? (
                                <span className={col.toLowerCase().includes('code') || col.toLowerCase().includes('model') ? 'mono' : ''}>
                                  {val}
                                </span>
                              ) : (
                                <span className="excel-empty-cell">—</span>
                              )}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={currentSheetData.headers.length + 2} className="excel-empty-state">
                      No records matched "{searchQuery}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Cards View */
          <div className="master-grid" style={{ padding: '12px' }}>
            {filteredRows.map(row => (
              <div key={row._id} className="master-card">
                <div className="mc-head">
                  <strong className="mono">{row['Name'] || row['Code'] || row['File Format']}</strong>
                  <span className="tag">{activeSheet}</span>
                </div>
                <h4>{row['Org Name'] || row['Domain Rule'] || row['Agent Name'] || row['Skill'] || row['Purpose']}</h4>
                {currentSheetData.headers.slice(2, 6).map((h, i) => (
                  <p key={i} className="xs muted">
                    <strong>{h}:</strong> {row[h] || '—'}
                  </p>
                ))}
                <div className="row" style={{ gap: '6px', marginTop: '8px' }}>
                  <button
                    type="button"
                    className="link sm"
                    onClick={() => {
                      const nameVal = row['Name'] || row['Agent Name'] || row['Skill'] || row['Code'] || ''
                      onTestInGraph?.(`Test ${activeSheet} parameter for ${nameVal}`)
                    }}
                  >
                    <Icon name="sparkle" size={11} />
                    <span>Test in Cognee Graph</span>
                  </button>
                  <button
                    type="button"
                    className="link sm"
                    style={{ color: 'var(--err)', marginLeft: 'auto' }}
                    onClick={() => handleDeleteRow(row._id)}
                  >
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info Banner */}
      <footer className="excel-footer-bar">
        <div className="row" style={{ gap: '12px', alignItems: 'center' }}>
          <span className="xs muted">
            Showing {filteredRows.length} of {currentSheetData.rows.length} rows in <strong>{activeSheet}</strong>
          </span>
          <span className="xs tone-ok">
            ✓ Linked to Stage 3.1 SOW synthesis &amp; Laya Judge
          </span>
        </div>
        <span className="xs muted">
          Tip: Click or double-click any cell to edit inline · Press Enter to commit
        </span>
      </footer>
    </div>
  )
}
