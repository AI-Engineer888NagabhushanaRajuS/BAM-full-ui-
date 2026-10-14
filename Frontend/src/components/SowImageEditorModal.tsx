import React, { useState, useEffect, useRef, useMemo } from 'react'
import FilerobotImageEditor, { TABS, TOOLS } from 'react-filerobot-image-editor'
import { Dialog, Icon } from './ui'
import { getDocumentTemplates, svgToDataUri, type CadDrawingTemplate } from './cadDrawings'
import { toast } from '../lib/store'

export interface SowImageEditorModalProps {
  open: boolean
  onClose: () => void
  onInsertImage: (dataUri: string, caption?: string) => void
  initialImage?: string
  initialCaption?: string
  uploadedFiles?: string[]
}

export function SowImageEditorModal({
  open,
  onClose,
  onInsertImage,
  initialImage,
  initialCaption,
  uploadedFiles = [],
}: SowImageEditorModalProps) {
  const templates = useMemo(() => getDocumentTemplates(uploadedFiles), [uploadedFiles])
  const [selectedTemplate, setSelectedTemplate] = useState<CadDrawingTemplate | null>(() => templates[0] || null)
  const [customImageUri, setCustomImageUri] = useState<string | null>(initialImage || null)
  const [activeImageUri, setActiveImageUri] = useState<string>(() => {
    return initialImage || (templates[0] ? svgToDataUri(templates[0].svg) : '')
  })
  const [caption, setCaption] = useState<string>(initialCaption || templates[0]?.name || 'Document Redline')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isClaims = uploadedFiles.some(f => /claim|policy|fir|police|accident|licen[cs]e|vehicle|damage|repair|estimate/i.test(f))
  const isCad = uploadedFiles.some(f => /\.(step|stp|cad|dwg)$/i.test(f) || /bracket|housing/i.test(f))

  useEffect(() => {
    if (initialImage) {
      setActiveImageUri(initialImage)
      setCustomImageUri(initialImage)
      setSelectedTemplate(null)
      if (initialCaption) setCaption(initialCaption)
    } else if (!customImageUri && selectedTemplate) {
      setActiveImageUri(svgToDataUri(selectedTemplate.svg))
      setCaption(selectedTemplate.name)
    }
  }, [initialImage, initialCaption, selectedTemplate, customImageUri])

  if (!open) return null

  const handleSelectTemplate = (t: CadDrawingTemplate) => {
    setSelectedTemplate(t)
    setCustomImageUri(null)
    setActiveImageUri(svgToDataUri(t.svg))
    setCaption(t.name)
    toast(`Loaded ${t.name} into Filerobot Markup Studio.`, 'info')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setCustomImageUri(result)
      setSelectedTemplate(null)
      setActiveImageUri(result)
      setCaption(file.name.replace(/\.[^/.]+$/, ''))
      toast(`Loaded ${file.name} into Filerobot Markup Studio.`, 'success')
    }
    reader.readAsDataURL(file)
  }

  const handleSave = (savedImageData: any) => {
    const dataUri = savedImageData.imageBase64 || savedImageData.imageCanvas?.toDataURL('image/png')
    if (!dataUri) {
      toast('Failed to export edited document image.', 'error')
      return
    }
    onInsertImage(dataUri, caption)
    toast(`Annotated figure inserted into SOW draft: "${caption}".`, 'success')
    onClose()
  }

  return (
    <Dialog
      open={open}
      title="Universal Document & Evidence Markup Studio (Filerobot)"
      onClose={onClose}
      className="dialog wide sow-filerobot-dialog"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="xs muted mono">
              Engine: <a href="https://github.com/scaleflex/filerobot-image-editor" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>@scaleflex/filerobot-image-editor</a>
            </span>
            <span className="badge sm">
              {isClaims ? 'Claims & Forensic Redline Ready' : isCad ? 'ASME Y14.5 Blueprint Ready' : 'Document Intelligence Ready'}
            </span>
          </div>
          <button className="btn btn-secondary sm" onClick={onClose}>
            <Icon name="x" size={12} />
            <span>Cancel</span>
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: 'calc(92vh - 120px)' }}>
        {/* Document Source Selector Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span className="xs muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Document Source:
            </span>
            {templates.map(t => (
              <button
                key={t.id}
                type="button"
                className={`btn xs ${selectedTemplate?.id === t.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleSelectTemplate(t)}
                style={{ fontSize: '11px', padding: '3px 10px', height: '28px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                title={`${t.partNumber}: ${t.spec}`}
              >
                <Icon name="file" size={11} />
                <span>{t.name.split(' · ')[0].split('(')[0].trim()}</span>
              </button>
            ))}

            <button
              type="button"
              className={`btn xs ${customImageUri ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: '11px', padding: '3px 10px', height: '28px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              title="Upload any image, document page, or screenshot from your computer"
            >
              <Icon name="upload" size={11} />
              <span>{customImageUri ? 'Custom File' : '+ Upload Any Document / Image'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="drawing-caption-input" className="xs muted" style={{ fontWeight: 600 }}>Figure Caption:</label>
            <input
              id="drawing-caption-input"
              type="text"
              className="input sm font-mono"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Enter figure caption for SOW..."
              style={{ width: '280px', height: '28px', fontSize: '11.5px' }}
            />
          </div>
        </div>

        {/* Filerobot Image Editor Canvas Container */}
        <div style={{
          flex: 1,
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          position: 'relative',
          background: '#090d16',
          minHeight: '480px',
        }}>
          {activeImageUri && (
            <FilerobotImageEditor
              key={activeImageUri.slice(0, 50)}
              source={activeImageUri}
              onSave={handleSave}
              onClose={onClose}
              annotationsCommon={{
                fill: '#ec4899',
                stroke: '#38bdf8',
                strokeWidth: 3,
                shadowOffsetX: 2,
                shadowOffsetY: 2,
                shadowBlur: 4,
                shadowColor: 'rgba(0,0,0,0.5)',
                opacity: 0.95,
              }}
              tabsIds={[
                TABS.ANNOTATE,
                TABS.ADJUST,
                TABS.WATERMARK,
                TABS.FILTERS,
                TABS.FINETUNE,
                TABS.RESIZE,
              ]}
              defaultTabId={TABS.ANNOTATE}
              defaultToolId={TOOLS.ARROW}
              savingPixelRatio={2}
              previewPixelRatio={1.5}
            />
          )}
        </div>
      </div>
    </Dialog>
  )
}
