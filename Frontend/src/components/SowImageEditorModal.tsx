import React, { useState, useEffect, useRef } from 'react'
import FilerobotImageEditor, { TABS, TOOLS } from 'react-filerobot-image-editor'
import { Dialog, Icon } from './ui'
import { CAD_TEMPLATES, svgToDataUri, type CadDrawingTemplate } from './cadDrawings'
import { toast } from '../lib/store'

export interface SowImageEditorModalProps {
  open: boolean
  onClose: () => void
  onInsertImage: (dataUri: string, caption?: string) => void
  initialImage?: string
  initialCaption?: string
}

export function SowImageEditorModal({
  open,
  onClose,
  onInsertImage,
  initialImage,
  initialCaption,
}: SowImageEditorModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<CadDrawingTemplate | null>(CAD_TEMPLATES[0])
  const [customImageUri, setCustomImageUri] = useState<string | null>(initialImage || null)
  const [activeImageUri, setActiveImageUri] = useState<string>(() => {
    return initialImage || svgToDataUri(CAD_TEMPLATES[0].svg)
  })
  const [caption, setCaption] = useState<string>(initialCaption || CAD_TEMPLATES[0].name)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    toast(`Loaded ${t.name} into Filerobot Image Editor.`, 'info')
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
      toast(`Loaded ${file.name} into Filerobot Image Editor.`, 'success')
    }
    reader.readAsDataURL(file)
  }

  const handleSave = (savedImageData: any) => {
    const dataUri = savedImageData.imageBase64 || savedImageData.imageCanvas?.toDataURL('image/png')
    if (!dataUri) {
      toast('Failed to export edited image.', 'error')
      return
    }
    onInsertImage(dataUri, caption)
    toast(`Annotated drawing inserted into SOW draft: "${caption}".`, 'success')
    onClose()
  }

  return (
    <Dialog
      open={open}
      title="CAD & Drawing Redline Markup · Filerobot Image Editor"
      onClose={onClose}
      className="dialog wide sow-filerobot-dialog"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="xs muted mono">
              Engine: <a href="https://github.com/scaleflex/filerobot-image-editor" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>@scaleflex/filerobot-image-editor</a>
            </span>
            <span className="badge sm">ASME Y14.5 Markup Ready</span>
          </div>
          <button className="btn btn-secondary sm" onClick={onClose}>
            <Icon name="x" size={12} />
            <span>Cancel</span>
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: 'calc(88vh - 110px)' }}>
        {/* Drawing Source Selector Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span className="xs muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select Source:
            </span>
            {CAD_TEMPLATES.map(t => (
              <button
                key={t.id}
                type="button"
                className={`btn xs ${selectedTemplate?.id === t.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleSelectTemplate(t)}
                style={{ fontSize: '11px', padding: '2px 8px', height: '26px' }}
                title={`${t.partNumber}: ${t.spec}`}
              >
                <Icon name="file" size={10} />
                <span>{t.partNumber.split(' ')[0]}</span>
              </button>
            ))}

            <button
              type="button"
              className={`btn xs ${customImageUri ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: '11px', padding: '2px 8px', height: '26px' }}
              title="Upload image / drawing from your computer"
            >
              <Icon name="upload" size={10} />
              <span>{customImageUri ? 'Custom Upload' : 'Upload File'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="drawing-caption-input" className="xs muted" style={{ fontWeight: 600 }}>Caption:</label>
            <input
              id="drawing-caption-input"
              type="text"
              className="input sm font-mono"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Drawing figure caption..."
              style={{ width: '260px', height: '26px', fontSize: '11.5px' }}
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
        }}>
          {activeImageUri && (
            <FilerobotImageEditor
              key={activeImageUri.slice(0, 40)}
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
