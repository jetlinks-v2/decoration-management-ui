import { ref, watch, onScopeDispose } from 'vue'
import type { DecorationApi } from '../../services/decorationApi'
import { errorText } from '../../utils/decoration'
import { attachmentFormat } from '../../utils/attachmentFormat'
import { useUploadActivity } from './useUploadScope'
/** 不向URL传令牌；下载经认证后生成短期blob预览，离开即释放。 */
export function useFiles(props: {api: DecorationApi; value: string[]; projectId: string; decorationId?: string; purpose?: string}, update: (ids: string[]) => void) {
  const uploading = ref(false), error = ref(''), previewId = ref('')
  const startUpload = useUploadActivity()
  const urls: string[] = []
  const thumbnails = ref<Record<string, string>>({})
  let generation = 0, disposed = false, scope = ''
  const loaded = new Set<string>()
  const previewTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/avif'])
  // PC与两端H5复用同一附件组件；认证后读取业务图片，不把令牌拼入图片地址。
  watch(() => [props.projectId, props.decorationId, ...props.value], async () => {
    const current = ++generation
    const nextScope = JSON.stringify([props.projectId, props.decorationId])
    const keep = new Set(props.value)
    for (const [id, url] of Object.entries(thumbnails.value)) {
      if (scope !== nextScope || !keep.has(id)) { URL.revokeObjectURL(url); delete thumbnails.value[id] }
    }
    for (const id of loaded) if (scope !== nextScope || !keep.has(id)) loaded.delete(id)
    scope = nextScope
    if (!props.projectId) return
    const ids = [...keep].filter(id => !loaded.has(id))
    for (let offset = 0; offset < ids.length; offset += 3) {
      if (disposed || current !== generation) return
      await Promise.all(ids.slice(offset, offset + 3).map(async id => {
        try {
          const blob = await props.api.download(id)
          if (disposed || current !== generation) return
          loaded.add(id)
          if (!previewTypes.has(blob.type.toLowerCase().split(';')[0])) return
          thumbnails.value[id] = URL.createObjectURL(blob)
        } catch { /* 单个附件失败保留原附件入口，点击可重试并查看错误。 */ }
      }))
    }
  }, { immediate: true })
  onScopeDispose(() => { disposed = true; generation++; urls.forEach(URL.revokeObjectURL); Object.values(thumbnails.value).forEach(URL.revokeObjectURL) })
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
  function preview(id:string) { previewId.value=id }
  async function download(id:string,name='装修附件') {
    error.value=''
    try{
      const blob=await props.api.download(id)
      const metadata=props.api.attachmentInfo?await props.api.attachmentInfo(id):undefined
      const format=await attachmentFormat(blob,metadata?.name)
      const extension=format.extension?'.'+format.extension:''
      if(metadata?.name&&name==='装修附件')name=metadata.name
      if(disposed)return
      const url=URL.createObjectURL(blob);urls.push(url);const anchor=document.createElement('a');anchor.href=url;anchor.download=/\.[a-z0-9]+$/i.test(name)?name:name+extension;anchor.click()
    }
    catch(e){if(!disposed)error.value=errorText(e)}
  }
  return {uploading, error, previewId, thumbnails, upload, preview, download, remove: (id: string) => update(props.value.filter(value => value !== id))}
}
