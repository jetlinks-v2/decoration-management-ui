<script setup lang="ts">
import { ref } from 'vue'
import FilePreview from './FilePreview.vue'
import { Image as AImage } from 'ant-design-vue'
import { useFiles } from '../../hooks/decoration/useFiles'
import type { DecorationApi } from '../../services/decorationApi'
const props = withDefaults(defineProps<{ api: DecorationApi; value: string[]; projectId: string; decorationId?: string; purpose?: string; readonly?: boolean; multiple?: boolean; accept?: string; label?: string;downloadOnly?:boolean;downloadName?:string }>(),{multiple:true,accept:'.jpg,.jpeg,.png,.webp,.heic,.pdf,.doc,.docx,.xls,.xlsx,.gif,.bmp,.dwg,.dxf'})
const emit = defineEmits<{ 'update:value': [string[]] }>()
const input = ref<HTMLInputElement>()
const { uploading, error, previewId, thumbnails, upload, preview, download, remove } = useFiles(props, value => emit('update:value', value))
</script>
<template>
  <div class="decoration-files">
    <div v-for="(id, index) in value" :key="id" class="decoration-file">
      <a-button v-if="downloadOnly" type="link" @click="download(id,downloadName||(label==='下载'?undefined:label))">{{label||'下载模板'}}</a-button>
      <a-image v-else-if="thumbnails[id]" :src="thumbnails[id]" :width="120" :height="90" :alt="label || `附件 ${index + 1}`" style="object-fit:cover;border-radius:8px" />
      <span v-else>{{label || `附件 ${index + 1}`}}</span>
      <template v-if="!downloadOnly"><a-button type="link" @click="preview(id)">查看</a-button><a-button type="link" @click="download(id)">下载</a-button></template>
      <a-button v-if="!readonly" type="text" danger :disabled="uploading" @click="remove(id)">移除</a-button>
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
.decoration-file{display:flex;align-items:center;min-width:0;gap:4px;flex-wrap:wrap}
.decoration-file-upload,.decoration-files>.ant-alert{flex-basis:100%}
</style>
