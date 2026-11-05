<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import type {ConfigurationImportView} from '../../types/decoration'
const props = defineProps<{view: ConfigurationImportView; beforeUpload: (file: File) => false}>()
const emit = defineEmits<{close: []; submit: []; download: []; confirm: []; retry: []}>()
const {t, te} = useI18n()
const columns = computed(() => [
  {title: t('Decoration.import.row'), dataIndex: 'rowNumber', width: 70},
  {title: t('Decoration.import.column'), dataIndex: 'columnName', width: 140},
  {title: t('Decoration.import.value'), dataIndex: 'cellValue', width: 180},
  {title: t('Decoration.import.reason'), dataIndex: 'reason'}
])
// 服务端只返回受限错误码，当前语言解释；未知错误保持可读提示，原始单元格始终文本转义。
const problems = computed(() => props.view.result?.errors.map((problem, index) => ({...problem, key: index,
  reason: t(te(`Decoration.importErrors.${problem.code}`) ? `Decoration.importErrors.${problem.code}` : 'Decoration.importErrors.unknown')})) || [])
</script>
<template>
  <a-modal :open="view.open" :title="t('Decoration.import.title')" :width="900" :mask-closable="false" :closable="!view.busy&&!view.uncertain" :keyboard="!view.busy&&!view.uncertain" @cancel="emit('close')">
    <a-space direction="vertical" style="width:100%" :size="16">
      <a-alert type="info" :message="t('Decoration.import.guide')" :description="t('Decoration.import.merge')" show-icon />
      <a-button :loading="view.downloading" :disabled="view.busy" @click="emit('download')">{{t('Decoration.import.template')}}</a-button>
      <a-upload-dragger accept=".xlsx" :multiple="false" :show-upload-list="false" :before-upload="beforeUpload" :disabled="view.busy||view.uncertain">
        <p>{{view.fileName||t('Decoration.import.drop')}}</p>
        <p class="ant-upload-hint">{{t('Decoration.import.limits')}}</p>
      </a-upload-dragger>
      <a-alert v-if="view.uncertain" type="warning" :message="t('Decoration.import.unknown')" :description="t('Decoration.import.unknownHint')" show-icon />
      <a-alert v-if="view.error" type="error" :message="view.error" show-icon />
      <a-alert v-if="view.result" :type="view.result.importedCount?'success':'warning'" :message="view.result.importedCount?t('Decoration.import.success',{count:view.result.importedCount,groups:view.result.configurations.length}):t('Decoration.import.validation',{total:view.result.totalCount,valid:view.result.validCount})" show-icon />
      <a-table v-if="problems.length" size="small" :columns="columns" :data-source="problems" :scroll="{x:760}" :pagination="{pageSize:10}" row-key="key" />
    </a-space>
    <template #footer>
      <a-button :disabled="view.busy||view.uncertain" @click="emit('close')">{{t('Decoration.import.close')}}</a-button>
      <template v-if="view.uncertain">
        <a-button :loading="view.checking" :disabled="view.busy" @click="emit('confirm')">{{t('Decoration.import.confirm')}}</a-button>
        <a-button v-if="view.resultMissing" :loading="view.uploading" :disabled="view.busy" @click="emit('retry')">{{t('Decoration.import.retry')}}</a-button>
      </template>
      <a-button v-else type="primary" :loading="view.uploading" :disabled="view.busy||!view.fileName||!!view.result?.importedCount" @click="emit('submit')">{{t('Decoration.import.start')}}</a-button>
    </template>
  </a-modal>
</template>
