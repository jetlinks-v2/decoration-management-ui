<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { Application, Action } from '../../types/decoration'
import type { DecorationApi } from '../../services/decorationApi'
import FilePicker from './FilePicker.vue'
const props=defineProps<{row:Application;api:DecorationApi;canReview:boolean;busy:boolean}>()
const emit=defineEmits<{action:[string,Partial<Action>]}>()
const review=reactive({itemId:'deposit',result:1,remark:'',amount:props.row.approvedDeposit||props.row.details.agreement.deposit,annotated:[] as string[]})
const original=JSON.stringify(review)
const dirty=computed(()=>props.canReview&&JSON.stringify(review)!==original)
defineExpose({dirty})
</script>
<template>
  <a-list :data-source="row.details.materials" item-layout="vertical">
    <template #renderItem="{item}">
      <a-list-item>
        <a-list-item-meta :title="item.definition.name" :description="`${['待审核','已通过','已驳回'][item.reviewStatus]} · ${item.reviewerName||'尚未审核'}`" />
        <FilePicker :value="item.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly />
        <p v-if="item.remark">审核意见：{{item.remark}}</p>
        <FilePicker v-if="item.annotatedFileId" :value="[item.annotatedFileId]" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly />
      </a-list-item>
    </template>
  </a-list>
  <a-card size="small" title="保证金审核" class="decoration-detail-section">
    <p>协议金额 {{row.details.agreement.deposit}} 元 · 确认金额 {{row.approvedDeposit??'未确认'}} 元</p>
    <p>{{['待审核','已通过','已驳回'][row.depositReviewStatus]}} · {{row.depositReviewerName||'尚未审核'}}</p>
    <p v-if="row.depositReviewRemark">{{row.depositReviewRemark}}</p>
  </a-card>
  <a-form v-if="canReview&&!row.actualEndTime&&row.paymentStatus===0" layout="vertical" @finish="emit('action','review',{itemId:review.itemId,result:review.result,remark:review.remark,amount:review.itemId==='deposit'?review.amount:undefined,annotatedFileId:review.annotated[0]})">
    <a-form-item label="审核项目"><a-select v-model:value="review.itemId" :disabled="busy" :options="[{value:'deposit',label:'装修保证金'},...row.details.materials.map(m=>({value:m.definition.id,label:m.definition.name}))]" /></a-form-item>
    <a-form-item v-if="review.itemId==='deposit'" label="审核保证金" required><a-input-number v-model:value="review.amount" :min="0.01" :max="9999999999.99" :precision="2" /></a-form-item>
    <a-form-item label="审核结果"><a-radio-group v-model:value="review.result"><a-radio :value="1">通过</a-radio><a-radio :value="2">驳回</a-radio></a-radio-group></a-form-item>
    <a-form-item label="审核意见" :required="review.result===2"><a-textarea v-model:value="review.remark" :maxlength="2000" /></a-form-item>
    <a-form-item v-if="review.itemId!=='deposit'" label="批注文件"><FilePicker v-model:value="review.annotated" :api="api" :project-id="row.projectId" :decoration-id="row.id" /></a-form-item>
    <a-button type="primary" html-type="submit" :loading="busy">提交审核</a-button>
  </a-form>
</template>
