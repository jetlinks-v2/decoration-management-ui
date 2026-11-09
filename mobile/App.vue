<script setup lang="ts">
import {computed,ref} from 'vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import {LeftOutlined,ReloadOutlined,HomeOutlined,LogoutOutlined} from '@ant-design/icons-vue'
import ProjectTreeSelect from '../components/decoration/ProjectTreeSelect.vue'
import OwnerHome from './components/OwnerHome.vue'
import StaffHome from './components/StaffHome.vue'
import OwnerApplicationForm from './components/OwnerApplicationForm.vue'
import OwnerApplicationDetail from './components/OwnerApplicationDetail.vue'
import StaffTaskDetail from './components/StaffTaskDetail.vue'
import {useMobileDecoration} from './useMobileDecoration'
import {useDiscardConfirm} from '../hooks/decoration/useDiscardConfirm'
import {mobileSide} from '../utils/mobileEntry'
import {dateText,ownerSteps,type OwnerStep} from './model'
const props=defineProps<{standalone?:boolean;loggingOut?:boolean}>()
const emit=defineEmits<{logout:[]}>()
const side=mobileSide(location.search)
type Editor={dirty:boolean;saving:boolean;uncertain:boolean;reload?:()=>Promise<void>}
const form=ref<Editor>(),detail=ref<Editor>()
const confirmDiscard=useDiscardConfirm(()=> '当前有尚未提交的内容，确定离开吗？')
const blocked=()=>!!(form.value?.saving||form.value?.uncertain||detail.value?.saving||detail.value?.uncertain)
const dirty=()=>!!(form.value?.dirty||detail.value?.dirty)
async function canLeave(){if(blocked())return false;return !dirty()||await confirmDiscard()&&!blocked()}
const {api,permissions,projectId,projects,households,householdId,household,current,rectificationCount,rows,taskRows,staffTab,page,total,loading,error,invalid,view,detailId,taskId,detailStep,contextKey,load,start,navigate,back,changeProject,changeHouse,changeTab,created,changePage}=useMobileDecoration(canLeave,side,()=>blocked()||dirty())
const title=computed(()=>view.value==='create'?'装修申请':view.value==='history'?'装修记录':view.value==='detail'?side==='staff'?'任务办理':detailStep.value==='rectification'?'巡检整改':ownerSteps().find(s=>s.key===detailStep.value)?.title||'装修详情':side==='owner'?'装修申请':'装修工作台')
function openStep(step:OwnerStep){if(!current.value&&step==='apply')navigate('create');else if(current.value)navigate('detail',current.value.id,step)}
async function signOut(){if(!props.loggingOut&&await canLeave())emit('logout')}
async function refresh(){if(await canLeave()){if(view.value==='detail')void detail.value?.reload?.();else void load()}}
</script>
<template>
 <a-config-provider :locale="zhCN"><main class="decoration-mobile" :class="`mobile-${side}`">
  <header class="mobile-header"><a-button type="text" aria-label="返回" @click="back"><LeftOutlined /></a-button><h1>{{title}}</h1><a-button v-if="!invalid&&view!=='create'" type="text" aria-label="刷新" @click="refresh"><ReloadOutlined /></a-button><span v-else class="header-spacer" /></header>
  <div class="mobile-content">
   <div v-if="standalone" class="mobile-account"><span>{{side==='staff'?'员工端':'业主端'}}</span><a-button type="text" size="small" :loading="loggingOut" @click="signOut"><LogoutOutlined />退出登录</a-button></div>
   <a-alert v-if="error" type="error" :message="error" show-icon><template #action><a-button v-if="!invalid" @click="start">重试</a-button></template></a-alert>
   <template v-if="!invalid">
    <div v-if="view==='list'" class="mobile-project"><HomeOutlined /><ProjectTreeSelect :value="projectId||undefined" :tree-data="projects" :allow-clear="side==='staff'" :disabled="loading" :placeholder="side==='owner'?'请选择项目':'全部有权项目'" @update:value="changeProject" /></div>
    <OwnerHome v-if="view==='list'&&side==='owner'" :households="households" :household="household" :current="current" :rectification-count="rectificationCount" :loading="loading" :failed="!!error" @house="changeHouse" @step="openStep" @history="navigate('history')" @rectification="current&&navigate('detail',current.id,'rectification')" />
    <StaffHome v-else-if="view==='list'" :tasks="taskRows" :tab="staffTab" :loading="loading" :total="total" :page="page" @tab="changeTab" @page="changePage" @open="task=>navigate('detail',task.decorationId,'overview',task.id)" />
    <template v-else-if="view==='history'"><p class="mobile-explanation">{{household?.spaceName}} 的装修申请记录</p><a-empty v-if="!rows.length&&!loading" description="暂无装修记录" /><article v-for="row in rows" :key="row.id" class="mobile-surface history-record" role="button" tabindex="0" @click="navigate('detail',row.id,'overview')" @keydown.enter="navigate('detail',row.id,'overview')"><div class="staff-task-head"><h2>{{row.spaceName}}</h2><span class="status-pill">{{$t(`Decoration.states.${row.status}`)}}</span></div><p>申请编号：{{row.number}}</p><p>申请时间：{{dateText(row.createTime)}}</p><p>装修类型：{{row.details.decorationType==='first'?'首次装修':'二次装修'}}</p><p v-if="row.actualEndTime">结束时间：{{dateText(row.actualEndTime)}}</p><a-button type="link">查看申请与办理记录</a-button></article><a-pagination v-if="total>10" :current="page" :total="total" :page-size="10" simple @change="changePage" /></template>
    <OwnerApplicationForm v-else-if="view==='create'&&side==='owner'&&household" :key="contextKey+householdId" ref="form" :api="api" :household="household" @submitted="created" />
    <OwnerApplicationDetail v-else-if="view==='detail'&&side==='owner'" :key="contextKey+detailId" ref="detail" :id="detailId" :api="api" :step="detailStep" @changed="load" @restart="navigate('create')" />
    <StaffTaskDetail v-else-if="view==='detail'" :key="contextKey+taskId" ref="detail" :api="api" :id="detailId" :task-id="taskId" :permissions="permissions" @changed="load" />
   </template>
  </div>
 </main></a-config-provider>
</template>
