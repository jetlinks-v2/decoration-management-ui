<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import {workflowStatus} from '../../utils/decoration'
import type {Status} from '../../types/decoration'
defineProps<{value?:Status|null;refundStatus?:number}>()
const {t}=useI18n()
</script>
<template>
 <a-tag v-if="value" :color="value==='rejected'?'error':refundStatus===2?'success':value==='finished'?'default':'processing'">{{t(`Decoration.states.${refundStatus==null?value:workflowStatus({status:value,refundStatus})}`)}}</a-tag>
 <span v-else>—</span>
</template>
