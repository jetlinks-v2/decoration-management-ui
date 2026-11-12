<script setup lang="ts">
import {ref} from 'vue'
import type {DecorationApi} from '../../services/decorationApi'
import {useAttachmentPreview} from '../../hooks/decoration/useAttachmentPreview'
const props=defineProps<{id:string;api:DecorationApi}>()
const container=ref<HTMLElement>()
const vm=useAttachmentPreview(props,()=>container.value)
</script>
<template>
  <div class="file-preview">
    <a-spin :spinning="vm.loading.value">
      <a-alert v-if="vm.error.value" type="warning" :message="vm.error.value" show-icon />
      <p class="filename">{{vm.name.value}}</p>
      <img v-if="vm.url.value&&vm.kind.value!=='pdf'" class="preview-image" :src="vm.url.value" :alt="vm.name.value" />
      <iframe v-if="vm.url.value&&vm.kind.value==='pdf'" :src="vm.url.value" :title="vm.name.value" class="pdf-preview" />
      <div v-show="vm.kind.value==='docx'" ref="container" class="word-preview" />
      <template v-if="vm.sheets.value.length">
        <a-select :value="vm.sheet.value" :options="vm.sheets.value.map(value=>({value,label:value}))" style="min-width:200px" @change="vm.selectSheet(String($event))" />
        <p v-if="vm.truncated.value">当前预览前2000行、100列，完整内容请下载原文件。</p>
        <div class="sheet-preview"><table><tbody><tr v-for="(row,i) in vm.rows.value" :key="i"><th>{{i+1}}</th><td v-for="(cell,j) in row" :key="j">{{cell}}</td></tr></tbody></table></div>
      </template>
      <template v-if="vm.kind.value==='doc'"><p>旧版Word正文预览，原始排版请下载查看。</p><pre>{{vm.text.value}}</pre></template>
    </a-spin>
  </div>
</template>
<style scoped>
.file-preview{min-height:160px}.filename{color:#777}.preview-image{display:block;max-width:100%;max-height:70vh;margin:auto;object-fit:contain}.pdf-preview{width:100%;height:70vh;border:0}.word-preview{overflow:auto;max-height:70vh}.word-preview :deep(.docx-wrapper){padding:16px;background:#eee}.word-preview :deep(section.docx){max-width:100%;box-sizing:border-box}.sheet-preview{overflow:auto;max-height:65vh;margin-top:12px}.sheet-preview table{border-collapse:collapse;min-width:100%;font-size:13px}.sheet-preview td,.sheet-preview th{border:1px solid #ddd;padding:6px 10px;white-space:pre-wrap;min-width:80px}.sheet-preview th{background:#f5f5f5;min-width:40px}pre{white-space:pre-wrap;font-family:inherit;max-height:65vh;overflow:auto}
</style>
