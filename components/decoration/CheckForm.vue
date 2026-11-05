<script setup lang="ts">
import type { CheckItem, CheckResult } from '../../types/decoration'
import type { DecorationApi } from '../../services/decorationApi'
import FilePicker from './FilePicker.vue'
import dayjs from 'dayjs'
const props=defineProps<{items:CheckItem[];value:CheckResult[];api:DecorationApi;projectId:string;decorationId:string;readonly?:boolean}>()
const emit=defineEmits<{'update:value':[CheckResult[]]}>()
function update(id:string, patch:Partial<CheckResult>){const old=props.value.find(v=>v.itemId===id)||{itemId:id,fileIds:[],qualified:true};emit('update:value',[...props.value.filter(v=>v.itemId!==id),{...old,...patch}])}
</script>
<template>
  <div v-for="item in items.filter(i=>i.enabled)" :key="item.id" class="decoration-card">
    <h4>{{item.category}} · {{item.name}} <span v-if="item.required">*</span></h4>
    <p class="decoration-meta">{{item.example}} {{item.standard?`标准：${item.standard}`:''}} {{item.min!=null?`下限：${item.min}`:''}} {{item.max!=null?`上限：${item.max}`:''}}</p>
    <FilePicker v-if="item.exampleFileId" :value="[item.exampleFileId]" :api="api" :project-id="projectId" readonly />
    <FilePicker v-if="item.inputType==='image'" :value="value.find(v=>v.itemId===item.id)?.fileIds||[]" :api="api" :project-id="projectId" :decoration-id="decorationId" :readonly="readonly" @update:value="ids=>update(item.id,{fileIds:ids})" />
    <a-select :disabled="readonly" v-else-if="item.inputType==='option'" :value="value.find(v=>v.itemId===item.id)?.value" :options="item.options.map(v=>({value:v,label:v}))" style="width:100%" @update:value="v=>update(item.id,{value:String(v)})" />
    <a-input-number :disabled="readonly" v-else-if="item.inputType==='number'" :value="Number(value.find(v=>v.itemId===item.id)?.value)||undefined" @update:value="v=>update(item.id,{value:String(v??'')})" />
    <a-input :disabled="readonly" v-else :value="value.find(v=>v.itemId===item.id)?.value" @update:value="v=>update(item.id,{value:v})" />
    <a-radio-group :disabled="readonly" :value="value.find(v=>v.itemId===item.id)?.qualified??true" @update:value="v=>update(item.id,{qualified:v})"><a-radio :value="true">合格</a-radio><a-radio :value="false">不合格</a-radio></a-radio-group>
    <template v-if="value.find(v=>v.itemId===item.id)?.qualified===false">
      <a-textarea :disabled="readonly" placeholder="整改内容" :value="value.find(v=>v.itemId===item.id)?.rectification" @update:value="v=>update(item.id,{rectification:v})" />
      <a-date-picker :disabled="readonly" placeholder="整改截止日期" :value="value.find(v=>v.itemId===item.id)?.deadline?dayjs(value.find(v=>v.itemId===item.id)?.deadline):undefined" @update:value="v=>update(item.id,{deadline:v?Number(v.valueOf()):undefined})" />
    </template>
  </div>
</template>
