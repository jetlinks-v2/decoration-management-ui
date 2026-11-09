<script setup lang="ts">
import {computed} from 'vue'
import type {Application} from '../../types/decoration'
import type {DecorationApi} from '../../services/decorationApi'
import {usePermitSnapshot} from '../../hooks/decoration/usePermitSnapshot'
import FilePicker from './FilePicker.vue'
const props=defineProps<{row:Application;api:DecorationApi}>()
const latest=computed(()=>props.row.permit?.prints?.at(-1))
const snapshot=usePermitSnapshot(props.api,()=>latest.value?.snapshotFileId)
const date=(time?:number)=>time?new Date(time).toLocaleString():'—'
</script>
<template>
  <article v-if="row.permit" class="decoration-card">
    <h2>装修备案证明</h2>
    <a-spin :spinning="snapshot.loading.value"><a-image v-if="snapshot.url.value" :src="snapshot.url.value" alt="备案证明打印快照" :width="'100%'" style="max-height:480px;object-fit:contain" /></a-spin>
    <a-alert v-if="snapshot.error.value" type="error" :message="snapshot.error.value"><template #action><a-button @click="snapshot.load">重试加载图片</a-button></template></a-alert>
    <a-empty v-if="!latest" description="暂无打印图片快照" />
    <a-alert v-if="latest&&latest.endTime!==row.permit.endTime" type="info" message="当前显示延期前的打印快照，新有效期的备案证明待重新打印、领取。" show-icon />
    <p>备案编号：{{row.permit.number}}</p><p>所属项目：{{row.projectName}}</p><p>房屋：{{row.spaceName}}</p>
    <p>业主：{{row.ownerName}} · {{row.contactPhone}}</p>
    <p>施工单位：{{row.details.constructionUnit}} · 负责人：{{row.details.constructionManager}}</p><p>安全负责人：{{row.permit.safetyPerson}} · {{row.permit.safetyPhone}}</p>
    <p>装修内容：{{row.permit.content}}</p><p>当前有效期：{{date(row.permit.startTime)}} 至 {{date(row.permit.endTime)}}</p><p>发证操作人：{{row.permit.approverName}}</p>
    <h4>当前证件领取</h4>
    <template v-if="row.permit.collectedTime"><p>领取时间：{{date(row.permit.collectedTime)}}</p><p>实际领取人：{{row.permit.collectedBy}}</p><p>登记操作人：{{row.permit.collectionOperatorName}}</p></template>
    <p v-else-if="row.permit.printTime&&!row.permit.prints?.length">历史已发证，未记录领取时间和领取人。</p><p v-else>尚未登记领取</p>
    <p v-if="row.permit.legacyPrintTime">历史打印时间：{{date(row.permit.legacyPrintTime)}}（未保留图片及操作人）</p>
    <p v-else-if="row.permit.printTime&&!row.permit.prints?.length">历史打印时间：{{date(row.permit.printTime)}}（未保留图片及操作人）</p>
    <h4>打印记录</h4><a-empty v-if="!row.permit.prints?.length" description="暂无打印明细" />
    <section v-for="(print,index) in [...(row.permit.prints||[])].reverse()" :key="`${print.time}-${index}`" class="decoration-card">
      <p>打印时间：{{date(print.time)}} · 操作人：{{print.operatorName}}</p><p>该版有效期至：{{date(print.endTime)}}</p>
      <FilePicker :value="[print.snapshotFileId]" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly label="查看 / 下载本次打印快照" />
    </section>
    <h4>领取记录</h4><a-empty v-if="!row.permit.collections?.length" description="暂无领取明细" />
    <section v-for="(record,index) in [...(row.permit.collections||[])].reverse()" :key="`${record.collectedTime}-${index}`" class="decoration-card">
      <p>领取时间：{{date(record.collectedTime)}} · 实际领取人：{{record.collectedBy}} · 登记操作人：{{record.operatorName}}</p><p>该版有效期至：{{date(record.endTime)}}</p>
      <FilePicker :value="[record.snapshotFileId]" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly label="查看 / 下载领取时证件" />
    </section>
    <h4>施工人员</h4><p v-for="(worker,index) in row.permit.workers" :key="index">{{worker.name}} · {{worker.phone}} · {{date(worker.entryTime)}} 至 {{date(worker.expirationTime)}}</p>
    <h4 v-if="row.permit.extensions.length">延期记录</h4><p v-for="(extension,index) in row.permit.extensions" :key="index">{{date(extension.beforeEndTime)}} → {{date(extension.afterEndTime)}} · {{extension.actorName}} · {{date(extension.time)}}</p>
  </article>
  <a-empty v-else description="暂无备案证明" />
</template>
