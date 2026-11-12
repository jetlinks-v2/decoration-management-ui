<script setup lang="ts">
import {computed,ref} from 'vue'
import {useI18n} from 'vue-i18n'
import type {Application} from '../../types/decoration'
import type {DecorationApi} from '../../services/decorationApi'
import {usePermitSnapshot} from '../../hooks/decoration/usePermitSnapshot'
import PermitRecords from './PermitRecords.vue'
const props=defineProps<{row:Application;api:DecorationApi}>()
const {t}=useI18n()
const label=(key:string)=>t(`Decoration.permitDetail.${key}`)
const tab=ref('certificate')
const latest=computed(()=>props.row.permit?.prints?.at(-1))
const registration=computed(()=>props.row.details.workerRegistration)
const construction=computed(()=>registration.value||props.row.permit)
const workers=computed(()=>registration.value?.workers||props.row.permit?.workers||[])
const snapshot=usePermitSnapshot(props.api,()=>latest.value?.snapshotFileId)
const date=(time?:number)=>time?new Date(time).toLocaleString('zh-CN',{hour12:false,timeZone:'Asia/Shanghai'}):'—'
</script>
<template>
 <a-tabs v-model:active-key="tab">
  <a-tab-pane key="certificate" :tab="label('certificate')">
   <template v-if="row.permit">
    <a-alert v-if="latest&&latest.endTime!==row.permit.endTime" type="info" :message="label('oldSnapshot')" show-icon />
    <div class="certificate-layout">
     <section class="certificate-image">
      <a-spin :spinning="snapshot.loading.value"><a-image v-if="snapshot.url.value" :src="snapshot.url.value" :alt="label('snapshot')" :width="'100%'" style="max-height:27.5rem;object-fit:contain" /></a-spin>
      <a-alert v-if="snapshot.error.value" type="error" :message="snapshot.error.value"><template #action><a-button @click="snapshot.load">{{t('Decoration.retry')}}</a-button></template></a-alert>
      <a-empty v-if="!latest" :description="label('noSnapshot')" />
     </section>
     <a-descriptions class="detail-fields" :column="1" size="small">
      <a-descriptions-item :label="label('number')">{{row.permit.number}}</a-descriptions-item>
      <a-descriptions-item :label="label('project')">{{row.projectName}}</a-descriptions-item>
      <a-descriptions-item :label="label('house')">{{row.spaceName}}</a-descriptions-item>
      <a-descriptions-item :label="label('owner')">{{row.ownerName||'—'}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.phone')">{{row.contactPhone||'—'}}</a-descriptions-item>
      <a-descriptions-item :label="label('unit')">{{row.details.constructionUnit}}</a-descriptions-item>
      <a-descriptions-item :label="label('safety')">{{row.permit.safetyPerson||'—'}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.safetyPhone')">{{row.permit.safetyPhone||'—'}}</a-descriptions-item>
      <a-descriptions-item :label="label('content')">{{row.permit.content}}</a-descriptions-item>
      <a-descriptions-item :label="label('validity')">{{date(row.permit.startTime)}} 至 {{date(row.permit.endTime)}}</a-descriptions-item>
      <a-descriptions-item :label="label('collectionStatus')">{{label(row.permit.downloadTime||row.permit.printTime?'outputCompleted':row.permit.collectedTime?'legacyIssued':'pendingPrint')}}</a-descriptions-item>
     </a-descriptions>
    </div>
   </template>
   <a-result v-else :status="registration?'info':'warning'" :title="label(registration?'registered':'notRegistered')" :sub-title="label(registration?'generateHint':'registerHint')" />
  </a-tab-pane>
  <a-tab-pane key="workers" :tab="t('Decoration.permitDetail.workers',{count:workers.length})">
   <a-descriptions :title="label('constructionInfo')" size="small" :column="{xs:1,lg:2}" class="detail-fields" style="margin:1rem 0">
    <a-descriptions-item :label="label('unit')">{{row.details.constructionUnit||'—'}}</a-descriptions-item>
    <a-descriptions-item :label="label('manager')">{{row.details.constructionManager||'—'}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.managerPhone')">{{row.details.managerPhone||'—'}}</a-descriptions-item>
    <a-descriptions-item :label="label('safety')">{{construction?.safetyPerson||'—'}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.safetyPhone')">{{construction?.safetyPhone||'—'}}</a-descriptions-item>
    <a-descriptions-item :label="label('entrusted')">{{construction?label(construction.entrusted?'yes':'no'):'—'}}</a-descriptions-item>
    <a-descriptions-item :label="label('content')" :span="2">{{construction?.content||'—'}}</a-descriptions-item>
   </a-descriptions>
   <a-descriptions :title="label('registrationInfo')" size="small" :column="{xs:1,lg:2}" class="detail-fields" style="margin:1.5rem 0">
    <a-descriptions-item :label="label('registrar')">{{registration?.operatorName||label('unrecorded')}}</a-descriptions-item>
    <a-descriptions-item :label="label('registrationTime')">{{date(registration?.time)}}</a-descriptions-item>
   </a-descriptions>
   <h4>{{label('workerList')}}</h4>
   <a-table :data-source="workers" :pagination="false" size="small" :row-key="(_row:unknown,index?:number)=>index??0" :columns="[{title:label('name'),dataIndex:'name'},{title:label('certificateNumber'),dataIndex:'certificate'},{title:label('phone'),dataIndex:'phone'},{title:label('entry'),key:'entryTime'},{title:label('expiry'),key:'expirationTime'}]">
    <template #bodyCell="{column,record}"><template v-if="['entryTime','expirationTime'].includes(String(column.key))">{{date(record[String(column.key)])}}</template></template>
    <template #emptyText><a-empty :description="label('noWorkers')" /></template>
   </a-table>
  </a-tab-pane>
  <a-tab-pane key="records" :tab="label('records')"><PermitRecords :row="row" :api="api" /></a-tab-pane>
 </a-tabs>
</template>
<style scoped>
.certificate-layout{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(20rem,1fr);gap:1.25rem;margin-top:1rem;align-items:start}.certificate-image{background:var(--ant-color-fill-alter,#fafafa);border:1px solid var(--ant-color-border-secondary,#f0f0f0);padding:0.75rem;min-height:15rem;display:flex;flex-direction:column;justify-content:center}@media(max-width:62.5rem){.certificate-layout{grid-template-columns:1fr}}
</style>
