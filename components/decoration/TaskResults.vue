<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import type {Application,Task} from '../../types/decoration'
import type {DecorationApi} from '../../services/decorationApi'
import FilePicker from './FilePicker.vue'
const {t}=useI18n()
const label=(key:string)=>t(`Decoration.detailFields.${key}`)
const props=defineProps<{task:Task;row:Application;api:DecorationApi}>()
const entries=computed(()=>props.task.details.checks.filter(item=>item.enabled).map(item=>({item,result:props.task.details.results.find(result=>result.itemId===item.id)})))
const date=(time?:number)=>time?new Date(time).toLocaleString():'—'
</script>
<template>
 <a-collapse v-if="entries.length" ghost>
  <a-collapse-panel key="results" header="检查内容与结果">
   <div v-for="{item,result} in entries" :key="item.id" class="decoration-card">
    <a-descriptions class="detail-fields" :column="{xs:1,lg:2}" size="small">
      <a-descriptions-item :label="label('category')">{{item.category||'—'}}</a-descriptions-item><a-descriptions-item :label="label('checkName')">{{item.name}}</a-descriptions-item>
      <a-descriptions-item v-if="item.standard" :label="label('standard')" :span="2">{{item.standard}}</a-descriptions-item><a-descriptions-item v-if="item.example" :label="label('instructions')" :span="2">{{item.example}}</a-descriptions-item>
      <template v-if="item.min!=null||item.max!=null"><a-descriptions-item :label="label('minimum')">{{item.min??'—'}}</a-descriptions-item><a-descriptions-item :label="label('maximum')">{{item.max??'—'}}</a-descriptions-item></template>
      <a-descriptions-item v-if="item.exampleFileId" :label="label('referenceFiles')" :span="2"><FilePicker :value="[item.exampleFileId]" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly /></a-descriptions-item>
      <a-descriptions-item :label="label('value')">{{result?.value??'—'}}</a-descriptions-item><a-descriptions-item :label="label('result')">{{label(result?result.qualified?'qualified':'unqualified':'unfilled')}}</a-descriptions-item>
      <template v-if="result">
        <a-descriptions-item :label="label('attachments')" :span="2"><FilePicker :value="result.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly /></a-descriptions-item>
        <a-descriptions-item v-if="result.rectification" :label="label('rectification')" :span="2">{{result.rectification}}</a-descriptions-item><a-descriptions-item v-if="result.deadline" :label="label('deadline')">{{date(result.deadline)}}</a-descriptions-item>
      </template>
    </a-descriptions>
   </div>
  </a-collapse-panel>
 </a-collapse>
</template>
