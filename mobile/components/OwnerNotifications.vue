<script setup lang="ts">
import {BellOutlined,HomeOutlined,RightOutlined,ClockCircleOutlined} from '@ant-design/icons-vue'
import type {DecorationNotice} from '../../types/decoration'
import {dateText} from '../model'
defineProps<{rows:DecorationNotice[];loading:boolean;failed:boolean;page:number;total:number}>()
const emit=defineEmits<{open:[notice:DecorationNotice];page:[value:number]}>()
</script>
<template>
 <section class="owner-list-intro"><span class="owner-list-icon"><BellOutlined /></span><div><h2>{{$t('Mobile.decorationNotifications')}}</h2><p>{{$t('Mobile.notificationsHint')}}</p></div></section>
 <a-spin :spinning="loading">
  <a-empty v-if="!rows.length&&!loading&&!failed" :description="$t('Mobile.noDecorationNotifications')" />
  <section v-for="notice in rows" :key="notice.id" class="mobile-surface owner-record owner-notice owner-record--clickable" role="button" :tabindex="loading?-1:0" :aria-disabled="loading" :aria-label="`${notice.message}，${$t('Mobile.viewDetail')}`" @click="!loading&&emit('open',notice)" @keydown.enter.self.prevent="!loading&&emit('open',notice)" @keydown.space.self.prevent="!loading&&emit('open',notice)">
   <div class="staff-task-head"><span class="owner-record-type"><BellOutlined />{{notice.title}}</span></div>
   <h3><HomeOutlined />{{notice.spaceName}}</h3><p class="owner-notice-description">{{notice.message}}</p>
   <p class="owner-record-number">{{$t('Mobile.applicationNumber')}}：{{notice.number}}</p>
   <div class="owner-record-footer"><span><ClockCircleOutlined />{{dateText(notice.createTime)}}</span><a-button type="link" :disabled="loading" @click.stop="emit('open',notice)">{{$t('Mobile.viewDetail')}}<RightOutlined /></a-button></div>
  </section>
  <a-pagination v-if="total>10" :current="page" :total="total" :page-size="10" simple :disabled="loading" @change="value=>emit('page',value)" />
 </a-spin>
</template>
