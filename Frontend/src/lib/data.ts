import { useState } from 'react'
import { useCustom, type BaseRecord } from '@refinedev/core'
import { useQueryClient } from '@tanstack/react-query'
import type { CodeFile, SkillRow, Snapshot, StepId } from '../api/types'
import { toast } from './store'
import { STEP_SCREEN } from '../tracker/trackerConfig.ts'

// One shared poll of the backend snapshot; every status in the UI derives from it.
export function useSnapshot() {
  const { query } = useCustom<Snapshot & BaseRecord>({ url: 'snapshot', method: 'get', queryOptions: { refetchInterval: 1000, retry: false } })
  return { snap: query.data?.data as Snapshot | undefined, error: query.error, isLoading: query.isLoading, syncedAt: query.dataUpdatedAt, refetch: query.refetch }
}

// `rev` changes when the backend says the data changed, which re-keys the query.
export function useSkills(rev: number) {
  const { query } = useCustom<{ rows: SkillRow[] }>({ url: 'skills', method: 'get', config: { query: { rev } }, queryOptions: { placeholderData: prev => prev } })
  return { rows: query.data?.data.rows, error: query.error, isLoading: query.isLoading, refetch: query.refetch }
}

export function useCode(rev: string) {
  // Keep showing the previous result while a new revision loads, so editors never unmount mid-edit.
  const { query } = useCustom<{ files: CodeFile[] }>({ url: 'code', method: 'get', config: { query: { rev } }, queryOptions: { placeholderData: prev => prev } })
  return { files: query.data?.data.files, error: query.error, isLoading: query.isLoading, refetch: query.refetch }
}

// Runs a backend command, reports failure as a persistent toast, then refreshes reads.
export function useAction() {
  const qc = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  async function run<T>(label: string, fn: () => Promise<T>, opts: { success?: string; step?: StepId } = {}): Promise<T | undefined> {
    setBusy(label)
    try {
      const r = await fn()
      if (opts.success) toast(opts.success, 'success', opts.step && STEP_SCREEN[opts.step])
      return r
    } catch (e) {
      toast(`${label} failed: ${(e as Error).message}`, 'error', opts.step && STEP_SCREEN[opts.step])
    } finally {
      setBusy(null)
      void qc.invalidateQueries()
    }
  }
  return { busy, run }
}
