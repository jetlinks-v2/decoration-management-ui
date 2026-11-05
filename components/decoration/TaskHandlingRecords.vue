<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import type {Application,TaskHandlingRecord} from '../../types/decoration'
import type {DecorationApi} from '../../services/decorationApi'
import FilePicker from './FilePicker.vue'
defineProps<{records:TaskHandlingRecord[];row:Application;api:DecorationApi}>()
const {t}=useI18n()
const labels={auditViolation:'整改通知审核',submitRectification:'提交整改',reviewRectification:'整改复核',reassignReviewRole:'重新指派复核角色',resendRectification:'重发整改任务'}
</script>
<template>
  <a-collapse v-if="records.length" ghost>
    <a-collapse-panel key="handling" header="整改办理记录">
      <a-timeline>
        <a-timeline-item v-for="(record,index) in records" :key="index">
          <strong>{{labels[record.action]}}</strong> · {{t(`Decoration.taskStates.${record.status}`)}}
          <p>{{record.operatorName}} · {{new Date(record.time).toLocaleString()}}</p>
          <p v-if="record.reviewRoleName">复核角色：{{record.reviewRoleName}}</p>
          <p>{{record.remark||'无补充意见'}}</p>
          <FilePicker v-if="record.fileIds.length" :value="record.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly />
        </a-timeline-item>
      </a-timeline>
    </a-collapse-panel>
  </a-collapse>
</template>
