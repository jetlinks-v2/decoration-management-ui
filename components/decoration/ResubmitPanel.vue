<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { Application, Action } from '../../types/decoration'
import type { DecorationApi } from '../../services/decorationApi'
import FilePicker from './FilePicker.vue'
import SignaturePad from './SignaturePad.vue'
const props=defineProps<{row:Application;api:DecorationApi;busy:boolean}>()
const emit=defineEmits<{action:[string,Partial<Action>]}>()
const uploads=reactive<Record<string,string[]>>({})
const dirty=computed(()=>Object.values(uploads).some(files=>files.length>0))
defineExpose({dirty})
</script>
<template>
  <a-card v-if="row.status==='rejected'" title="重新提交被驳回的资料" class="decoration-detail-section">
    <div v-for="item in row.details.materials.filter(m=>m.reviewStatus===2)" :key="item.definition.id">
      <h4>{{item.definition.name}}</h4><p>{{item.remark}}</p>
      <FilePicker :value="uploads[item.definition.id]||[]" :api="api" :project-id="row.projectId" :decoration-id="row.id" @update:value="ids=>uploads[item.definition.id]=ids" />
      <SignaturePad v-if="item.definition.source==='sign'" :api="api" :project-id="row.projectId" :decoration-id="row.id" @saved="id=>uploads[item.definition.id]=[id]" />
    </div>
    <a-button v-if="Object.values(uploads).some(files=>files.length)" type="primary" :loading="busy" @click="emit('action','resubmit',{materials:Object.entries(uploads).filter(([,files])=>files.length).map(([itemId,fileIds])=>({itemId,fileIds}))})">重新提交</a-button>
  </a-card>
</template>
