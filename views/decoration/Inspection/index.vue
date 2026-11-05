<script setup lang="ts">
import {ref} from 'vue'
import Applications from '../Applications/index.vue'
import TaskWorkspace from '../../../components/decoration/TaskWorkspace.vue'
const active=ref('applications')
const applications=ref<{allowLeave:()=>boolean}>(),tasks=ref<{allowLeave:()=>boolean}>()
function changeTab(key:string|number){const current=active.value==='applications'?applications.value:tasks.value;if(!current||current.allowLeave())active.value=String(key)}
</script>
<template><a-tabs :active-key="active" destroy-inactive-tab-pane @update:active-key="changeTab"><a-tab-pane key="applications" tab="分配巡检任务"><Applications ref="applications" mode="inspection" /></a-tab-pane><a-tab-pane key="tasks" tab="巡检任务"><TaskWorkspace ref="tasks" kind="daily" /></a-tab-pane></a-tabs></template>
