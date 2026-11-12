<script setup lang="ts">
import {FileTextOutlined,HomeOutlined,RightOutlined,ClockCircleOutlined} from '@ant-design/icons-vue'
import type {OwnerApplicationSummary} from '../../types/decoration'
import {workflowStatus} from '../../utils/decoration'
import {dateText} from '../model'
defineProps<{rows:OwnerApplicationSummary[];loading:boolean;failed:boolean;page:number;total:number;ongoing?:boolean;occupied?:boolean}>()
const emit=defineEmits<{open:[id:string];page:[value:number]}>()
</script>
<template>
 <div v-if="ongoing" class="mobile-section-heading"><h2>{{$t('Mobile.processingApplications')}}</h2></div>
 <section v-else class="owner-list-intro"><span class="owner-list-icon"><FileTextOutlined /></span><div><h2>{{$t('Mobile.decorationRecords')}}</h2><p>{{$t('Mobile.recordsEntryDescription')}}</p></div></section>
 <a-spin :spinning="loading">
  <a-empty v-if="!rows.length&&!loading&&!failed" :description="$t(ongoing?occupied?'Mobile.processingApplicationUnavailable':'Mobile.noProcessingApplications':'Mobile.noDecorationRecords')" />
  <section v-for="row in rows" :key="row.id" class="mobile-surface owner-record owner-record--clickable" role="button" :tabindex="loading?-1:0" :aria-disabled="loading" :aria-label="`${row.number}，${$t('Mobile.openApplication')}`" @click="!loading&&emit('open',row.id)" @keydown.enter.self.prevent="!loading&&emit('open',row.id)" @keydown.space.self.prevent="!loading&&emit('open',row.id)">
   <div class="staff-task-head"><span class="owner-record-type"><FileTextOutlined />{{$t(row.decorationType==='first'?'Mobile.firstDecoration':'Mobile.secondDecoration')}}</span><span class="status-pill" :class="{warning:row.status==='rejected'||row.status.includes('failed')}">{{$t(`Decoration.states.${workflowStatus(row)}`)}}</span></div>
   <h3><HomeOutlined />{{row.spaceName}}</h3>
   <p class="owner-record-number">{{$t('Mobile.applicationNumber')}}：{{row.number}}</p>
   <div class="owner-record-footer"><span><ClockCircleOutlined />{{$t('Mobile.applicationDate')}} {{dateText(row.createTime)}}</span><a-button type="link" :disabled="loading" @click.stop="emit('open',row.id)">{{$t(ongoing?'Mobile.continueApplication':'Mobile.viewDetail')}}<RightOutlined /></a-button></div>
  </section>
  <a-pagination v-if="total>10" :current="page" :total="total" :page-size="10" simple :disabled="loading" @change="value=>emit('page',value)" />
 </a-spin>
</template>
