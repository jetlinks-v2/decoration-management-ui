<script setup lang="ts">
import {computed} from 'vue'
import type {Application,Action,Material} from '../../types/decoration'
import type {DecorationApi} from '../../services/decorationApi'
import dayjs from 'dayjs'
const dateText=(value?:number)=>value?dayjs(value).format('YYYY-MM-DD HH:mm:ss'):'—'
import {useReviewPanel} from '../../hooks/decoration/useReviewPanel'
import FilePicker from './FilePicker.vue'
import FilePreview from './FilePreview.vue'
import ImageAnnotation from './ImageAnnotation.vue'
const props=defineProps<{row:Application;api:DecorationApi;canReview:boolean;busy:boolean}>()
const emit=defineEmits<{action:[string,Partial<Action>]}>()
const vm=useReviewPanel(props,(name,input)=>emit('action',name,input))
const dirty=computed(()=>vm.dirty.value)
defineExpose({dirty})
const columns=[{title:'审核项',dataIndex:'name',key:'name',width:180},{title:'状态',key:'status',width:110},{title:'审核人',dataIndex:'reviewerName',width:110},{title:'审核时间',key:'time',width:170},{title:'备注',dataIndex:'remark'},{title:'操作',key:'actions',width:200}]
</script>
<template>
  <section v-for="group in vm.groups.value" :key="group.title" class="review-section">
    <h3>{{group.title}}</h3>
    <a-table :columns="columns" :data-source="group.items" :pagination="false" row-key="definition.id" bordered size="middle" :scroll="{x:900}">
      <template #bodyCell="{column,record}">
        <template v-if="column.key==='name'">{{record.definition.name}}<small v-if="!record.definition.required">（选填）</small></template>
        <template v-else-if="column.key==='status'"><a-tag v-if="!record.definition.required&&!record.fileIds.length">未提交</a-tag><a-tag v-else :color="record.reviewStatus===1?'success':record.reviewStatus===2?'error':'processing'">{{['待审核','审核通过','已驳回'][record.reviewStatus]}}</a-tag></template>
        <template v-else-if="column.key==='time'">{{dateText(record.reviewTime)}}</template>
        <template v-else-if="column.key==='actions'">
          <a-space v-if="record.fileIds.length"><a-button type="link" @click="vm.show(record as Material)">查看</a-button><a-button v-if="vm.editable.value&&record.reviewStatus!==1" type="link" :disabled="busy" @click="vm.show(record as Material,true)">审核</a-button></a-space><span v-else>—</span>
          <FilePicker :value="record.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly download-only label="下载" />
        </template>
        <template v-else>{{record[String(column.dataIndex)]||'—'}}</template>
      </template>
      <template #emptyText>暂无配置项</template>
    </a-table>
  </section>
  <section v-if="!row.details.selfInspectionReview&&row.details.selfInspectionFiles.length" class="review-section"><h3>装修自检表</h3><p>历史申请未记录独立自检审核。</p><FilePicker :value="row.details.selfInspectionFiles" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly /></section>
  <section class="review-section">
    <h3>装修保证金审核</h3>
    <a-descriptions bordered size="small" :column="3">
      <a-descriptions-item label="协议金额">{{row.details.agreement.deposit}} 元</a-descriptions-item><a-descriptions-item label="审核金额">{{row.approvedDeposit??'未确认'}} 元</a-descriptions-item><a-descriptions-item label="状态">{{['待审核','审核通过','已驳回'][row.depositReviewStatus]}}</a-descriptions-item>
      <a-descriptions-item label="审核人">{{row.depositReviewerName||'—'}}</a-descriptions-item><a-descriptions-item label="审核时间">{{dateText(row.depositReviewTime)}}</a-descriptions-item><a-descriptions-item label="备注">{{row.depositReviewRemark||'—'}}</a-descriptions-item>
    </a-descriptions><a-button v-if="vm.editable.value&&row.depositReviewStatus!==1" type="link" :disabled="busy" @click="vm.show(undefined,true)">审核保证金</a-button>
  </section>
  <a-modal :open="vm.open.value" :title="`${vm.editing.value?'审核':'查看'}：${vm.selected.value?.definition.name||'装修保证金'}`" :width="1200" :footer="null" :mask-closable="false" destroy-on-close @cancel="vm.close">
    <div :class="{'review-editor':vm.editing.value&&vm.selected.value}">
      <div v-if="vm.selected.value" class="review-content">
        <FilePicker :value="vm.selected.value.fileIds" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly />
        <a-select v-if="vm.selected.value.fileIds.length>1" v-model:value="vm.previewId.value" :options="vm.selected.value.fileIds.map((id,index)=>({value:id,label:`附件 ${index+1}`}))" />
        <FilePreview v-if="vm.previewId.value&&(!vm.editing.value||!vm.imageIds.value.includes(vm.previewId.value))" :key="vm.previewId.value" :id="vm.previewId.value" :api="api" />
        <template v-if="vm.editing.value&&vm.imageIds.value.length"><h4>图片批注</h4><ImageAnnotation :api="api" :project-id="row.projectId" :decoration-id="row.id" :file-ids="vm.imageIds.value" :source-id="vm.selected.value.annotationSourceFileId" :marks="vm.selected.value.annotations" :disabled="busy" @saved="vm.annotated" @dirty="value=>vm.annotationDirty.value=value" /></template>
        <template v-if="vm.review.annotated.length"><h4>已保存批注图片</h4><FilePicker :value="vm.review.annotated" :api="api" :project-id="row.projectId" :decoration-id="row.id" readonly /></template>
        <a-alert v-if="!vm.editing.value" type="info" :message="`审核意见：${vm.selected.value.remark||'暂无'} · 审核人：${vm.selected.value.reviewerName||'—'} · ${dateText(vm.selected.value.reviewTime)}`" />
      </div>
      <a-form v-if="vm.editing.value" layout="vertical" :model="vm.review" @finish="vm.finish">
        <a-form-item v-if="!vm.selected.value" label="审核保证金" required><a-input-number v-model:value="vm.review.amount" :min="0.01" :max="9999999999.99" :precision="2" :disabled="busy" /></a-form-item>
        <a-form-item label="审核结果"><a-radio-group v-model:value="vm.review.result" :disabled="busy"><a-radio :value="1">通过</a-radio><a-radio :value="2">驳回</a-radio></a-radio-group></a-form-item>
        <a-form-item label="审核意见" name="remark" :rules="[{required:vm.review.result===2,message:'请填写驳回原因'}]"><a-textarea v-model:value="vm.review.remark" :maxlength="2000" :rows="6" :disabled="busy" /></a-form-item>
        <a-alert v-if="vm.annotationDirty.value" type="warning" message="图片批注尚未保存，请先保存批注图片。" />
        <a-space><a-button @click="vm.close" :disabled="busy">取消</a-button><a-button type="primary" html-type="submit" :loading="busy" :disabled="vm.annotationDirty.value">提交本项审核</a-button></a-space>
      </a-form>
    </div>
  </a-modal>
</template>
<style scoped>
.review-section{margin-bottom:24px}.review-section h3{font-size:16px;margin:0 0 14px;font-weight:600}.review-section small{color:#999}.review-editor{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px}.review-content{min-width:0;display:grid;gap:16px}.review-editor>.ant-form{border-left:1px solid #eee;padding-left:24px}@media(max-width:800px){.review-editor{grid-template-columns:1fr}.review-editor>.ant-form{border:0;padding:0}}
</style>
