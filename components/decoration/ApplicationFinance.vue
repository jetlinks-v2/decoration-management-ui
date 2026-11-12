<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import type {Application} from '../../types/decoration'
import {nextRefund} from '../../utils/decoration'
defineProps<{row:Application;refund:boolean}>()
const {t}=useI18n(),date=(time?:number)=>time?new Date(time).toLocaleString():'—'
</script>
<template>
  <section class="finance-summary">
    <div><span>{{t(refund?'Decoration.detailFlow.refunded':'Decoration.detailFlow.received')}}</span><strong><small>¥</small> {{Number((refund?row.refundedAmount:row.paidAmount)||0).toFixed(2)}}</strong></div>
    <div class="finance-status"><span>{{t('Decoration.detailFields.financeStatus')}}：</span><a-tag :color="(refund?row.refundStatus:row.paymentStatus)===2?'success':'default'">{{refund?['未退款','处理中','已退款'][row.refundStatus]:['未缴费','处理中','已核验'][row.paymentStatus]}}</a-tag></div>
  </section>
  <a-descriptions class="detail-fields" :column="{xs:1,lg:2}" size="small">
    <template v-if="!refund"><a-descriptions-item :label="t('Decoration.detailFlow.agreedDeposit')">{{row.details.agreement.deposit}} 元</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFlow.approvedDeposit')">{{row.approvedDeposit??'—'}} 元</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFlow.paymentReceipt')">{{row.paymentReference||'—'}}</a-descriptions-item></template>
    <template v-else><a-descriptions-item :label="t('Decoration.detailFlow.received')">{{row.paidAmount??'—'}} 元</a-descriptions-item><a-descriptions-item v-if="nextRefund(row)" :label="t('Decoration.detailFlow.pendingRefund')">{{nextRefund(row)!.amount}} 元</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFlow.refundMode')">{{t('Decoration.detailFlow.singleRefund')}}</a-descriptions-item></template>
  </a-descriptions>
  <template v-if="refund"><h4>{{t('Decoration.detailFlow.refundRecords')}}</h4><a-empty v-if="!row.details.refunds?.length" :description="t('Decoration.detailFlow.noRefund')" /><div v-for="(item,index) in row.details.refunds||[]" :key="index" class="refund-record"><a-descriptions class="detail-fields" :column="{xs:1,lg:2}" size="small"><a-descriptions-item :label="t('Decoration.detailFields.refundStage')">{{item.stage==='single'?'一次性退款':item.stage==='first'?'首次验收退款':'二次验收退款'}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.amount')">{{item.amount}} 元</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.reference')">{{item.reference||'零金额结算'}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.settledTime')">{{date(item.settledTime)}}</a-descriptions-item></a-descriptions></div></template>
</template>
<style scoped>
.finance-summary{padding:24px;border:1px solid #e9edf3;background:#fafbfd;border-radius:8px;display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}.finance-summary span{color:#8490a0;font-size:13px}.finance-summary strong{display:block;font-size:30px;font-weight:600;color:#27364b;margin-top:8px}.finance-summary strong small{font-size:18px;font-weight:400}.refund-record{border-bottom:1px solid #edf0f4;padding:16px 0}.refund-record p{font-size:12px;color:#8c96a5;margin:6px 0 0}h4{margin:24px 0 12px}
</style>
