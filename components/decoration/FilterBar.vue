<script setup lang="ts">
import { Button as AButton } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import ProjectTreeSelect from './ProjectTreeSelect.vue'
import type { ProjectTreeNode } from '../../utils/decoration'
defineProps<{ projectId?: string; treeData: ProjectTreeNode[]; disabled?: boolean; loading?: boolean }>()
const emit = defineEmits<{ projectChange: [value: string | undefined]; refresh: [] }>()
const { t } = useI18n()
</script>
<template>
  <div class="decoration-filter">
    <label class="decoration-project-filter">
      <span>{{ t('Decoration.selfInspection.project') }}</span>
      <ProjectTreeSelect :value="projectId" :tree-data="treeData" :disabled="disabled"
        :placeholder="t('Decoration.selfInspection.allProjects')" @update:value="emit('projectChange', $event)" />
    </label>
    <slot />
    <a-button :loading="loading" @click="emit('refresh')">{{ t('Decoration.selfInspection.refresh') }}</a-button>
  </div>
</template>
