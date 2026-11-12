<script setup lang="ts">
import dayjs from 'dayjs'
import WorkerRegistrationFields from './WorkerRegistrationFields.vue'
import {nextRefund} from '../../utils/decoration'
import type { Action, Application } from '../../types/decoration'
import { useI18n } from 'vue-i18n'
import type { DecorationApi } from '../../services/decorationApi'
import { useActionForm } from '../../hooks/decoration/useActionForm'
const props=defineProps<{action:string;api:DecorationApi;busy:boolean;row?:Application}>()
const {t}=useI18n()
const emit=defineEmits<{submit:[string,Partial<Action>,boolean]}>()
function initialAction():Partial<Action>{
 const row=props.row
 if(['permit','permit/workers'].includes(props.action)){
  const registration=row?.details.workerRegistration||row?.permit
  return {safetyPerson:registration?.safetyPerson||row?.details.constructionManager,safetyPhone:registration?.safetyPhone||row?.details.managerPhone,content:registration?.content||'',entrusted:registration?.entrusted||false,workers:JSON.parse(JSON.stringify(registration?.workers||[]))}
 }
 if(props.action==='actual-end-time')return {actualEndTime:row?.actualEndTime??row?.completionTime}
 if(props.action==='inspection/assign')return {
  inspectionRoles:row?.inspectionPlan?.inspectionRoles.map(role=>({...role}))||[],
  reviewRoleId:row?.inspectionPlan?.reviewRoleId,
 }
 // 指派沿用本轮申请类型；二验申请及重提默认选二验，服务端仍校验状态。
 if(props.action==='acceptance/assign')return {type:row?.acceptanceType===2?2:1}
 if(props.action==='acceptance')return {type:['pending_second_acceptance','second_acceptance_failed'].includes(row?.status||'')?2:1}
 return {}
}
const {form,employees,error,loading,searchEmployees,submit,roleOptions,selectedRoles,inspectionOptions,changeRoles}=useActionForm(props.api,()=>props.action,(name,body,task)=>emit('submit',name,body,task),initialAction,()=>{const plan=props.row?.inspectionPlan;return plan?[...plan.inspectionRoles.map(role=>({id:role.roleId,name:role.roleName||''})),{id:plan.reviewRoleId||'',name:plan.reviewRoleName||''}].filter(role=>role.id&&role.name):[]},()=>t('Decoration.assignment.selectEmployee'),()=>props.row?.projectId)
</script>
<template>
 <a-form :model="form" layout="vertical" @finish="submit">
  <a-alert v-if="action==='refund'&&row&&nextRefund(row)" type="info" :message="`${nextRefund(row)!.label}：${nextRefund(row)!.amount} 元（已累计退 ${row.refundedAmount||0} 元）`" show-icon />
  <a-alert v-if="error" type="error" :message="error" show-icon />
  <template v-if="['acceptance','acceptance/assign'].includes(action)">
   <a-form-item label="验收类型" required><span v-if="row">{{form.type===2?'二次验收':'首次验收'}}</span><a-radio-group v-else v-model:value="form.type"><a-radio :value="1">首次验收</a-radio><a-radio :value="2">二次验收</a-radio></a-radio-group></a-form-item>
   <a-form-item v-if="action==='acceptance'" label="申请验收日期" required><a-date-picker show-time :value="form.acceptanceDate?dayjs(form.acceptanceDate):undefined" @update:value="v=>form.acceptanceDate=v?Number(v.valueOf()):undefined" /></a-form-item>
   <a-form-item v-if="!api.mine" label="验收人员" :required="action==='acceptance/assign'"><a-select v-model:value="form.assigneeIds" mode="multiple" show-search :filter-option="false" :loading="loading" :options="employees.map(p=>({label:p.name,value:p.id}))" @search="searchEmployees"><template #notFoundContent>{{loading?t('Decoration.assignment.loading'):t('Decoration.assignment.noEmployees')}}</template></a-select></a-form-item>
  </template>
  <template v-if="action==='inspection/assign'">
   <a-descriptions bordered :column="2" size="small" style="margin-bottom:20px">
    <a-descriptions-item label="房号">{{row?.spaceName||'—'}}</a-descriptions-item>
    <a-descriptions-item label="业主姓名">{{row?.ownerName||'—'}}</a-descriptions-item>
    <a-descriptions-item label="巡检开始">指派当天</a-descriptions-item>
    <a-descriptions-item label="巡检截止">{{row?.completionTime?dayjs(row.completionTime).format('YYYY-MM-DD HH:mm'):'—'}}（计划竣工时间）</a-descriptions-item>
   </a-descriptions>
   <a-form-item label="指派装修巡查角色" required><a-select :value="selectedRoles" mode="multiple" show-search :filter-option="false" :loading="roleOptions.loading.value" :options="inspectionOptions.map(role=>({label:role.name,value:role.id}))" @update:value="changeRoles" @search="roleOptions.search" /></a-form-item>
   <a-form-item v-for="role in form.inspectionRoles" :key="role.roleId" :label="`${role.roleName||role.roleId} · 巡检频率`" required>每 <a-input-number v-model:value="role.intervalDays" :min="1" :max="1000" :precision="0" /> 天一次</a-form-item>
   <a-alert v-if="roleOptions.error.value" type="error" :message="roleOptions.error.value"><template #action><a-button @click="roleOptions.search()">重试</a-button></template></a-alert>
   <a-form-item label="整改复核角色" required><a-select v-model:value="form.reviewRoleId" show-search :filter-option="false" :loading="roleOptions.loading.value" :options="roleOptions.options([form.reviewRoleId]).map(role=>({label:role.name,value:role.id}))" @search="roleOptions.search" /></a-form-item>
  </template>

  <WorkerRegistrationFields v-if="action==='permit/workers'" :form="form" :row="row" />
  <a-descriptions v-if="action==='permit'" bordered :column="1" size="small">
   <a-descriptions-item label="业主 / 房屋">{{row?.ownerName}} / {{row?.spaceName}}</a-descriptions-item>
   <a-descriptions-item label="施工单位">{{row?.details.constructionUnit}}</a-descriptions-item>
   <a-descriptions-item label="安全负责人">{{form.safetyPerson}} · {{form.safetyPhone}}</a-descriptions-item>
   <a-descriptions-item label="装修内容">{{form.content}}</a-descriptions-item>
   <a-descriptions-item label="登记人数">{{form.workers?.length||0}} 人</a-descriptions-item>
  </a-descriptions>
  <template v-if="action==='permit/extend'">
   <a-alert type="info" message="延期后保留历史证件和操作记录；新有效期需重新打印或下载。" show-icon />
   <a-form-item label="当前有效期"><a-input :value="`${dayjs(row?.permit?.startTime).format('YYYY-MM-DD')} 至 ${dayjs(row?.permit?.endTime).format('YYYY-MM-DD')}`" readonly /></a-form-item>
   <a-form-item label="延期月数" required><a-input-number v-model:value="form.months" :min="1" :max="120" :precision="0" /></a-form-item>
   <a-form-item label="延期后截止日期"><a-input :value="dayjs(row?.permit?.endTime).add(form.months||0,'month').format('YYYY-MM-DD')" readonly /></a-form-item>
  </template>
  <a-form-item v-if="action==='completion-time'" label="计划竣工时间" required><a-date-picker show-time :value="form.completionTime?dayjs(form.completionTime):undefined" @update:value="v=>form.completionTime=v?Number(v.valueOf()):undefined" /></a-form-item>
  <template v-if="action==='actual-end-time'">
   <a-alert type="warning" :message="t('Decoration.record.actualEndTimeHint')" show-icon />
   <a-form-item :label="t('Decoration.record.actualEndTime')" required><a-date-picker show-time :value="form.actualEndTime?dayjs(form.actualEndTime):undefined" @update:value="v=>form.actualEndTime=v?Number(v.valueOf()):undefined" /></a-form-item>
  </template>
  <a-form-item v-if="['payment','refund'].includes(action)&&!api.mine" label="财务单据号" required><a-input v-model:value="form.reference" /></a-form-item>
  <a-form-item label="办理说明" :required="action==='end'"><a-textarea v-model:value="form.remark" :maxlength="2000" /></a-form-item>
  <a-button type="primary" html-type="submit" :loading="busy">{{action==='permit/workers'?'保存登记':'确认办理'}}</a-button>
 </a-form>
</template>
