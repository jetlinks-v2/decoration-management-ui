<script setup lang="ts">
import ownerScene from '../assets/owner-scene.svg'
import {ref} from 'vue'
import {FileTextOutlined,WalletOutlined,SafetyCertificateOutlined,CheckCircleOutlined,AuditOutlined,AccountBookOutlined,RightOutlined,HomeOutlined,HistoryOutlined,ExclamationCircleOutlined} from '@ant-design/icons-vue'
import type {Application,Household} from '../../types/decoration'
import {ownerSteps,type OwnerStep} from '../model'
defineProps<{households:Household[];household?:Household;current?:Application;rectificationCount:number;loading:boolean;failed?:boolean}>()
const emit=defineEmits<{house:[string];step:[OwnerStep];history:[];rectification:[]}>()
const icons={FileTextOutlined,WalletOutlined,SafetyCertificateOutlined,CheckCircleOutlined,AuditOutlined,AccountBookOutlined}
const switching=ref(false),choice=ref('')
function switchHouse(id:string){choice.value=id;switching.value=true}
function confirm(){emit('house',choice.value);switching.value=false}
</script>
<template>
 <section class="decoration-hero decoration-hero--owner"><div><span class="hero-eyebrow">{{$t('Mobile.ownerSide')}}</span><h2>{{$t('Mobile.ownerHeroTitle')}}</h2><p>{{$t('Mobile.ownerHeroHint')}}</p></div><img :src="ownerScene" alt="" width="320" height="240" /></section>
 <div class="house-switch mobile-surface" role="button" tabindex="0" @click="switchHouse(household?.relationshipId||'')" @keydown.enter="switchHouse(household?.relationshipId||'')">
  <span class="current-pill">当前</span><strong>{{household?.spaceName||'请选择房屋'}}</strong><span class="house-switch-action">切换 <RightOutlined /></span>
 </div>
 <a-spin :spinning="loading">
  <a-empty v-if="!households.length&&!loading&&!failed" description="当前项目暂无可办理房屋，请联系物业核对房屋关联" />
  <template v-if="household">
   <div v-if="rectificationCount" class="rectification-banner" role="button" tabindex="0" @click="emit('rectification')" @keydown.enter="emit('rectification')"><ExclamationCircleOutlined /><div><strong>有 {{rectificationCount}} 项巡检问题待整改</strong><p>查看整改要求，完成后提交物业复核</p></div><RightOutlined /></div>
   <div class="mobile-section-heading"><h2>装修流程</h2><a-button type="link" size="small" @click="emit('history')"><HistoryOutlined /> 装修记录</a-button></div>
   <div v-for="(step,index) in ownerSteps(current)" :key="step.key" class="step-card" :class="'step-card--'+step.state" role="button" :aria-disabled="step.state==='disabled'" :tabindex="step.state==='disabled'?-1:0" @click="step.state!=='disabled'&&emit('step',step.key)" @keydown.enter="step.state!=='disabled'&&emit('step',step.key)">
    <span class="step-card-icon"><component :is="icons[step.icon as keyof typeof icons]" /></span>
    <div class="step-card-content"><h3>{{step.title}}</h3><p>{{step.description}}</p></div>
    <span class="step-card-number">{{index+1}}</span><RightOutlined class="step-card-arrow" />
   </div>
   <section class="mobile-surface house-summary"><h3><HomeOutlined /> 当前房屋</h3><dl><dt>房屋</dt><dd>{{household.spaceName}}</dd><dt>业主</dt><dd>{{household.customerName}}</dd><dt>当前状态</dt><dd class="primary-text">{{current?$t(`Decoration.states.${current.status}`):'未申请装修'}}</dd></dl></section>
   <a-button v-if="current?.actualEndTime" block type="primary" size="large" class="new-application" @click="emit('step','apply')">查看本次装修</a-button>
   <p class="mobile-footnote">按流程办理装修，共同守护美好家园</p>
  </template>
 </a-spin>
 <a-modal v-model:open="switching" title="切换房屋" :width="560" centered :footer="null" :style="{maxWidth:'calc(100vw - 32px)'}" :body-style="{maxHeight:'65dvh',overflowY:'auto'}">
  <a-radio-group v-model:value="choice" class="house-options"><div v-for="home in households" :key="home.relationshipId" class="house-option" @click="choice=home.relationshipId"><div><strong>{{home.spaceName}}</strong><p>业主：{{home.customerName}}</p></div><a-radio :value="home.relationshipId" /></div></a-radio-group>
  <a-button block type="primary" size="large" :disabled="!choice" @click="confirm">确认切换</a-button>
 </a-modal>
</template>
