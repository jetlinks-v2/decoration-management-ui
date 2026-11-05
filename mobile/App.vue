<script setup lang="ts">
import ProjectTreeSelect from '../components/decoration/ProjectTreeSelect.vue'
import {ref} from 'vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import {useI18n} from 'vue-i18n'
import {useMobileDecoration} from './useMobileDecoration'
import ApplicationForm from '../components/decoration/ApplicationForm.vue'
import ApplicationDetail from '../components/decoration/ApplicationDetail.vue'
import {mobileSide} from '../utils/mobileEntry'
const side=mobileSide(location.search)
const form=ref<{dirty:boolean;saving:boolean;uncertain:boolean}>(),detail=ref<{dirty:boolean;saving:boolean;uncertain:boolean}>()
const {t}=useI18n()
function canLeave(){if(form.value?.saving||form.value?.uncertain||detail.value?.saving||detail.value?.uncertain)return false;return !(form.value?.dirty||detail.value?.dirty)||window.confirm(t('Decoration.unsaved'))}
const {api,permissions,projectId,projects,rows,page,total,loading,error,invalid,view,detailId,contextKey,load,start,navigate,back,changeProject,created,changePage}=useMobileDecoration(canLeave,side)
</script>
<template>
 <a-config-provider :locale="zhCN"><main class="decoration-mobile">
  <header><a-button type="text" @click="back">返回</a-button><h1>{{t(`Decoration.mobileEntry.${side}Title`)}}</h1><a-button v-if="!invalid" type="text" @click="load">刷新</a-button></header>
  <a-alert v-if="error" :message="error" type="error" show-icon><template #action><a-button v-if="!invalid" @click="start">重试</a-button></template></a-alert>
  <template v-if="!invalid">
   <ProjectTreeSelect :value="projectId||undefined" :tree-data="projects" placeholder="全部有权项目" style="width:100%;margin-bottom:16px" @update:value="changeProject" />
   <section v-if="view==='list'">
    <div class="decoration-toolbar"><h2>{{side==='owner'?'我的装修申请':'装修申请与办理'}}</h2><a-button v-if="side==='owner'" type="primary" @click="navigate('create')">申请装修</a-button></div>
    <a-spin :spinning="loading"><a-empty v-if="!rows.length&&!loading" description="暂无装修申请" />
     <a-card v-for="row in rows" :key="row.id" class="mobile-record" @click="navigate('detail',row.id)"><a-tag color="blue">{{t(`Decoration.states.${row.status}`)}}</a-tag><h3>{{row.spaceName}}</h3><p>{{row.projectName}} · {{row.number}}</p><p>{{new Date(row.createTime).toLocaleString()}}</p><a-button type="link">查看申请与办理进度</a-button></a-card>
    </a-spin>
    <a-pagination v-if="total>10" :current="page" :total="total" :page-size="10" simple @change="changePage" />
   </section>
   <ApplicationForm v-else-if="view==='create'&&side==='owner'" :key="contextKey" ref="form" :api="api" :project-id="projectId" :projects="projects" @submitted="created" />
   <ApplicationDetail v-else :key="contextKey+detailId" ref="detail" :id="detailId" :api="api" :permissions="permissions" @changed="load" />
  </template>
 </main></a-config-provider>
</template>
