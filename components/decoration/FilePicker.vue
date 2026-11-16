<script setup lang="ts">
import { ref } from 'vue'
import FilePreview from './FilePreview.vue'
import {DownloadOutlined,DeleteOutlined,FileTextOutlined} from '@ant-design/icons-vue'
import { useFiles } from '../../hooks/decoration/useFiles'
import type { DecorationApi } from '../../services/decorationApi'
const props = withDefaults(defineProps<{ api: DecorationApi; value: string[]; projectId: string; decorationId?: string; purpose?: string; readonly?: boolean; multiple?: boolean; accept?: string; label?: string;downloadOnly?:boolean;downloadName?:string }>(),{multiple:true,accept:'.jpg,.jpeg,.png,.webp,.heic,.pdf,.doc,.docx,.xls,.xlsx,.gif,.bmp,.dwg,.dxf'})
const emit = defineEmits<{ 'update:value': [string[]] }>()
const input = ref<HTMLInputElement>()
const { uploading, error, previewId, thumbnails, upload, preview, download, remove } = useFiles(props, value => emit('update:value', value))
</script>
<template>
  <div class="decoration-files" :class="{'decoration-files-download':downloadOnly}">
    <div v-for="(id, index) in value" :key="id" class="decoration-file" :class="{'decoration-file-image':!downloadOnly&&!!thumbnails[id]}">
      <a-button v-if="downloadOnly" type="link" @click="download(id,downloadName||(label==='下载'?undefined:label))">{{label||'下载模板'}}</a-button>
      <template v-else>
        <button v-if="thumbnails[id]" type="button" class="decoration-file-preview" :aria-label="`查看${label || `附件 ${index + 1}`}`" title="查看图片" @click="preview(id)">
          <img :src="thumbnails[id]" :alt="label || `附件 ${index + 1}`" />
        </button>
        <button v-else type="button" class="decoration-file-document" :title="`查看${label || `附件 ${index + 1}`}`" @click="preview(id)"><FileTextOutlined /><span>{{label || `附件 ${index + 1}`}}</span></button>
        <div class="decoration-file-actions">
          <button type="button" class="decoration-file-action" title="下载" :aria-label="`下载${label || `附件 ${index + 1}`}`" @click="download(id)"><DownloadOutlined /></button>
          <button v-if="!readonly" type="button" class="decoration-file-action decoration-file-action-danger" title="移除" :aria-label="`移除${label || `附件 ${index + 1}`}`" :disabled="uploading" @click="remove(id)"><DeleteOutlined /></button>
        </div>
      </template>
      <button v-if="downloadOnly&&!readonly" type="button" class="decoration-file-action decoration-file-action-danger" title="移除" :aria-label="`移除${label || `附件 ${index + 1}`}`" :disabled="uploading" @click="remove(id)"><DeleteOutlined /></button>
    </div>
    <div v-if="!readonly" class="decoration-file-upload">
      <input ref="input" hidden style="display:none" type="file" :multiple="multiple" :accept="accept" @change="upload($event)" />
      <a-button :loading="uploading" :disabled="!projectId || uploading" @click="input?.click()">上传文件</a-button>
      <small>单个文件最大20MB</small>
    </div>
    <a-alert v-if="error" type="error" :message="error" show-icon />
    <a-modal :open="!!previewId" title="查看附件" :width="1000" :footer="null" destroy-on-close @cancel="previewId=''">
      <FilePreview v-if="previewId" :key="previewId" :id="previewId" :api="api" />
    </a-modal>
  </div>
</template>

<style scoped>
.decoration-file-upload{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.decoration-file-upload small{color:var(--ant-color-text-tertiary,#8c8c8c);font-size:12px}
.decoration-files{display:flex;flex-wrap:wrap;gap:12px}
.decoration-file{display:flex;align-items:center;min-width:0;max-width:100%;gap:8px;padding:6px;border:1px solid var(--ant-color-border-secondary,#e8edf3);border-radius:10px;background:var(--ant-color-bg-container,#fff)}
.decoration-files-download .decoration-file{padding:0;border:0;border-radius:0;background:transparent}
.decoration-file-image{flex-direction:column;align-items:stretch;gap:4px}
.decoration-file-preview{display:block;width:120px;height:90px;padding:0;border:0;border-radius:6px;overflow:hidden;background:var(--ant-color-fill-alter,#f5f7fa);cursor:zoom-in}
.decoration-file-preview img{display:block;width:100%;height:100%;object-fit:cover}
.decoration-file-document{display:flex;align-items:center;gap:8px;min-width:0;padding:6px 8px;border:0;background:transparent;color:var(--ant-color-primary,#2563eb);font:inherit;text-align:left;cursor:pointer}
.decoration-file-document span{overflow-wrap:anywhere}
.decoration-file-actions{display:flex;align-items:center;justify-content:flex-end;gap:4px;flex-shrink:0}
.decoration-file-action{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--ant-color-text-secondary,#66758c);font-size:18px;cursor:pointer;transition:background .15s,color .15s}
.decoration-file-action:hover{background:var(--ant-color-primary-bg,#edf4ff);color:var(--ant-color-primary,#2563eb)}
.decoration-file-action-danger:hover{background:var(--ant-color-error-bg,#fff1f0);color:var(--ant-color-error,#e5484d)}
.decoration-file-action:disabled{opacity:.4;cursor:not-allowed}
.decoration-file-preview:focus-visible,.decoration-file-document:focus-visible,.decoration-file-action:focus-visible{outline:2px solid var(--ant-color-primary,#2563eb);outline-offset:2px}
.decoration-file-upload,.decoration-files>.ant-alert{flex-basis:100%}
</style>
