<script setup lang="ts">
import {computed,reactive,ref,watch} from 'vue'
import dayjs from 'dayjs'
import type {Application,Task,Action,CheckResult,Violation} from '../../types/decoration'
import type {DecorationApi} from '../../services/decorationApi'
import CheckForm from '../../components/decoration/CheckForm.vue'
import TaskResults from '../../components/decoration/TaskResults.vue'
import FilePicker from '../../components/decoration/FilePicker.vue'
import TaskHandlingRecords from '../../components/decoration/TaskHandlingRecords.vue'
import {taskNames,taskStates,dateText} from '../model'
const props=defineProps<{task:Task;row:Application;api:DecorationApi;busy:boolean;canHandle?:boolean;canReview?:boolean;owner?:boolean}>()
const emit=defineEmits<{action:[string,Partial<Action>,boolean]}>()
const results=ref<CheckResult[]>([]),error=ref(''),form=reactive({passed:true,remark:'',fileIds:[] as string[],deadline:'',violations:[] as Violation[]})
const mode=computed(()=>props.row.actualEndTime?'':props.owner&&['owner_rectification','rectification_rejected'].includes(props.task.status)?'rectification':!props.owner&&props.task.status==='pending'&&props.canHandle?'feedback':!props.owner&&props.task.status==='waiting_review'&&props.canReview?'review':'')
const dirty=computed(()=>!form.passed||!!form.deadline||!!form.remark||form.fileIds.length>0||form.violations.length>0||results.value.some(r=>r.value||r.fileIds.length||!r.qualified))
watch(()=>[props.task.id,props.task.modifyTime],()=>{results.value=props.task.details.checks.filter(c=>c.enabled).map(c=>({itemId:c.id,fileIds:[],qualified:true}));Object.assign(form,{passed:true,remark:'',fileIds:[],deadline:'',violations:[]});error.value=''},{immediate:true})
watch(results,values=>{if(values.some(r=>!r.qualified))form.passed=false},{deep:true})
function submit(){
 if(props.busy||!mode.value)return
 error.value=''
 if(mode.value==='rectification'&&!form.remark.trim()&&!form.fileIds.length){error.value='请填写整改说明或上传整改照片';return}
 if(mode.value==='feedback'){
  if(form.passed&&results.value.some(r=>!r.qualified)){error.value='存在不合格检查项，不能提交为通过';return}
  if(props.task.kind==='daily'&&!form.passed&&(!form.violations.length||form.violations.some(v=>!v.location.trim()||!v.rectification.trim()))){error.value='请填写违规位置和整改要求';return}
 }
 if(mode.value==='review'&&!form.passed&&!form.remark.trim()){error.value='请说明整改未通过的原因';return}
 const name=mode.value==='rectification'?'rectification':mode.value==='review'?'rectification/review':props.task.kind==='daily'?'inspection/feedback':'acceptance/feedback'
 emit('action',name,{taskId:props.task.id,passed:form.passed,remark:form.remark,fileIds:form.fileIds,results:results.value,violations:form.passed?[]:form.violations,deadline:form.deadline?dayjs(form.deadline).endOf('day').valueOf():undefined},mode.value!=='rectification')
}
defineExpose({dirty})
</script>
<template>
 <section class="mobile-surface task-record"><div class="staff-task-head"><h2>{{task.status==='waiting_review'?'整改复核':taskNames[task.kind]}}</h2><span class="status-pill">{{taskStates[task.status]||task.status}}</span></div>
  <p class="muted">{{dateText(task.modifyTime)}} · {{task.assigneeName||task.details.inspectionRoles?.map(r=>r.roleName).join('、')||'待办理'}}</p>
  <p v-if="task.kind==='daily'">巡检日期：{{task.details.scheduledDate||'—'}}<br>有效时段：{{dateText(task.details.startTime)}} — {{dateText(task.details.endTime)}}</p>
  <p v-if="task.kind.includes('Acceptance')">申请验收日期：{{dateText(task.acceptanceDate)}}</p>
  <template v-if="task.status!=='pending'">
   <p v-if="task.details.feedback" class="feedback-note">{{task.details.feedback}}</p><TaskResults :task="task" :row="row" :api="api" />
   <div v-for="(violation,index) in task.details.violations" :key="index" class="violation-item"><strong>{{index+1}}. {{violation.location}}</strong><p>{{violation.rectification}}</p><FilePicker :value="violation.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly /></div>
   <p v-if="task.details.deadline" class="warning-text">请于 {{dateText(task.details.deadline)}} 前完成整改</p>
   <FilePicker :value="task.details.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly />
   <div v-if="task.details.rectificationRemark||task.details.rectificationFiles.length" class="rectification-result"><h3>业主整改反馈</h3><p>{{task.details.rectificationRemark}}</p><FilePicker :value="task.details.rectificationFiles" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly /></div>
   <TaskHandlingRecords :records="task.details.handlingRecords||[]" :row="row" :api="api" />
  </template>
 </section>
 <a-form :model="form" v-if="mode" layout="vertical" class="mobile-form" :disabled="busy" @finish="submit">
  <section class="mobile-surface">
   <h2>{{mode==='rectification'?'提交整改反馈':mode==='review'?'填写整改复核结果':'现场检查'}}</h2>
   <CheckForm v-if="mode==='feedback'" v-model:value="results" :items="task.details.checks" :api="api" :project-id="row.projectId" :decoration-id="row.id" :readonly="busy" />
   <a-form-item v-if="mode!=='rectification'" label="检查结果" required><a-radio-group v-model:value="form.passed"><a-radio :value="true">通过</a-radio><a-radio :value="false">不通过</a-radio></a-radio-group></a-form-item>
   <template v-if="mode==='feedback'&&task.kind==='daily'&&!form.passed">
    <p class="warning-text">提交后将直接下发业主整改，请准确填写整改要求。</p>
    <div v-for="(violation,index) in form.violations" :key="index" class="violation-editor"><a-form-item :label="`违规位置 ${index+1}`" required><a-input v-model:value="violation.location" placeholder="例如：阳台外立面" /></a-form-item><a-form-item label="整改要求" required><a-textarea v-model:value="violation.rectification" :auto-size="{minRows:2,maxRows:6}" /></a-form-item><FilePicker v-model:value="violation.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" :readonly="busy" /><a-button danger type="text" :disabled="busy" @click="form.violations.splice(index,1)">移除此项</a-button></div>
    <a-button block :disabled="busy" @click="form.violations.push({location:'',rectification:'',fileIds:[]})">添加违规事项</a-button>
    <a-form-item label="整改截止日期"><a-input v-model:value="form.deadline" type="date" /></a-form-item>
   </template>
   <a-form-item :label="mode==='rectification'?'整改说明':'处理意见'" :required="mode==='review'&&!form.passed"><a-textarea v-model:value="form.remark" :maxlength="2000" :auto-size="{minRows:3,maxRows:8}" :placeholder="mode==='rectification'?'请描述已完成的整改内容':'请填写现场检查或复核意见'" /></a-form-item>
   <a-form-item v-if="mode!=='review'" :label="mode==='rectification'?'整改照片 / 附件':'现场照片 / 附件'"><FilePicker v-model:value="form.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" :readonly="busy" /></a-form-item>
   <a-alert v-if="error" type="error" :message="error" show-icon />
  </section>
  <div class="mobile-bottom-actions"><a-button block type="primary" size="large" html-type="submit" :loading="busy">{{mode==='rectification'?'提交整改，申请复核':mode==='feedback'&&task.kind==='daily'&&!form.passed?'提交并下发业主整改':'确认提交'}}</a-button></div>
 </a-form>
 <p v-else-if="!row.actualEndTime&&task.status==='pending'" class="mobile-footnote">当前账号没有办理权限，或任务已不属于本人。</p>
</template>
