<script setup lang="ts">
import { computed, ref } from 'vue'
import ProjectTreeSelect from './ProjectTreeSelect.vue'
import type { ProjectTreeNode } from '../../utils/decoration'
import {useI18n} from 'vue-i18n'
import dayjs, { type Dayjs } from 'dayjs'
import type { DecorationApi } from '../../services/decorationApi'
import type { Application } from '../../types/decoration'
import { useApplicationForm } from '../../hooks/decoration/useApplicationForm'
import { useDiscardConfirm } from '../../hooks/decoration/useDiscardConfirm'
import SelfInspectionUpload from './SelfInspectionUpload.vue'
import ApplicationMaterials from './ApplicationMaterials.vue'
const props = defineProps<{ api: DecorationApi; projectId: string; projects?: ProjectTreeNode[] }>()
const emit = defineEmits<{submitted: [Application]}>()
const {t}=useI18n()
const confirmDiscard=useDiscardConfirm(()=>t('Decoration.unsaved'))
const selectedProject=ref(props.projectId)
const projectId=computed(()=>props.projects?selectedProject.value:props.projectId)
const state=useApplicationForm(props.api,()=>projectId.value,row=>emit('submitted',row))
const {form,households,selected,configuration,loading,saving,uploading,error,uncertain,resultMissing,submit,confirmResult,retryOriginal}=state
const start=computed({get:()=>form.startTime?dayjs(form.startTime):undefined,set:(v:Dayjs|undefined)=>{form.startTime=v?.valueOf()}})
const completion=computed({get:()=>form.completionTime?dayjs(form.completionTime):undefined,set:(v:Dayjs|undefined)=>{form.completionTime=v?.valueOf()}})
const dirty=computed(()=>!!selected.value||!!form.constructionUnit)
const busy=computed(()=>saving.value||uploading.value)
async function changeProject(value?:string){
 if(busy.value||uncertain.value)return
 if(dirty.value&&!await confirmDiscard())return
 if(busy.value||uncertain.value)return
 selectedProject.value=value||''
}
defineExpose({dirty,saving:busy,uncertain})
</script>
<template>
  <a-spin :spinning="loading">
    <a-alert v-if="error" type="error" :message="error" show-icon />
    <a-alert v-if="uncertain" type="warning" message="提交结果待确认。请保持表单不变，点击核对结果。" show-icon><template #action><a-button @click="confirmResult">核对结果</a-button><a-button v-if="resultMissing" :loading="saving" @click="retryOriginal">重试原申请</a-button></template></a-alert>
    <a-form layout="vertical" :model="form" class="decoration-form" @finish="submit">
      <a-form-item v-if="projects" label="所属项目" required><ProjectTreeSelect :value="projectId" :tree-data="projects" :allow-clear="false" :disabled="busy||uncertain" placeholder="请选择项目" @update:value="changeProject" /></a-form-item>
      <a-form-item label="房屋与业主" required><a-select v-model:value="selected" show-search option-filter-prop="label" :disabled="!projectId||saving||uncertain||uploading" :options="households.map(h=>({value:h.relationshipId,label:`${h.spaceName} · ${h.customerName}`}))" placeholder="请选择有权办理的房屋" /></a-form-item>
      <a-form-item label="装修类型" required><a-select v-model:value="form.decorationType" :disabled="saving||uncertain||uploading" :options="[{label:'首次装修',value:'first'},{label:'二次装修',value:'second'}]" /></a-form-item>
      <template v-if="configuration">
        <div class="decoration-form-grid">
          <a-form-item label="联系电话" required><a-input v-model:value="form.contactPhone" :disabled="saving||uncertain||uploading" /></a-form-item>
          <a-form-item label="业主身份证号码" required><a-input v-model:value="form.ownerCertificate" :disabled="saving||uncertain||uploading" /></a-form-item>
          <a-form-item label="施工类型" required><a-select v-model:value="form.constructionType" :disabled="saving||uncertain||uploading" :options="[{label:'装修公司',value:1},{label:'自装',value:2}]" /></a-form-item>
          <a-form-item label="施工单位" required><a-input v-model:value="form.constructionUnit" :disabled="saving||uncertain||uploading" /></a-form-item>
          <a-form-item label="施工负责人" required><a-input v-model:value="form.constructionManager" :disabled="saving||uncertain||uploading" /></a-form-item>
          <a-form-item label="负责人电话" required><a-input v-model:value="form.managerPhone" :disabled="saving||uncertain||uploading" /></a-form-item>
          <a-form-item label="负责人身份证号码" required><a-input v-model:value="form.managerCertificate" :disabled="saving||uncertain||uploading" /></a-form-item>
          <a-form-item label="装修开始时间" required><a-date-picker v-model:value="start" show-time :disabled="saving||uncertain||uploading" /></a-form-item>
          <a-form-item label="计划竣工时间" required><a-date-picker v-model:value="completion" show-time :disabled="saving||uncertain||uploading" /></a-form-item>
        </div>
        <a-divider>装前自检</a-divider>
        <SelfInspectionUpload :api="api" :form="form" :disabled="saving||uncertain||uploading" />
        <a-divider>{{ configuration.agreement.title || '装修协议与须知' }}</a-divider>
        <div class="decoration-agreement">{{ configuration.agreement.content }}</div>
        <div v-for="(supplement,index) in configuration.agreement.supplements" :key="index"><h4>{{ supplement.name }}</h4><p class="decoration-agreement">{{ supplement.content }}</p></div>
        <p>协议保证金：{{ configuration.agreement.deposit }} 元（以本申请审核结果为准）</p>
        <a-checkbox v-model:checked="form.noticesAccepted" :disabled="saving||uncertain||uploading">已阅读并确认装修须知和协议</a-checkbox>
        <ApplicationMaterials :api="api" :form="form" :configuration="configuration" :disabled="saving||uncertain||uploading" title-orientation="center" />
        <a-button type="primary" html-type="submit" :loading="saving" :disabled="uncertain||uploading">提交申请</a-button>
      </template>
      <a-empty v-else-if="!loading&&!error" description="请选择房屋，加载本项目的装修协议与材料配置" />
    </a-form>
  </a-spin>
</template>
