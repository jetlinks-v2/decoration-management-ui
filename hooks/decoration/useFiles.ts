import { ref, onScopeDispose } from 'vue'
import type { DecorationApi } from '../../services/decorationApi'
import { errorText } from '../../utils/decoration'
import { useUploadActivity } from './useUploadScope'
/** 不向URL传令牌；下载经认证后生成短期blob预览，离开即释放。 */
export function useFiles(props: {api: DecorationApi; value: string[]; projectId: string; decorationId?: string; purpose?: string}, update: (ids: string[]) => void) {
  const uploading = ref(false), error = ref('')
  const startUpload = useUploadActivity()
  const urls: string[] = []
  let disposed = false
  onScopeDispose(() => { disposed = true; urls.forEach(URL.revokeObjectURL) })
  async function upload(event: Event) {
    const input = event.target as HTMLInputElement
    const files = Array.from(input.files || []); input.value = ''
    if (uploading.value || !files.length) return
    uploading.value = true; error.value = ''
    const finishUpload = startUpload()
    const project = props.projectId
    try {
      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) throw new Error('文件不能超过20MB')
        const receipt = await props.api.upload(file, project, props.decorationId, props.purpose)
        if (disposed || props.projectId !== project) return
        update([...props.value, receipt.id])
      }
    } catch (e) { if (!disposed) error.value = errorText(e) } finally { finishUpload(); if (!disposed) uploading.value = false }
  }
  async function preview(id: string) {
    error.value = ''
    const target = window.open('', '_blank')
    try {
      const blob = await props.api.download(id)
      if (disposed) { target?.close(); return }
      const url = URL.createObjectURL(blob); urls.push(url)
      if (target) { target.opener = null; target.location.href = url } else { const a = document.createElement('a'); a.href=url; a.download='装修附件'; a.click() }
    } catch (e) { target?.close(); if (!disposed) error.value = errorText(e) }
  }
  return {uploading, error, upload, preview, remove: (id: string) => update(props.value.filter(value => value !== id))}
}
