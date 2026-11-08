import { reactive } from 'vue'
import { SessionError as MobileError } from '../session'
import { mobileSide } from '../../utils/mobileEntry'

interface RuntimeConfig { applicationId: string; tenantDomain?: string; title: string; apiBase: string }
export interface Session { token: string; applicationId: string; tenantDomain: string }
export class VerificationRequired extends MobileError {
  constructor(public key: string) { super(403, 'Mobile.verificationRequired') }
}
export interface Authorization {
  user: { id: string; name?: string }
  permissions?: { id: string; actions: string[] }[]
}
const KEY = 'decoration-h5:session'
export const authState = reactive<{ config: RuntimeConfig; session?: Session; authorization?: Authorization }>({
  config: { applicationId: '', tenantDomain: '', title: '装修管理', apiBase: '/api' },
})
let revision = 0

/** 运行配置和会话只属于装修 H5；不读取 PC 的 localStorage 登录凭证。 */
export async function initializeConfig() {
  const response = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store' })
  if (!response.ok) throw new MobileError(response.status, 'Mobile.loginConfigFailed')
  const config = await response.json() as RuntimeConfig
  if (typeof config.applicationId !== 'string' || !config.applicationId.trim()
    || config.tenantDomain !== undefined && typeof config.tenantDomain !== 'string')
    throw new MobileError(400, 'Mobile.loginConfigFailed')
  const requestedApplication = new URLSearchParams(location.search).get('applicationScope')
  if (requestedApplication && requestedApplication !== config.applicationId)
    throw new MobileError(400, 'Mobile.applicationMismatch')
  const api = typeof config.apiBase === 'string' ? config.apiBase : ''
  if (!api.startsWith('/') || api.startsWith('//') || /[\\?#]/.test(api)
    || new URL(api, location.origin).origin !== location.origin)
    throw new MobileError(400, 'Mobile.sameOriginRequired')
  authState.config = { ...config, apiBase: api.replace(/\/$/, '') }
  clearSession(false)
  try {
    const stored = JSON.parse(sessionStorage.getItem(KEY) || 'null') as Session | null
    if (stored && typeof stored.token === 'string' && stored.token.trim()
      && stored.applicationId === config.applicationId && typeof stored.tenantDomain === 'string' && stored.tenantDomain.trim())
      setSession(stored)
    else sessionStorage.removeItem(KEY)
  } catch { sessionStorage.removeItem(KEY) }
}

export function setSession(session: Session) {
  sessionStorage.setItem(KEY, JSON.stringify(session))
  revision++
  authState.authorization = undefined
  authState.session = session
}
export function clearSession(removeStored = true) {
  revision++
  authState.session = undefined
  authState.authorization = undefined
  if (removeStored) sessionStorage.removeItem(KEY)
}

/** 401 只清理发起请求的会话；旧账号的迟到响应不能清掉新登录。 */
export async function sessionRequest<T>(path: string, method = 'GET', body?: unknown,
  options: { scoped?: boolean; responseType?: 'blob'; session?: Session; signal?: AbortSignal; verification?: { key: string; token: string } } = {}): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//') || /[\\#]/.test(path) || decodeURIComponent(path).split('?')[0].split('/').includes('..'))
    throw new MobileError(400, 'Mobile.sameOriginRequired')
  const scoped = options.scoped !== false, session = options.session || authState.session, requestRevision = revision
  if (scoped && !session) throw new MobileError(401, 'Mobile.sessionRequired')
  const headers: Record<string, string> = {}
  if (options.verification) {
    headers['x-verify-key'] = options.verification.key
    headers['x-verify-token'] = options.verification.token
  }
  if (scoped && session) {
    headers['X-Access-Token'] = session.token
    headers['X-Asset-Scope'] = `business_application:${session.applicationId}`
    headers['X-Tenant-Domain'] = session.tenantDomain
  }
  const multipart = body instanceof FormData
  if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json'
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000)
  const abort = () => controller.abort()
  if (options.signal?.aborted) controller.abort()
  else options.signal?.addEventListener('abort', abort, { once: true })
  try {
    const response = await fetch(authState.config.apiBase + path, {
      method, headers, credentials: 'omit', signal: controller.signal,
      body: multipart ? body as FormData : body === undefined ? undefined : JSON.stringify(body),
    })
    const binary = response.ok && options.responseType === 'blob'
    const data = binary ? await response.blob() : await response.json().catch(() => null)
    if (controller.signal.aborted) throw new DOMException('Request aborted', 'AbortError')
    if (scoped && requestRevision !== revision) throw new MobileError(401, 'Mobile.contextChanged')
    if (binary) return data as T
    const status = response.ok ? data?.status || response.status : response.status
    if (!response.ok || !data || status !== 200) {
      if (!scoped && status === 403 && data?.result?.type === 'captcha' && typeof data.result.key === 'string')
        throw new VerificationRequired(data.result.key)
      if (scoped && !options.session && status === 401) clearSession()
      const accessDenied = status === 403 && path.startsWith('/decoration/')
      throw new MobileError(status, accessDenied ? 'Mobile.accessDenied'
        : status === 401 ? 'Mobile.sessionRequired' : data?.message || 'Mobile.requestFailed')
    }
    return data.result as T
  } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort) }
}

/** 应用范围内核验访问权限；管理权限不代替员工身份或真实任务执行资格。 */
export async function verifySession(session?: Session, signal?: AbortSignal) {
  const me = await sessionRequest<Authorization>('/authorize/me', 'GET', undefined, { session, signal })
  if (!me.user?.id || !me.permissions?.some(permission =>
    permission.id === (mobileSide(location.search) === 'staff' ? 'decoration-task' : 'decoration-owner') && permission.actions.includes('query')))
    throw new MobileError(403, 'Mobile.accessDenied')
  const path = mobileSide(location.search) === 'staff' ? '/decoration/tasks/mine/_query' : '/decoration/mobile/applications/_query'
  await sessionRequest(path, 'POST', { pageSize: 1 }, { session, signal })
  if (!session) authState.authorization = me
  return me
}
