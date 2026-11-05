<script setup lang="ts">
import { ref } from 'vue'
import { useFiles } from '../../hooks/decoration/useFiles'
import type { DecorationApi } from '../../services/decorationApi'
const props = withDefaults(defineProps<{ api: DecorationApi; value: string[]; projectId: string; decorationId?: string; purpose?: string; readonly?: boolean; multiple?: boolean; accept?: string; label?: string }>(),{multiple:true,accept:'.jpg,.jpeg,.png,.webp,.heic,.pdf,.doc,.docx,.dwg,.dxf'})
const emit = defineEmits<{ 'update:value': [string[]] }>()
const input = ref<HTMLInputElement>()
const { uploading, error, upload, preview, remove } = useFiles(props, value => emit('update:value', value))
</script>
<template>
  <div class="decoration-files">
    <div v-for="(id, index) in value" :key="id" class="decoration-file">
      <a-button type="link" @click="preview(id)">{{label || `附件 ${index + 1}`}}</a-button>
      <a-button v-if="!readonly" type="text" danger :disabled="uploading" @click="remove(id)">移除</a-button>
    </div>
    <div v-if="!readonly" class="decoration-file-upload">
      <input ref="input" hidden style="display:none" type="file" :multiple="multiple" :accept="accept" @change="upload($event)" />
      <a-button :loading="uploading" :disabled="!projectId || uploading" @click="input?.click()">上传文件</a-button>
      <small>单个文件最大20MB</small>
    </div>
    <a-alert v-if="error" type="error" :message="error" show-icon />
  </div>
</template>

<style scoped>
.decoration-file-upload{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.decoration-file-upload small{color:var(--ant-color-text-tertiary,#8c8c8c);font-size:12px}
.decoration-file{min-width:0;flex-wrap:wrap}
</style>
