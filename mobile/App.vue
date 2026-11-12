<script setup lang="ts">
import {computed,ref} from 'vue'
import {useI18n} from 'vue-i18n'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import {LeftOutlined,ReloadOutlined,HomeOutlined,LogoutOutlined,FileAddOutlined,FileTextOutlined,BellOutlined} from '@ant-design/icons-vue'
import ProjectTreeSelect from '../components/decoration/ProjectTreeSelect.vue'
import OwnerHome from './components/OwnerHome.vue'
import OwnerRecords from './components/OwnerRecords.vue'
import OwnerWorkflow from './components/OwnerWorkflow.vue'
import StaffHome from './components/StaffHome.vue'
import OwnerApplicationForm from './components/OwnerApplicationForm.vue'
import OwnerApplicationDetail from './components/OwnerApplicationDetail.vue'
import StaffTaskDetail from './components/StaffTaskDetail.vue'
import {useMobileDecoration} from './useMobileDecoration'
import {useDiscardConfirm} from '../hooks/decoration/useDiscardConfirm'
import {mobileSide} from '../utils/mobileEntry'
import {ownerSteps,type OwnerStep} from './model'
const props=defineProps<{standalone?:boolean;loggingOut?:boolean}>()
const emit=defineEmits<{logout:[]}>()
const side=mobileSide(location.search)
const {t}=useI18n()
type Editor={dirty:boolean;saving:boolean;uncertain:boolean;reload?:()=>Promise<void>}
const form=ref<Editor>(),detail=ref<Editor>()
const confirmDiscard=useDiscardConfirm(()=> '当前有尚未提交的内容，确定离开吗？')
const blocked=()=>!!(form.value?.saving||form.value?.uncertain||detail.value?.saving||detail.value?.uncertain)
const dirty=()=>!!(form.value?.dirty||detail.value?.dirty)
async function canLeave(){if(blocked())return false;return !dirty()||await confirmDiscard()&&!blocked()}
const {api,permissions,projectId,projects,houses,householdId,household,current,rectificationCount,rows,taskRows,staffTab,ownerTab,page,total,loading,error,invalid,view,detailId,taskId,detailStep,contextKey,load,start,navigate,back,changeProject,changeHouse,changeTab,created,applicationChanged,changePage}=useMobileDecoration(canLeave,side,()=>blocked()||dirty())
const title=computed(()=>view.value==='create'?'装修申请':view.value==='notifications'?t('Mobile.decorationNotifications'):view.value==='history'?t('Mobile.decorationRecords'):view.value==='workflow'?t('Mobile.workflowTitle'):view.value==='detail'?side==='staff'?'任务办理':detailStep.value==='rectification'?'巡检整改':ownerSteps().find(s=>s.key===detailStep.value)?.title||'装修详情':side==='owner'?t('Mobile.myDecoration'):'装修工作台')
const ownerRoot=computed(()=>side==='owner'&&['list','history','notifications'].includes(view.value))
const houseOptions=computed(()=>houses.value.map(home=>({value:home.household.relationshipId,label:`${home.projectName} / ${home.household.spaceName}`})))
function openStep(step:OwnerStep){if(!current.value&&step==='apply')navigate('create');else if(current.value)navigate('detail',current.value.id,step)}
async function signOut(){if(!props.loggingOut&&await canLeave())emit('logout')}
async function refresh(){if(await canLeave()){if(view.value==='detail')void detail.value?.reload?.();else void load()}}
</script>
<template>
 <a-config-provider :locale="zhCN"><main class="decoration-mobile" :class="[`mobile-${side}`,{'has-owner-tabs':ownerRoot}]">
  <header class="mobile-header" :class="{'owner-home-header':side==='owner'&&view==='list'}">
   <template v-if="side==='owner'&&view==='list'"><HomeOutlined class="owner-header-home" /><a-select class="owner-header-select" :value="householdId||undefined" :options="houseOptions" show-search option-filter-prop="label" allow-clear :loading="loading" :disabled="invalid||loading||!houses.length" :aria-label="$t('Mobile.selectHouse')" :placeholder="$t('Mobile.selectHouse')" @update:value="value=>changeHouse(typeof value==='string'?value:undefined)" /><a-button v-if="standalone" type="text" :aria-label="$t('Mobile.logout')" :title="$t('Mobile.logout')" :loading="loggingOut" @click="signOut"><LogoutOutlined /></a-button><a-button v-else type="text" :aria-label="$t('Mobile.refresh')" @click="refresh"><ReloadOutlined /></a-button></template>
   <template v-else><a-button type="text" aria-label="返回" @click="back()"><LeftOutlined /></a-button><h1>{{title}}</h1><a-button v-if="!invalid&&view!=='create'" type="text" aria-label="刷新" @click="refresh"><ReloadOutlined /></a-button><span v-else class="header-spacer" /></template>
  </header>
  <div class="mobile-content">
   <div v-if="standalone&&!ownerRoot" class="mobile-account"><span>{{side==='staff'?'员工端':'业主端'}}</span><a-button type="text" size="small" :loading="loggingOut" @click="signOut"><LogoutOutlined />退出登录</a-button></div>
   <a-alert v-if="error" type="error" :message="error" show-icon><template #action><a-button v-if="!invalid" @click="start">重试</a-button></template></a-alert>
   <template v-if="!invalid">
    <div v-if="view==='list'&&side==='staff'" class="mobile-project"><HomeOutlined /><ProjectTreeSelect :value="projectId||undefined" :tree-data="projects" :allow-clear="true" :disabled="loading" placeholder="全部有权项目" @update:value="changeProject" /></div>
    <OwnerHome v-if="view==='list'&&side==='owner'" :houses="houses" :selected-id="householdId" :loading="loading" :failed="!!error" :rows="rows" :page="page" :total="total" @apply="navigate('create')" @refresh="refresh" @open="id=>navigate('workflow',id)" @page="changePage" />
    <StaffHome v-else-if="view==='list'" :tasks="taskRows" :tab="staffTab" :loading="loading" :total="total" :page="page" @tab="changeTab" @page="changePage" @open="task=>navigate('detail',task.decorationId,'overview',task.id)" />
    <OwnerRecords v-else-if="view==='history'||view==='notifications'" :rows="rows" :notifications="view==='notifications'" :loading="loading" :failed="!!error" :page="page" :total="total" @open="id=>navigate('workflow',id)" @page="changePage" />
    <OwnerWorkflow v-else-if="view==='workflow'&&current" :current="current" :rectification-count="rectificationCount" :loading="loading" @step="openStep" @rectification="navigate('detail',current.id,'rectification')" />
    <a-spin v-else-if="view==='workflow'" :spinning="loading" />
    <OwnerApplicationForm v-else-if="view==='create'&&side==='owner'&&household" :key="contextKey+householdId" ref="form" :api="api" :household="household" @submitted="created" />
    <OwnerApplicationDetail v-else-if="view==='detail'&&side==='owner'" :key="contextKey+detailId" ref="detail" :id="detailId" :api="api" :step="detailStep" @changed="applicationChanged" @restart="navigate('list')" />
    <StaffTaskDetail v-else-if="view==='detail'" :key="contextKey+taskId" ref="detail" :api="api" :id="detailId" :task-id="taskId" :permissions="permissions" @changed="load" />
   </template>
  </div>
  <nav v-if="ownerRoot&&!invalid" class="owner-bottom-nav" :aria-label="$t('Mobile.ownerNavigation')">
   <a-button type="text" :class="{active:ownerTab==='list'}" :aria-current="ownerTab==='list'?'page':undefined" @click="view!=='list'&&navigate('list')"><FileAddOutlined /><span>{{$t('Mobile.houseApplications')}}</span></a-button>
   <a-button type="text" :class="{active:ownerTab==='history'}" :aria-current="ownerTab==='history'?'page':undefined" @click="view!=='history'&&navigate('history')"><FileTextOutlined /><span>{{$t('Mobile.decorationRecords')}}</span></a-button>
   <a-button type="text" :class="{active:ownerTab==='notifications'}" :aria-current="ownerTab==='notifications'?'page':undefined" @click="view!=='notifications'&&navigate('notifications')"><BellOutlined /><span>{{$t('Mobile.decorationNotifications')}}</span></a-button>
  </nav>
 </main></a-config-provider>
</template>
