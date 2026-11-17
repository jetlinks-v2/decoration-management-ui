<script setup lang="ts">
import {ref} from 'vue'
import type {DecorationApi} from '../../services/decorationApi'
import {useAttachmentPreview} from '../../hooks/decoration/useAttachmentPreview'
const props=defineProps<{id:string;api:DecorationApi;contained?:boolean}>()
const container=ref<HTMLElement>()
const vm=useAttachmentPreview(props,()=>container.value)
</script>
<template>
  <div class="file-preview" :class="{'file-preview-contained':contained}">
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
.file-preview{width:100%;min-width:0;max-width:100%;min-height:160px}.file-preview :deep(.ant-spin-nested-loading),.file-preview :deep(.ant-spin-container){min-width:0;max-width:100%}.filename{color:#777;overflow-wrap:anywhere}.preview-image{display:block;max-width:100%;max-height:70vh;margin:auto;object-fit:contain}.pdf-preview{display:block;max-width:100%;width:100%;height:70vh;border:0}.word-preview{width:100%;min-width:0;overflow:auto;max-height:70vh;overscroll-behavior:contain}.word-preview :deep(.docx-wrapper){padding:16px;background:#eee}.word-preview :deep(section.docx){max-width:100%;box-sizing:border-box}.sheet-preview{width:100%;min-width:0;max-width:100%;overflow:auto;max-height:65vh;margin-top:12px;overscroll-behavior:contain}.sheet-preview table{border-collapse:collapse;min-width:100%;font-size:13px}.sheet-preview td,.sheet-preview th{border:1px solid #ddd;padding:6px 10px;white-space:pre-wrap;min-width:80px}.sheet-preview th{background:#f5f5f5;min-width:40px}pre{max-width:100%;white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit;max-height:65vh;overflow:auto}
/* 审核弹窗由父级分配剩余高度，仅文档本身负责滚动。 */
.file-preview-contained{display:flex;flex-direction:column;min-height:0;overflow:hidden}
.file-preview-contained :deep(.ant-spin-nested-loading),.file-preview-contained :deep(.ant-spin-container){display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden}
.file-preview-contained .filename,.file-preview-contained .ant-select,.file-preview-contained p{flex-shrink:0}
.file-preview-contained .ant-select{align-self:flex-start;max-width:100%}
.file-preview-contained .sheet-preview,.file-preview-contained .word-preview,.file-preview-contained pre{flex:1;min-height:0;max-height:none}
.file-preview-contained .pdf-preview{flex:1;min-height:0;height:auto}
.file-preview-contained .preview-image{flex:1;min-height:0;width:100%;max-height:100%;object-fit:contain}
</style>
