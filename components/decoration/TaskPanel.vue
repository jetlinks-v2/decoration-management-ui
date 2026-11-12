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
const props=defineProps<{row:Application;tasks:Task[];api:DecorationApi;busy:boolean;canHandle:boolean;canReview:boolean;canRectify:boolean;canNotify?:boolean;canAssign?:boolean;notificationAvailable?:boolean;emptyText?:string}>()
const emit=defineEmits<{action:[string,Partial<Action>,boolean]}>()
const roleOptions=useRoleOptions(props.api)
const operation=ref(''),reviewRole=ref('')
const selected=ref<Task>(),results=ref<CheckResult[]>([]),form=reactive({passed:true,remark:'',fileIds:[] as string[],violations:[] as Violation[]})
const {t}=useI18n()
const date=(time?:number)=>time?new Date(time).toLocaleString():'—'
const dirty=computed(()=>!!selected.value)
defineExpose({dirty})
function close(){if(!props.busy)selected.value=undefined}
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
  <a-empty v-if="!tasks.length" :description="emptyText||'暂无巡检或验收任务'" />
  <div v-for="task in tasks" :key="task.id" class="decoration-card">
    <strong>{{{daily:'日常巡检',inspectionRecord:'巡检记录',firstAcceptance:'首次验收',secondAcceptance:'二次验收'}[task.kind]}}</strong>
    <a-alert v-if="canNotify&&!notificationAvailable&&['owner_rectification','rectification_rejected'].includes(task.status)" type="info" message="消息服务尚未接通，暂不可发送通知" />
    <a-descriptions class="detail-fields task-summary" :column="{xs:1,lg:2}" size="small">
      <a-descriptions-item :label="t('Decoration.detailFields.taskState')"><a-tag :color="task.status==='passed'?'success':task.status==='failed'?'error':'processing'">{{t(`Decoration.taskStates.${task.status==='pending'&&task.kind.includes('Acceptance')?'waitingAcceptance':task.status==='passed'&&task.kind==='inspectionRecord'?'normal':task.status}`)}}</a-tag></a-descriptions-item>
      <a-descriptions-item :label="t(task.kind.includes('Acceptance')?'Decoration.detailFields.round':'Decoration.detailFields.taskRound')">{{t('Decoration.detailFields.roundValue',{number:task.round})}}</a-descriptions-item>
      <a-descriptions-item :label="t(task.kind.includes('Acceptance')?'Decoration.detailFields.assignee':'Decoration.detailFields.inspectionAssignee')">{{task.assigneeName||task.details.inspectionRoles?.map(role=>role.roleName).join('、')||'待指派'}}</a-descriptions-item>
      <a-descriptions-item :label="t('Decoration.detailFields.handledTime')">{{date(task.modifyTime)}}</a-descriptions-item>
      <a-descriptions-item :label="t('Decoration.detailFields.taskNumber')">{{task.id}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.registrar')">{{task.creatorName||'—'}}</a-descriptions-item>
      <template v-if="task.kind.includes('Acceptance')"><a-descriptions-item :label="t('Decoration.detailFields.acceptanceDate')">{{date(task.acceptanceDate)}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.requestTime')">{{date(task.acceptanceRequestTime)}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.requester')">{{task.acceptanceRequesterName||'—'}}</a-descriptions-item></template>
      <template v-if="task.kind==='daily'"><a-descriptions-item :label="t('Decoration.detailFields.inspectionDate')">{{task.details.scheduledDate||'—'}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.startTime')">{{date(task.details.startTime)}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.endTime')">{{date(task.details.endTime)}}</a-descriptions-item></template>
      <a-descriptions-item v-if="task.kind==='inspectionRecord'" :label="t('Decoration.detailFields.reviewRole')">{{task.details.reviewRoleName||'—'}}</a-descriptions-item>
      <a-descriptions-item v-if="task.details.feedback" :label="t('Decoration.detailFields.feedback')" :span="2">{{task.details.feedback}}</a-descriptions-item>
    </a-descriptions>
    <TaskResults :task="task" :row="row" :api="api" />
    <section v-for="(violation,index) in task.details.violations" :key="index" class="detail-record-section"><a-descriptions class="detail-fields" :column="1" size="small"><a-descriptions-item :label="t('Decoration.detailFields.location')">{{violation.location||'—'}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.rectification')">{{violation.rectification||'—'}}</a-descriptions-item><a-descriptions-item v-if="violation.fileIds.length" :label="t('Decoration.detailFields.attachments')"><FilePicker :value="violation.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly /></a-descriptions-item></a-descriptions></section>
    <a-descriptions v-if="task.details.fileIds.length" class="detail-fields" :column="1" size="small"><a-descriptions-item :label="t('Decoration.detailFields.attachments')"><FilePicker :value="task.details.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly /></a-descriptions-item></a-descriptions>
    <a-descriptions v-if="task.details.rectificationRemark||task.details.rectificationFiles.length" class="detail-fields" :column="1" size="small"><a-descriptions-item :label="t('Decoration.detailFields.rectification')">{{task.details.rectificationRemark||'—'}}</a-descriptions-item><a-descriptions-item v-if="task.details.rectificationFiles.length" :label="t('Decoration.detailFields.rectificationFiles')"><FilePicker :value="task.details.rectificationFiles" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly /></a-descriptions-item></a-descriptions>
    <TaskHandlingRecords :records="task.details.handlingRecords||[]" :row="row" :api="api" />
    <a-button v-if="!row.actualEndTime&&(task.status==='pending'&&canHandle&&task.feedbackAllowed||task.status==='waiting_review'&&canReview&&task.reviewAllowed||['owner_rectification','rectification_rejected'].includes(task.status)&&canRectify)" @click="select(task)">{{task.kind==='daily'?'去巡检':'办理'}}</a-button>
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
