<script setup lang="ts">
import {ref} from 'vue'
import {useI18n} from 'vue-i18n'
import type {PermitDocument} from '../../types/decoration'
import PermitCertificate from './PermitCertificate.vue'
defineProps<{state:{open:boolean;document?:PermitDocument;snapshotUrl?:string;busy:boolean;error:string;uncertain:boolean;resultMissing:boolean}}>()
const emit=defineEmits<{close:[];reload:[];print:[];download:[];confirm:[];retry:[]}>()
const {t}=useI18n(),element=ref<HTMLElement>()
defineExpose({element})
</script>
<template>
 <a-modal :open="state.open" :title="t('Decoration.permitDocument.title')" width="min(1240px,98vw)" :footer="null" :mask-closable="false" :closable="!state.busy&&!state.uncertain" :keyboard="!state.busy&&!state.uncertain" :destroy-on-close="true" @cancel="emit('close')">
  <a-alert v-if="state.error" type="error" :message="state.error" show-icon />
  <a-alert v-if="state.uncertain" type="warning" :message="t('Decoration.uncertain')"><template #action><a-button :loading="state.busy" @click="emit('confirm')">核对结果</a-button><a-button v-if="state.resultMissing" :loading="state.busy" @click="emit('retry')">重试原操作</a-button></template></a-alert>
  <a-space style="margin:16px 0"><a-button type="primary" :loading="state.busy" :disabled="!state.document||state.uncertain" @click="emit('print')">打印</a-button><a-button :disabled="state.busy||!state.document||state.uncertain" @click="emit('download')">下载PNG</a-button><a-button :disabled="state.busy||state.uncertain" @click="emit('reload')">重新加载</a-button></a-space>
  <a-alert type="info" message="打印后请按实际领取情况单独登记领取；延期后需重新打印和领取。" show-icon />
  <div v-if="state.snapshotUrl" style="overflow:auto"><img :src="state.snapshotUrl" alt="备案证明打印快照" style="width:1120px;max-width:100%" /></div>
  <div v-else style="overflow:auto"><div v-if="state.document" ref="element" style="width:1120px"><PermitCertificate :document="state.document" /></div></div>
  <a-empty v-if="!state.document&&!state.busy&&!state.error" :description="t('Decoration.permitDocument.notReady')" />
 </a-modal>
</template>
