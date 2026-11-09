<script setup lang="ts">
import FilterBar from './FilterBar.vue'
import {computed,ref} from 'vue'
import {useTaskWorkspace} from '../../hooks/decoration/useTaskWorkspace'
import {useLeaveGuard} from '../../hooks/decoration/useLeaveGuard'
import {useDiscardConfirm} from '../../hooks/decoration/useDiscardConfirm'
import {useI18n} from 'vue-i18n'
import {decorationApi} from '../../api/decoration'
import {taskStatusKeys} from '../../utils/decoration'
import type {Task} from '../../types/decoration'
import {useDictionaries} from '../../hooks/useDecorationDictionaries'
import ApplicationDetail from './ApplicationDetail.vue'
import ConditionFilter from '@jetlinks-web-core/components/ConditionFilter'
import './decoration.css'
const props=withDefaults(defineProps<{kind:Task['kind'];allRecords?:boolean;decorationId?:string}>(),{allRecords:false})
const {projectId,tree,terms,changeFilters,error,detailId,taskId,table,permissions,params,request,loadProjects,changeProject:setProject,reload,open}=useTaskWorkspace(()=>props.kind,()=>props.allRecords,()=>props.decorationId)
const detail=ref<{dirty:boolean;saving:boolean;uncertain:boolean}>()
const {t}=useI18n()
const dictionary=useDictionaries()
const acceptance=computed(()=>props.kind==='firstAcceptance'||props.kind==='secondAcceptance')
const confirmDiscard=useDiscardConfirm(()=>t('Decoration.unsaved'))
const {allowLeave}=useLeaveGuard({dirty:()=>!!detail.value?.dirty,blocked:()=>!!detail.value?.saving||!!detail.value?.uncertain,confirmDiscard,onBlocked:()=>{error.value=t('Decoration.waitForResult')},onDiscard:()=>{detailId.value=''}})
async function closeDetail(){if(await allowLeave())detailId.value=''}
async function changeProject(value?:string){if(await allowLeave()){taskId.value='';setProject(value)}}
function retry(){void loadProjects();reload()}
defineExpose({allowLeave})
const title=computed(()=>props.kind==='inspectionRecord'&&props.allRecords?'巡检记录':({daily:'装修巡检任务',inspectionRecord:'违规记录',firstAcceptance:'首次验收记录',secondAcceptance:'二次验收记录'})[props.kind])
const identifier=computed(()=>({daily:'巡检任务编号',inspectionRecord:props.allRecords?'巡检记录编号':'违规处理编号',firstAcceptance:'首次验收任务编号',secondAcceptance:'二次验收任务编号'})[props.kind])
const columns=computed(()=>[
 {title:identifier.value,dataIndex:'id',width:260},
 {title:'装修编号',dataIndex:'number',width:200},
 {title:'所属项目',dataIndex:'projectName',width:160},
 {title:'房号',dataIndex:'spaceName',width:200},
 {title:'业主',dataIndex:'ownerName',width:120},
 {title:'联系电话',dataIndex:'contactPhone',width:140},
 {title:'施工单位',dataIndex:'constructionUnit',width:180},
 {title:'施工负责人',dataIndex:'constructionManager',width:120},
 {title:'负责人电话',dataIndex:'managerPhone',width:140},
 {title:'房屋类型',dataIndex:'houseType',width:120,scopedSlots:true},
 {title:'装修类型',dataIndex:'decorationType',width:120,scopedSlots:true},
 ...(props.kind==='daily'?[{title:'业主申请时间',dataIndex:'applicationTime',width:180,scopedSlots:true},{title:'装修开始时间',dataIndex:'decorationStartTime',width:180,scopedSlots:true},{title:'装修竣工时间',dataIndex:'completionTime',width:180,scopedSlots:true}]:[]),
 ...(acceptance.value?[{title:'申请验收日期',dataIndex:'acceptanceDate',width:180,scopedSlots:true},{title:'提交验收申请时间',dataIndex:'acceptanceRequestTime',width:180,scopedSlots:true},{title:'验收申请来源',dataIndex:'acceptanceSource',width:120,scopedSlots:true},{title:'验收申请人',dataIndex:'acceptanceRequesterName',width:120}]:[]),
 {title:props.kind.includes('Acceptance')?'验收人':'巡检人',dataIndex:'assigneeName',width:120},
 ...(props.kind==='inspectionRecord'?[{title:'巡检结果',dataIndex:'inspectionResult',width:120,scopedSlots:true},{title:'违章位置',dataIndex:'locations',width:180,scopedSlots:true},{title:'整改复核角色',dataIndex:'reviewRoleName',width:160,scopedSlots:true}]:[]),
 {title:'办理状态',dataIndex:'status',width:160,scopedSlots:true},
 ...(acceptance.value?[{title:'验收轮次',dataIndex:'count',width:140,scopedSlots:true}]:[]),
 ...(props.kind==='daily'?[{title:'巡检日期',dataIndex:'scheduledDate',width:130,scopedSlots:true},{title:'可办理角色',dataIndex:'inspectionRoles',width:200,scopedSlots:true},{title:'巡检开始时间',dataIndex:'startTime',width:180,scopedSlots:true},{title:'巡检结束时间',dataIndex:'endTime',width:180,scopedSlots:true}]:[]),
 {title:'创建时间',dataIndex:'createTime',width:180,scopedSlots:true},
 {title:'更新时间',dataIndex:'modifyTime',width:180,scopedSlots:true},
 {title:'任务登记人',dataIndex:'creatorName',width:120},
 {title:'操作',dataIndex:'actions',width:140,fixed:'right',scopedSlots:true}
])
function statusText(value:string){
 if(value==='pending'&&props.kind.includes('Acceptance'))return t('Decoration.taskStates.waitingAcceptance')
 if(value==='passed'&&props.kind==='inspectionRecord')return t('Decoration.taskStates.normal')
 const key=`Decoration.taskStates.${value}`
 return t(key)===key?value:t(key)
}
const fields=computed(()=>[
 ...['id','number','projectName','spaceName','ownerName','contactPhone','constructionUnit','constructionManager','managerPhone','assigneeName','creatorName',...(acceptance.value?['acceptanceRequesterName']:[])].map(dataIndex=>({dataIndex,title:columns.value.find(c=>c.dataIndex===dataIndex)?.title||dataIndex,search:{type:'string'}})),
 {title:'办理状态',dataIndex:'status',search:{type:'select',options:taskStatusKeys(props.kind,props.allRecords).map(value=>({value,label:statusText(value)}))}},
 ...['createTime','modifyTime',...(acceptance.value?['acceptanceDate','acceptanceRequestTime']:[]),...(props.kind==='daily'?['applicationTime','decorationStartTime','completionTime']:[])].map(dataIndex=>({dataIndex,title:columns.value.find(c=>c.dataIndex===dataIndex)?.title||dataIndex,search:{type:'date'}})),
 {title:'房屋类型',dataIndex:'houseType',search:{type:'select',options:dictionary.options('house-type')}}
])
const date=(time?:number)=>time?new Date(time).toLocaleString():'—'
const locations=(record:Task)=>record.details.violations.map(item=>item.location).join('、')||'—'
</script>
<template>
 <section class="decoration-workspace" :class="{'decoration-task-embedded':decorationId}">
  <div class="decoration-toolbar"><h2>{{title}}</h2></div>
  <FilterBar :project-id="projectId" :tree-data="tree" @project-change="changeProject" @refresh="reload">
   <ConditionFilter v-model="terms" :fields="fields" @change="changeFilters" />
  </FilterBar>
  <a-alert v-if="error" type="error" :message="error" show-icon><template #action><a-button @click="retry">重试</a-button></template></a-alert>
  <a-alert v-if="dictionary.failed.value" type="error" message="基础字典加载失败"><template #action><a-button @click="dictionary.reload">重试</a-button></template></a-alert>
  <j-pro-table ref="table" :key="kind+projectId+allRecords" row-key="id" mode="TABLE" type="PAGE" :columns="columns" :request="request" :params="params" :pagination="{pageSize:20}" :scroll="{x:columns.reduce((width,column)=>width+column.width,0)}" :alert-show="false">
   <template #status="record">{{statusText(record.status)}}</template>
   <template #inspectionResult="record">{{t(`Decoration.taskStates.${record.details.violations.length?'violation':'normal'}`)}}</template>
   <template #locations="record">{{locations(record)}}</template>
   <template #reviewRoleName="record">{{record.details.reviewRoleName||'—'}}</template>
   <template #count="record">第 {{record.round}} 轮</template>
   <template #scheduledDate="record">{{record.details.scheduledDate||'—'}}</template>
   <template #inspectionRoles="record">{{record.details.inspectionRoles?.map((role:{roleName?:string})=>role.roleName).join('、')||'—'}}</template>
   <template #startTime="record">{{date(record.details.startTime)}}</template>
   <template #endTime="record">{{date(record.details.endTime)}}</template>
   <template #createTime="record">{{date(record.createTime)}}</template>
   <template #modifyTime="record">{{date(record.modifyTime)}}</template>
   <template #houseType="record">{{dictionary.text('house-type',record.houseType)}}</template>
   <template #decorationType="record">{{({first:'首次装修',second:'二次装修'} as Record<string,string>)[record.decorationType]||record.decorationType||'—'}}</template>
   <template #applicationTime="record">{{date(record.applicationTime)}}</template>
   <template #decorationStartTime="record">{{date(record.decorationStartTime)}}</template>
   <template #completionTime="record">{{date(record.completionTime)}}</template>
   <template #acceptanceDate="record">{{date(record.acceptanceDate)}}</template>
   <template #acceptanceRequestTime="record">{{date(record.acceptanceRequestTime)}}</template>
   <template #acceptanceSource="record">{{record.acceptanceSource?t(`Decoration.acceptanceSources.${record.acceptanceSource}`):'—'}}</template>
   <template #actions="record"><a-button type="link" @click="open(record.decorationId,record.id)">查看与办理</a-button></template>
   <template #emptyText><a-empty description="暂无记录" /></template>
  </j-pro-table>
  <a-modal :open="!!detailId" title="装修任务" :width="1080" :style="{top:'32px',maxWidth:'calc(100vw - 32px)'}" :body-style="{maxHeight:'calc(100vh - 160px)',overflowY:'auto'}" :footer="null" :destroy-on-close="true" :mask-closable="false" @cancel="closeDetail">
   <ApplicationDetail v-if="detailId" ref="detail" :id="detailId" :task-id="taskId" :api="decorationApi" :permissions="permissions" @changed="reload" />
  </a-modal>
 </section>
</template>

<style scoped>
.decoration-task-embedded{padding:0;height:auto}
.decoration-task-embedded .decoration-toolbar h2{display:none}
.decoration-task-embedded .decoration-toolbar{justify-content:flex-end;margin-bottom:12px}
</style>
