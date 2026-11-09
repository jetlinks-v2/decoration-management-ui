import { onScopeDispose } from 'vue'
import { Modal } from 'ant-design-vue'

/** 使用页面内确认，避免原生 confirm 暂停页面及浏览器自动化通道。 */
export function useDiscardConfirm(message: () => string) {
  let pending: { cancel: () => void; destroy: () => void } | undefined
  let disposed = false
  onScopeDispose(() => {
    disposed = true
    const current = pending
    current?.cancel()
    current?.destroy()
  })
  return () => {
    // 重复点击不排队执行多个切换动作；组件卸载后也不能继续丢弃。
    if (pending || disposed) return Promise.resolve(false)
    return new Promise<boolean>(resolve => {
      const finish = (accepted: boolean) => {
        if (pending !== current) return
        pending = undefined
        resolve(accepted)
      }
      const current = { cancel: () => finish(false), destroy: () => {} }
      pending = current
      const dialog = Modal.confirm({
        title: message(),
        okText: '放弃修改',
        cancelText: '继续填写',
        maskClosable: false,
        onOk: () => finish(true),
        onCancel: current.cancel,
        afterClose: current.cancel,
      })
      current.destroy = dialog.destroy
    })
  }
}
