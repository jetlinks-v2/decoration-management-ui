<script setup lang="ts">
import {applicationContactError} from '../../utils/contactValidation'
import {computed,ref,watch} from 'vue'
import dayjs from 'dayjs'
import {HomeOutlined,CheckOutlined} from '@ant-design/icons-vue'
import type {DecorationApi} from '../../services/decorationApi'
import type {Application,Household} from '../../types/decoration'
import {useApplicationForm} from '../../hooks/decoration/useApplicationForm'
import FilePicker from '../../components/decoration/FilePicker.vue'
import SignaturePad from '../../components/decoration/SignaturePad.vue'
import SignedDocuments from '../../components/decoration/SignedDocuments.vue'
const props=defineProps<{api:DecorationApi;household:Household}>()
const emit=defineEmits<{submitted:[Application]}>()
const state=useApplicationForm(props.api,()=>props.household.projectId,row=>emit('submitted',row))
const {form,households,selected,configuration,loading,saving,uploading,error,uncertain,resultMissing,submit,confirmResult,retryOriginal}=state
// 上一页已选定房屋；从服务端目录确认关系后初始化，不能直接信任URL传入的房屋/业主。
watch(households,items=>{if(items.some(h=>h.relationshipId===props.household.relationshipId))selected.value=props.household.relationshipId},{immediate:true})
const step=ref(0),busy=computed(()=>saving.value||uploading.value),dirty=computed(()=>!!selected.value||!!form.constructionUnit)
const dates=computed(()=>({start:form.startTime?dayjs(form.startTime).format('YYYY-MM-DD'):'',end:form.completionTime?dayjs(form.completionTime).format('YYYY-MM-DD'):''}))
function next(){
 if(busy.value||uncertain.value||!configuration.value)return
 if(step.value===0&&!form.noticesAccepted){error.value='请先阅读并确认装修须知与协议';return}
 if(step.value===1&&(!form.contactPhone||!form.constructionUnit||!form.constructionManager||!form.managerPhone||!form.startTime||!form.completionTime)){error.value='请填写申请信息中的必填项';return}
 if(step.value===1&&applicationContactError(form)){error.value=applicationContactError(form);return}
 if(step.value===1&&form.completionTime!<form.startTime!){error.value='计划竣工日期不能早于开工日期';return}
 error.value='';step.value++
}
function setFiles(id:string,ids:string[]){const item=form.materials.find(m=>m.itemId===id);if(item)item.fileIds=ids}
defineExpose({dirty,saving:busy,uncertain})
</script>
<template>
 <div class="form-house mobile-surface"><HomeOutlined /><div><strong>{{household.spaceName}}</strong><p>申请业主：{{household.customerName}}</p></div></div>
 <div class="mobile-form-steps"><div v-for="(label,index) in ['装修自检与须知','申请信息','资料与图纸']" :key="label" :class="{active:step===index,done:step>index}"><span><CheckOutlined v-if="step>index" /><template v-else>{{index+1}}</template></span><p>{{label}}</p></div></div>
 <a-alert v-if="error" type="error" :message="error" show-icon />
 <a-alert v-if="uncertain" type="warning" message="申请结果待确认，请先核对结果。"><template #action><a-button @click="confirmResult">核对结果</a-button><a-button v-if="resultMissing" :loading="saving" @click="retryOriginal">重试原申请</a-button></template></a-alert>
 <a-spin :spinning="loading">
  <a-empty v-if="!configuration&&!loading&&!error" description="暂无适用装修配置，请联系物业" />
  <a-form :model="form" v-if="configuration" layout="vertical" class="mobile-form" :disabled="busy||uncertain" @finish="submit">
   <template v-if="step===0">
    <section class="mobile-surface"><h2>装修前房屋自检</h2><p class="muted">开始施工前，请确认房屋现状并保留照片。</p><a-form-item label="自检结果"><a-radio-group v-model:value="form.selfInspectionStatus"><a-radio :value="0">未发现问题</a-radio><a-radio :value="1">发现问题</a-radio></a-radio-group></a-form-item><a-form-item label="自检说明"><a-textarea v-model:value="form.selfInspectionRemark" placeholder="请描述房屋现状或发现的问题" :auto-size="{minRows:3,maxRows:6}" /></a-form-item><a-form-item label="房屋现状照片"><FilePicker v-model:value="form.selfInspectionFiles" :api="api" :project-id="household.projectId" :readonly="busy||uncertain" /></a-form-item></section>
    <section class="mobile-surface agreement-section"><h2>{{configuration.agreement.title||'装修协议与须知'}}</h2><p>{{configuration.agreement.content}}</p><div v-for="(item,index) in configuration.agreement.supplements" :key="index"><h3>{{item.name}}</h3><p>{{item.content}}</p></div><div class="deposit-note">协议保证金 <strong>¥{{configuration.agreement.deposit}}</strong><small>最终金额以物业审核结果为准</small></div></section>
    <div class="mobile-consent"><a-checkbox v-model:checked="form.noticesAccepted">我已阅读并确认以上装修须知和协议</a-checkbox></div>
   </template>
   <template v-else-if="step===1">
    <section class="mobile-surface"><h2>装修申请信息</h2><a-form-item label="装修类型" required><a-radio-group v-model:value="form.decorationType"><a-radio value="first">首次装修</a-radio><a-radio value="second">二次装修</a-radio></a-radio-group></a-form-item><a-form-item label="业主联系电话" required><a-input v-model:value="form.contactPhone" type="tel" placeholder="请输入联系电话" /></a-form-item><a-form-item label="业主身份证号码" required><a-input v-model:value="form.ownerCertificate" placeholder="请输入证件号码" /></a-form-item><div class="mobile-date-row"><a-form-item label="开工日期" required><a-input type="date" :value="dates.start" @update:value="v=>form.startTime=v?dayjs(v).valueOf():undefined" /></a-form-item><a-form-item label="计划竣工日期" required><a-input type="date" :value="dates.end" @update:value="v=>form.completionTime=v?dayjs(v).endOf('day').valueOf():undefined" /></a-form-item></div></section>
    <section class="mobile-surface"><h2>施工方信息</h2><a-form-item label="施工类型" required><a-radio-group v-model:value="form.constructionType"><a-radio :value="1">装修公司</a-radio><a-radio :value="2">自装</a-radio></a-radio-group></a-form-item><a-form-item label="施工单位 / 公司" required><a-input v-model:value="form.constructionUnit" placeholder="请输入施工单位" /></a-form-item><a-form-item label="施工负责人" required><a-input v-model:value="form.constructionManager" placeholder="请输入负责人姓名" /></a-form-item><a-form-item label="负责人联系电话" required><a-input v-model:value="form.managerPhone" type="tel" placeholder="请输入联系电话" /></a-form-item><a-form-item label="负责人身份证号码" required><a-input v-model:value="form.managerCertificate" /></a-form-item></section>
   </template>
   <template v-else>
    <section v-for="kind in ['material','drawing']" :key="kind" class="mobile-surface"><h2>{{kind==='material'?'装修资料':'装修图纸'}}</h2><p v-if="!configuration.materials.some(m=>m.enabled&&m.kind===kind)" class="muted">本项目无需提交{{kind==='material'?'装修资料':'装修图纸'}}</p><a-form-item v-for="item in configuration.materials.filter(m=>m.enabled&&m.kind===kind)" :key="item.id" :label="item.name" :required="item.required"><FilePicker v-if="item.templateFileId" :value="[item.templateFileId]" :api="api" :project-id="household.projectId" readonly /><FilePicker :value="form.materials.find(m=>m.itemId===item.id)?.fileIds||[]" :api="api" :project-id="household.projectId" :readonly="busy||uncertain||item.source==='sign'" @update:value="ids=>setFiles(item.id,ids)" /><SignaturePad v-if="item.source==='sign'&&!busy&&!uncertain" :api="api" :project-id="household.projectId" @saved="id=>setFiles(item.id,[id])" /></a-form-item></section>
    <section class="mobile-surface"><h2>签署文书</h2><SignedDocuments :api="api" :form="form" :configuration="configuration" :disabled="saving||uncertain" /></section>
   </template>
   <div class="mobile-bottom-actions"><a-button v-if="step>0" size="large" :disabled="busy||uncertain" @click="step--">上一步</a-button><a-button v-if="step<2" type="primary" size="large" :disabled="busy||uncertain" @click="next">下一步</a-button><a-button v-else type="primary" size="large" html-type="submit" :loading="saving" :disabled="uploading||uncertain">确认并提交申请</a-button></div>
  </a-form>
 </a-spin>
</template>
