<script setup lang="ts">
import type {CreateApplication,FormConfiguration} from '../../types/decoration'
import type {DecorationApi} from '../../services/decorationApi'
import {materialTemplate} from '../../services/materialTemplates'
import {useApplicationMaterials} from '../../hooks/decoration/useApplicationMaterials'
import FilePicker from './FilePicker.vue'
const props=withDefaults(defineProps<{api:DecorationApi;form:CreateApplication;configuration:FormConfiguration;disabled?:boolean;kind?:'material'|'drawing';titleOrientation?:'left'|'center'|'right'}>(),{titleOrientation:'left'})
const {sections,setFiles}=useApplicationMaterials(props.form,()=>props.configuration,()=>props.kind)
</script>
<template>
 <section v-for="section in sections" :key="section.kind" class="application-material-section">
  <a-divider :orientation="titleOrientation">{{section.title}}</a-divider>
  <p v-if="section.kind==='material'" class="application-material-tip">下载模板并打印，业主填写、签字后，拍照或扫描上传对应资料。</p>
  <a-empty v-if="!section.items.length" :description="`本项目无需提交${section.title}`" />
  <div v-for="item in section.items" :key="item.id" class="application-material-item">
   <h4><span v-if="item.required" class="required">*</span>{{item.name}}</h4>
   <template v-if="section.kind==='material'">
    <FilePicker v-if="item.templateFileId" :value="[item.templateFileId]" :api="api" :project-id="form.projectId" readonly download-only :download-name="item.name" :label="`下载${item.name}模板`" />
    <a-button v-else-if="materialTemplate(item)" type="link" :href="materialTemplate(item)!.url" :download="materialTemplate(item)!.name">下载{{item.name}}模板</a-button>
    <p v-else class="application-material-tip">该资料未配置模板</p>
   </template>
   <FilePicker :value="form.materials.find(value=>value.itemId===item.id)?.fileIds||[]" :api="api" :project-id="form.projectId" :readonly="disabled" @update:value="ids=>setFiles(item.id,ids)" />
  </div>
 </section>
</template>
<style scoped>
.application-material-item{padding:16px 0;border-bottom:1px solid var(--ant-color-border-secondary,#f0f0f0)}.application-material-item h4{margin:0 0 8px}.application-material-tip{color:var(--ant-color-text-secondary,#666);line-height:1.7}.required{color:var(--ant-color-error,#ff4d4f);margin-right:4px}
</style>
