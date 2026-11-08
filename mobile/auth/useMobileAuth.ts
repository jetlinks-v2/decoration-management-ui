import { onMounted, ref, watch } from 'vue'
import { authState, clearSession, initializeConfig, verifySession } from './session'
import { logout } from './useLogin'

/** 独立浏览器会话先核验再展示业务；原生宿主继续提供其既有认证适配。 */
export function useMobileAuth() {
  const hosted = !!window.decorationHost, ready = ref(hosted), configError = ref(''), notice = ref(''), loggingOut = ref(false), appKey = ref(0)
  let explicitLogout = false
  watch(() => authState.session, (session, previous) => {
    appKey.value++
    if (!session && previous && !explicitLogout) notice.value = 'Mobile.sessionRequired'
    else if (session) notice.value = ''
  }, { flush: 'sync' })
  async function start() {
    ready.value = false; configError.value = ''; notice.value = ''
    try {
      await initializeConfig()
      if (authState.session) {
        try { await verifySession() }
        catch (error) { clearSession(); notice.value = error instanceof Error ? error.message : 'Mobile.requestFailed' }
      }
    } catch (error) { configError.value = error instanceof Error ? error.message : 'Mobile.loginConfigFailed' }
    finally { ready.value = true }
  }
  async function signOut() {
    if (loggingOut.value) return
    loggingOut.value = true; explicitLogout = true
    try { await logout() } catch { /* 服务端退出失败也清理本标签页会话。 */ }
    finally { notice.value = ''; loggingOut.value = false; explicitLogout = false }
  }
  onMounted(() => { if (!hosted) void start() })
  return { hosted, ready, configError, notice, loggingOut, appKey, start, signOut }
}
