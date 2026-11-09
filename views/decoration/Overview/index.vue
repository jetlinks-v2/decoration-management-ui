<script setup lang="ts">
import FilterBar from '../../../components/decoration/FilterBar.vue'
import {useI18n} from 'vue-i18n'
import {computed} from 'vue'
import {useOverview} from '../../../hooks/decoration/useOverview'
import {useDictionaries} from '../../../hooks/useDecorationDictionaries'
import OverviewDistribution from '../../../components/decoration/OverviewDistribution.vue'
import '../../../components/decoration/decoration.css'
const {t}=useI18n(),{projectId,tree,report,error,loading,load,changeProject}=useOverview()
const dictionary=useDictionaries()
const cards=computed(()=>report.value?[
 {name:'total',value:report.value.summary.totalHouseCount,rate:report.value.summary.totalHouseCountRate},
 {name:'decorating',value:report.value.summary.inDecorationHouseCount,rate:report.value.summary.inDecorationHouseCountRate}
]:[])
const processItems=computed(()=>report.value?.funnel.map(item=>({...item,name:t(`Decoration.overview.process.${item.name}`)}))||[])
const houseItems=computed(()=>report.value?.houseTypePie.map(item=>({...item,name:item.name?dictionary.text('house-type',item.name):t('Decoration.overview.unknown')}))||[])
const rate=(value:number)=>`${value>=0?'+':''}${value.toFixed(1)}%`
</script>
<template>
 <section class="decoration-workspace">
  <div class="decoration-toolbar"><h2>{{t('Decoration.overview.title')}}</h2></div>
  <FilterBar :project-id="projectId||undefined" :tree-data="tree" :loading="loading" @project-change="changeProject" @refresh="load" />
  <a-alert v-if="error" type="error" :message="error" show-icon><template #action><a-button @click="load">{{t('Decoration.selfInspection.retry')}}</a-button></template></a-alert>
  <a-alert v-if="dictionary.failed.value" type="error" :message="t('Decoration.overview.dictionaryFailed')"><template #action><a-button @click="dictionary.reload">{{t('Decoration.selfInspection.retry')}}</a-button></template></a-alert>
  <a-spin :spinning="loading">
   <template v-if="report">
    <div class="overview-grid overview-summary"><a-card v-for="card in cards" :key="card.name" :title="t(`Decoration.overview.${card.name}`)"><a-statistic :value="card.value" :suffix="t('Decoration.overview.houseUnit')" /><p>{{t('Decoration.overview.monthOverMonth')}} {{rate(card.rate)}}</p></a-card></div>
    <div class="overview-grid"><OverviewDistribution :title="t('Decoration.overview.processTitle')" :items="processItems" /><OverviewDistribution :title="t('Decoration.overview.houseTypeTitle')" :items="houseItems" /></div>
   </template>
  </a-spin>
 </section>
</template>
<style scoped>
.overview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:20px}
.overview-summary p{margin:12px 0 0;color:var(--ant-text-color-secondary,#666)}
@media(max-width:900px){.overview-grid{grid-template-columns:1fr}}
</style>
