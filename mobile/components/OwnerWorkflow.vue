<script setup lang="ts">
import {FileTextOutlined,WalletOutlined,SafetyCertificateOutlined,CheckCircleOutlined,AuditOutlined,AccountBookOutlined,RightOutlined,HomeOutlined,ExclamationCircleOutlined} from '@ant-design/icons-vue'
import type {Application} from '../../types/decoration'
import {ownerSteps,type OwnerStep} from '../model'
import {workflowStatus} from '../../utils/decoration'
import {workflowReminder} from '../../utils/applicationWorkflow'
defineProps<{current:Application;rectificationCount:number;loading:boolean;failed?:boolean}>()
const emit=defineEmits<{step:[OwnerStep];rectification:[]}>()
const icons={FileTextOutlined,WalletOutlined,SafetyCertificateOutlined,CheckCircleOutlined,AuditOutlined,AccountBookOutlined}
</script>
<template>
 <a-spin :spinning="loading">
  <template v-if="current">
   <a-alert class="workflow-reminder" :type="workflowReminder(current).tone" :message="workflowReminder(current).message" show-icon><template #action><a-button type="link" :disabled="loading" @click="emit('step',workflowReminder(current).step)">{{workflowReminder(current).action}}</a-button></template></a-alert>
   <div v-if="rectificationCount" class="rectification-banner" role="button" tabindex="0" @click="emit('rectification')" @keydown.enter="emit('rectification')"><ExclamationCircleOutlined /><div><strong>有 {{rectificationCount}} 项巡检问题待整改</strong><p>查看整改要求，完成后提交物业复核</p></div><RightOutlined /></div>
   <section class="mobile-surface form-house"><HomeOutlined /><div><strong>{{current.spaceName}}</strong><p>{{current.number}}</p></div><span class="status-pill">{{$t(`Decoration.states.${workflowStatus(current)}`)}}</span></section><div class="mobile-section-heading"><h2>装修流程</h2></div>
   <div v-for="(step,index) in ownerSteps(current)" :key="step.key" class="step-card" :class="'step-card--'+step.state" role="button" :aria-disabled="step.state==='disabled'" :tabindex="step.state==='disabled'?-1:0" @click="step.state!=='disabled'&&emit('step',step.key)" @keydown.enter="step.state!=='disabled'&&emit('step',step.key)">
    <span class="step-card-icon"><component :is="icons[step.icon as keyof typeof icons]" /></span>
    <div class="step-card-content"><h3>{{step.title}}</h3><p>{{step.description}}</p></div>
    <span class="step-card-number">{{index+1}}</span><RightOutlined class="step-card-arrow" />
   </div>
   <section class="mobile-surface house-summary"><h3><HomeOutlined /> 当前房屋</h3><dl><dt>房屋</dt><dd>{{current.spaceName}}</dd><dt>业主</dt><dd>{{current.ownerName}}</dd><dt>当前状态</dt><dd class="primary-text">{{current?$t(`Decoration.states.${workflowStatus(current)}`):'未申请装修'}}</dd></dl></section>
   <a-button v-if="current?.actualEndTime" block type="primary" size="large" class="new-application" @click="emit('step','apply')">查看本次装修</a-button>
   <p class="mobile-footnote">按流程办理装修，共同守护美好家园</p>
  </template>
 </a-spin>
</template>
