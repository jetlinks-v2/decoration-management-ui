<script setup lang="ts">
import type {CreateApplication} from '../../types/decoration'
import type {DecorationApi} from '../../services/decorationApi'
import {ref,onScopeDispose} from 'vue'
import {downloadBlob} from '../../services/blobDownload'
import {errorText} from '../../utils/decoration'
import FilePicker from './FilePicker.vue'
const props=defineProps<{api:DecorationApi;form:CreateApplication;disabled?:boolean}>()
const downloading=ref(false),error=ref('');let disposed=false
onScopeDispose(()=>{disposed=true})
async function downloadTemplate(){
 if(downloading.value||props.disabled)return
 const form={...props.form,selfInspectionItems:[]}
 downloading.value=true;error.value=''
 try{
  // 读取当前保存版本的模板附件；此处不重新生成文件。
  const configuration=await props.api.form(form.projectId,form.spaceId,form.customerId,form.decorationType)
  if(!configuration.selfInspectionTemplateFileId)throw new Error('请先保存本项目的装修资料配置，生成装修自检表模板')
  const blob=await props.api.download(configuration.selfInspectionTemplateFileId)
  if(!disposed)downloadBlob(blob,'装修自检表.pdf')
 }catch(e){if(!disposed)error.value=errorText(e)}finally{if(!disposed)downloading.value=false}
}
</script>
<template>
 <section class="self-inspection-upload">
  <p>下载自检表交由业主填写、签字，再导入签字后的照片、扫描件或文件。</p>
  <a-alert v-if="error" :message="error" type="error" show-icon />
  <a-button type="link" :loading="downloading" :disabled="disabled" @click="downloadTemplate">下载装修自检表模板</a-button>
  <a-form-item label="签字后的装修自检表" required><FilePicker v-model:value="form.selfInspectionFiles" :api="api" :project-id="form.projectId" :readonly="disabled" /></a-form-item>
 </section>
</template>
<style scoped>
.self-inspection-upload>p{color:var(--ant-color-text-secondary,#666);line-height:1.7}
</style>
