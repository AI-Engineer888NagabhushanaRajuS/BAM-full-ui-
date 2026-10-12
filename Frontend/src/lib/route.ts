import { useSyncExternalStore } from 'react'
import type { Snapshot, StepId } from '../api/types'
import { SCREEN_ROUTES, STEP_SCREEN } from '../tracker/trackerConfig.ts'

// ponytail: History API instead of a router library; swap for Refine's router binding if routes grow.
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())
if (typeof window !== 'undefined') window.addEventListener('popstate', emit)

export function navigate(path: string, { replace = false } = {}) {
  if (location.pathname === path) return
  if (replace) history.replaceState(null, '', path)
  else history.pushState(null, '', path)
  emit()
}

export const usePath = () =>
  useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb) } }, () => location.pathname)

export const RAG_ROUTES = { graph: SCREEN_ROUTES['2.1'].path, schemas: SCREEN_ROUTES['2.2'].path, quality: SCREEN_ROUTES['2.3'].path, review: SCREEN_ROUTES['2.4'].path } as const

export const goScreen = (id: string) => { const r = SCREEN_ROUTES[id]; if (r) navigate(r.path) }
/** Open the screen where a backend workbench step is worked on. */
export const goStep = (step: StepId) => goScreen(STEP_SCREEN[step])

/** Where the work is right now: upload first, then RAG, then the active workbench step. */
export function activeScreen(snap: Snapshot): string {
  if (snap.activeStep === 1 && !snap.sow) return snap.uploads.length ? '2.1' : '1.1'
  return STEP_SCREEN[snap.activeStep]
}
