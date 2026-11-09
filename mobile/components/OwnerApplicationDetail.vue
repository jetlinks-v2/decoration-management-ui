<script setup lang="ts">
import {computed,ref} from 'vue'
import dayjs from 'dayjs'
import {HomeOutlined,CheckCircleOutlined,ClockCircleOutlined} from '@ant-design/icons-vue'
import type {DecorationApi} from '../../services/decorationApi'
import type {Action,Term} from '../../types/decoration'
import {useApplicationDetail} from '../../hooks/decoration/useApplicationDetail'
import {canRequestAcceptance,nextRefund} from '../../utils/decoration'
import FilePicker from '../../components/decoration/FilePicker.vue'
import PermitView from '../../components/decoration/PermitView.vue'
import ResubmitPanel from '../../components/decoration/ResubmitPanel.vue'
import MobileTaskRecord from './MobileTaskRecord.vue'
import {dateText,type OwnerStep} from '../model'
const props=defineProps<{api:DecorationApi;id:string;step:OwnerStep|'rectification'|'overview'}>()
const emit=defineEmits<{changed:[];restart:[]}>()
const terms=computed<Term[]>(()=>props.step==='first'||props.step==='second'?[{column:'kind',termType:'eq',value:props.step==='first'?'firstAcceptance':'secondAcceptance'}]:props.step==='rectification'?[{column:'kind',termType:'eq',value:'inspectionRecord'},{column:'status',termType:'nin',value:['passed']}]:[])
const {row,tasks,history,capabilities,loading,saving,uploading,error,uncertain,resultMissing,confirm,retryOriginal,load,execute,taskTotal,taskPage,changeTaskPage}=useApplicationDetail(props.api,()=>props.id,undefined,()=>terms.value)
const acceptanceDate=ref(''),remark=ref(''),resubmit=ref<{dirty:boolean}>(),taskEditors=ref<{dirty:boolean}[]>([])
const dirty=computed(()=>!!acceptanceDate.value||!!remark.value||!!resubmit.value?.dirty||taskEditors.value.some(editor=>editor.dirty)),busy=computed(()=>saving.value||uploading.value||uncertain.value)
const round=computed(()=>props.step==='second'?2:1)
async function submit(name:string,input:Partial<Action>={},task=false){if(await execute(name,input,task)){acceptanceDate.value='';remark.value='';emit('changed')}}
function applyAcceptance(){if(!acceptanceDate.value){error.value='请选择期望验收日期';return}void submit('acceptance',{type:round.value,acceptanceDate:dayjs(acceptanceDate.value).valueOf(),remark:remark.value})}
defineExpose({dirty,saving:busy,uncertain,reload:load})
</script>
<template>
 <a-spin :spinning="loading">
  <a-alert v-if="error" type="error" :message="error" show-icon><template #action><a-button :disabled="busy" @click="load">重试</a-button></template></a-alert>
  <a-alert v-if="uncertain" type="warning" message="办理结果待确认，请先核对结果。"><template #action><a-button :loading="saving" @click="confirm">核对结果</a-button><a-button v-if="resultMissing" :loading="saving" @click="retryOriginal">重试原操作</a-button></template></a-alert>
  <template v-if="row">
   <div class="mobile-surface form-house"><HomeOutlined /><div><strong>{{row.spaceName}}</strong><p>{{row.projectName}} · {{row.ownerName}}</p></div><span class="status-pill">{{$t(`Decoration.states.${row.status}`)}}</span></div>
   <a-alert v-if="capabilities.simulated" type="warning" :message="$t('Decoration.simulatedServices')" show-icon />
   <template v-if="step==='apply'||step==='overview'">
    <section class="mobile-surface"><h2>申请信息</h2><dl><dt>申请编号</dt><dd>{{row.number}}</dd><dt>申请业主</dt><dd>{{row.ownerName}}</dd><dt>联系电话</dt><dd>{{row.contactPhone}}</dd><dt>装修类型</dt><dd>{{row.details.decorationType==='first'?'首次装修':'二次装修'}}</dd><dt>施工时间</dt><dd>{{dateText(row.details.startTime)}}<br>至 {{dateText(row.details.completionTime)}}</dd><dt>施工单位</dt><dd>{{row.details.constructionUnit}}</dd><dt>负责人</dt><dd>{{row.details.constructionManager}}</dd><dt>联系电话</dt><dd>{{row.details.managerPhone}}</dd></dl></section>
    <section v-for="kind in ['drawing','material']" :key="kind" class="mobile-surface"><h2>{{kind==='drawing'?'装修图纸审核':'资料审核'}}</h2><p v-if="!row.details.materials.some(m=>m.definition.kind===kind)" class="muted">无需提交{{kind==='drawing'?'图纸':'资料'}}</p><article v-for="item in row.details.materials.filter(m=>m.definition.kind===kind)" :key="item.definition.id" class="material-review"><div class="staff-task-head"><strong>{{item.definition.name}}</strong><span class="status-pill" :class="{warning:item.reviewStatus!==1}">{{item.reviewStatus===1?'已通过':item.reviewStatus===2?'未通过':'待审核'}}</span></div><p v-if="item.remark" class="warning-text">{{item.remark}}</p><FilePicker :value="item.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly /><FilePicker v-if="item.annotatedFileId" :value="[item.annotatedFileId]" :api="api" :project-id="row.projectId" :decoration-id="row.id" label="查看审核批注" readonly /><p v-if="!item.fileIds.length" class="muted">未上传</p></article><div v-if="kind==='material'" class="material-review"><div class="staff-task-head"><strong>装修保证金</strong><span class="status-pill">{{row.depositReviewStatus===1?'已审核':row.depositReviewStatus===2?'未通过':'待审核'}}</span></div><p>{{row.approvedDeposit!=null?`审核金额：¥${row.approvedDeposit}`:'金额待物业核定'}}</p><p v-if="row.depositReviewRemark" class="warning-text">{{row.depositReviewRemark}}</p></div></section>
    <ResubmitPanel v-if="!row.actualEndTime" :key="row.version" ref="resubmit" :row="row" :api="api" :busy="busy" @action="submit" />
    <section v-for="doc in row.details.signedDocuments" :key="doc.kind" class="mobile-surface"><h3>{{doc.title}}</h3><p>{{doc.signedName}} · {{dateText(doc.signedTime)}}</p><FilePicker :value="[doc.documentFileId]" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly :label="`查看或下载${doc.title}`" /></section><a-collapse ghost><a-collapse-panel key="self" header="装修自检与办理记录"><section class="mobile-surface"><p>自检结果：{{row.details.selfInspectionStatus===1?'发现问题':'未发现问题'}}</p><p>{{row.details.selfInspectionRemark}}</p><FilePicker :value="row.details.selfInspectionFiles" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly /><a-timeline><a-timeline-item v-for="event in history" :key="event.id"><strong>{{$t(`Decoration.states.${event.afterStatus}`)}}</strong><p>{{event.actorName}} · {{dateText(event.createTime)}}</p><p v-if="event.remark">{{event.remark}}</p></a-timeline-item></a-timeline></section></a-collapse-panel></a-collapse>
    <div v-if="row.actualEndTime" class="mobile-bottom-actions"><a-button block size="large" type="primary" @click="emit('restart')">再次申请装修</a-button></div>
   </template>
   <template v-else-if="step==='pay'||step==='refund'">
    <section class="mobile-surface finance-summary"><div class="finance-status-icon"><CheckCircleOutlined v-if="(step==='pay'?row.paymentStatus:row.refundStatus)===2" /><ClockCircleOutlined v-else /></div><h2>{{step==='pay'?(row.paymentStatus===2?'费用已缴纳':'装修费用缴纳'):(row.refundStatus===2?'退费已完成':'装修退费申请')}}</h2><span class="finance-amount">¥{{step==='pay'?row.paidAmount??row.approvedDeposit??'—':nextRefund(row)?.amount??row.refundedAmount??'—'}}</span><p class="muted">{{step==='pay'?'装修保证金':'可退金额以退款核验结果为准'}}</p><dl v-if="(step==='pay'?row.paymentStatus:row.refundStatus)===2"><dt>{{step==='pay'?'缴费时间':'退费时间'}}</dt><dd>{{dateText(step==='pay'?row.paidTime:row.refundTime)}}</dd><dt>业务单据</dt><dd>{{step==='pay'?row.paymentReference:row.refundReference}}</dd></dl></section>
    <section v-if="!row.actualEndTime&&(step==='pay'?row.paymentStatus:row.refundStatus)!==2" class="mobile-surface"><p>{{step==='pay'?'请核对费用并完成缴纳，缴费核验通过后可领取备案证明。':'二次验收通过后，按申请协议约定一次性退还保证金；退款核验成功后结束装修。'}}</p><a-alert v-if="row.source==='pc_admin'&&!capabilities.simulated" type="info" message="该申请由物业登记，缴费与退费请联系物业前台核验财务单据。" /><a-alert v-else-if="step==='pay'?!capabilities.payment:!capabilities.refund" type="info" message="当前暂不支持线上办理，请联系物业前台。" /><div v-else class="mobile-bottom-actions"><a-button block size="large" type="primary" :loading="saving" :disabled="busy||(step==='pay'?row.status!=='pending_payment':!nextRefund(row))" @click="submit((capabilities.simulated?'simulation/':'')+(step==='pay'?'payment':'refund'))">{{capabilities.simulated?(step==='pay'?'模拟缴费':'模拟退款（一次性）'):step==='pay'?'确认缴费':nextRefund(row)?.label||'提交退费申请'}}</a-button></div></section>
    <section v-for="refund in row.details.refunds" :key="refund.stage" class="mobile-surface">{{refund.stage==='single'?'一次性退款':refund.stage==='first'?'首次验收':'二次验收'}}：{{refund.amount}} 元 · {{refund.reference||'零金额结算'}} · {{dateText(refund.settledTime)}}</section><p v-if="row.actualEndTime&&row.refundStatus!==2" class="mobile-footnote">装修已结束，尚无退款成功记录，请联系物业确认费用处理。</p>
   </template>
   <template v-else-if="step==='permit'"><section class="mobile-surface"><h2>{{row.permit?.printTime?'备案证明已领取':'待领取备案证明'}}</h2><p>{{row.permit?.printTime?'请按备案内容和有效期施工。':'缴费核验通过后，请到物业前台领取装修备案证明。'}}</p></section><PermitView :row="row" /></template>
   <template v-else-if="step==='first'||step==='second'">
    <section class="mobile-surface"><h2>{{step==='first'?'首次验收':'二次验收'}}</h2><p class="muted">{{$t(`Decoration.states.${row.status}`)}}</p><a-form :model="{acceptanceDate,remark}" v-if="canRequestAcceptance(row,round)" layout="vertical" :disabled="busy" @finish="applyAcceptance"><a-form-item label="期望验收日期" required><a-input v-model:value="acceptanceDate" type="date" /></a-form-item><a-form-item label="申请说明"><a-textarea v-model:value="remark" placeholder="可填写方便联系的时间及补充说明" /></a-form-item><a-button block size="large" type="primary" html-type="submit" :loading="saving" :disabled="busy">{{row.status.includes('failed')?'重新申请验收':'提交验收申请'}}</a-button></a-form><p v-else-if="row.acceptanceDate">本轮申请日期：{{dateText(row.acceptanceDate)}}</p></section>
    <MobileTaskRecord v-for="task in tasks" :key="task.id" :task="task" :row="row" :api="api" :busy="busy" owner />
    <a-empty v-if="!tasks.length&&!loading" description="暂无验收记录" />
   </template>
   <template v-else-if="step==='rectification'"><p class="mobile-explanation">物业巡检发现的问题将直接显示在这里。完成整改后，请提交照片和说明，等待物业复核。</p><MobileTaskRecord v-for="task in tasks" :key="task.id+':'+task.modifyTime" ref="taskEditors" :task="task" :row="row" :api="api" :busy="busy" owner @action="submit" /><a-empty v-if="!tasks.length&&!loading" description="暂无整改记录" /></template>
   <a-pagination v-if="['first','second','rectification'].includes(step)&&taskTotal>20" :current="taskPage+1" :page-size="20" :total="taskTotal" simple :disabled="busy||dirty" @change="changeTaskPage" />
  </template>
 </a-spin>
</template>
