<script setup lang="ts">
import type {DecorationApi} from '../../services/decorationApi'
import type {CreateApplication,FormConfiguration} from '../../types/decoration'
import {documentTitles,type DocumentKind} from '../../utils/signedDocuments'
import {useSignedDocuments} from '../../hooks/decoration/useSignedDocuments'
import SignaturePad from './SignaturePad.vue'
import FilePicker from './FilePicker.vue'
const props=defineProps<{api:DecorationApi;form:CreateApplication;configuration:FormConfiguration;disabled?:boolean}>()
const vm=useSignedDocuments(props.api,props.form,()=>props.configuration)
const kinds=Object.keys(documentTitles) as DocumentKind[]
</script>
<template>
 <a-alert v-if="vm.error.value" type="error" :message="vm.error.value" show-icon />
 <a-alert type="info" message="请核对并分别签署以下四份文书。修改申请信息或协议后需重新签署。" show-icon />
 <a-collapse>
  <a-collapse-panel v-for="kind in kinds" :key="kind" :header="`${documentTitles[kind]} · ${form.signedDocuments?.some(d=>d.kind===kind)?'已签署':'待签署'}`">
   <pre class="signed-document-content">{{vm.content(kind)}}</pre>
   <FilePicker v-if="form.signedDocuments?.find(d=>d.kind===kind)" :value="[form.signedDocuments.find(d=>d.kind===kind)!.documentFileId]" :api="api" :project-id="form.projectId" readonly :label="`查看或下载${documentTitles[kind]}`" />
   <SignaturePad v-if="!disabled&&!vm.saving.value" :api="api" :project-id="form.projectId" @saved="id=>vm.sign(kind,id)" />
   <a-spin v-if="vm.saving.value" />
  </a-collapse-panel>
 </a-collapse>
</template>
<style scoped>
.signed-document-content{white-space:pre-wrap;overflow-wrap:anywhere;max-height:360px;overflow:auto;font-family:inherit;font-size:14px;line-height:1.8}
</style>
