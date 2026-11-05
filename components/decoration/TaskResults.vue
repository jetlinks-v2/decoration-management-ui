<script setup lang="ts">
import {computed} from 'vue'
import type {Application,Task} from '../../types/decoration'
import type {DecorationApi} from '../../services/decorationApi'
import FilePicker from './FilePicker.vue'
const props=defineProps<{task:Task;row:Application;api:DecorationApi}>()
const entries=computed(()=>props.task.details.checks.filter(item=>item.enabled).map(item=>({item,result:props.task.details.results.find(result=>result.itemId===item.id)})))
const date=(time?:number)=>time?new Date(time).toLocaleString():'—'
</script>
<template>
 <a-collapse v-if="entries.length" ghost>
  <a-collapse-panel key="results" header="检查内容与结果">
   <div v-for="{item,result} in entries" :key="item.id" class="decoration-card">
    <strong>{{item.category}} · {{item.name}}</strong>
    <p>{{item.standard||item.example||'—'}}</p>
    <p v-if="item.min!=null||item.max!=null">下限：{{item.min??'—'}} · 上限：{{item.max??'—'}}</p>
    <FilePicker v-if="item.exampleFileId" :value="[item.exampleFileId]" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly />
    <template v-if="result">
     <p>检查值：{{result.value??'—'}} · {{result.qualified?'合格':'不合格'}}</p>
     <FilePicker :value="result.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly />
     <p v-if="result.rectification">整改内容：{{result.rectification}}</p>
     <p v-if="result.deadline">整改截止日期：{{date(result.deadline)}}</p>
    </template>
    <p v-else>未填写</p>
   </div>
  </a-collapse-panel>
 </a-collapse>
</template>
