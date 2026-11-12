<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import type {Application} from '../../types/decoration'
import type {DecorationApi} from '../../services/decorationApi'
import FilePicker from './FilePicker.vue'
defineProps<{row:Application;api:DecorationApi}>()
const {t}=useI18n()
const label=(key:string)=>t(`Decoration.permitDetail.${key}`)
const date=(time?:number)=>time?new Date(time).toLocaleString('zh-CN',{hour12:false,timeZone:'Asia/Shanghai'}):'—'
</script>
<template>
 <template v-if="row.permit">
  <a-descriptions :title="label('operators')" :column="2" size="small" bordered>
   <a-descriptions-item :label="label('issuer')">{{row.permit.approverName||label('unrecorded')}}</a-descriptions-item>
   <a-descriptions-item :label="label('issuerPhone')">{{row.permit.approverPhone||label('unrecorded')}}</a-descriptions-item>
   <a-descriptions-item :label="label('printOperator')">{{row.permit.prints?.filter(record=>record.outputType!=='download'&&record.endTime===row.permit?.endTime).at(-1)?.operatorName||(row.permit.printTime?label('unrecorded'):'—')}}</a-descriptions-item>
   <a-descriptions-item :label="label('printTime')">{{date(row.permit.printTime)}}</a-descriptions-item>
   <a-descriptions-item :label="label('downloadTime')">{{date(row.permit.downloadTime)}}</a-descriptions-item>
   <a-descriptions-item :label="label('downloadOperator')">{{row.permit.prints?.filter(record=>record.outputType==='download'&&record.endTime===row.permit?.endTime).at(-1)?.operatorName||'—'}}</a-descriptions-item>
  </a-descriptions>
  <a-alert v-if="row.permit.legacyPrintTime||row.permit.printTime&&!row.permit.prints?.length" type="info" :message="t('Decoration.permitDetail.legacyPrint',{time:date(row.permit.legacyPrintTime||row.permit.printTime)})" show-icon style="margin-top:1rem" />
  <a-tabs>
  <a-tab-pane key="prints" :tab="`${label('prints')}（${row.permit.prints?.length||0}）`">
  <a-table size="small" :data-source="[...(row.permit.prints||[])].reverse()" :pagination="false" :row-key="(_row:unknown,index?:number)=>index??0" :columns="[{title:label('outputType'),key:'outputType'},{title:label('outputTime'),key:'time'},{title:label('operator'),dataIndex:'operatorName'},{title:label('versionEnd'),key:'endTime'},{title:label('printSnapshot'),key:'snapshot'}]">
   <template #bodyCell="{column,record}"><template v-if="column.key==='outputType'">{{label(record.outputType==='download'?'download':'print')}}</template><template v-else-if="['time','endTime'].includes(String(column.key))">{{date(record[String(column.key)])}}</template><FilePicker v-else-if="column.key==='snapshot'" :value="[record.snapshotFileId]" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly label="" /></template>
  </a-table>
  </a-tab-pane>
  <a-tab-pane v-if="row.permit.collections?.length" key="collections" :tab="`${label('collections')}（${row.permit.collections?.length||0}）`">
  <a-table size="small" :data-source="[...(row.permit.collections||[])].reverse()" :pagination="false" :row-key="(_row:unknown,index?:number)=>index??0" :columns="[{title:label('collectionTime'),key:'collectedTime'},{title:label('collector'),dataIndex:'collectedBy'},{title:label('collectionOperator'),dataIndex:'operatorName'},{title:label('versionEnd'),key:'endTime'},{title:label('collectedSnapshot'),key:'snapshot'}]">
   <template #bodyCell="{column,record}"><template v-if="['collectedTime','endTime'].includes(String(column.key))">{{date(record[String(column.key)])}}</template><FilePicker v-else-if="column.key==='snapshot'" :value="[record.snapshotFileId]" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly label="" /></template>
  </a-table>
  </a-tab-pane>
  <a-tab-pane key="extensions" :tab="`${label('extensions')}（${row.permit.extensions?.length||0}）`">
  <a-table size="small" :data-source="[...(row.permit.extensions||[])].reverse()" :pagination="false" :row-key="(_row:unknown,index?:number)=>index??0" :columns="[{title:label('extensionTime'),key:'time'},{title:label('operator'),dataIndex:'actorName'},{title:label('months'),dataIndex:'months'},{title:label('beforeEnd'),key:'beforeEndTime'},{title:label('afterEnd'),key:'afterEndTime'}]">
   <template #bodyCell="{column,record}"><template v-if="['time','beforeEndTime','afterEndTime'].includes(String(column.key))">{{date(record[String(column.key)])}}</template></template>
  </a-table>
  </a-tab-pane>
  </a-tabs>
 </template>
 <a-empty v-else :description="label('noPermitRecords')" />
</template>

