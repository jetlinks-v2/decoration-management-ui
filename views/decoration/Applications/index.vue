<script setup lang="ts">
import FilterBar from '../../../components/decoration/FilterBar.vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ConditionFilter from '@jetlinks-web-core/components/ConditionFilter'
import { decorationApi } from '../../../api/decoration'
import { useWorkspace } from '../../../hooks/decoration/useWorkspace'
import { useLeaveGuard } from '../../../hooks/decoration/useLeaveGuard'
import { statusKeys, materialReviewState, permitStatus, permitIsActive } from '../../../utils/decoration'
import { useDictionaries } from '../../../hooks/useDecorationDictionaries'
import ApplicationForm from '../../../components/decoration/ApplicationForm.vue'
import ApplicationDetail from '../../../components/decoration/ApplicationDetail.vue'
import type {Application} from '../../../types/decoration'
import '../../../components/decoration/decoration.css'
const props=withDefaults(defineProps<{mode?:string}>(),{mode:'all'})
const {t}=useI18n()
const dictionary=useDictionaries()
const {projectId,tree,terms,changeFilters,error,loading,detailId,createOpen,table,permissions,params,request,loadProjects,changeProject:setProject,reload,exportRows}=useWorkspace(()=>props.mode)
const form=ref<{dirty:boolean;saving:boolean;uncertain:boolean}>(),detail=ref<{dirty:boolean;saving:boolean;uncertain:boolean}>()
const {allowLeave}=useLeaveGuard({
 dirty:()=>!!form.value?.dirty||!!detail.value?.dirty,
 blocked:()=>!!form.value?.saving||!!form.value?.uncertain||!!detail.value?.saving||!!detail.value?.uncertain,
 confirmDiscard:()=>window.confirm(t('Decoration.unsaved')),
 onBlocked:()=>{error.value=t('Decoration.waitForResult')},
 onDiscard:()=>{createOpen.value=false;detailId.value=''}
})
const titles:Record<string,string>={all:'装修记录',review:'在线审核',permits:'装修备案证明',first:'首次验收',second:'二次验收',inspection:'分配巡检任务',violations:'违规记录',selfInspection:'装修自检表'}
const columns=computed(()=>[
 {title:'装修编号',dataIndex:'number',width:200,scopedSlots:true},{title:'所属项目',dataIndex:'projectName',width:160},{title:'房号',dataIndex:'spaceName',width:200},{title:'业主',dataIndex:'ownerName',width:120},{title:'联系电话',dataIndex:'contactPhone',width:140},
 {title:'施工单位',dataIndex:'constructionUnit',width:180},{title:'施工负责人',dataIndex:'constructionManager',width:120},{title:'负责人电话',dataIndex:'managerPhone',width:140},
 {title:'房屋类型',dataIndex:'houseType',width:120,scopedSlots:true},{title:'装修类型',dataIndex:'decorationType',width:120,scopedSlots:true},
 {title:'申请时间',dataIndex:'createTime',width:180,scopedSlots:true},{title:'开始时间',dataIndex:'startTime',width:180,scopedSlots:true},{title:'竣工时间',dataIndex:'completionTime',width:180,scopedSlots:true},
 ...(['first','second'].includes(props.mode)?[{title:'申请验收日期',dataIndex:'acceptanceDate',width:180,scopedSlots:true},{title:'提交验收申请时间',dataIndex:'acceptanceRequestTime',width:180,scopedSlots:true},{title:'验收申请人',dataIndex:'acceptanceRequesterName',width:120},{title:'验收申请来源',dataIndex:'acceptanceSource',width:120,scopedSlots:true}]:[]),
 ...(props.mode==='review'?[{title:'资料审核状态',dataIndex:'materialReview',width:120,scopedSlots:true},{title:'图纸审核状态',dataIndex:'drawingReview',width:120,scopedSlots:true},{title:'保证金审核状态',dataIndex:'depositReviewStatus',width:140,scopedSlots:true}]:[]),
 ...(['all','permits'].includes(props.mode)?[{title:'备案编号',dataIndex:'permitNumber',width:200,scopedSlots:true},{title:'备案申报人',dataIndex:'permitApprover',width:120,scopedSlots:true},{title:t('Decoration.record.approverPhone'),dataIndex:'permitApproverPhone',width:180,scopedSlots:true},{title:'是否委托',dataIndex:'entrusted',width:100,scopedSlots:true},{title:'备案有效期',dataIndex:'validity',width:340,scopedSlots:true},{title:'打印时间',dataIndex:'printTime',width:180,scopedSlots:true}]:[]),
 ...(props.mode==='permits'?[{title:t('Decoration.permitStatusTitle'),dataIndex:'permitStatus',width:180,scopedSlots:true}]:[]),
 ...(props.mode==='all'?[{title:t('Decoration.record.active'),dataIndex:'permitActive',width:120,scopedSlots:true},{title:'装修结束时间',dataIndex:'actualEndTime',width:180,scopedSlots:true}]:[]),
 ...(props.mode==='inspection'?[{title:'巡查角色与周期',dataIndex:'inspectionRoles',width:260,scopedSlots:true}]:[]),
 {title:'装修状态',dataIndex:'status',width:180,scopedSlots:true},{title:'登记人',dataIndex:'creatorName',width:120},{title:'操作',dataIndex:'actions',width:100,fixed:'right',scopedSlots:true}
])
const fields=computed(()=>[
 ...['number','spaceName','ownerName','contactPhone','constructionUnit','constructionManager','managerPhone','creatorName'].map(dataIndex=>({dataIndex,title:columns.value.find(c=>c.dataIndex===dataIndex)?.title||dataIndex,search:{type:'string'}})),
 {title:'房屋类型',dataIndex:'houseType',search:{type:'select',options:dictionary.options('house-type')}},
 {title:'装修类型',dataIndex:'decorationType',search:{type:'select',options:[{value:'first',label:'首次装修'},{value:'second',label:'二次装修'}]}},
 ...(props.mode==='inspection'?[{title:'巡查角色与周期',dataIndex:'inspectionRoles',width:260,scopedSlots:true}]:[]),
 {title:'装修状态',dataIndex:'status',search:{type:'select',options:statusKeys.map(value=>({value,label:t(`Decoration.states.${value}`)}))}},
 ...(props.mode==='review'?[{title:'保证金审核状态',dataIndex:'depositReviewStatus',search:{type:'select',options:[{value:0,label:'待审核'},{value:1,label:'已通过'},{value:2,label:'已驳回'}]}}]:[]),
 ...(props.mode==='permits'?[{title:t('Decoration.permitStatusTitle'),dataIndex:'permitStatus',search:{type:'select',termTypeOptions:['in','nin'],options:['pending','issued','extended','expired'].map(value=>({value,label:t(`Decoration.permitStates.${value}`)}))}},{title:'打印时间',dataIndex:'printTime',search:{type:'date',termTypeOptions:['btw','nbtw','gte','lte','isnull','notnull']}}]:[]),
 ...(['first','second'].includes(props.mode)?[{title:'验收申请人',dataIndex:'acceptanceRequesterName',search:{type:'string'}},{title:'申请验收日期',dataIndex:'acceptanceDate',search:{type:'date'}},{title:'提交验收申请时间',dataIndex:'acceptanceRequestTime',search:{type:'date'}}]:[]),
 ...['createTime','startTime','completionTime','actualEndTime'].map(dataIndex=>({dataIndex,title:({createTime:'申请时间',startTime:'开始时间',completionTime:'竣工时间',actualEndTime:'结束时间'} as Record<string,string>)[dataIndex],search:{type:'date'}}))
])
function closeCreate(){if(allowLeave())createOpen.value=false}
function closeDetail(){if(allowLeave())detailId.value=''}
function changeProject(value?:string){if(allowLeave())setProject(value)}
function created(row:Application){createOpen.value=false;detailId.value=row.id;reload()}
defineExpose({allowLeave})
const date=(time?:number)=>time?new Date(time).toLocaleString():'—'
</script>
<template>
 <section class="decoration-workspace">
  <div class="decoration-toolbar"><h2>{{titles[mode]||'装修管理'}}</h2><a-space><a-button v-if="permissions.export" :loading="loading" @click="exportRows">导出</a-button><a-button v-if="permissions.create" type="primary" @click="createOpen=true">新增装修申请</a-button></a-space></div>
  <FilterBar :project-id="projectId" :tree-data="tree" @project-change="changeProject" @refresh="reload"><ConditionFilter v-model="terms" :fields="fields" @change="changeFilters" /></FilterBar>
  <a-alert v-if="dictionary.failed.value" type="error" message="基础字典加载失败"><template #action><a-button @click="dictionary.reload">重试</a-button></template></a-alert>
  <a-alert v-if="error" type="error" :message="error" show-icon><template #action><a-button @click="()=>{loadProjects();reload()}">重试</a-button></template></a-alert>
  <j-pro-table ref="table" :key="`${mode}:${projectId||'all'}`" row-key="id" mode="TABLE" type="PAGE" :columns="columns" :request="request" :params="params" :no-pagination="false" :pagination="{pageSize:20}" :scroll="{x:columns.reduce((width,column)=>width+column.width,0)}" :alert-show="false">
   <template #number="record"><a-button type="link" @click="detailId=record.id">{{record.number}}</a-button></template>
   <template #status="record"><a-tag :color="record.status==='rejected'?'error':record.status==='finished'?'default':'processing'">{{t(`Decoration.states.${record.status}`)}}</a-tag></template>
   <template #createTime="record">{{date(record.createTime)}}</template><template #startTime="record">{{date(record.startTime)}}</template><template #completionTime="record">{{date(record.completionTime)}}</template>
   <template #houseType="record">{{dictionary.text('house-type',record.houseType)}}</template>
   <template #decorationType="record">{{({first:'首次装修',second:'二次装修'} as Record<string,string>)[record.decorationType]||record.decorationType||'—'}}</template>
   <template #actualEndTime="record">{{date(record.actualEndTime)}}</template>
   <template #acceptanceDate="record">{{date(record.acceptanceDate)}}</template>
   <template #acceptanceRequestTime="record">{{date(record.acceptanceRequestTime)}}</template>
   <template #acceptanceSource="record">{{record.acceptanceSource?t(`Decoration.acceptanceSources.${record.acceptanceSource}`):'—'}}</template>
   <template #materialReview="record">{{t(`Decoration.reviewStates.${materialReviewState(record.details.materials,'material')}`)}}</template>
   <template #drawingReview="record">{{t(`Decoration.reviewStates.${materialReviewState(record.details.materials,'drawing')}`)}}</template>
   <template #depositReviewStatus="record">{{t(`Decoration.reviewStates.${['pending','approved','rejected'][record.depositReviewStatus]}`)}}</template>
   <template #permitNumber="record">{{record.permit?.number||'—'}}</template>
   <template #permitApprover="record">{{record.permit?.approverName||'—'}}</template>
   <template #permitApproverPhone="record">{{record.permit?.approverPhone||'—'}}</template>
   <template #permitActive="record">{{permitIsActive(record.permit)?'是':'否'}}</template>
   <template #entrusted="record">{{record.permit?(record.permit.entrusted?'是':'否'):'—'}}</template>
   <template #validity="record">{{record.permit?`${date(record.permit.startTime)} — ${date(record.permit.endTime)}`:'—'}}</template>
   <template #printTime="record">{{date(record.permit?.printTime)}}</template>
   <template #permitStatus="record">{{t(`Decoration.permitStates.${permitStatus(record.permit)}`)}}</template>
   <template #inspectionRoles="record">{{record.inspectionPlan?.inspectionRoles.map((role:{roleName?:string;intervalDays:number})=>`${role.roleName}（每${role.intervalDays}天）`).join('、')||'待指派'}}</template>
   <template #actions="record"><a-button type="link" @click="detailId=record.id">{{mode==='inspection'?'查看与指派':'详情'}}</a-button></template>
   <template #emptyText><a-empty description="暂无装修记录" /></template>
  </j-pro-table>
  <a-drawer :open="createOpen" title="新增装修申请" width="min(920px,100vw)" :mask-closable="false" :destroy-on-close="true" @close="closeCreate"><ApplicationForm v-if="createOpen" ref="form" :api="decorationApi" :project-id="projectId||''" :projects="tree" @submitted="created" /></a-drawer>
  <a-drawer :open="!!detailId" title="装修详情" width="min(1080px,100vw)" :mask-closable="false" :destroy-on-close="true" @close="closeDetail"><ApplicationDetail v-if="detailId" ref="detail" :id="detailId" :api="decorationApi" :permissions="permissions" @changed="reload" /></a-drawer>
 </section>
</template>
