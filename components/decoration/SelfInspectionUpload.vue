<script setup lang="ts">
import type {CreateApplication} from '../../types/decoration'
import type {DecorationApi} from '../../services/decorationApi'
import templateUrl from '../../assets/material-templates/装修自检表.pdf?url'
import FilePicker from './FilePicker.vue'
defineProps<{api:DecorationApi;form:CreateApplication;disabled?:boolean}>()
</script>
<template>
 <section class="self-inspection-upload">
  <p>下载自检表交由业主填写、签字，再导入签字后的照片、扫描件或文件。</p>
  <a-button type="link" :href="templateUrl" download="装修自检表.pdf">下载装修自检表模板</a-button>
  <a-form-item label="签字后的装修自检表" required><FilePicker v-model:value="form.selfInspectionFiles" :api="api" :project-id="form.projectId" :readonly="disabled" /></a-form-item>
 </section>
</template>
<style scoped>
.self-inspection-upload>p{color:var(--ant-color-text-secondary,#666);line-height:1.7}
</style>
