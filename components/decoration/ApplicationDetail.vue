<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DecorationApi } from '../../services/decorationApi'
import type { Action } from '../../types/decoration'
import { useApplicationDetail } from '../../hooks/decoration/useApplicationDetail'
import { applicationActionNames } from '../../utils/decoration'
import ReviewPanel from './ReviewPanel.vue'
import ResubmitPanel from './ResubmitPanel.vue'
import TaskPanel from './TaskPanel.vue'
import PermitView from './PermitView.vue'
import ActionForm from './ActionForm.vue'
import FilePicker from './FilePicker.vue'
import PermitDocumentDialog from './PermitDocumentDialog.vue'
import {usePermitDocument} from '../../hooks/decoration/usePermitDocument'
import {useDiscardConfirm} from '../../hooks/decoration/useDiscardConfirm'
const props=defineProps<{id:string;api:DecorationApi;permissions?:Record<string,boolean>;taskId?:string;initialAction?:string}>()
const emit=defineEmits<{changed:[]}>()
const {t}=useI18n()
const confirmDiscard=useDiscardConfirm(()=>t('Decoration.unsaved'))
const detail=useApplicationDetail(props.api,()=>props.id,()=>props.taskId)
const permitDialog=ref<{element?:HTMLElement}>()
const printing=usePermitDocument(props.api,detail,()=>permitDialog.value?.element,()=>emit('changed'))
const {row,tasks,history,capabilities,loading,saving,uploading,error,uncertain,resultMissing,retryOriginal,load,execute,confirm,taskTotal,taskPage,changeTaskPage}=detail
const action=ref(''),tab=ref(props.taskId?'tasks':'overview')
const reviewPanel=ref<{dirty:boolean}>(),resubmitPanel=ref<{dirty:boolean}>(),taskPanel=ref<{dirty:boolean}>()
const dirty=computed(()=>!!action.value||!!reviewPanel.value?.dirty||!!resubmitPanel.value?.dirty||!!taskPanel.value?.dirty)
async function closeAction(){if(busy.value||uncertain.value)return;if(await confirmDiscard()&&!busy.value&&!uncertain.value)action.value=''}
const allowed=(key:string)=>props.api.mine||!!props.permissions?.[key]
async function submit(name:string,input:Partial<Action>,task=false){if(await execute(name,input,task)){action.value='';emit('changed')}}
const actionLabels:Record<string,string>={'acceptance':'申请验收','permit':'办理备案','permit/extend':'备案延期','permit/print':'打印备案证明','inspection/assign':'指派巡检','acceptance/assign':'指派验收','completion-time':'修改竣工时间','end':'结束装修','payment':'缴费核验','refund':'退款核验'}
const actions=computed(()=>applicationActionNames(row.value,props.api.mine,props.permissions||{},capabilities.value).map(name=>({name,label:name==='actual-end-time'?t('Decoration.record.changeActualEndTime'):actionLabels[name]})))

// 行内分配入口仅在当前对象和原按钮权限允许时打开，结束装修不会自动进入办理。
let initialActionOpened=false
watch(actions,items=>{if(!initialActionOpened&&props.initialAction&&items.some(item=>item.name===props.initialAction)){initialActionOpened=true;void choose(props.initialAction)}},{immediate:true})
async function choose(name:string){if(busy.value||uncertain.value)return;if(name==='permit/print')await printing.prepare();else action.value=name}
const date=(time?:number)=>time?new Date(time).toLocaleString():'—'
const busy=computed(()=>saving.value||uploading.value||printing.busy.value)
defineExpose({dirty,saving:busy,uncertain})
</script>
<template>
 <a-spin :spinning="loading">
  <a-alert v-if="error" type="error" :message="error" show-icon><template #action><a-button @click="load">重试</a-button></template></a-alert>
  <a-alert v-if="uncertain" type="warning" :message="t('Decoration.uncertain')"><template #action><a-button @click="confirm">核对结果</a-button><a-button v-if="resultMissing" :loading="saving" @click="retryOriginal">重试原操作</a-button></template></a-alert>
  <template v-if="row">
   <div class="decoration-toolbar"><div><h2>{{row.number}}</h2><span>{{row.projectName}} / {{row.spaceName}} · {{t(`Decoration.states.${row.status}`)}}</span></div><a-button :disabled="busy" @click="load">刷新</a-button></div>
   <div class="decoration-actions"><a-button v-for="item in actions" :key="item.name" :disabled="busy||uncertain" :danger="item.name==='end'" @click="choose(item.name)">{{item.label}}</a-button></div>
   <a-alert v-if="capabilities.simulated" type="warning" :message="t('Decoration.simulatedServices')" show-icon style="margin-top:16px" />
   <a-alert v-if="(row.status==='pending_payment'&&!capabilities.payment)||(row.status==='acceptance_passed'&&!capabilities.refund)" type="info" :message="t('Decoration.financeUnavailable')" style="margin-top:16px" />
   <a-tabs v-model:active-key="tab">
    <a-tab-pane key="overview" tab="申请信息">
     <a-descriptions bordered :column="{xs:1,sm:2}" size="small">
      <a-descriptions-item label="业主">{{row.ownerName}}</a-descriptions-item><a-descriptions-item label="联系电话">{{row.contactPhone}}</a-descriptions-item>
      <a-descriptions-item label="施工单位">{{row.details.constructionUnit}}</a-descriptions-item><a-descriptions-item label="负责人">{{row.details.constructionManager}} · {{row.details.managerPhone}}</a-descriptions-item>
      <a-descriptions-item label="开始时间">{{date(row.details.startTime)}}</a-descriptions-item><a-descriptions-item label="竣工时间">{{date(row.details.completionTime)}}</a-descriptions-item>
      <a-descriptions-item label="申请时间">{{date(row.createTime)}}</a-descriptions-item><a-descriptions-item label="登记人">{{row.creatorName}}</a-descriptions-item>
      <a-descriptions-item label="申请来源">{{row.source==='pc_admin'?'管理端登记':'业主申请'}}</a-descriptions-item><a-descriptions-item label="结束时间">{{date(row.actualEndTime)}}</a-descriptions-item>
      <template v-if="row.acceptanceType">
       <a-descriptions-item label="当前验收轮次">{{row.acceptanceType===1?'首次验收':'二次验收'}} · 第{{row.acceptanceRound}}轮</a-descriptions-item><a-descriptions-item label="申请验收日期">{{date(row.acceptanceDate)}}</a-descriptions-item>
       <a-descriptions-item label="提交验收申请时间">{{date(row.acceptanceRequestTime)}}</a-descriptions-item><a-descriptions-item label="验收申请人">{{row.acceptanceRequesterName||'—'}}</a-descriptions-item>
      </template>
      <a-descriptions-item v-if="row.actualEndTime!=null" label="结束原因" :span="2">{{row.endReason||t('Decoration.record.noEndReason')}}</a-descriptions-item>
     </a-descriptions>
     <h3>签署文书</h3><a-empty v-if="!row.details.signedDocuments?.length" description="历史申请未保留分项签署文书" /><section v-for="doc in row.details.signedDocuments" :key="doc.kind"><h4>{{doc.title}}</h4><p>签署人：{{doc.signedName}} · {{date(doc.signedTime)}}</p><FilePicker :value="[doc.documentFileId]" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly :label="`查看或下载${doc.title}`" /></section>
     <h3>装前自检</h3><p>{{row.details.selfInspectionRemark||'未填写说明'}}</p><FilePicker :value="row.details.selfInspectionFiles" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly />
     <h3>{{row.details.agreement.title}}</h3><p class="decoration-agreement">{{row.details.agreement.content}}</p><p v-for="(item,index) in row.details.agreement.supplements" :key="index">{{item.name}}：{{item.content}}</p>
    </a-tab-pane>
    <a-tab-pane key="materials" tab="资料审核"><ReviewPanel ref="reviewPanel" :key="row.version" :row="row" :api="api" :can-review="!api.mine&&allowed('review')" :busy="busy||uncertain" @action="submit" /><ResubmitPanel ref="resubmitPanel" v-if="allowed('resubmit')&&(api.mine||row.source==='pc_admin')" :key="row.version" :row="row" :api="api" :busy="busy||uncertain" @action="submit" /></a-tab-pane>
    <a-tab-pane key="tasks" tab="巡检与验收"><TaskPanel ref="taskPanel" :key="row.version" :row="row" :tasks="tasks" :api="api" :busy="busy||uncertain" :can-handle="!api.mine&&allowed('handle')" :can-review="!api.mine&&allowed('taskReview')" :can-notify="!api.mine&&allowed('notify')" :can-assign="!api.mine&&allowed('assign')" :notification-available="capabilities.pushNotification" :can-rectify="allowed('rectification')&&(api.mine||row.source==='pc_admin')" @action="submit" /><a-pagination v-if="taskTotal>20" :current="taskPage+1" :total="taskTotal" :page-size="20" @change="changeTaskPage" /></a-tab-pane>
    <a-tab-pane key="permit" tab="备案证明"><PermitView :row="row" /></a-tab-pane>
    <a-tab-pane key="finance" tab="缴费与退款"><a-descriptions bordered :column="1"><a-descriptions-item label="缴费状态">{{['未缴费','处理中','已核验'][row.paymentStatus]}}</a-descriptions-item><a-descriptions-item label="已收金额">{{row.paidAmount??'—'}}</a-descriptions-item><a-descriptions-item label="收款单据">{{row.paymentReference||'—'}}</a-descriptions-item><a-descriptions-item label="退款状态">{{['未退款','处理中','已退款'][row.refundStatus]}}</a-descriptions-item><a-descriptions-item label="退款金额">{{row.refundedAmount??'—'}}</a-descriptions-item></a-descriptions><a-list :data-source="row.details.refunds||[]"><template #renderItem="{item}"><a-list-item>{{item.stage==='first'?'首次验收':item.stage==='second'?'二次验收':'验收'}}：{{item.amount}} 元 · {{item.reference||'零金额结算'}} · {{date(item.settledTime)}}</a-list-item></template></a-list></a-tab-pane>
    <a-tab-pane key="history" tab="操作轨迹"><a-timeline><a-timeline-item v-for="event in history" :key="event.id"><b>{{event.actorName}}</b> · {{event.action}}<p>{{date(event.createTime)}} · {{t(`Decoration.states.${event.afterStatus}`)}}</p><p>{{event.remark}}</p></a-timeline-item></a-timeline></a-tab-pane>
   </a-tabs>
   <a-modal :open="!!action" title="办理装修" :footer="null" :mask-closable="false" @cancel="closeAction"><ActionForm v-if="action" :row="row" :action="action" :api="api" :busy="busy||uncertain" @submit="submit" /></a-modal>
   <PermitDocumentDialog ref="permitDialog" :state="printing.view.value" @close="printing.close" @reload="printing.prepare" @print="printing.print" @download="printing.download" @confirm="printing.recover()" @retry="printing.recover(true)" />
  </template>
 </a-spin>
</template>
