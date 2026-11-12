<script setup lang="ts">
import {BellOutlined,FileTextOutlined,HomeOutlined,RightOutlined,ClockCircleOutlined} from '@ant-design/icons-vue'
import type {OwnerApplicationSummary} from '../../types/decoration'
import {workflowStatus} from '../../utils/decoration'
import {dateText} from '../model'
defineProps<{rows:OwnerApplicationSummary[];notifications:boolean;loading:boolean;failed:boolean;page:number;total:number;ongoing?:boolean;occupied?:boolean}>()
const emit=defineEmits<{open:[id:string];page:[value:number]}>()
</script>
<template>
 <div v-if="ongoing" class="mobile-section-heading"><h2>{{$t('Mobile.processingApplications')}}</h2></div>
 <section v-else class="owner-list-intro"><span class="owner-list-icon"><BellOutlined v-if="notifications" /><FileTextOutlined v-else /></span><div><h2>{{$t(notifications?'Mobile.decorationNotifications':'Mobile.decorationRecords')}}</h2><p>{{$t(notifications?'Mobile.notificationsHint':'Mobile.recordsEntryDescription')}}</p></div></section>
 <a-spin :spinning="loading">
  <a-empty v-if="!rows.length&&!loading&&!failed" :description="$t(ongoing?occupied?'Mobile.processingApplicationUnavailable':'Mobile.noProcessingApplications':notifications?'Mobile.noDecorationNotifications':'Mobile.noDecorationRecords')" />
  <section v-for="row in rows" :key="row.id" class="mobile-surface owner-record owner-record--clickable" :class="{'owner-notice':notifications}" role="button" :tabindex="loading?-1:0" :aria-disabled="loading" :aria-label="`${row.number}，${$t('Mobile.openApplication')}`" @click="!loading&&emit('open',row.id)" @keydown.enter.self.prevent="!loading&&emit('open',row.id)" @keydown.space.self.prevent="!loading&&emit('open',row.id)">
   <div class="staff-task-head"><span class="owner-record-type"><BellOutlined v-if="notifications" /><FileTextOutlined v-else />{{$t(notifications?'Mobile.applicationUpdate':row.decorationType==='first'?'Mobile.firstDecoration':'Mobile.secondDecoration')}}</span><span class="status-pill" :class="{warning:row.status==='rejected'||row.status.includes('failed')}">{{$t(`Decoration.states.${workflowStatus(row)}`)}}</span></div>
   <h3><HomeOutlined />{{row.spaceName}}</h3>
   <p v-if="notifications" class="owner-notice-description">{{$t(`Mobile.applicationUpdate_${row.status==='finished'&&row.refundStatus!==2?'unfinishedRefund':row.status}`)}}</p>
   <p class="owner-record-number">{{$t('Mobile.applicationNumber')}}：{{row.number}}</p>
   <div class="owner-record-footer"><span><ClockCircleOutlined />{{$t('Mobile.applicationDate')}} {{dateText(row.createTime)}}</span><a-button type="link" :disabled="loading" @click.stop="emit('open',row.id)">{{$t(ongoing?'Mobile.continueApplication':notifications?'Mobile.viewProgress':'Mobile.viewDetail')}}<RightOutlined /></a-button></div>
  </section>
  <a-pagination v-if="total>10" :current="page" :total="total" :page-size="10" simple :disabled="loading" @change="value=>emit('page',value)" />
 </a-spin>
</template>
