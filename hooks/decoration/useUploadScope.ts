import { computed, inject, provide, ref, type InjectionKey } from 'vue'

type StartUpload = () => () => void
const uploadScope: InjectionKey<StartUpload> = Symbol('decoration-upload-scope')

/** 编辑对象拥有上传计数；多份附件或签名全部完成后才允许保存和离开。 */
export function provideUploadScope() {
  const pending = ref(0)
  const start: StartUpload = () => {
    pending.value++
    let completed = false
    return () => { if (!completed) { completed = true; pending.value-- } }
  }
  provide(uploadScope, start)
  return { uploading: computed(() => pending.value > 0) }
}

/** 深层文件/签名组件只登记本次操作，不持有页面或全局状态。 */
export function useUploadActivity(): StartUpload {
  return inject(uploadScope, undefined) || (() => () => {})
}
