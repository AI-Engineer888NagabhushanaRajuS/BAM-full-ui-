import { useSyncExternalStore } from 'react'

export interface WorkspaceItem {
  id: string
  code: string
  name: string
  orgType: string
  description: string
  icon: string
}

export interface ProjectItem {
  id: string
  code: string
  name: string
  workspaceId: string
  description: string
  domain: 'aerospace' | 'software' | 'telemetry' | 'ems'
  status: 'active' | 'in_review' | 'released'
}

export const PRESET_WORKSPACES: WorkspaceItem[] = [
  {
    id: 'ws-aero',
    code: 'BU-AERO-01',
    name: 'Meridian Aerospace & Defense',
    orgType: 'Tier-1 EMS Aerospace (AS9100D / ITAR)',
    description: 'Precision CAD/CAM, 17-4PH machining, and spaceflight qualification packages.',
    icon: 'rocket',
  },
  {
    id: 'ws-ems',
    code: 'ORG-EMS',
    name: 'DigiBull EMS Enterprise',
    orgType: 'Contract Electronics Manufacturing',
    description: 'High-speed SMT lines ($120/hr), component normalization, and BOM scrub.',
    icon: 'cpu',
  },
  {
    id: 'ws-soft',
    code: 'BU-SW-01',
    name: 'Distributed Microservices & AST',
    orgType: 'Software Architecture & Compliance',
    description: 'Django AST microservices, 1AutoScanner Pro, and threat perimeter isolation.',
    icon: 'terminal',
  },
  {
    id: 'ws-space',
    code: 'ORG-CORE',
    name: 'SpaceTech LEO Telemetry',
    orgType: 'Constellation Operations',
    description: 'Space-Track orbital ephemeris ingestion and telemetry streaming engine.',
    icon: 'satellite',
  },
]

export const PRESET_PROJECTS: ProjectItem[] = [
  {
    id: 'proj-0147',
    code: 'RFQ-2026-0147',
    name: 'Meridian Precision Housing & Bracket',
    workspaceId: 'ws-aero',
    description: 'MPW-4421 bracket & MPW-4422 housing with 17-4PH SS certs and Rev C deltas.',
    domain: 'aerospace',
    status: 'active',
  },
  {
    id: 'proj-ast-pro',
    code: 'AST-SCAN-V3',
    name: '1AutoScanner Pro & Microservice AST',
    workspaceId: 'ws-soft',
    description: 'Django service extraction, heuristic threat scanner, and FastMCP bindings.',
    domain: 'software',
    status: 'active',
  },
  {
    id: 'proj-telemetry',
    code: 'LEO-EPHEM-01',
    name: 'Space-Track LEO Telemetry Stream',
    workspaceId: 'ws-space',
    description: 'Real-time orbital tracking ephemeris, attitude matrices, and ground stations.',
    domain: 'telemetry',
    status: 'active',
  },
  {
    id: 'proj-pcba-ems',
    code: 'EMS-PCBA-88',
    name: 'High-Reliability Avionics PCBA',
    workspaceId: 'ws-ems',
    description: 'IPC Class 3 PCBA costing, SMT line optimization, and excess inventory scrub.',
    domain: 'ems',
    status: 'active',
  },
]

const STORAGE_KEY_WS = 'bam-active-workspace-v1'
const STORAGE_KEY_PROJ = 'bam-active-project-v1'

const listeners = new Set<() => void>()
function notify() {
  listeners.forEach(l => l())
}

function getStoredWorkspace(): WorkspaceItem {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WS)
    if (raw) return JSON.parse(raw) as WorkspaceItem
  } catch {}
  return PRESET_WORKSPACES[0]
}

function getStoredProject(): ProjectItem {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJ)
    if (raw) return JSON.parse(raw) as ProjectItem
  } catch {}
  return PRESET_PROJECTS[0]
}

let currentWorkspace: WorkspaceItem = getStoredWorkspace()
let currentProject: ProjectItem = getStoredProject()

export const workspaceStore = {
  getWorkspace: () => currentWorkspace,
  getProject: () => currentProject,
  setWorkspace: (ws: WorkspaceItem) => {
    currentWorkspace = ws
    try {
      localStorage.setItem(STORAGE_KEY_WS, JSON.stringify(ws))
    } catch {}
    // Pick first project for this workspace if current project doesn't match
    const matchingProj = PRESET_PROJECTS.find(p => p.workspaceId === ws.id) || PRESET_PROJECTS[0]
    workspaceStore.setProject(matchingProj)
    notify()
  },
  setProject: (proj: ProjectItem) => {
    currentProject = proj
    try {
      localStorage.setItem(STORAGE_KEY_PROJ, JSON.stringify(proj))
    } catch {}
    notify()
  },
  subscribe: (cb: () => void) => {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  },
}

export function useWorkspace() {
  const ws = useSyncExternalStore(workspaceStore.subscribe, workspaceStore.getWorkspace)
  const proj = useSyncExternalStore(workspaceStore.subscribe, workspaceStore.getProject)
  return {
    workspace: ws,
    project: proj,
    allWorkspaces: PRESET_WORKSPACES,
    allProjects: PRESET_PROJECTS,
    setWorkspace: workspaceStore.setWorkspace,
    setProject: workspaceStore.setProject,
  }
}
