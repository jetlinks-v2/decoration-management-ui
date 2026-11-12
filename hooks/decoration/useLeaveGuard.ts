import { onMounted, onBeforeUnmount, onActivated, onDeactivated } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'

interface LeaveGuardOptions {
  dirty: () => boolean
  blocked: () => boolean
  confirmDiscard: () => boolean | Promise<boolean>
  onBlocked: () => void
  onDiscard?: () => void
}

/** 弹窗直接关闭，页面切换仍确认草稿；两者均保留上传、提交和未知结果保护。 */
export function useLeaveGuard(options: LeaveGuardOptions) {
  function allowClose() {
    if (!options.blocked()) return true
    options.onBlocked()
    return false
  }
  async function allowLeave() {
    if (options.blocked()) {
      options.onBlocked()
      return false
    }
    if (!options.dirty()) return true
    if (!await options.confirmDiscard()) return false
    // 页面内确认不暂停上传和提交，用户确认后仍须核对当前状态。
    if (options.blocked()) {
      options.onBlocked()
      return false
    }
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
  return { allowLeave, allowClose }
}
