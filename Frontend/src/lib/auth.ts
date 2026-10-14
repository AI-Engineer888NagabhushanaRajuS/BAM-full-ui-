import { useSyncExternalStore } from 'react'

export interface User {
  id: string
  name: string
  email: string
  role: string
  organization: string
  provider: 'Clerk' | 'Google' | 'GitHub' | 'Microsoft' | 'Keycloak' | 'Direct'
  initials: string
  avatarGradient: string
  token: string
  loginTime: string
}

export interface AuthProviderInfo {
  id: string
  name: string
  protocol: string
  connected: boolean
  account?: string
  icon: string
  color: string
  scopes: string
}

export const PRESET_USERS: User[] = [
  {
    id: 'user-nagabhushana',
    name: 'Nagabhushana Raju S',
    email: 'nagabhushana@digibull.ai',
    role: 'Lead Architect & Owner',
    organization: 'BU-AERO-01',
    provider: 'GitHub',
    initials: 'NR',
    avatarGradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    token: 'jwt_nb_sec_9918274a8f',
    loginTime: 'Active now',
  },
  {
    id: 'user-parvitha',
    name: 'Parvitha C Gowda',
    email: 'parvitha.c@digibull.ai',
    role: 'Security Contributor',
    organization: 'ORG-EMS',
    provider: 'Google',
    initials: 'PG',
    avatarGradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
    token: 'jwt_pg_sec_3381920b1c',
    loginTime: 'Active now',
  },
  {
    id: 'user-alex',
    name: 'Alex Mercer',
    email: 'alex.mercer@digibull.ai',
    role: 'Admin / FDE',
    organization: 'BU-AERO-01',
    provider: 'Clerk',
    initials: 'AM',
    avatarGradient: 'linear-gradient(135deg, #6366f1, #a855f7)',
    token: 'jwt_am_sec_7721839c4d',
    loginTime: 'Active now',
  },
]

export const DEFAULT_PROVIDERS: AuthProviderInfo[] = [
  {
    id: 'clerk',
    name: 'Clerk User Management',
    protocol: 'OpenID Connect · JWT Session',
    connected: true,
    account: 'alex.mercer@digibull.ai',
    icon: 'C',
    color: '#6c47ff',
    scopes: 'profile, email, organization:read',
  },
  {
    id: 'github',
    name: 'GitHub Enterprise OAuth',
    protocol: 'OAuth 2.0 PKCE',
    connected: true,
    account: '@AI-Engineer888NagabhushanaRajuS',
    icon: 'G',
    color: '#24292e',
    scopes: 'repo, workflow, read:user',
  },
  {
    id: 'google',
    name: 'Google Workspace SSO',
    protocol: 'SAML 2.0 / OAuth 2.0 PKCE',
    connected: true,
    account: 'digibull.ai domain verified',
    icon: 'G',
    color: '#4285F4',
    scopes: 'openid, email, profile',
  },
  {
    id: 'microsoft',
    name: 'Microsoft 365 / Entra ID',
    protocol: 'Azure AD Multi-Tenant',
    connected: false,
    account: 'Not configured',
    icon: 'M',
    color: '#00a4ef',
    scopes: 'User.Read, Directory.Read.All',
  },
  {
    id: 'keycloak',
    name: 'Keycloak Self-Hosted SSO',
    protocol: 'OIDC / Kerberos Enterprise Realm',
    connected: false,
    account: 'realm: digibull-corp',
    icon: 'K',
    color: '#cc0000',
    scopes: 'offline_access, roles',
  },
  {
    id: 'fastmcp',
    name: 'FastMCP IPC Protocol Bridge',
    protocol: 'Local IPC / Socket Port 8787',
    connected: true,
    account: 'Daemon bound (Python runtime)',
    icon: 'F',
    color: '#eab308',
    scopes: 'tools:exec, sandbox:microvm',
  },
]

interface AuthStore {
  user: User | null
  providers: AuthProviderInfo[]
}

const STORAGE_KEY_USER = 'bam-auth-user-v1'
const STORAGE_KEY_PROVIDERS = 'bam-auth-providers-v1'

function getInitialUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER)
    if (raw) return JSON.parse(raw) as User
  } catch {}
  return PRESET_USERS[0] // Default to Nagabhushana Raju S
}

function getInitialProviders(): AuthProviderInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROVIDERS)
    if (raw) return JSON.parse(raw) as AuthProviderInfo[]
  } catch {}
  return DEFAULT_PROVIDERS
}

let authState: AuthStore = {
  user: getInitialUser(),
  providers: getInitialProviders(),
}

const listeners = new Set<() => void>()
function notify() {
  listeners.forEach(fn => fn())
}

function persist() {
  try {
    if (authState.user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(authState.user))
    } else {
      localStorage.removeItem(STORAGE_KEY_USER)
    }
    localStorage.setItem(STORAGE_KEY_PROVIDERS, JSON.stringify(authState.providers))
  } catch {}
}

export const authActions = {
  switchUser(user: User) {
    authState = { ...authState, user }
    persist()
    notify()
  },

  signInWithCredentials(name: string, email: string, role: string, organization: string, provider: User['provider']) {
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map(p => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'

    const user: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      organization,
      provider,
      initials,
      avatarGradient: 'linear-gradient(135deg, #2563eb, #7c3aed)',
      token: `jwt_${Math.random().toString(36).substring(2, 10)}`,
      loginTime: 'Just now',
    }
    authState = { ...authState, user }
    persist()
    notify()
    return user
  },

  signOut() {
    authState = { ...authState, user: null }
    persist()
    notify()
  },

  toggleProvider(providerId: string) {
    authState = {
      ...authState,
      providers: authState.providers.map(p => {
        if (p.id === providerId) {
          const nextConnected = !p.connected
          return {
            ...p,
            connected: nextConnected,
            account: nextConnected ? (p.account || 'Connected') : 'Disconnected',
          }
        }
        return p
      }),
    }
    persist()
    notify()
  },

  getState(): AuthStore {
    return authState
  },

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function useAuth() {
  return useSyncExternalStore(authActions.subscribe, authActions.getState)
}
