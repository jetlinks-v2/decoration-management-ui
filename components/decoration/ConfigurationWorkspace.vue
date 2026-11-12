<script setup lang="ts">
import {refundTotal} from '../../utils/decoration'
import ProjectTreeSelect from './ProjectTreeSelect.vue'
import FilterBar from './FilterBar.vue'
import {computed,defineAsyncComponent} from 'vue'
import {Modal as AModal} from 'ant-design-vue'
import ConditionFilter from '@jetlinks-web-core/components/ConditionFilter'
import type {Configuration,ConfigurationKind,MaterialDefinition} from '../../types/decoration'
import {useConfigurations} from '../../hooks/decoration/useConfigurations'
import {useLeaveGuard} from '../../hooks/decoration/useLeaveGuard'
import {useDiscardConfirm} from '../../hooks/decoration/useDiscardConfirm'
import {useConfigurationImport} from '../../hooks/decoration/useConfigurationImport'
import {useI18n} from 'vue-i18n'
import ConfigurationEditor from './ConfigurationEditor.vue'
import './decoration.css'
const props=defineProps<{kind:ConfigurationKind}>()
const {checkScope,checkScopeReady,openingChecks,changeCheckScope,openCurrentChecks,api,kinds,dictionary,projectNames,projectId,tree,kind,terms,changeFilters,rows,total,page,loading,saving,error,draft,uncertain,canSave,canDelete,load,save,closeDraft,uploading,remove,edit,changeDraftProject,changeProject:setProject,confirm}=useConfigurations(props.kind)
const useDialog=computed(()=>['materials','checks'].includes(kind.value))
const title=computed(()=>kinds.find(item=>item.value===kind.value)?.label||'装修基础配置')
const {t}=useI18n()
const confirmDiscard=useDiscardConfirm(()=>t('Decoration.unsaved'))
const ConfigurationImportDialog=defineAsyncComponent(()=>import('./ConfigurationImportDialog.vue'))
const importer=useConfigurationImport(api,load,t)
const importView=importer.view
const {allowLeave,allowClose}=useLeaveGuard({dirty:()=>!!draft.value&&!!canSave.value||importer.dirty.value,blocked:()=>saving.value||uncertain.value||uploading.value||importer.blocked.value,confirmDiscard,onBlocked:()=>{error.value=t('Decoration.waitForResult')},onDiscard:()=>{draft.value=undefined;importer.discard()}})
const columns=computed(()=>[
 {title:'所属项目',dataIndex:'projectId',width:160},
 ...(['agreement','materials','checks'].includes(kind.value)?[{title:'房屋类型',dataIndex:'houseType',width:120}]:[]),
 ...(['materials','checks'].includes(kind.value)?[{title:'装修类型',dataIndex:'decorationType',width:120}]:[]),
 ...(kind.value==='agreement'?[{title:'收费科目',dataIndex:'chargeItem',width:160},{title:'装修保证金（元）',dataIndex:'deposit',width:160},{title:'二验后一次性退款（元）',dataIndex:'refundAmount',width:190}]:[]),
 ...(kind.value==='materials'?[{title:'资料项数',dataIndex:'materialCount',width:100},{title:'图纸项数',dataIndex:'drawingCount',width:100}]:[]),
 ...(kind.value==='checks'?[{title:'检查场景',dataIndex:'scene',width:120},{title:'检查项数',dataIndex:'checkCount',width:100}]:[]),
 ...(kind.value==='validity'?[{title:'有效月数',dataIndex:'validityMonths',width:120}]:[]),
 {title:'启用',dataIndex:'enabled',width:100},{title:'版本',dataIndex:'version',width:80},{title:'操作',dataIndex:'actions',width:160}
])
const fields=computed(()=>[
 ...(['agreement','materials'].includes(kind.value)?[{title:'房屋类型',dataIndex:'houseType',search:{type:'select',options:dictionary.options('house-type')}}]:[]),
 ...(kind.value==='materials'?[{title:'装修类型',dataIndex:'decorationType',search:{type:'select',options:[{value:'first',label:'首次装修'},{value:'second',label:'二次装修'}]}}]:[]),
 {title:'启用状态',dataIndex:'enabled',search:{type:'select',options:[{value:true,label:'已启用'},{value:false,label:'已停用'}]}}
])
function close(){closeDraft()}
async function changeProject(value?:string){if(await allowLeave())setProject(value||'')}
async function selectDraftProject(value?:string){if(value===draft.value?.projectId)return;if(!draft.value?.projectId||await allowLeave())changeDraftProject(value)}
async function openImport(){if(await allowLeave())importer.show()}
function closeImport(){if(allowClose())importer.discard()}
async function editConfiguration(row?:Configuration){if(await allowLeave()){importer.discard();if(kind.value==='checks'&&!row)await openCurrentChecks();else edit(row)}}
async function selectCheckScope(field:keyof typeof checkScope.value,value:unknown){if(await allowLeave())changeCheckScope(field,typeof value==='string'?value:undefined)}
async function refresh(){if(await allowLeave())void load()}
async function filter(value:Parameters<typeof changeFilters>[0]){if(await allowLeave())changeFilters(value)}
async function changePage(value:{current?:number}){if(await allowLeave()){page.value=value.current||1;void load()}}
async function deleteConfiguration(row:Configuration){if(await allowLeave())void remove(row)}
</script>
<template>
 <section class="decoration-workspace"><div class="decoration-toolbar"><h2>{{title}}</h2></div>
  <FilterBar :project-id="projectId||undefined" :tree-data="tree" :loading="loading" @project-change="changeProject" @refresh="refresh">
   <template v-if="kind==='checks'">
    <label class="decoration-project-filter"><span>{{t('Decoration.checkConfiguration.scene')}}</span><a-select :value="checkScope.scene||undefined" style="width:150px" :options="[{value:'daily',label:t('Decoration.checkConfiguration.daily')},{value:'firstAcceptance',label:t('Decoration.checkConfiguration.firstAcceptance')},{value:'secondAcceptance',label:t('Decoration.checkConfiguration.secondAcceptance')}]" @update:value="value=>selectCheckScope('scene',value)" /></label>
    <label class="decoration-project-filter"><span>{{t('Decoration.checkConfiguration.houseType')}}</span><a-select :value="checkScope.houseType||undefined" allow-clear style="width:150px" :placeholder="t('Decoration.checkConfiguration.allHouseTypes')" :options="dictionary.options('house-type')" @update:value="value=>selectCheckScope('houseType',value)" /></label>
    <label class="decoration-project-filter"><span>{{t('Decoration.checkConfiguration.decorationType')}}</span><a-select :value="checkScope.decorationType||undefined" style="width:150px" :options="[{value:'first',label:t('Decoration.checkConfiguration.firstDecoration')},{value:'second',label:t('Decoration.checkConfiguration.secondDecoration')}]" @update:value="value=>selectCheckScope('decorationType',value)" /></label>
   </template>
   <ConditionFilter :key="kind" v-model="terms" :fields="fields" @change="filter" />
  </FilterBar>
  <a-alert v-if="kind==='checks'&&!checkScopeReady" type="info" :message="t('Decoration.checkConfiguration.selectOutside')" show-icon style="margin-bottom:12px" />
  <a-alert v-if="dictionary.failed.value" type="error" message="基础字典加载失败"><template #action><a-button @click="dictionary.reload">重试</a-button></template></a-alert>
  <a-alert v-if="error" type="error" :message="error" show-icon />
  <div v-if="canSave" class="decoration-actions decoration-list-actions">
   <a-button type="primary" :loading="openingChecks" :disabled="kind==='checks'&&!checkScopeReady" @click="editConfiguration()">{{kind==='checks'?t('Decoration.checkConfiguration.configure'):'新增配置'}}</a-button>
   <a-button v-if="kind==='checks'" @click="openImport">{{t('Decoration.import.title')}}</a-button>
  </div>
  <a-table :columns="columns" :scroll="{x:columns.reduce((width,column)=>width+column.width,0)}" :data-source="rows" :loading="loading" row-key="id" :pagination="{current:page,total,pageSize:20}" @change="changePage"><template #bodyCell="{column,record}"><template v-if="column.dataIndex==='actions'"><a-space><a-button type="link" @click="editConfiguration(record as Configuration)">{{canSave?'编辑':'查看'}}</a-button><a-popconfirm v-if="canDelete" title="停用并删除此配置？历史申请快照会保留。" @confirm="deleteConfiguration(record as Configuration)"><a-button type="link" danger :disabled="saving">删除</a-button></a-popconfirm></a-space></template><template v-else-if="column.dataIndex==='enabled'">{{record.enabled?'已启用':'已停用'}}</template>
    <template v-else-if="column.dataIndex==='projectId'">{{projectNames[record.projectId]||'—'}}</template>
    <template v-else-if="column.dataIndex==='houseType'">{{dictionary.text('house-type',record.houseType)}}</template>
    <template v-else-if="column.dataIndex==='decorationType'">{{({first:'首次装修',second:'二次装修'} as Record<string,string>)[record.decorationType]||record.decorationType||'—'}}</template>
    <template v-else-if="column.dataIndex==='scene'">{{({daily:'日常巡检',firstAcceptance:'首次验收',secondAcceptance:'二次验收'} as Record<string,string>)[record.scene]||record.scene||'—'}}</template>
    <template v-else-if="column.dataIndex==='chargeItem'">{{record.content.agreement?.chargeItemName||'—'}}</template>
    <template v-else-if="column.dataIndex==='deposit'">{{record.content.agreement?.deposit??'—'}}</template>
    <template v-else-if="column.dataIndex==='refundAmount'">{{record.content.agreement?refundTotal(record.content.agreement,record.content.agreement.deposit):'—'}}</template>
    <template v-else-if="column.dataIndex==='materialCount'">{{record.content.materials.filter((item:MaterialDefinition)=>item.kind==='material'&&item.enabled).length}}</template>
    <template v-else-if="column.dataIndex==='drawingCount'">{{record.content.materials.filter((item:MaterialDefinition)=>item.kind==='drawing'&&item.enabled).length}}</template>
    <template v-else-if="column.dataIndex==='checkCount'">{{record.content.checks.length}}</template>
    <template v-else-if="column.dataIndex==='validityMonths'">{{record.content.validityMonths??'—'}}</template></template></a-table>
  <AModal :open="!!draft" :title="title" :width="useDialog?1040:760" :footer="null" :mask-closable="false" :keyboard="!saving&&!uncertain&&!uploading" :class="{'decoration-configuration-dialog':useDialog}" :style="{top:'40px',maxWidth:'calc(100vw - 32px)'}" :body-style="{maxHeight:'calc(100vh - 160px)',overflowY:'auto'}" @cancel="close">
   <a-alert v-if="uncertain" type="warning" message="保存结果待确认"><template #action><a-button @click="confirm">核对配置</a-button></template></a-alert>
   <a-alert v-if="draft&&error" type="error" :message="error" show-icon />
   <template v-if="draft"><ConfigurationEditor :key="draft.id||kind+draft.projectId" :value="draft" :api="api" :busy="saving||uncertain||uploading||!canSave" @save="save" @cancel="close"><template #project><a-form-item label="所属项目" required><span v-if="kind==='checks'">{{projectNames[draft.projectId]||draft.projectId}}</span><ProjectTreeSelect v-else :value="draft.projectId||undefined" :tree-data="tree" :allow-clear="false" :disabled="!!draft.id||saving||uncertain||uploading" placeholder="请选择项目" style="width:100%" @update:value="selectDraftProject" /></a-form-item></template></ConfigurationEditor></template>
  </AModal>
  <ConfigurationImportDialog v-if="importView.open" :view="importView" :before-upload="importer.select" @close="closeImport" @submit="importer.submit" @download="importer.downloadTemplate" @confirm="importer.confirmResult" @retry="importer.retryOriginal" />
 </section>
</template>

<style>
.decoration-configuration-dialog .ant-modal-body{max-height:calc(100vh - 160px);overflow-y:auto;padding:24px!important}
.decoration-configuration-dialog .ant-modal-header{margin-bottom:0;padding:18px 24px;background:var(--ant-color-bg-container,#fff);border-bottom:1px solid var(--ant-color-border-secondary,#f0f0f0)}
.decoration-configuration-dialog .ant-modal-header .ant-modal-title{padding-bottom:0}
.decoration-configuration-dialog .ant-modal-content{padding:0;overflow:hidden}
</style>
