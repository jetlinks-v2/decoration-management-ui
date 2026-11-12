<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DecorationApi } from '../../services/decorationApi'
import type { Action } from '../../types/decoration'
import { useApplicationDetail } from '../../hooks/decoration/useApplicationDetail'
import {useDetailPermissions} from '../../hooks/decoration/useDetailPermissions'
import {useApplicationFlow} from '../../hooks/decoration/useApplicationFlow'
import {detailFlow,detailEntry,detailStageActions,type DetailEntry} from '../../utils/applicationDetailFlow'
import ApplicationFlowNav from './ApplicationFlowNav.vue'
import ApplicationInformation from './ApplicationInformation.vue'
import ApplicationFinance from './ApplicationFinance.vue'
import {ReloadOutlined,DownOutlined,HomeOutlined} from '@ant-design/icons-vue'
import { applicationActionNames } from '../../utils/decoration'
import ReviewPanel from './ReviewPanel.vue'
import ResubmitPanel from './ResubmitPanel.vue'
import TaskPanel from './TaskPanel.vue'
import PermitView from './PermitView.vue'
import ActionForm from './ActionForm.vue'
import PermitDocumentDialog from './PermitDocumentDialog.vue'
import {usePermitDocument} from '../../hooks/decoration/usePermitDocument'
const props=defineProps<{id:string;api:DecorationApi;permissions?:Record<string,boolean>;taskId?:string;initialAction?:string;initialTab?:DetailEntry}>()
const emit=defineEmits<{changed:[]}>()
const {t}=useI18n()
const action=ref('')
const reviewPanel=ref<{dirty:boolean}>(),resubmitPanel=ref<{dirty:boolean}>(),taskPanel=ref<{dirty:boolean}>()
const flow=useApplicationFlow(()=>[props.id,props.taskId,props.initialTab],()=>({busy:busy.value||uncertain.value,dirty:dirty.value}))
const detailPermissions=useDetailPermissions(()=>flow.stage.value)
const activeTaskId=computed(()=>flow.stage.value===detailEntry(props.initialTab||(props.taskId?'tasks':'overview'))?props.taskId:undefined)
const detail=useApplicationDetail(props.api,()=>props.id,()=>activeTaskId.value,()=>flow.taskTerms.value)
const permitDialog=ref<{element?:HTMLElement}>()
const printing=usePermitDocument(props.api,detail,()=>permitDialog.value?.element,()=>emit('changed'))
const {row,tasks,history,capabilities,loading,saving,uploading,error,uncertain,resultMissing,retryOriginal,load,execute,confirm,taskTotal,taskPage,changeTaskPage}=detail
const dirty=computed(()=>!!action.value||!!reviewPanel.value?.dirty||!!resubmitPanel.value?.dirty||!!taskPanel.value?.dirty)
function closeAction(){if(!busy.value&&!uncertain.value)action.value=''}
const allowed=(key:string)=>props.api.mine||!!detailPermissions.value[key]
async function submit(name:string,input:Partial<Action>,task=false){if(await execute(name,input,task)){action.value='';emit('changed')}}
const actionLabels:Record<string,string>={'acceptance':props.api.mine?'申请验收':'发起验收','permit':'生成装修备案证明','permit/workers':'施工人员登记','permit/extend':'备案延期','permit/print':'打印／下载备案证明','inspection/assign':'指派巡检','acceptance/assign':'指派验收','completion-time':'修改竣工时间','end':'结束装修','payment':'缴费核验','refund':'退款核验'}
const actions=computed(()=>applicationActionNames(row.value,props.api.mine,detailPermissions.value,capabilities.value).map(name=>({name:capabilities.value.simulated&&['payment','refund'].includes(name)?`simulation/${name}`:name,label:capabilities.value.simulated&&name==='payment'?'模拟缴费':capabilities.value.simulated&&name==='refund'?'模拟退款':name==='actual-end-time'?t('Decoration.record.changeActualEndTime'):actionLabels[name]})))

// 行内分配入口仅在当前对象和原按钮权限允许时打开，结束装修不会自动进入办理。
let initialActionOpened=false
watch(actions,items=>{if(!initialActionOpened&&props.initialAction&&items.some(item=>item.name===props.initialAction)){initialActionOpened=true;void choose(props.initialAction)}},{immediate:true})
async function choose(name:string){if(busy.value||uncertain.value)return;if(name.startsWith('simulation/'))await submit(name,{});else if(name==='permit/print')await printing.prepare();else action.value=name}
const date=(time?:number)=>time?new Date(time).toLocaleString():'—'
const busy=computed(()=>saving.value||uploading.value||printing.busy.value)
defineExpose({dirty,saving:busy,uncertain})

const steps=computed(()=>row.value?detailFlow(row.value):[])
const currentStep=computed(()=>steps.value.find(step=>step.key===flow.stage.value))
const stageTitle=computed(()=>currentStep.value?.title||t(flow.stage.value==='inspection'?'Decoration.detailFlow.inspection':'Decoration.history'))
const stageActions=computed(()=>row.value?actions.value.filter(item=>detailStageActions(flow.stage.value,actions.value.map(action=>action.name),row.value!).includes(item.name)):[])
const moreActions=computed(()=>actions.value.filter(item=>['actual-end-time','completion-time','end'].includes(item.name)))
const actionTitles=computed(()=>actions.value.find(item=>item.name===action.value)?.label||'办理装修')
const historyAction=(value:string)=>{const key=`Decoration.historyActions.${value}`;return t(key)===key?value:t(key)}
const taskKey=computed(()=>row.value?`${row.value.version}-${flow.stage.value}`:'')
</script>
<template>
 <a-spin :spinning="loading">
  <a-alert v-if="error" type="error" :message="error" show-icon><template #action><a-button @click="load">重试</a-button></template></a-alert>
  <a-alert v-if="uncertain" type="warning" :message="t('Decoration.uncertain')"><template #action><a-button @click="confirm">核对结果</a-button><a-button v-if="resultMissing" :loading="saving" @click="retryOriginal">重试原操作</a-button></template></a-alert>
  <template v-if="row">
    <header class="application-header">
      <div class="application-identity"><span class="house-symbol"><HomeOutlined /></span><div><p class="application-number">{{row.number}}<a-tag :color="row.status==='rejected'?'error':row.actualEndTime?'default':'processing'">{{t(`Decoration.states.${row.status}`)}}</a-tag></p><h2>{{row.spaceName}}</h2><p class="application-owner">{{row.projectName}}<i />{{row.ownerName}}<i />{{row.contactPhone}}</p></div></div>
      <a-space class="header-tools"><a-button :disabled="busy||uncertain" @click="load"><ReloadOutlined />{{t('Decoration.refresh')}}</a-button><a-dropdown v-if="moreActions.length" :trigger="['click']"><a-button :disabled="busy||uncertain">{{t('Decoration.detailFlow.more')}}<DownOutlined /></a-button><template #overlay><a-menu><a-menu-item v-for="item in moreActions" :key="item.name" :danger="item.name==='end'" @click="choose(item.name)">{{item.label}}</a-menu-item></a-menu></template></a-dropdown></a-space>
    </header>
    <div class="detail-layout">
      <ApplicationFlowNav :row="row" :selected="flow.stage.value" :blocked="busy||uncertain" @select="flow.select" />
      <section class="stage-content">
        <header class="stage-heading"><div><p v-if="currentStep" class="stage-eyebrow">{{t('Decoration.detailFlow.stage',{number:steps.findIndex(step=>step.key===flow.stage.value)+1})}}</p><h3>{{stageTitle}}</h3><p class="stage-description">{{currentStep?.description||t(flow.stage.value==='inspection'?'Decoration.detailFlow.inspectionDescription':'Decoration.detailFlow.historyDescription')}}</p></div><a-space wrap><a-button v-for="(item,index) in stageActions" :key="item.name" :type="index===0?'primary':'default'" :disabled="busy||uncertain" @click="choose(item.name)">{{item.label}}</a-button></a-space></header>
        <a-alert v-if="capabilities.simulated&&['pay','refund'].includes(flow.stage.value)" type="warning" :message="t('Decoration.simulatedServices')" show-icon class="stage-notice" />
        <a-alert v-if="flow.stage.value==='pay'&&row.status==='pending_payment'&&!capabilities.payment||flow.stage.value==='refund'&&row.status==='acceptance_passed'&&!capabilities.refund" type="info" :message="t('Decoration.financeUnavailable')" class="stage-notice" />
        <template v-if="flow.stage.value==='apply'">
          <a-radio-group class="application-subnav" :value="flow.applicationTab.value" button-style="solid" @change="flow.selectApplicationTab($event.target.value)"><a-radio-button value="information">{{t('Decoration.detailFlow.information')}}</a-radio-button><a-radio-button value="review">{{t('Decoration.detailFlow.review')}}</a-radio-button></a-radio-group>
          <ApplicationInformation v-if="flow.applicationTab.value==='information'" :row="row" :api="api" />
          <template v-else><ReviewPanel ref="reviewPanel" :key="row.version" :row="row" :api="api" :can-review="!api.mine&&allowed('review')" :busy="busy||uncertain" @action="submit" /><ResubmitPanel ref="resubmitPanel" v-if="allowed('resubmit')&&(api.mine||row.source==='pc_admin')" :key="row.version" :row="row" :api="api" :busy="busy||uncertain" @action="submit" /></template>
        </template>
        <ApplicationFinance v-else-if="flow.stage.value==='pay'||flow.stage.value==='refund'" :row="row" :refund="flow.stage.value==='refund'" />
        <PermitView v-else-if="flow.stage.value==='permit'" :row="row" :api="api" />
        <template v-else-if="['inspection','first','second'].includes(flow.stage.value)">
          <div v-if="flow.stage.value==='inspection'&&row.inspectionPlan" class="inspection-plan"><strong>{{t('Decoration.detailFlow.inspectionPlan')}}</strong><p>{{row.inspectionPlan.inspectionRoles.map(role=>`${role.roleName} · ${role.intervalDays}天/次`).join('；')}}</p><small>{{date(row.inspectionPlan.startTime)}} — {{date(row.inspectionPlan.endTime)}}</small></div>
          <TaskPanel ref="taskPanel" :key="taskKey" :row="row" :tasks="tasks" :empty-text="t('Decoration.detailFlow.noTasks',{stage:stageTitle})" :api="api" :busy="busy||uncertain" :can-handle="!api.mine&&allowed('handle')" :can-review="!api.mine&&allowed('taskReview')" :can-notify="!api.mine&&allowed('notify')" :can-assign="!api.mine&&allowed('assign')" :notification-available="capabilities.pushNotification" :can-rectify="allowed('rectification')&&(api.mine||row.source==='pc_admin')" @action="submit" /><a-pagination v-if="taskTotal>20" :current="taskPage+1" :total="taskTotal" :page-size="20" @change="changeTaskPage" />
        </template>
        <a-timeline v-else-if="flow.stage.value==='history'" class="operation-history"><a-timeline-item v-for="event in history" :key="event.id"><div class="history-line"><strong>{{event.actorName}}</strong><time>{{date(event.createTime)}}</time></div><p>{{historyAction(event.action)}}<a-tag>{{t(`Decoration.states.${event.afterStatus}`)}}</a-tag></p><p v-if="event.remark" class="history-remark">{{event.remark}}</p></a-timeline-item></a-timeline>
      </section>
    </div>
    <a-modal :open="!!action" :title="actionTitles" :width="action==='permit/workers'?1100:560" :body-style="{maxHeight:'70vh',overflowY:'auto'}" :footer="null" :mask-closable="false" @cancel="closeAction"><ActionForm v-if="action" :row="row" :action="action" :api="api" :busy="busy||uncertain" @submit="submit" /></a-modal>
    <PermitDocumentDialog ref="permitDialog" :state="printing.view.value" @close="printing.close" @reload="printing.prepare" @print="printing.print" @download="printing.download" @confirm="printing.recover()" @retry="printing.recover(true)" />
  </template>
 </a-spin>
</template>
<style scoped src="./application-detail.css"></style>
