<script setup lang="ts">
import {computed} from 'vue'
import {CheckOutlined,RightOutlined,SearchOutlined,HistoryOutlined} from '@ant-design/icons-vue'
import {useI18n} from 'vue-i18n'
import type {Application} from '../../types/decoration'
import {detailFlow,type DetailStage} from '../../utils/applicationDetailFlow'
const props=defineProps<{row:Application;selected:DetailStage;blocked:boolean}>()
const emit=defineEmits<{select:[DetailStage]}>()
const steps=computed(()=>detailFlow(props.row)),{t}=useI18n()
</script>
<template>
  <aside class="flow-nav">
    <p class="nav-caption">{{t('Decoration.detailFlow.process')}}</p>
    <nav :aria-label="t('Decoration.detailFlow.process')">
      <button v-for="(step,index) in steps" :key="step.key" type="button" :class="['flow-step',step.state,{selected:selected===step.key}]" :disabled="blocked" :aria-current="selected===step.key?'step':undefined" @click="emit('select',step.key)">
        <span class="step-number"><CheckOutlined v-if="step.state==='done'" /><template v-else>{{index+1}}</template></span>
        <span class="step-copy"><strong>{{step.title}}</strong><small>{{t(`Decoration.detailFlow.${step.state}`)}}</small></span>
        <RightOutlined v-if="selected===step.key" class="step-arrow" />
      </button>
    </nav>
    <div class="nav-related">
      <button type="button" :class="{selected:selected==='inspection'}" :disabled="blocked" @click="emit('select','inspection')"><SearchOutlined /><span>{{t('Decoration.detailFlow.inspection')}}</span><RightOutlined /></button>
      <button type="button" :class="{selected:selected==='history'}" :disabled="blocked" @click="emit('select','history')"><HistoryOutlined /><span>{{t('Decoration.history')}}</span><RightOutlined /></button>
    </div>
  </aside>
</template>
<style scoped>
.flow-nav{width:216px;flex-shrink:0;padding:16px 12px;overflow:auto;background:#f8fafc;border-right:1px solid #edf0f5}.nav-caption{font-size:12px;color:#8a94a3;letter-spacing:1px;margin:0 0 14px 12px}.flow-step{width:100%;display:flex;align-items:center;gap:12px;padding:8px 10px;border:1px solid transparent;border-radius:8px;background:transparent;text-align:left;cursor:pointer;margin-bottom:4px;transition:background .2s}.step-number{flex-shrink:0;width:29px;height:29px;display:grid;place-items:center;border:1px solid #dce1e9;border-radius:50%;background:white;color:#9ba3af;font-size:13px;font-weight:600}.step-copy{display:grid;gap:2px}.step-copy strong{font-size:14px;font-weight:500;color:#5c6675}.step-copy small{font-size:11px;color:#9ba3af}.flow-step.done .step-number{background:#eef8f3;border-color:#c5e6d4;color:#399965}.flow-step.active .step-number{border-color:#aac7fa;color:#316ed8}.flow-step.selected{background:white;border-color:#dce6f8;box-shadow:0 2px 5px #233c6710}.flow-step.selected .step-number{background:#316ed8;color:white;border-color:#316ed8}.flow-step.selected .step-copy strong,.flow-step.selected .step-arrow{color:#245dc2}.step-arrow{font-size:10px;margin-left:auto}.nav-related{border-top:1px solid #e7ebf1;padding-top:10px;margin:12px 0 0}.nav-related button{width:100%;border:0;border-radius:7px;padding:10px;display:flex;align-items:center;gap:10px;background:transparent;color:#697486;cursor:pointer}.nav-related button span:nth-child(2){flex:1;text-align:left}.nav-related button.selected{background:#eaf1fc;color:#245dc2}.flow-nav button:hover{background:#edf3fc}.flow-nav button:disabled{cursor:wait}.flow-nav button:focus-visible{outline:2px solid #316ed8;outline-offset:1px}@media(max-width:760px){.flow-nav{width:100%;border:0;border-bottom:1px solid #eee;padding:12px}.flow-nav nav{display:flex;overflow-x:auto;gap:8px}.flow-step{min-width:150px;margin:0;padding:8px}.nav-caption{display:none}.nav-related{display:flex;margin-top:10px;padding-top:8px}.nav-related button{padding:8px}.nav-related button span:nth-child(2){flex:0 1 auto}}
</style>
