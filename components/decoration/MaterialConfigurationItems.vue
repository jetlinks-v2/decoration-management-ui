<script setup lang="ts">
import type {MaterialDefinition} from '../../types/decoration'
import type {DecorationApi} from '../../services/decorationApi'
import {useMaterialItems} from '../../hooks/decoration/useMaterialItems'
import FilePicker from './FilePicker.vue'
const props=defineProps<{items:MaterialDefinition[];api:DecorationApi;projectId:string;busy:boolean}>()
const {sections,add,remove}=useMaterialItems(()=>props.items,()=>props.busy)
</script>
<template>
 <section v-for="section in sections" :key="section.kind" class="material-items">
  <a-divider orientation="left">{{section.title}}</a-divider>
  <a-button type="primary" :disabled="busy" class="material-items-add" @click="add(section.kind)">{{section.addLabel}}</a-button>
  <div class="material-items-scroll">
   <table class="material-items-table">
    <thead><tr><th class="material-index">序号</th><th>{{section.nameLabel}}</th><th v-if="section.kind==='material'">资料模板</th><th v-else class="material-switch">必填</th><th class="material-switch">启用</th><th class="material-action">操作</th></tr></thead>
    <tbody>
     <tr v-for="(item,index) in section.rows" :key="item.id">
      <td>{{index+1}}</td>
      <td><a-input v-model:value="item.name" :placeholder="`请输入${section.nameLabel}`" :disabled="busy" :maxlength="128" :aria-label="`${section.nameLabel}${index+1}`" /></td>
      <td v-if="section.kind==='material'" class="material-template"><FilePicker :api="api" :project-id="projectId" purpose="template" :value="item.templateFileId?[item.templateFileId]:[]" :readonly="busy" :multiple="false" accept=".pdf" label="查看资料模板" @update:value="ids=>item.templateFileId=ids.at(-1)" /></td>
      <td v-else><a-switch v-model:checked="item.required" :disabled="busy" :aria-label="`图纸${index+1}必填`" /></td>
      <td><a-switch v-model:checked="item.enabled" :disabled="busy" :aria-label="`${section.nameLabel}${index+1}启用`" /></td>
      <td><a-button type="link" danger :disabled="busy" @click="remove(item.id)">删除</a-button></td>
     </tr>
     <tr v-if="!section.rows.length"><td colspan="5" class="material-items-empty">暂无{{section.kind==='material'?'资料':'图纸'}}项</td></tr>
    </tbody>
   </table>
  </div>
 </section>
</template>
<style scoped>
.material-items-add{margin-bottom:12px}.material-items-scroll{overflow-x:auto}.material-items-table{width:100%;min-width:640px;border-collapse:collapse;table-layout:fixed}.material-items-table th,.material-items-table td{padding:10px 8px;border:1px solid var(--ant-color-border-secondary,#e8edf3);text-align:left}.material-items-table th{background:var(--ant-color-fill-alter,#f5f7fb);font-weight:500}.material-index{width:60px}.material-switch{width:90px}.material-action{width:80px}.material-template{width:40%}.material-items-empty{text-align:center!important;color:var(--ant-color-text-tertiary,#999);padding:24px!important}
</style>
