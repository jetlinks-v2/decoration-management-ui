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
          <a-descriptions class="detail-fields" :column="{xs:1,lg:2}" size="small">
            <a-descriptions-item :label="t('Decoration.detailFields.action')">{{labels[record.action]}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.taskState')">{{t(`Decoration.taskStates.${record.status}`)}}</a-descriptions-item>
            <a-descriptions-item :label="t('Decoration.detailFields.operator')">{{record.operatorName||'—'}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.time')">{{new Date(record.time).toLocaleString()}}</a-descriptions-item>
            <a-descriptions-item v-if="record.reviewRoleName" :label="t('Decoration.detailFields.reviewRole')">{{record.reviewRoleName}}</a-descriptions-item><a-descriptions-item :label="t('Decoration.detailFields.feedback')" :span="2">{{record.remark||'—'}}</a-descriptions-item>
            <a-descriptions-item v-if="record.fileIds.length" :label="t('Decoration.detailFields.attachments')" :span="2"><FilePicker :value="record.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly /></a-descriptions-item>
          </a-descriptions>
        </a-timeline-item>
      </a-timeline>
    </a-collapse-panel>
  </a-collapse>
</template>
