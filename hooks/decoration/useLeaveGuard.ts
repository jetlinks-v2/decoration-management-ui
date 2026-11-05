import { onMounted, onBeforeUnmount, onActivated, onDeactivated } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'

interface LeaveGuardOptions {
  dirty: () => boolean
  blocked: () => boolean
  confirmDiscard: () => boolean
  onBlocked: () => void
  onDiscard?: () => void
}

/** 页面切换与抽屉关闭共用判断；未知提交结果不能通过丢弃草稿绕过核对。 */
export function useLeaveGuard(options: LeaveGuardOptions) {
  function allowLeave() {
    if (options.blocked()) {
      options.onBlocked()
      return false
    }
    if (!options.dirty()) return true
    if (!options.confirmDiscard()) return false
    options.onDiscard?.()
    return true
  }

  function beforeUnload(event: BeforeUnloadEvent) {
    if (!options.blocked() && !options.dirty()) return
    event.preventDefault()
    event.returnValue = ''
  }

  onBeforeRouteLeave(allowLeave)
  onBeforeRouteUpdate(allowLeave)
  const attach = () => window.addEventListener('beforeunload', beforeUnload)
  const detach = () => window.removeEventListener('beforeunload', beforeUnload)
  onMounted(attach)
  onActivated(attach)
  onDeactivated(detach)
  onBeforeUnmount(detach)
  return { allowLeave }
}
