<script setup lang="ts">
import ProjectTreeSelect from './ProjectTreeSelect.vue'
import FilterBar from './FilterBar.vue'
import {computed,defineAsyncComponent} from 'vue'
import {Modal as AModal,Drawer as ADrawer} from 'ant-design-vue'
import ConditionFilter from '@jetlinks-web-core/components/ConditionFilter'
import type {Configuration,ConfigurationKind,MaterialDefinition} from '../../types/decoration'
import {useConfigurations} from '../../hooks/decoration/useConfigurations'
import {useLeaveGuard} from '../../hooks/decoration/useLeaveGuard'
import {useConfigurationImport} from '../../hooks/decoration/useConfigurationImport'
import {useI18n} from 'vue-i18n'
import ConfigurationEditor from './ConfigurationEditor.vue'
import './decoration.css'
const props=defineProps<{kind:ConfigurationKind}>()
const {api,kinds,dictionary,projectNames,projectId,tree,kind,terms,changeFilters,rows,total,page,loading,saving,error,draft,uncertain,canSave,canDelete,load,save,closeDraft,uploading,remove,edit,changeDraftProject,changeProject:setProject,confirm}=useConfigurations(props.kind)
const useDialog=computed(()=>['materials','checks'].includes(kind.value))
const title=computed(()=>kinds.find(item=>item.value===kind.value)?.label||'装修基础配置')
const {t}=useI18n()
const ConfigurationImportDialog=defineAsyncComponent(()=>import('./ConfigurationImportDialog.vue'))
const importer=useConfigurationImport(api,load,t)
const importView=importer.view
const {allowLeave}=useLeaveGuard({dirty:()=>!!draft.value&&!!canSave.value||importer.dirty.value,blocked:()=>saving.value||uncertain.value||uploading.value||importer.blocked.value,confirmDiscard:()=>window.confirm(t('Decoration.unsaved')),onBlocked:()=>{error.value=t('Decoration.waitForResult')},onDiscard:()=>{draft.value=undefined;importer.discard()}})
const columns=computed(()=>[
 ...(kind.value==='materials'?[]:[{title:'名称',dataIndex:'name',width:180}]),{title:'所属项目',dataIndex:'projectId',width:160},
 ...(['agreement','materials','checks'].includes(kind.value)?[{title:'房屋类型',dataIndex:'houseType',width:120}]:[]),
 ...(['materials','checks'].includes(kind.value)?[{title:'装修类型',dataIndex:'decorationType',width:120}]:[]),
 ...(kind.value==='agreement'?[{title:'收费科目',dataIndex:'chargeItem',width:160},{title:'装修保证金（元）',dataIndex:'deposit',width:160},{title:'首验退款配置（元）',dataIndex:'firstRefund',width:160},{title:'复验退款配置（元）',dataIndex:'secondRefund',width:160}]:[]),
 ...(kind.value==='materials'?[{title:'资料项数',dataIndex:'materialCount',width:100},{title:'图纸项数',dataIndex:'drawingCount',width:100}]:[]),
 ...(kind.value==='checks'?[{title:'检查场景',dataIndex:'scene',width:120},{title:'检查项数',dataIndex:'checkCount',width:100}]:[]),
 ...(kind.value==='access'?[{title:'允许办理的客户性质',dataIndex:'eligibleNatures',width:220}]:[]),
 ...(kind.value==='validity'?[{title:'有效月数',dataIndex:'validityMonths',width:120}]:[]),
 {title:'启用',dataIndex:'enabled',width:100},{title:'版本',dataIndex:'version',width:80},{title:'操作',dataIndex:'actions',width:160}
])
const fields=computed(()=>[
 ...(kind.value==='materials'?[]:[{title:'名称',dataIndex:'name',search:{type:'string'}}]),
 ...(['agreement','materials','checks'].includes(kind.value)?[{title:'房屋类型',dataIndex:'houseType',search:{type:'select',options:dictionary.options('house-type')}}]:[]),
 ...(['materials','checks'].includes(kind.value)?[{title:'装修类型',dataIndex:'decorationType',search:{type:'select',options:[{value:'first',label:'首次装修'},{value:'second',label:'二次装修'}]}}]:[]),
 ...(kind.value==='checks'?[{title:'检查场景',dataIndex:'scene',search:{type:'select',options:[{value:'daily',label:'日常巡检'},{value:'firstAcceptance',label:'首次验收'},{value:'secondAcceptance',label:'二次验收'}]}}]:[]),
 {title:'启用状态',dataIndex:'enabled',search:{type:'select',options:[{value:true,label:'已启用'},{value:false,label:'已停用'}]}}
])
function close(){if(useDialog.value){closeDraft();return}if(allowLeave())draft.value=undefined}
function changeProject(value?:string){if(allowLeave())setProject(value||'')}
function selectDraftProject(value?:string){if(value===draft.value?.projectId)return;if(!draft.value?.projectId||allowLeave())changeDraftProject(value)}
function openImport(){if(allowLeave())importer.show()}
function closeImport(){if(allowLeave())importer.discard()}
function editConfiguration(row?:Configuration){if(allowLeave()){importer.discard();edit(row)}}
function refresh(){if(allowLeave())void load()}
function filter(value:Parameters<typeof changeFilters>[0]){if(allowLeave())changeFilters(value)}
function changePage(value:{current?:number}){if(allowLeave()){page.value=value.current||1;void load()}}
function deleteConfiguration(row:Configuration){if(allowLeave())void remove(row)}
</script>
<template>
 <section class="decoration-workspace"><div class="decoration-toolbar"><h2>{{title}}</h2><a-space><a-button v-if="canSave&&kind==='checks'" @click="openImport">{{t('Decoration.import.title')}}</a-button><a-button v-if="canSave" type="primary" @click="editConfiguration()">新增配置</a-button></a-space></div>
  <FilterBar :project-id="projectId||undefined" :tree-data="tree" :loading="loading" @project-change="changeProject" @refresh="refresh"><ConditionFilter :key="kind" v-model="terms" :fields="fields" @change="filter" /></FilterBar>
  <a-alert v-if="dictionary.failed.value" type="error" message="基础字典加载失败"><template #action><a-button @click="dictionary.reload">重试</a-button></template></a-alert>
  <a-alert v-if="error" type="error" :message="error" show-icon />
  <a-table :columns="columns" :scroll="{x:columns.reduce((width,column)=>width+column.width,0)}" :data-source="rows" :loading="loading" row-key="id" :pagination="{current:page,total,pageSize:20}" @change="changePage"><template #bodyCell="{column,record}"><template v-if="column.dataIndex==='actions'"><a-space><a-button type="link" @click="editConfiguration(record as Configuration)">{{canSave?'编辑':'查看'}}</a-button><a-popconfirm v-if="canDelete" title="停用并删除此配置？历史申请快照会保留。" @confirm="deleteConfiguration(record as Configuration)"><a-button type="link" danger :disabled="saving">删除</a-button></a-popconfirm></a-space></template><template v-else-if="column.dataIndex==='enabled'">{{record.enabled?'已启用':'已停用'}}</template>
    <template v-else-if="column.dataIndex==='projectId'">{{projectNames[record.projectId]||'—'}}</template>
    <template v-else-if="column.dataIndex==='houseType'">{{dictionary.text('house-type',record.houseType)}}</template>
    <template v-else-if="column.dataIndex==='decorationType'">{{({first:'首次装修',second:'二次装修'} as Record<string,string>)[record.decorationType]||record.decorationType||'—'}}</template>
    <template v-else-if="column.dataIndex==='scene'">{{({daily:'日常巡检',firstAcceptance:'首次验收',secondAcceptance:'二次验收'} as Record<string,string>)[record.scene]||record.scene||'—'}}</template>
    <template v-else-if="column.dataIndex==='chargeItem'">{{record.content.agreement?.chargeItemName||'—'}}</template>
    <template v-else-if="column.dataIndex==='deposit'">{{record.content.agreement?.deposit??'—'}}</template>
    <template v-else-if="column.dataIndex==='firstRefund'">{{record.content.agreement?.firstRefund??'—'}}</template>
    <template v-else-if="column.dataIndex==='secondRefund'">{{record.content.agreement?.secondRefund??'—'}}</template>
    <template v-else-if="column.dataIndex==='materialCount'">{{record.content.materials.filter((item:MaterialDefinition)=>item.kind==='material').length}}</template>
    <template v-else-if="column.dataIndex==='drawingCount'">{{record.content.materials.filter((item:MaterialDefinition)=>item.kind==='drawing').length}}</template>
    <template v-else-if="column.dataIndex==='checkCount'">{{record.content.checks.length}}</template>
    <template v-else-if="column.dataIndex==='eligibleNatures'">{{record.content.eligibleNatures.map((value:string)=>dictionary.text('customer-nature',value)).join('、')||'—'}}</template>
    <template v-else-if="column.dataIndex==='validityMonths'">{{record.content.validityMonths??'—'}}</template></template></a-table>
  <component :is="useDialog?AModal:ADrawer" :open="!!draft" :title="title" :width="useDialog?1040:760" :footer="null" :mask-closable="false" :keyboard="!saving&&!uncertain&&!uploading" :class="{'decoration-configuration-dialog':useDialog}" :style="useDialog?{top:'40px',maxWidth:'calc(100vw - 32px)'}:undefined" @cancel="close" @close="close">
   <a-alert v-if="uncertain" type="warning" message="保存结果待确认"><template #action><a-button @click="confirm">核对配置</a-button></template></a-alert>
   <a-alert v-if="draft&&error" type="error" :message="error" show-icon />
   <template v-if="draft"><ConfigurationEditor :key="draft.id||kind+draft.projectId" :value="draft" :api="api" :busy="saving||uncertain||uploading||!canSave" @save="save" @cancel="close"><template #project><a-form-item label="所属项目" required><ProjectTreeSelect :value="draft.projectId||undefined" :tree-data="tree" :allow-clear="false" :disabled="!!draft.id||saving||uncertain||uploading" placeholder="请选择项目" style="width:100%" @update:value="selectDraftProject" /></a-form-item></template></ConfigurationEditor></template>
  </component>
  <ConfigurationImportDialog v-if="importView.open" :view="importView" :before-upload="importer.select" @close="closeImport" @submit="importer.submit" @download="importer.downloadTemplate" @confirm="importer.confirmResult" @retry="importer.retryOriginal" />
 </section>
</template>

<style>
.decoration-configuration-dialog .ant-modal-body{max-height:calc(100vh - 160px);overflow-y:auto;padding:24px!important}
.decoration-configuration-dialog .ant-modal-header{margin-bottom:0;padding:18px 24px;background:var(--ant-color-bg-container,#fff);border-bottom:1px solid var(--ant-color-border-secondary,#f0f0f0)}
.decoration-configuration-dialog .ant-modal-header .ant-modal-title{padding-bottom:0}
.decoration-configuration-dialog .ant-modal-content{padding:0;overflow:hidden}
</style>
