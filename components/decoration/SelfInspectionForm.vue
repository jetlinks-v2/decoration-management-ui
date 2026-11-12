<script setup lang="ts">
import type {DecorationApi} from '../../services/decorationApi'
import type {CreateApplication,FormConfiguration} from '../../types/decoration'
import {selfInspectionGroups} from '../../utils/selfInspection'
import {useSignedDocuments} from '../../hooks/decoration/useSignedDocuments'
import SignaturePad from './SignaturePad.vue'
import FilePicker from './FilePicker.vue'
const props=defineProps<{api:DecorationApi;form:CreateApplication;configuration:FormConfiguration;disabled?:boolean}>()
const {selfDocument,updateSelfInspection,sign,saving,error}=useSignedDocuments(props.api,props.form,()=>props.configuration)
</script>
<template>
 <section class="self-inspection-form">
  <header><h3>装修自检表</h3><p>请与装修师傅确认以下项目是否完好/通畅？</p></header>
  <dl class="self-inspection-house"><dt>房屋</dt><dd>{{configuration.household.spaceName}}</dd><dt>业主</dt><dd>{{configuration.household.customerName}}</dd></dl>
  <table v-for="group in selfInspectionGroups" :key="group.key" class="self-inspection-table">
   <thead><tr><th scope="col">检测项目</th><th scope="col">{{group.optionTitle}}</th></tr></thead>
   <tbody><tr v-for="item in group.items" :key="item.key"><th scope="row">{{item.text}}</th><td><a-radio-group :value="form.selfInspectionItems?.find(value=>value.key===item.key)?.value" :disabled="disabled||saving" :aria-label="`${item.text} · ${group.optionTitle}`" @update:value="value=>updateSelfInspection(item.key,value)"><a-radio :value="true">是</a-radio><a-radio :value="false">否</a-radio></a-radio-group></td></tr></tbody>
  </table>
  <div class="self-inspection-signature"><h4>业主签字确认</h4><p>确认签名后保存包含全部自检项与签字的自检表图片。修改自检项或联系电话后须重新签字。</p>
   <a-alert v-if="error" :message="error" type="error" show-icon />
   <a-alert v-if="selfDocument" message="自检表已签署并保存" type="success" show-icon />
   <FilePicker v-if="selfDocument" :value="[selfDocument.documentFileId]" :api="api" :project-id="form.projectId" readonly label="查看或下载签字自检表" />
   <SignaturePad v-if="!saving" :key="`${form.projectId}:${form.spaceId}:${form.customerId}`" :api="api" :project-id="form.projectId" :disabled="disabled" @saved="id=>sign('selfInspection',id)" />
   <a-spin v-if="saving" tip="正在生成签字自检表…" />
  </div>
 </section>
</template>
<style scoped>
.self-inspection-form{color:var(--ant-color-text,#262626)}
header h3{margin:0 0 8px;font-size:18px}header p,.self-inspection-signature p{color:var(--ant-color-text-secondary,#666);line-height:1.7}
.self-inspection-house{display:grid;grid-template-columns:auto 1fr;gap:8px 16px;margin:16px 0}.self-inspection-house dt{color:var(--ant-color-text-secondary,#666)}.self-inspection-house dd{margin:0;overflow-wrap:anywhere}
.self-inspection-table{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px}.self-inspection-table th,.self-inspection-table td{padding:12px 16px;border:1px solid var(--ant-color-border-secondary,#e8e8e8);text-align:left}.self-inspection-table thead{background:var(--ant-color-fill-alter,#fafafa)}.self-inspection-table tbody th{font-weight:400;width:52%}.self-inspection-table td{white-space:nowrap}
.self-inspection-signature{display:grid;gap:12px;margin-top:24px}.self-inspection-signature h4,.self-inspection-signature p{margin:0}
@media(max-width:600px){.self-inspection-table th,.self-inspection-table td{padding:10px}.self-inspection-table td :deep(.ant-radio-wrapper){margin-inline-end:8px}}
</style>
