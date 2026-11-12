<script setup lang="ts">
import dayjs from 'dayjs'
import type {Action,Application} from '../../types/decoration'
defineProps<{form:Partial<Action>;row?:Application}>()
</script>
<template>
 <a-descriptions bordered :column="3" size="small" style="margin-bottom:20px">
  <a-descriptions-item label="业主">{{row?.ownerName}}</a-descriptions-item>
  <a-descriptions-item label="房屋">{{row?.spaceName}}</a-descriptions-item>
  <a-descriptions-item label="施工单位">{{row?.details.constructionUnit}}</a-descriptions-item>
 </a-descriptions>
 <a-row :gutter="16">
  <a-col :span="12"><a-form-item label="安全负责人" required><a-input v-model:value="form.safetyPerson" :readonly="!!row?.permit" :maxlength="128" /></a-form-item></a-col>
  <a-col :span="12"><a-form-item label="安全负责人电话" required><a-input v-model:value="form.safetyPhone" :readonly="!!row?.permit" :maxlength="64" /></a-form-item></a-col>
 </a-row>
 <a-form-item label="具体施工内容" required><a-textarea v-model:value="form.content" :readonly="!!row?.permit" :maxlength="2000" :rows="3" /></a-form-item>
 <a-form-item label="是否委托"><a-switch v-model:checked="form.entrusted" :disabled="!!row?.permit" /></a-form-item>
 <a-alert v-if="row?.permit" type="info" message="已发证后可继续登记施工人员；证件正文及已打印、下载的图片保留原记录。" show-icon />
 <div class="workers-title"><h4>施工人员（{{form.workers?.length||0}} 人）</h4><a-button :disabled="(form.workers?.length||0)>=200" @click="form.workers?.push({name:'',phone:'',certificate:'',entryTime:0,expirationTime:0})">添加人员</a-button></div>
 <div v-for="(worker,index) in form.workers" :key="index" class="worker-row">
  <a-form-item :label="`人员 ${index+1} · 姓名`" required><a-input v-model:value="worker.name" :maxlength="128" /></a-form-item>
  <a-form-item label="证件号码" required><a-input v-model:value="worker.certificate" :maxlength="64" /></a-form-item>
  <a-form-item label="联系电话" required><a-input v-model:value="worker.phone" :maxlength="64" /></a-form-item>
  <a-form-item label="进场日期" required><a-date-picker :value="worker.entryTime?dayjs(worker.entryTime):undefined" @update:value="v=>worker.entryTime=Number(v?.valueOf()||0)" /></a-form-item>
  <a-form-item label="有效截止期" required><a-date-picker :value="worker.expirationTime?dayjs(worker.expirationTime):undefined" @update:value="v=>worker.expirationTime=Number(v?.valueOf()||0)" /></a-form-item>
  <a-button danger type="link" @click="form.workers?.splice(index,1)">移除</a-button>
 </div>
 <a-empty v-if="!form.workers?.length" description="尚未登记施工人员" :image-style="{height:'40px'}" />
</template>
<style scoped>
.workers-title{display:flex;align-items:center;justify-content:space-between;margin:20px 0 12px}.workers-title h4{margin:0}.worker-row{display:grid;grid-template-columns:1fr 1.4fr 1.2fr 1fr 1fr auto;gap:12px;align-items:center;border-top:1px solid #f0f0f0;padding-top:12px}.worker-row .ant-picker{width:100%}@media(max-width:850px){.worker-row{grid-template-columns:1fr 1fr}}
</style>
