<script setup lang="ts">
import dayjs from 'dayjs'
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
 if(props.action==='actual-end-time')return {actualEndTime:row?.actualEndTime??row?.completionTime}
 if(props.action==='inspection/assign')return {
  inspectionRoles:row?.inspectionPlan?.inspectionRoles.map(role=>({...role}))||[],
  reviewRoleId:row?.inspectionPlan?.reviewRoleId,
  startTime:row?.inspectionPlan?.startTime??Date.now(),
  endTime:row?.inspectionPlan?.endTime??row?.completionTime,
 }
 // 指派沿用本轮申请类型；二验申请及重提默认选二验，服务端仍校验状态。
 if(props.action==='acceptance/assign')return {type:row?.acceptanceType===2?2:1}
 if(props.action==='acceptance')return {type:['pending_second_acceptance','second_acceptance_failed'].includes(row?.status||'')?2:1}
 return {}
}
const {form,employees,error,loading,searchEmployees,submit,roleOptions,selectedRoles,inspectionOptions,changeRoles}=useActionForm(props.api,()=>props.action,(name,body,task)=>emit('submit',name,body,task),initialAction,()=>{const plan=props.row?.inspectionPlan;return plan?[...plan.inspectionRoles.map(role=>({id:role.roleId,name:role.roleName||''})),{id:plan.reviewRoleId||'',name:plan.reviewRoleName||''}].filter(role=>role.id&&role.name):[]})
</script>
<template>
 <a-form :model="form" layout="vertical" @finish="submit">
  <a-alert v-if="action==='refund'&&row&&nextRefund(row)" type="info" :message="`${nextRefund(row)!.label}：${nextRefund(row)!.amount} 元（已累计退 ${row.refundedAmount||0} 元）`" show-icon />
  <a-alert v-if="error" type="error" :message="error" show-icon />
  <template v-if="['acceptance','acceptance/assign'].includes(action)">
   <a-form-item label="验收类型" required><a-radio-group v-model:value="form.type"><a-radio :value="1">首次验收</a-radio><a-radio :value="2">二次验收</a-radio></a-radio-group></a-form-item>
   <a-form-item v-if="action==='acceptance'" label="申请验收日期" required><a-date-picker show-time :value="form.acceptanceDate?dayjs(form.acceptanceDate):undefined" @update:value="v=>form.acceptanceDate=v?Number(v.valueOf()):undefined" /></a-form-item>
   <a-form-item v-if="!api.mine" label="验收人员"><a-select v-model:value="form.assigneeIds" mode="multiple" show-search :filter-option="false" :loading="loading" :options="employees.map(p=>({label:p.name,value:p.id}))" @search="searchEmployees" /></a-form-item>
  </template>
  <template v-if="action==='inspection/assign'">
   <a-form-item label="指派装修巡查角色" required><a-select :value="selectedRoles" mode="multiple" show-search :filter-option="false" :loading="roleOptions.loading.value" :options="inspectionOptions.map(role=>({label:role.name,value:role.id}))" @update:value="changeRoles" @search="roleOptions.search" /></a-form-item>
   <a-form-item v-for="role in form.inspectionRoles" :key="role.roleId" :label="role.roleName" required><a-input-number v-model:value="role.intervalDays" :min="1" :max="1000" :precision="0" /> 天 1 次</a-form-item>
   <a-alert v-if="roleOptions.error.value" type="error" :message="roleOptions.error.value"><template #action><a-button @click="roleOptions.search()">重试</a-button></template></a-alert>
   <a-form-item label="整改复核角色" required><a-select v-model:value="form.reviewRoleId" show-search :filter-option="false" :loading="roleOptions.loading.value" :options="roleOptions.options([form.reviewRoleId]).map(role=>({label:role.name,value:role.id}))" @search="roleOptions.search" /></a-form-item>
   <a-form-item label="巡检开始" required><a-date-picker show-time :value="form.startTime?dayjs(form.startTime):undefined" @update:value="v=>form.startTime=v?Number(v.valueOf()):undefined" /></a-form-item>
   <a-form-item label="巡检截止" required><a-date-picker show-time :value="form.endTime?dayjs(form.endTime):undefined" @update:value="v=>form.endTime=v?Number(v.valueOf()):undefined" /></a-form-item>
  </template>
  <template v-if="action==='permit'">
   <a-form-item label="安全负责人" required><a-input v-model:value="form.safetyPerson" /></a-form-item>
   <a-form-item label="安全负责人电话" required><a-input v-model:value="form.safetyPhone" /></a-form-item>
   <a-form-item label="装修内容" required><a-textarea v-model:value="form.content" /></a-form-item>
   <a-form-item label="是否委托"><a-switch v-model:checked="form.entrusted" /></a-form-item>
   <h4>施工人员</h4>
   <div v-for="(worker,index) in form.workers" :key="index" class="decoration-card">
    <a-input v-model:value="worker.name" placeholder="姓名" /><a-input v-model:value="worker.phone" placeholder="电话" /><a-input v-model:value="worker.certificate" placeholder="证件号码" />
    <a-date-picker :value="worker.entryTime?dayjs(worker.entryTime):undefined" placeholder="进场日期" @update:value="v=>worker.entryTime=Number(v?.valueOf()||0)" /><a-date-picker :value="worker.expirationTime?dayjs(worker.expirationTime):undefined" placeholder="到期日期" @update:value="v=>worker.expirationTime=Number(v?.valueOf()||0)" />
    <a-button danger @click="form.workers?.splice(index,1)">移除人员</a-button>
   </div>
   <a-button @click="form.workers?.push({name:'',phone:'',certificate:'',entryTime:0,expirationTime:0})">添加施工人员</a-button>
  </template>
  <a-form-item v-if="action==='permit/extend'" label="延期月数" required><a-input-number v-model:value="form.months" :min="1" :max="120" /></a-form-item>
  <a-form-item v-if="action==='completion-time'" label="计划竣工时间" required><a-date-picker show-time :value="form.completionTime?dayjs(form.completionTime):undefined" @update:value="v=>form.completionTime=v?Number(v.valueOf()):undefined" /></a-form-item>
  <template v-if="action==='actual-end-time'">
   <a-alert type="warning" :message="t('Decoration.record.actualEndTimeHint')" show-icon />
   <a-form-item :label="t('Decoration.record.actualEndTime')" required><a-date-picker show-time :value="form.actualEndTime?dayjs(form.actualEndTime):undefined" @update:value="v=>form.actualEndTime=v?Number(v.valueOf()):undefined" /></a-form-item>
  </template>
  <a-form-item v-if="['payment','refund'].includes(action)&&!api.mine" label="财务单据号" required><a-input v-model:value="form.reference" /></a-form-item>
  <a-form-item label="办理说明" :required="action==='end'"><a-textarea v-model:value="form.remark" :maxlength="2000" /></a-form-item>
  <a-button type="primary" html-type="submit" :loading="busy">确认办理</a-button>
 </a-form>
</template>
