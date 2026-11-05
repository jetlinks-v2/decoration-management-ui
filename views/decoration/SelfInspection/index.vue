<script setup lang="ts">
import FilterBar from '../../../components/decoration/FilterBar.vue'
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import ConditionFilter from '@jetlinks-web-core/components/ConditionFilter'
import {useSelfInspections} from '../../../hooks/decoration/useSelfInspections'
import FilePicker from '../../../components/decoration/FilePicker.vue'
import type {SelfInspection} from '../../../types/decoration'
import '../../../components/decoration/decoration.css'
const {t}=useI18n()
const {api,projectId,tree,terms,rows,total,page,loading,saving,error,detail,detailOpen,detailLoading,detailError,canDelete,load,loadProjects,openDetail,closeDetail,changeProject,changeFilters,changePage,remove}=useSelfInspections()
const columns=computed(()=>[
  {title:t('Decoration.selfInspection.number'),dataIndex:'number',width:230},
  {title:t('Decoration.selfInspection.project'),dataIndex:'projectName',width:180},
  {title:t('Decoration.selfInspection.space'),dataIndex:'spaceName',width:200},
  {title:t('Decoration.selfInspection.submitted'),dataIndex:'createTime',width:200},
  {title:t('Decoration.selfInspection.creator'),dataIndex:'creatorName',width:140},
  {title:t('Decoration.selfInspection.actions'),key:'actions',width:140}
])
const fields=computed(()=>[
  {title:t('Decoration.selfInspection.project'),dataIndex:'projectName',search:{type:'string'}},
  {title:t('Decoration.selfInspection.space'),dataIndex:'spaceName',search:{type:'string'}},
  {title:t('Decoration.selfInspection.submitted'),dataIndex:'createTime',search:{type:'date'}}
])
const date=(value:number)=>new Date(value).toLocaleString()
const view=(row:SelfInspection)=>openDetail(row.id)
</script>
<template>
  <section class="decoration-workspace">
    <div class="decoration-toolbar"><h2>{{t('Decoration.selfInspection.title')}}</h2></div>
    <FilterBar :project-id="projectId||undefined" :tree-data="tree" :disabled="saving" :loading="loading" @project-change="changeProject" @refresh="load">
      <ConditionFilter v-model="terms" :fields="fields" @change="changeFilters" />
    </FilterBar>
    <a-alert v-if="error" type="error" :message="error" show-icon><template #action><a-button @click="()=>{load();loadProjects()}">{{t('Decoration.selfInspection.retry')}}</a-button></template></a-alert>
    <a-table row-key="id" :columns="columns" :data-source="rows" :loading="loading" :pagination="false" :scroll="{x:1090}">
      <template #bodyCell="{column,record}">
        <template v-if="column.dataIndex==='number'"><a-button type="link" @click="view(record as SelfInspection)">{{record.number}}</a-button></template>
        <template v-else-if="column.dataIndex==='createTime'">{{date(record.createTime)}}</template>
        <template v-else-if="column.key==='actions'">
          <a-button type="link" @click="view(record as SelfInspection)">{{t('Decoration.selfInspection.view')}}</a-button>
          <a-popconfirm v-if="canDelete" :title="t('Decoration.selfInspection.deleteConfirm')" :ok-button-props="{loading:saving}" @confirm="remove(record as SelfInspection)"><a-button type="link" danger :disabled="saving">{{t('Decoration.selfInspection.delete')}}</a-button></a-popconfirm>
        </template>
      </template>
      <template #emptyText><a-empty :description="t('Decoration.selfInspection.empty')" /></template>
    </a-table>
    <a-pagination :current="page" :page-size="20" :total="total" :show-size-changer="false" :disabled="loading||saving" @change="changePage" />
    <a-drawer :open="detailOpen" :title="t('Decoration.selfInspection.detail')" width="min(720px,100vw)" :destroy-on-close="true" @close="closeDetail">
      <a-spin :spinning="detailLoading">
        <a-alert v-if="detailError" type="error" :message="detailError" show-icon />
        <template v-if="detail">
          <a-descriptions bordered :column="1">
            <a-descriptions-item :label="t('Decoration.selfInspection.number')">{{detail.number}}</a-descriptions-item>
            <a-descriptions-item :label="t('Decoration.selfInspection.project')">{{detail.projectName}}</a-descriptions-item>
            <a-descriptions-item :label="t('Decoration.selfInspection.space')">{{detail.spaceName}}</a-descriptions-item>
            <a-descriptions-item :label="t('Decoration.selfInspection.submitted')">{{date(detail.createTime)}}</a-descriptions-item>
            <a-descriptions-item :label="t('Decoration.selfInspection.creator')">{{detail.creatorName}}</a-descriptions-item>
            <a-descriptions-item :label="t('Decoration.selfInspection.status')">{{t(`Decoration.selfInspection.${detail.status===1?'hasIssue':'noIssue'}`)}}</a-descriptions-item>
            <a-descriptions-item :label="t('Decoration.selfInspection.remark')"><div class="decoration-agreement">{{detail.remark||'—'}}</div></a-descriptions-item>
          </a-descriptions>
          <a-divider>{{t('Decoration.selfInspection.files')}}</a-divider>
          <FilePicker v-if="detail.fileIds.length" :value="detail.fileIds" :api="api" :project-id="detail.projectId" :decoration-id="detail.decorationId" readonly />
          <a-empty v-else :description="t('Decoration.selfInspection.noFiles')" />
        </template>
      </a-spin>
    </a-drawer>
  </section>
</template>
