<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import type {Application} from '../../types/decoration'
defineProps<{row:Application}>()
const {t}=useI18n()
const date=(time?:number)=>time?new Date(time).toLocaleString():'—'
</script>
<template>
  <article v-if="row.permit" class="decoration-print decoration-card">
    <h2 style="text-align:center">装修备案证明</h2>
    <p>备案编号：{{row.permit.number}}</p><p>所属项目：{{row.projectName}}</p><p>房屋：{{row.spaceName}}</p><p>业主：{{row.ownerName}}</p>
    <p>施工单位：{{row.details.constructionUnit}} · 负责人：{{row.details.constructionManager}}</p><p>安全负责人：{{row.permit.safetyPerson}} · {{row.permit.safetyPhone}}</p>
    <p>装修内容：{{row.permit.content}}</p><p>有效期：{{date(row.permit.startTime)}} 至 {{date(row.permit.endTime)}}</p><p>审核人：{{row.permit.approverName}}</p><p>{{t('Decoration.record.approverPhone')}}：{{row.permit.approverPhone||'—'}}</p><p>领取打印时间：{{date(row.permit.printTime)}}</p>
    <h4>施工人员</h4><p v-for="(worker,index) in row.permit.workers" :key="index">{{worker.name}} · {{worker.phone}} · {{date(worker.entryTime)}} 至 {{date(worker.expirationTime)}}</p>
    <h4 v-if="row.permit.extensions.length">延期记录</h4><p v-for="(extension,index) in row.permit.extensions" :key="index">{{date(extension.beforeEndTime)}} → {{date(extension.afterEndTime)}} · {{extension.actorName}}</p>
  </article>
  <a-empty v-else description="暂无备案证明" />
</template>
