<script setup lang="ts">
import type {MaterialDefinition,CreateApplication,FormConfiguration} from '../../types/decoration'
import type {DecorationApi} from '../../services/decorationApi'
import {useMaterialSigning} from '../../hooks/decoration/useMaterialSigning'
import SignaturePad from './SignaturePad.vue'
import FilePicker from './FilePicker.vue'
const props=defineProps<{api:DecorationApi;form:CreateApplication;configuration:FormConfiguration;item:MaterialDefinition;disabled?:boolean}>()
const {pages,loading,error,signError,saving,signed,load,sign}=useMaterialSigning(props.api,props.form,()=>props.configuration,()=>props.item)
</script>
<template>
 <section class="material-signing">
  <h3>{{item.name}} <small>{{signed?'已签署':'待签署'}}</small></h3>
  <p>请阅读以下资料正文，核对申请信息后在文末签字。</p>
  <a-alert v-if="error" type="error" :message="error" show-icon><template #action><a-button @click="load">重试</a-button></template></a-alert>
  <a-spin :spinning="loading"><div class="material-template-pages"><img v-for="(url,index) in pages" :key="url" :src="url" :alt="`${item.name} 第${index+1}页`" /></div></a-spin>
  <a-alert v-if="signError" type="error" :message="signError" show-icon />
  <FilePicker v-if="signed" :api="api" :value="[signed.documentFileId]" :project-id="form.projectId" readonly :label="`查看签字后的${item.name}`" />
  <h4>业主签字确认</h4>
  <SignaturePad v-if="pages.length&&!saving" :api="api" :project-id="form.projectId" :disabled="disabled||loading" @saved="sign" />
  <a-spin v-if="saving" tip="正在保存签字后的完整资料图片…" />
 </section>
</template>
<style scoped>
.material-signing h3{margin:0 0 12px;font-size:18px}.material-signing h3 small{font-size:13px;color:var(--ant-color-primary,#1677ff);margin-left:8px}.material-signing>p{color:var(--ant-color-text-secondary,#666);line-height:1.7}.material-template-pages{display:grid;gap:12px;margin:16px 0}.material-template-pages img{display:block;width:100%;height:auto;border:1px solid var(--ant-color-border-secondary,#e8e8e8)}
</style>
