<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import type {Status} from '../../types/decoration'
defineProps<{value?:Status|null}>()
const {t}=useI18n()
</script>
<template>
 <a-tag v-if="value" :color="value==='rejected'?'error':value==='finished'?'default':'processing'">{{t(`Decoration.states.${value}`)}}</a-tag>
 <span v-else>—</span>
</template>
