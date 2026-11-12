<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {mobileEntry,mobileNoticeTarget} from '../../utils/mobileEntry'
const props=defineProps<{data:{message?:string;detail?:unknown;detailJson?:string}}>()
const {t}=useI18n()
const objectDetail=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{}
const detail=computed(()=>{
 if(props.data.detail&&typeof props.data.detail==='object')return objectDetail(props.data.detail)
 try{return objectDetail(JSON.parse(props.data.detailJson||'{}'))}catch{return {}}
})
// 只接受当前业务的对象标识，不直接使用通知中任意URL跳转。
const href=computed(()=>{
 const value=detail.value
 if(typeof value.applicationId!=='string'||typeof value.decorationId!=='string')return
 const query=new URLSearchParams({decorationId:value.decorationId,step:typeof value.step==='string'?value.step:'apply'})
 if(!mobileNoticeTarget('?'+query))return
 return mobileEntry(value.applicationId,'','owner')+'&'+query
})
</script>
<template><div><a-alert type="info" :message="data.message" show-icon /><a-button v-if="href" type="primary" :href="href" target="_blank" rel="noopener" style="margin-top:20px">{{t('Decoration.notice.openDetail')}}</a-button></div></template>
