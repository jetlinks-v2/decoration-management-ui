<script setup lang="ts">
import { TreeSelect as ATreeSelect } from 'ant-design-vue'
import { isSelectableProject, type ProjectTreeNode } from '../../utils/decoration'
const props = withDefaults(defineProps<{
  value?: string
  treeData: ProjectTreeNode[]
  placeholder?: string
  disabled?: boolean
  allowClear?: boolean
}>(), { allowClear: true })
const emit = defineEmits<{ 'update:value': [value: string | undefined] }>()
/** 清空保持页面原有范围语义；节点选择只接受当前有权树中的项目。 */
function update(value: unknown) {
  if (props.disabled) return
  if (value == null || value === '') {
    if (props.allowClear) emit('update:value', undefined)
  } else if (typeof value === 'string' && isSelectableProject(props.treeData, value)) {
    emit('update:value', value)
  }
}
</script>
<template>
  <ATreeSelect
    :value="value || undefined"
    :tree-data="treeData"
    :placeholder="placeholder"
    :disabled="disabled"
    :allow-clear="allowClear"
    tree-default-expand-all
    show-search
    tree-node-filter-prop="title"
    class="decoration-project-select"
    @update:value="update"
  />
</template>
<style scoped>
.decoration-project-select { width: 320px; max-width: 100%; }
</style>
