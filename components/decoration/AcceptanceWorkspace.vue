<script setup lang="ts">
import {ref} from 'vue'
import Applications from '../../views/decoration/Applications/index.vue'
import TaskWorkspace from './TaskWorkspace.vue'
defineProps<{type:'first'|'second'}>()
const active=ref('applications')
const applications=ref<{allowLeave:()=>Promise<boolean>}>(),records=ref<{allowLeave:()=>Promise<boolean>}>()
async function changeTab(key:string|number){
 const current=active.value==='applications'?applications.value:records.value
 if(!current||await current.allowLeave())active.value=String(key)
}
</script>
<template><a-tabs :active-key="active" destroy-inactive-tab-pane @update:active-key="changeTab"><a-tab-pane key="applications" tab="验收申请"><Applications ref="applications" :mode="type" /></a-tab-pane><a-tab-pane key="records" tab="验收记录"><TaskWorkspace ref="records" :kind="type==='first'?'firstAcceptance':'secondAcceptance'" /></a-tab-pane></a-tabs></template>
