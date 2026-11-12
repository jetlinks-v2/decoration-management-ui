<script setup lang="ts">
import FilterBar from './FilterBar.vue'
import DecorationStatus from './DecorationStatus.vue'
import {computed,ref} from 'vue'
import {useTaskWorkspace} from '../../hooks/decoration/useTaskWorkspace'
import {useLeaveGuard} from '../../hooks/decoration/useLeaveGuard'
import {useDiscardConfirm} from '../../hooks/decoration/useDiscardConfirm'
import {useI18n} from 'vue-i18n'
import {decorationApi} from '../../api/decoration'
import {taskStatusKeys} from '../../utils/decoration'
import type {Task,AcceptanceRecord} from '../../types/decoration'
import {useDictionaries} from '../../hooks/useDecorationDictionaries'
import {useDetailPermissions} from '../../hooks/decoration/useDetailPermissions'
import ApplicationDetail from './ApplicationDetail.vue'
import ConditionFilter from '@jetlinks-web-core/components/ConditionFilter'
import './decoration.css'
const props=withDefaults(defineProps<{kind:Task['kind'];allRecords?:boolean;decorationId?:string}>(),{allRecords:false})
const {projectId,tree,terms,changeFilters,error,detailId,taskId,inspectionTaskId,mergedInspection,table,permissions,params,request,loadProjects,changeProject:setProject,reload,open:openRecord}=useTaskWorkspace(()=>props.kind,()=>props.allRecords,()=>props.decorationId)
const detailAction=ref<string>()
function open(id:string,task:string,action?:string){detailAction.value=action;openRecord(id,task)}
// 与共用详情使用同一既有授权来源，避免详情能指派而列表隐藏入口。
const acceptancePermissions=useDetailPermissions(()=>props.kind==='firstAcceptance'?'first':'second')
function canAssignAcceptance(row:Task|AcceptanceRecord){return acceptance.value&&acceptancePermissions.value.assign&&row.status==='waiting_assignment'&&row.decorationStatus===(props.kind==='firstAcceptance'?'first_acceptance_waiting':'second_acceptance_waiting')}
function canRequestAcceptance(row:AcceptanceRecord){return acceptance.value&&acceptancePermissions.value.acceptance&&row.requestAllowed===true}
const detail=ref<{dirty:boolean;saving:boolean;uncertain:boolean}>()
const {t}=useI18n()
const dictionary=useDictionaries()
const inspectionPermissions=useDetailPermissions(()=>'inspection')
const acceptance=computed(()=>props.kind==='firstAcceptance'||props.kind==='secondAcceptance')
const confirmDiscard=useDiscardConfirm(()=>t('Decoration.unsaved'))
const {allowLeave,allowClose}=useLeaveGuard({dirty:()=>!!detail.value?.dirty,blocked:()=>!!detail.value?.saving||!!detail.value?.uncertain,confirmDiscard,onBlocked:()=>{error.value=t('Decoration.waitForResult')},onDiscard:()=>{detailId.value=''}})
function closeDetail(){if(allowClose())detailId.value=''}
async function changeProject(value?:string){if(await allowLeave()){taskId.value='';setProject(value)}}
function retry(){void loadProjects();reload()}
defineExpose({allowLeave,allowClose})
const title=computed(()=>props.kind==='inspectionRecord'&&props.allRecords?'巡检记录':({daily:'装修巡检任务',inspectionRecord:'违规记录',firstAcceptance:'首次验收',secondAcceptance:'二次验收'})[props.kind])
const identifier=computed(()=>({daily:'巡检任务编号',inspectionRecord:props.allRecords?'巡检记录编号':'违规处理编号',firstAcceptance:'首次验收记录编号',secondAcceptance:'二次验收记录编号'})[props.kind])
const columns=computed(()=>mergedInspection.value?[
 {title:'巡检日期',dataIndex:'scheduledDate',width:140,scopedSlots:true},
 {title:'所属项目',dataIndex:'projectName',width:180},
 {title:'房号',dataIndex:'spaceName',width:220},
 {title:'巡检人',dataIndex:'assigneeName',width:140,scopedSlots:true},
 {title:'巡检结果',dataIndex:'inspectionResult',width:120,scopedSlots:true},
 {title:'办理状态',dataIndex:'status',width:160,scopedSlots:true},
 {title:'更新时间',dataIndex:'modifyTime',width:180,scopedSlots:true},
 {title:'装修状态',dataIndex:'decorationStatus',width:180,fixed:'right',scopedSlots:true},
 {title:'操作',dataIndex:'actions',width:140,fixed:'right',scopedSlots:true}
 ]:[
 ...(!acceptance.value?[{title:identifier.value,dataIndex:'id',width:260}]:[]),
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
 {title:props.kind.includes('Acceptance')?'验收人':'巡检人',dataIndex:'assigneeName',width:120,scopedSlots:true},
 ...(props.kind==='inspectionRecord'?[{title:'巡检结果',dataIndex:'inspectionResult',width:120,scopedSlots:true},{title:'违章位置',dataIndex:'locations',width:180,scopedSlots:true},{title:'整改复核角色',dataIndex:'reviewRoleName',width:160,scopedSlots:true}]:[]),
 ...(!acceptance.value?[{title:'办理状态',dataIndex:'status',width:160,scopedSlots:true}]:[]),
 ...(acceptance.value?[{title:'最新轮次',dataIndex:'count',width:140,scopedSlots:true}]:[]),
 ...(props.kind==='daily'?[{title:'巡检日期',dataIndex:'scheduledDate',width:130,scopedSlots:true},{title:'可办理角色',dataIndex:'inspectionRoles',width:200,scopedSlots:true},{title:'巡检开始时间',dataIndex:'startTime',width:180,scopedSlots:true},{title:'巡检结束时间',dataIndex:'endTime',width:180,scopedSlots:true}]:[]),
 {title:'创建时间',dataIndex:'createTime',width:180,scopedSlots:true},
 {title:'更新时间',dataIndex:'modifyTime',width:180,scopedSlots:true},
 ...(!acceptance.value?[{title:'任务登记人',dataIndex:'creatorName',width:120}]:[]),
 ...(acceptance.value?[{title:'办理状态',dataIndex:'status',width:160,fixed:'right',scopedSlots:true}]:[]),
 {title:'装修状态',dataIndex:'decorationStatus',width:180,fixed:'right',scopedSlots:true},
 {title:'操作',dataIndex:'actions',width:acceptance.value?220:140,fixed:'right',scopedSlots:true}
])
function statusText(value:string){
 if(mergedInspection.value){
  const label=({pending:'待巡检',completed:'已巡检',passed:'已巡检',owner_rectification:'待整改',waiting_review:'待复核',rectification_rejected:'复核驳回',rectified:'整改完成',reissued:'已重发'} as Record<string,string>)[value]
  if(label)return label
 }
 if(value==='waiting_assignment')return t('Decoration.taskStates.waiting_assignment')
 if(value==='not_requested'&&acceptance.value)return t('Decoration.taskStates.not_requested')
 if(value==='pending'&&props.kind.includes('Acceptance'))return t('Decoration.taskStates.waitingAcceptance')
 if(value==='passed'&&props.kind==='inspectionRecord')return t('Decoration.taskStates.normal')
 const key=`Decoration.taskStates.${value}`
 return t(key)===key?value:t(key)
}
const fields=computed(()=>mergedInspection.value?[
 {title:'房号',dataIndex:'spaceName',search:{type:'string'}},
 {title:'更新时间',dataIndex:'modifyTime',search:{type:'date',termTypeOptions:['btw']}}
 ]:[
 ...[...(!acceptance.value?['id']:[]),'number','projectName','spaceName','ownerName','contactPhone','constructionUnit','constructionManager','managerPhone','assigneeName',...(acceptance.value?['acceptanceRequesterName']:['creatorName'])].map(dataIndex=>({dataIndex,title:columns.value.find(c=>c.dataIndex===dataIndex)?.title||dataIndex,search:{type:'string'}})),
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
   <template #decorationStatus="record"><DecorationStatus :value="record.decorationStatus" /></template>
   <template #status="record">{{statusText(record.status)}}</template>
   <template #inspectionResult="record">{{mergedInspection?(record.inspectionResult==='pending'?'—':t(`Decoration.taskStates.${record.inspectionResult}`)):t(`Decoration.taskStates.${record.details.violations.length?'violation':'normal'}`)}}</template>
   <template #assigneeName="record">{{record.assigneeName||'—'}}</template>
   <template #locations="record">{{locations(record)}}</template>
   <template #reviewRoleName="record">{{record.details.reviewRoleName||'—'}}</template>
   <template #count="record">{{record.round?`第 ${record.round} 轮`:'—'}}</template>
   <template #scheduledDate="record">{{(mergedInspection?record.scheduledDate:record.details.scheduledDate)||'—'}}</template>
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
   <template #actions="record"><a-space><a-button v-if="canRequestAcceptance(record)" type="link" @click="open(record.decorationId,record.id,'acceptance')">发起验收</a-button><a-button v-if="canAssignAcceptance(record)" type="link" @click="open(record.decorationId,record.id,'acceptance/assign')">指派</a-button><a-button type="link" @click="open(record.decorationId,record.id)">{{mergedInspection?(record.status==='pending'&&record.feedbackAllowed&&inspectionPermissions.handle?'去巡检':'详情'):acceptance?'详情':'查看与办理'}}</a-button></a-space></template>
   <template #emptyText><a-empty description="暂无记录" /></template>
  </j-pro-table>
  <a-modal :open="!!detailId" class="decoration-detail-modal" :title="acceptance||mergedInspection?title:'装修任务'" :width="1400" :style="{top:'32px',maxWidth:'calc(100vw - 32px)'}" :body-style="{maxHeight:'calc(100vh - 160px)',overflowY:'auto'}" :footer="null" :destroy-on-close="true" :mask-closable="false" @cancel="closeDetail">
   <ApplicationDetail v-if="detailId" ref="detail" :id="detailId" :task-id="taskId" :inspection-task-id="inspectionTaskId" :api="decorationApi" :permissions="permissions" :initial-action="detailAction" :initial-tab="kind==='firstAcceptance'?'first':kind==='secondAcceptance'?'second':'tasks'" @changed="reload" />
  </a-modal>
 </section>
</template>

<style scoped>
.decoration-task-embedded{padding:0;height:auto}
.decoration-task-embedded .decoration-toolbar h2{display:none}
.decoration-task-embedded .decoration-toolbar{justify-content:flex-end;margin-bottom:12px}
</style>
