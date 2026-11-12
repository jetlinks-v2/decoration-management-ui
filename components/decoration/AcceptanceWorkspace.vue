<script setup lang="ts">
import TaskWorkspace from './TaskWorkspace.vue'
defineProps<{type:'first'|'second'}>()
</script>
<template><TaskWorkspace :kind="type==='first'?'firstAcceptance':'secondAcceptance'" /></template>
