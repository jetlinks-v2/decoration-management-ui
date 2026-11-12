<script setup lang="ts">
import dayjs from 'dayjs'
import {HomeOutlined,CheckOutlined} from '@ant-design/icons-vue'
import type {DecorationApi} from '../../services/decorationApi'
import type {Application,Household} from '../../types/decoration'
import {useOwnerApplicationForm} from '../../hooks/decoration/useOwnerApplicationForm'
import SelfInspectionForm from '../../components/decoration/SelfInspectionForm.vue'
import ApplicationMaterials from '../../components/decoration/ApplicationMaterials.vue'
import MaterialSigning from '../../components/decoration/MaterialSigning.vue'
const props=defineProps<{api:DecorationApi;household:Household}>()
const emit=defineEmits<{submitted:[Application]}>()
const {form,configuration,loading,saving,uploading,error,uncertain,resultMissing,confirmResult,retryOriginal,step,materialIndex,materials,currentMaterial,materialSigned,editMaterial,busy,dirty,dates,next,back,submit}=useOwnerApplicationForm(props.api,()=>props.household,row=>emit('submitted',row))
defineExpose({dirty,saving:busy,uncertain})
</script>
<template>
 <div class="form-house mobile-surface"><HomeOutlined /><div><strong>{{household.spaceName}}</strong><p>申请业主：{{household.customerName}}</p></div></div>
 <div class="mobile-form-steps"><div v-for="(label,index) in ['申请信息','装修自检','装修图纸','资料签署']" :key="label" :class="{active:step===index,done:step>index}"><span><CheckOutlined v-if="step>index" /><template v-else>{{index+1}}</template></span><p>{{label}}</p></div></div>
 <a-alert v-if="error" type="error" :message="error" show-icon />
 <a-alert v-if="uncertain" type="warning" message="申请结果待确认，请先核对结果。"><template #action><a-button @click="confirmResult">核对结果</a-button><a-button v-if="resultMissing" :loading="saving" @click="retryOriginal">重试原申请</a-button></template></a-alert>
 <a-spin :spinning="loading">
  <a-empty v-if="!configuration&&!loading&&!error" description="暂无适用装修配置，请联系物业" />
  <a-form :model="form" v-if="configuration" layout="vertical" class="mobile-form" :disabled="busy||uncertain" @finish="submit">
   <template v-if="step===0">
    <section class="mobile-surface"><h2>装修申请信息</h2><a-form-item label="装修类型" required><a-radio-group v-model:value="form.decorationType"><a-radio value="first">首次装修</a-radio><a-radio value="second">二次装修</a-radio></a-radio-group></a-form-item><a-form-item label="业主联系电话" required><a-input v-model:value="form.contactPhone" type="tel" placeholder="请输入联系电话" /></a-form-item><a-form-item label="业主身份证号码" required><a-input v-model:value="form.ownerCertificate" placeholder="请输入证件号码" /></a-form-item><div class="mobile-date-row"><a-form-item label="开工日期" required><a-input type="date" :value="dates.start" @update:value="v=>form.startTime=v?dayjs(v).valueOf():undefined" /></a-form-item><a-form-item label="计划竣工日期" required><a-input type="date" :value="dates.end" @update:value="v=>form.completionTime=v?dayjs(v).endOf('day').valueOf():undefined" /></a-form-item></div></section>
    <section class="mobile-surface"><h2>施工方信息</h2><a-form-item label="施工类型" required><a-radio-group v-model:value="form.constructionType"><a-radio :value="1">装修公司</a-radio><a-radio :value="2">自装</a-radio></a-radio-group></a-form-item><a-form-item label="施工单位 / 公司" required><a-input v-model:value="form.constructionUnit" placeholder="请输入施工单位" /></a-form-item><a-form-item label="施工负责人" required><a-input v-model:value="form.constructionManager" placeholder="请输入负责人姓名" /></a-form-item><a-form-item label="负责人联系电话" required><a-input v-model:value="form.managerPhone" type="tel" placeholder="请输入联系电话" /></a-form-item><a-form-item label="负责人身份证号码" required><a-input v-model:value="form.managerCertificate" /></a-form-item></section>
    <section class="mobile-surface agreement-section">
     <h2>{{$t('Decoration.agreement')}}</h2>
     <p>{{configuration.agreement.content}}</p>
     <div v-for="(item,index) in configuration.agreement.supplements" :key="index"><h3>{{item.name}}</h3><p>{{item.content}}</p></div>
     <div class="deposit-note">{{$t('Mobile.agreementDeposit')}}<strong>¥{{configuration.agreement.deposit}}</strong><small>{{$t('Mobile.agreementDepositHint')}}</small></div>
     <div v-if="Object.keys(configuration.agreement.fees||{}).length" class="agreement-fees"><h3>{{$t('Mobile.agreementOtherFees')}}</h3><dl><template v-for="(amount,name) in configuration.agreement.fees" :key="name"><dt>{{name}}</dt><dd>¥{{amount}}</dd></template></dl></div>
    </section>
    <div class="mobile-consent"><a-checkbox v-model:checked="form.noticesAccepted">我已阅读并确认以上装修须知和协议</a-checkbox></div>
   </template>
   <template v-else-if="step===1"><section class="mobile-surface"><SelfInspectionForm :api="api" :form="form" :configuration="configuration" :disabled="busy||uncertain" /></section></template>
   <template v-else-if="step===2"><section class="mobile-surface"><ApplicationMaterials :api="api" :form="form" :configuration="configuration" kind="drawing" :disabled="busy||uncertain" /></section></template>
   <template v-else>
    <section v-if="currentMaterial" class="mobile-surface"><p class="muted">第 {{materialIndex+1}} / {{materials.length}} 份资料{{currentMaterial.required?'（必签）':'（可跳过）'}}</p><MaterialSigning :key="currentMaterial.id" :api="api" :form="form" :configuration="configuration" :item="currentMaterial" :disabled="busy||uncertain" /></section>
    <section v-else class="mobile-surface"><h2>资料签署完成</h2><p v-if="!materials.length" class="muted">本项目无需签署装修资料。</p><div v-for="(item,index) in materials" :key="item.id" class="staff-task-head"><span>{{item.name}} · {{materialSigned(item.id)?'已签署':'未签署'}}</span><a-button type="link" :disabled="busy||uncertain" @click="editMaterial(index)">查看 / 重签</a-button></div></section>
   </template>
   <div class="mobile-bottom-actions"><a-button v-if="step>0" size="large" :disabled="busy||uncertain" @click="back">上一步</a-button><a-button v-if="step<3||currentMaterial" type="primary" size="large" :disabled="busy||uncertain" @click="next">{{step===3?(currentMaterial&&!currentMaterial.required&&!materialSigned(currentMaterial.id)?'跳过此资料':'下一份资料'):'下一步'}}</a-button><a-button v-else type="primary" size="large" html-type="submit" :loading="saving" :disabled="uploading||uncertain">确认并提交申请</a-button></div>
  </a-form>
 </a-spin>
</template>
