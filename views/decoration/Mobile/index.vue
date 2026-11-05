<script setup lang="ts">
import {useMobileEntry} from '../../../hooks/decoration/useMobileEntry'
const href=useMobileEntry()
</script>
<template><a-result v-if="href" title="装修移动办理" sub-title="在手机浏览器或 APP 内打开，继续办理本人房屋的装修申请。"><template #extra><a-button type="primary" :href="href" target="_blank" rel="noopener">打开移动办理</a-button></template></a-result><a-result v-else status="warning" title="请从装修应用入口进入" /></template>
