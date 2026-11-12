<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import type {Application} from '../../types/decoration'
import type {DecorationApi} from '../../services/decorationApi'
import FilePicker from './FilePicker.vue'
defineProps<{row:Application;api:DecorationApi}>()
const {t}=useI18n(),date=(time?:number)=>time?new Date(time).toLocaleString():'—'
</script>
<template><section class="application-information">
     <a-descriptions class="detail-fields" :column="{xs:1,lg:2}" size="small">
      <a-descriptions-item label="业主">{{row.ownerName}}</a-descriptions-item><a-descriptions-item label="联系电话">{{row.contactPhone}}</a-descriptions-item>
      <a-descriptions-item label="施工单位">{{row.details.constructionUnit}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.manager')">{{row.details.constructionManager||'—'}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.managerPhone')">{{row.details.managerPhone||'—'}}</a-descriptions-item>
      <a-descriptions-item label="开始时间">{{date(row.details.startTime)}}</a-descriptions-item><a-descriptions-item label="竣工时间">{{date(row.details.completionTime)}}</a-descriptions-item>
      <a-descriptions-item label="申请时间">{{date(row.createTime)}}</a-descriptions-item><a-descriptions-item label="登记人">{{row.creatorName}}</a-descriptions-item>
      <a-descriptions-item label="申请来源">{{row.source==='pc_admin'?'管理端登记':'业主申请'}}</a-descriptions-item><a-descriptions-item label="结束时间">{{date(row.actualEndTime)}}</a-descriptions-item>
      <template v-if="row.acceptanceType">
       <a-descriptions-item label="验收类型">{{row.acceptanceType===1?'首次验收':'二次验收'}}</a-descriptions-item><a-descriptions-item label="当前验收轮次">{{t('Decoration.detailFields.roundValue',{number:row.acceptanceRound})}}</a-descriptions-item><a-descriptions-item label="申请验收日期">{{date(row.acceptanceDate)}}</a-descriptions-item>
       <a-descriptions-item label="提交验收申请时间">{{date(row.acceptanceRequestTime)}}</a-descriptions-item><a-descriptions-item label="验收申请人">{{row.acceptanceRequesterName||'—'}}</a-descriptions-item>
      </template>
      <a-descriptions-item v-if="row.actualEndTime!=null" label="结束原因" :span="2">{{row.endReason||t('Decoration.record.noEndReason')}}</a-descriptions-item>
     </a-descriptions>
     <h3 v-if="row.details.signedDocuments?.length">签字资料</h3><section v-for="doc in row.details.signedDocuments" :key="doc.kind"><h4>{{doc.title}}</h4><a-descriptions class="detail-fields" :column="{xs:1,lg:2}" size="small"><a-descriptions-item :label="t('Decoration.detailFields.signer')">{{doc.signedName||'—'}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.signedTime')">{{date(doc.signedTime)}}</a-descriptions-item></a-descriptions><FilePicker :value="[doc.documentFileId]" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly :label="`查看或下载${doc.title}`" /></section>
     <h3>装前自检</h3><a-descriptions class="detail-fields" :column="1" size="small"><a-descriptions-item v-if="row.details.selfInspectionRemark" :label="t('Decoration.detailFields.selfRemark')">{{row.details.selfInspectionRemark}}</a-descriptions-item><a-descriptions-item label="签字自检表"><FilePicker :value="row.details.selfInspectionFiles" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly /></a-descriptions-item></a-descriptions>
     <h3>{{row.details.agreement.title}}</h3><p class="decoration-agreement">{{row.details.agreement.content}}</p><p v-for="(item,index) in row.details.agreement.supplements" :key="index">{{item.name}}：{{item.content}}</p>

</section></template>
<style scoped>
.application-information h3{font-size:15px;margin:24px 0 12px}.application-information h4{font-size:14px}.application-information p{line-height:1.8;color:#687386}.application-information :deep(.ant-descriptions-item-content){color:#303b4b}.decoration-agreement{white-space:pre-wrap;padding:16px;background:#fafbfd;border-radius:6px}
</style>
