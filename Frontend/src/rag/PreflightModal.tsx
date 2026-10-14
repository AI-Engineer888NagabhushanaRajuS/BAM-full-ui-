import { Dialog, Icon } from '../components/ui'
import { CogneePreflightCockpit } from './CogneePreflightCockpit'
import { useUi, closePreflight } from '../lib/store'

export function PreflightModal() {
  const open = useUi(s => !!s.preflightModalOpen)

  if (!open) return null

  return (
    <Dialog
      open={open}
      title="BAM Context Pre-Flight Verification & FDE Gate"
      onClose={closePreflight}
      className="dialog wide preflight-fullscreen-dialog"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span className="xs muted">
            BuLLM BAM 0.2 · 80% Context Sufficiency Gate Required before SOW Synthesis
          </span>
          <button className="btn btn-secondary sm" onClick={closePreflight}>
            <Icon name="x" size={12} />
            <span>Close Gate Cockpit</span>
          </button>
        </div>
      }
    >
      <div style={{ maxHeight: 'calc(85vh - 120px)', overflowY: 'auto', paddingRight: '4px' }}>
        <CogneePreflightCockpit onPushToSowSuccess={closePreflight} />
      </div>
    </Dialog>
  )
}
