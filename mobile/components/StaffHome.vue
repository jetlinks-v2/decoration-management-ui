<script setup lang="ts">
import staffScene from '../assets/staff-scene.svg'
import {RightOutlined,EnvironmentOutlined,ClockCircleOutlined} from '@ant-design/icons-vue'
import type {Task} from '../../types/decoration'
import {taskNames,taskStates,dateText,type StaffTab} from '../model'
defineProps<{tasks:Task[];tab:StaffTab;loading:boolean;total:number;page:number}>()
const emit=defineEmits<{tab:[StaffTab];open:[Task];page:[number]}>()
</script>
<template>
 <section class="decoration-hero decoration-hero--staff"><div><span class="hero-eyebrow">{{$t('Mobile.staffSide')}}</span><h2>{{$t('Mobile.staffHeroTitle')}}</h2><p>{{$t('Mobile.staffHeroHint')}}</p></div><img :src="staffScene" alt="" width="320" height="240" /></section>
 <div class="staff-tabs" role="tablist"><a-button v-for="item in [{key:'inspection',name:'巡检任务'},{key:'acceptance',name:'验收任务'},{key:'history',name:'历史记录'}]" :key="item.key" role="tab" :aria-selected="tab===item.key" :class="{selected:tab===item.key}" @click="emit('tab',item.key as StaffTab)">{{item.name}}</a-button></div>
 <div class="mobile-section-heading"><h2>{{tab==='history'?'我的办理记录':'我的待办'}}</h2><span class="muted">{{total}} 项</span></div>
 <a-spin :spinning="loading"><a-empty v-if="!tasks.length&&!loading" :description="tab==='history'?'暂无办理记录':'当前没有待办任务'" />
  <article v-for="task in tasks" :key="task.id" class="mobile-surface staff-task" role="button" tabindex="0" @click="emit('open',task)" @keydown.enter="emit('open',task)">
   <div class="staff-task-head"><span class="task-kind">{{task.status==='waiting_review'?'整改复核':taskNames[task.kind]}}</span><span class="status-pill" :class="{warning:task.status==='pending'||task.status==='waiting_review'}">{{taskStates[task.status]||task.status}}</span></div>
   <h3>{{task.spaceName||'房屋信息待完善'}}</h3><p><EnvironmentOutlined /> {{task.projectName||'—'}} · {{task.ownerName||'—'}}</p><p><ClockCircleOutlined /> {{task.kind==='daily'?task.details.scheduledDate||dateText(task.createTime):dateText(task.acceptanceDate||task.modifyTime)}}</p>
   <div class="staff-task-footer"><span>{{task.assigneeName||task.details.inspectionRoles?.map(r=>r.roleName).join('、')||'角色任务'}}</span><span class="primary-text">{{tab==='history'?'查看记录':'去办理'}} <RightOutlined /></span></div>
  </article>
 </a-spin>
 <a-pagination v-if="total>10" :current="page" :total="total" :page-size="10" simple @change="emit('page',$event)" />
</template>
