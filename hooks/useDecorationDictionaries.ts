import { onMounted, onScopeDispose, ref } from 'vue'
import type { DictionaryItem, DictionaryType } from '@property-base-ui/public-api'
import { propertyBaseApis } from '../services/propertyBase'
export const dictionaryCodes = ['house-type', 'house-state', 'customer-nature', 'certificate-type'] as const
export type DictionaryCode = (typeof dictionaryCodes)[number]
/** 停用项保留用于历史解析；新增选项只允许启用分类下的启用项。 */
export function useDictionaries(codes: readonly DictionaryCode[] = dictionaryCodes) {
  const types = ref<DictionaryType[]>([])
  const items = ref<Partial<Record<DictionaryCode, DictionaryItem[]>>>({})
  const failed = ref(false)
  const loading = ref(false)
  let generation = 0
  let disposed = false
  async function reload() {
    const token = ++generation
    loading.value = true
    try {
      const { getDictionaryTypes, getDictionaryItems } = propertyBaseApis()
      const result = await getDictionaryTypes()
      const entries = await Promise.all(
        codes.map(
          async (code) =>
            [code, result.some((type) => type.code === code) ? await getDictionaryItems(code) : []] as const
        )
      )
      if (!disposed && token === generation) {
        types.value = result
        items.value = Object.fromEntries(entries)
        failed.value = false
      }
    } catch {
      if (!disposed && token === generation) failed.value = true
    } finally {
      if (!disposed && token === generation) loading.value = false
    }
  }
  const options = (code: DictionaryCode, current?: string) => {
    const enabled = types.value.some((type) => type.code === code && type.enabled)
    return (items.value[code] || [])
      .filter((item) => (enabled && item.enabled) || item.value === current)
      .map((item) => ({ value: item.value, label: item.text, disabled: !enabled || !item.enabled }))
  }
  const text = (code: DictionaryCode, value?: string) => {
    const found = items.value[code]?.find((item) => item.value === value)?.text
    if (found) return found
    if (code === 'house-type') return ({commercial: '商业', residential: '住宅', office: '办公', industrial: '工业'} as Record<string, string>)[value || ''] || value || '—'
    return value || '—'
  }
  onMounted(() => {
    void reload()
  })
  onScopeDispose(() => {
    disposed = true
    generation++
  })
  return { items, types, failed, loading, options, text, reload }
}
