<script setup lang="ts">
import {computed} from 'vue'
import {useI18n} from 'vue-i18n'
import {PieChart} from 'echarts/charts'
import {TooltipComponent} from 'echarts/components'
import Echarts from '@jetlinks-web-core/components/Echarts/Echarts.vue'
import type {OverviewItem} from '../../types/decoration'
const props=defineProps<{title:string;items:OverviewItem[]}>()
const {t}=useI18n(),library=[PieChart,TooltipComponent]
const total=computed(()=>props.items.reduce((sum,item)=>sum+item.value,0))
const option=computed(()=>({
  tooltip:{trigger:'item',renderMode:'richText',formatter:'{b}: {c} ({d}%)'},
  series:[{type:'pie',radius:['50%','75%'],label:{show:false},data:props.items}]
}))
const percent=(value:number)=>total.value?`${(value*100/total.value).toFixed(1)}%`:'0.0%'
</script>
<template>
  <a-card :title="title">
    <div v-if="total" class="overview-distribution">
      <div class="overview-chart" role="img" :aria-label="title"><Echarts :option="option" :library="library" /></div>
      <ul class="overview-legend"><li v-for="item in items" :key="item.name"><span>{{item.name}}</span><strong>{{item.value}}</strong><span>{{percent(item.value)}}</span></li></ul>
    </div>
    <a-empty v-else class="overview-empty" :description="t('Decoration.overview.noDistribution')" />
  </a-card>
</template>
<style scoped>
.overview-distribution{display:grid;grid-template-columns:minmax(160px,1fr) minmax(150px,1fr);align-items:center;gap:12px;min-height:280px}
.overview-chart{height:280px;min-width:0}
.overview-legend{list-style:none;margin:0;padding:0;display:grid;gap:18px}
.overview-legend li{display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center}
.overview-empty{min-height:280px;display:flex;flex-direction:column;justify-content:center}
@media(max-width:600px){.overview-distribution{grid-template-columns:1fr}}
</style>
