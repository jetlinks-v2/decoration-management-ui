<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Application, Task, Action, CheckResult, Violation } from '../../types/decoration'
import type { DecorationApi } from '../../services/decorationApi'
import FilePicker from './FilePicker.vue'
import CheckForm from './CheckForm.vue'
import TaskResults from './TaskResults.vue'
import TaskHandlingRecords from './TaskHandlingRecords.vue'
import {useRoleOptions} from '../../hooks/decoration/useRoleOptions'
const props=defineProps<{row:Application;tasks:Task[];api:DecorationApi;busy:boolean;canHandle:boolean;canReview:boolean;canRectify:boolean;canNotify?:boolean;canAssign?:boolean;notificationAvailable?:boolean}>()
const emit=defineEmits<{action:[string,Partial<Action>,boolean]}>()
const roleOptions=useRoleOptions(props.api)
const operation=ref(''),reviewRole=ref('')
const selected=ref<Task>(),results=ref<CheckResult[]>([]),form=reactive({passed:true,remark:'',fileIds:[] as string[],violations:[] as Violation[]})
const {t}=useI18n()
const date=(time?:number)=>time?new Date(time).toLocaleString():'—'
const dirty=computed(()=>!!selected.value)
defineExpose({dirty})
function close(){if(!props.busy&&window.confirm(t('Decoration.unsaved')))selected.value=undefined}
function select(task:Task,name=''){if(props.busy)return;operation.value=name;reviewRole.value='';if(name==='rectification/reassign')void roleOptions.search();selected.value=task;results.value=[];form.passed=true;form.remark='';form.fileIds=[];form.violations=[]}
function submit(){if(!selected.value||props.busy)return;const task=selected.value
 const body:Partial<Action>={taskId:task.id,passed:form.passed,remark:form.remark,fileIds:form.fileIds,results:results.value,violations:form.violations}
 if(operation.value){emit('action',operation.value,{...body,reviewRoleId:reviewRole.value},true);return}
 if(task.status==='pending')emit('action',task.kind==='daily'?'inspection/feedback':'acceptance/feedback',body,true)
 else if(task.status==='waiting_review')emit('action','rectification/review',body,true)
 else emit('action','rectification',body,false)
}
</script>
<template>
  <a-empty v-if="!tasks.length" description="暂无巡检或验收任务" />
  <div v-for="task in tasks" :key="task.id" class="decoration-card">
    <strong>{{{daily:'日常巡检',inspectionRecord:'巡检记录',firstAcceptance:'首次验收',secondAcceptance:'二次验收'}[task.kind]}}</strong>
    <a-alert v-if="canNotify&&!notificationAvailable&&['owner_rectification','rectification_rejected'].includes(task.status)" type="info" message="消息服务尚未接通，暂不可发送通知" />
    <p>{{task.assigneeName||task.details.inspectionRoles?.map(role=>role.roleName).join('、')||'待指派'}} · {{t(`Decoration.taskStates.${task.status==='pending'&&task.kind.includes('Acceptance')?'waitingAcceptance':task.status==='passed'&&task.kind==='inspectionRecord'?'normal':task.status}`)}} · 第{{task.round}}轮</p>
    <p>任务编号：{{task.id}} · 登记人：{{task.creatorName||'—'}}</p>
    <p v-if="task.kind.includes('Acceptance')">申请验收日期：{{date(task.acceptanceDate)}} · 提交时间：{{date(task.acceptanceRequestTime)}} · 申请人：{{task.acceptanceRequesterName||'—'}}</p>
    <p v-if="task.kind==='daily'">巡检日期：{{task.details.scheduledDate||'—'}} · 办理时段：{{date(task.details.startTime)}} — {{date(task.details.endTime)}}</p>
    <p v-if="task.details.feedback">{{task.kind.includes('Acceptance')?'验收结果备注':'巡查结果备注'}}：{{task.details.feedback}}</p>
    <p v-if="task.kind==='inspectionRecord'">整改复核角色：{{task.details.reviewRoleName||'—'}}</p>
    <TaskResults :task="task" :row="row" :api="api" />
    <div v-for="(violation,index) in task.details.violations" :key="index"><b>{{violation.location}}</b><p>{{violation.rectification}}</p><FilePicker :value="violation.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly /></div>
    <FilePicker :value="task.details.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly />
    <div v-if="task.details.rectificationRemark||task.details.rectificationFiles.length"><p>最新整改内容：{{task.details.rectificationRemark||'—'}}</p><FilePicker :value="task.details.rectificationFiles" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly /></div>
    <TaskHandlingRecords :records="task.details.handlingRecords||[]" :row="row" :api="api" />
    <a-button v-if="!row.actualEndTime&&(task.status==='pending'&&canHandle||task.status==='waiting_review'&&canReview||['owner_rectification','rectification_rejected'].includes(task.status)&&canRectify)" @click="select(task)">办理</a-button>
    <a-space v-if="!row.actualEndTime">
      <a-button v-if="canAssign&&['owner_rectification','rectification_rejected','waiting_review'].includes(task.status)" :disabled="busy" @click="select(task,'rectification/reassign')">重新指派复核角色</a-button>
      <a-button v-if="canAssign&&row.source==='pc_admin'&&['rectified','rectification_rejected'].includes(task.status)" :disabled="busy" @click="select(task,'rectification/resend')">重发整改任务</a-button>
      <a-button v-if="canNotify&&['owner_rectification','rectification_rejected'].includes(task.status)" :disabled="busy||!notificationAvailable" @click="select(task,'violation/notify')">发送整改通知</a-button>
    </a-space>
  </div>
  <a-modal :open="!!selected" title="办理任务" :width="680" :confirm-loading="busy" :mask-closable="false" @cancel="close" @ok="submit">
    <template v-if="selected">
      <a-alert v-if="operation==='rectification/reassign'&&roleOptions.error.value" type="error" :message="roleOptions.error.value"><template #action><a-button @click="roleOptions.search()">重试</a-button></template></a-alert>
      <CheckForm v-if="!operation&&selected.status==='pending'" v-model:value="results" :items="selected.details.checks" :api="api" :project-id="row.projectId" :decoration-id="row.id" />
      <a-form layout="vertical"><a-form-item v-if="operation==='rectification/reassign'" label="复核角色" required><a-select v-model:value="reviewRole" show-search :filter-option="false" :loading="roleOptions.loading.value" :options="roleOptions.options([reviewRole]).map(role=>({label:role.name,value:role.id}))" @search="roleOptions.search" /></a-form-item>
        <a-form-item v-if="!operation&&!['owner_rectification','rectification_rejected'].includes(selected.status)" label="处理结果"><a-radio-group v-model:value="form.passed"><a-radio :value="true">通过</a-radio><a-radio :value="false">不通过</a-radio></a-radio-group></a-form-item>
        <template v-if="!operation&&selected.kind==='daily'&&!form.passed">
          <div v-for="(violation,index) in form.violations" :key="index" class="decoration-card"><a-input v-model:value="violation.location" placeholder="违章位置" /><a-textarea v-model:value="violation.rectification" placeholder="整改内容" /><FilePicker v-model:value="violation.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" /><a-button danger :disabled="busy" @click="form.violations.splice(index,1)">移除</a-button></div>
          <a-button @click="form.violations.push({location:'',rectification:'',fileIds:[]})">新增违章事项</a-button>
        </template>
        <a-form-item label="处理意见"><a-textarea v-model:value="form.remark" :maxlength="2000" /></a-form-item>
        <a-form-item v-if="!operation&&['pending','owner_rectification','rectification_rejected'].includes(selected.status)" label="附件"><FilePicker v-model:value="form.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" /></a-form-item>
      </a-form>
    </template>
  </a-modal>
</template>
