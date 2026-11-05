import {computed, onScopeDispose, ref, shallowRef} from 'vue'
import type {DecorationApi} from '../../services/decorationApi'
import type {ConfigurationImportResult, ConfigurationImportView} from '../../types/decoration'
import {downloadBlob} from '../../services/blobDownload'
import {errorText, isUncertain, requestId} from '../../utils/decoration'

/** 导入只提交冻结文件；未知结果先读原收据，不把超时当作失败或自动重复导入。 */
export function useConfigurationImport(api: DecorationApi, onImported: () => Promise<void>, t: (key: string) => string) {
  const open = ref(false), file = shallowRef<File>(), result = shallowRef<ConfigurationImportResult>()
  const uploading = ref(false), checking = ref(false), downloading = ref(false)
  const uncertain = ref(false), resultMissing = ref(false), error = ref('')
  let pending: {file: File; requestId: string} | undefined, disposed = false, generation = 0
  const busy = computed(() => uploading.value || checking.value || downloading.value)
  const blocked = computed(() => busy.value || uncertain.value)
  const dirty = computed(() => !!file.value && !result.value?.importedCount)
  const view = computed<ConfigurationImportView>(() => ({open: open.value, fileName: file.value?.name || '', busy: busy.value,
    uploading: uploading.value, checking: checking.value, downloading: downloading.value, uncertain: uncertain.value,
    resultMissing: resultMissing.value, error: error.value, result: result.value}))
  onScopeDispose(() => {disposed = true; generation++})

  function show() { if (!disposed) open.value = true }
  /** 页面统一退出保护确认后调用；进行中与未知结果均不能丢弃原请求。 */
  function discard() {
    if (blocked.value) return
    generation++; open.value = false; file.value = undefined; result.value = undefined; error.value = ''; pending = undefined
  }
  /** beforeUpload返回false，文件经业务接口提交，禁止控件自行上传到公共目录。 */
  function select(next: File): false {
    if (blocked.value || disposed) return false
    if (!/\.xlsx$/i.test(next.name)) {error.value = t('Decoration.import.format'); return false}
    if (!next.size || next.size > 10 * 1024 * 1024) {error.value = t('Decoration.import.size'); return false}
    file.value = next; pending = undefined; result.value = undefined; resultMissing.value = false; error.value = ''
    return false
  }
  async function accept(value: ConfigurationImportResult, token: number) {
    if (disposed || token !== generation) return
    result.value = value; resultMissing.value = false; error.value = ''
    // 原请求可能仍在执行，重试返回的校验失败不能证明原请求未提交；只有成功收据能解除未知状态。
    if (uncertain.value && !value.importedCount) {error.value = t('Decoration.import.unknownHint'); return}
    uncertain.value = false
    if (value.importedCount) {try {await onImported()} catch (e) {if (!disposed && token === generation) error.value = errorText(e)}}
  }
  async function write(original: {file: File; requestId: string}) {
    const token = generation, wasUncertain = uncertain.value
    uploading.value = true; resultMissing.value = false; error.value = ''
    try {await accept(await api.importChecks(original.file, original.requestId), token)}
    catch (e) {
      if (disposed || token !== generation) return
      error.value = errorText(e)
      const failure = e as {code?: string; response?: {data?: {code?: string}}}
      // 目录失败发生在上传/写库之前；仅首次确定失败可释放草稿，不能消除更早的未知提交。
      const prewrite = (failure.response?.data?.code || failure.code) === 'error.decoration.directory_unavailable'
      uncertain.value = wasUncertain || (!prewrite && isUncertain(e))
    } finally {if (!disposed && token === generation) uploading.value = false}
  }
  async function submit() {
    if (blocked.value || disposed || result.value?.importedCount) return
    if (!file.value) {error.value = t('Decoration.import.fileRequired'); return}
    pending = {file: file.value, requestId: requestId()}
    await write(pending)
  }
  /** 404只表示暂未发现成功收据，保留原文件/请求号并允许显式原请求重试。 */
  async function confirmResult() {
    if (!uncertain.value || busy.value || !pending || disposed) return
    const token = generation; checking.value = true; error.value = ''; resultMissing.value = false
    try {await accept(await api.checkImportResult(pending.requestId), token)}
    catch (e) {
      if (disposed || token !== generation) return
      const failure = e as {status?: number; response?: {status?: number}}
      resultMissing.value = (failure.status || failure.response?.status) === 404
      error.value = resultMissing.value ? t('Decoration.import.notFound') : errorText(e)
    } finally {if (!disposed && token === generation) checking.value = false}
  }
  async function retryOriginal() {
    if (!uncertain.value || !resultMissing.value || busy.value || !pending || disposed) return
    await write(pending)
  }
  async function downloadTemplate() {
    if (busy.value || disposed) return
    const token = generation; downloading.value = true; error.value = ''
    try {const blob = await api.checkImportTemplate(); if (!disposed && token === generation) downloadBlob(blob, '装修检查配置模板.xlsx')}
    catch (e) {if (!disposed && token === generation) error.value = errorText(e)}
    finally {if (!disposed && token === generation) downloading.value = false}
  }
  return {view, dirty, blocked, show, discard, select, submit, confirmResult, retryOriginal, downloadTemplate}
}
