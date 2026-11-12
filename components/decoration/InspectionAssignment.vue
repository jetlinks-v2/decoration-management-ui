<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import type {DecorationApi} from '../../services/decorationApi'
import type {Action} from '../../types/decoration'
import {useApplicationDetail} from '../../hooks/decoration/useApplicationDetail'
import ActionForm from './ActionForm.vue'
const props=defineProps<{id:string;api:DecorationApi}>()
const emit=defineEmits<{assigned:[]}>()
const {t}=useI18n()
const {row,loading,saving,error,uncertain,resultMissing,load,execute,confirm,retryOriginal}=useApplicationDetail(props.api,()=>props.id,undefined,undefined,{loadRelated:false})
const dirty=computed(()=>!!row.value)
async function submit(name:string,input:Partial<Action>){if(await execute(name,input,true))emit('assigned')}
async function recover(retry=false){if(await (retry?retryOriginal():confirm()))emit('assigned')}
defineExpose({dirty,saving,uncertain})
</script>
<template>
 <a-spin :spinning="loading">
  <a-alert v-if="error" type="error" :message="error" show-icon><template #action><a-button v-if="!uncertain" :disabled="saving" @click="load">重新加载</a-button></template></a-alert>
  <a-alert v-if="uncertain" type="warning" :message="t('Decoration.uncertain')"><template #action><a-button :loading="saving" @click="recover()">核对结果</a-button><a-button v-if="resultMissing" :loading="saving" @click="recover(true)">重试原操作</a-button></template></a-alert>
  <ActionForm v-if="row" :key="row.version" action="inspection/assign" :row="row" :api="api" :busy="saving||uncertain||loading" @submit="submit" />
 </a-spin>
</template>
