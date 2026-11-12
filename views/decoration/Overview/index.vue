<script setup lang="ts">
import {useI18n} from 'vue-i18n'
import {HomeOutlined,ToolOutlined,FileAddOutlined,CheckCircleOutlined,ArrowRightOutlined,ClockCircleOutlined,FileTextOutlined} from '@ant-design/icons-vue'
import {LineChart,BarChart} from 'echarts/charts'
import {GridComponent,TooltipComponent,LegendComponent,AriaComponent} from 'echarts/components'
import {CanvasRenderer} from 'echarts/renderers'
import Echarts from '@jetlinks-web-core/components/Echarts/Echarts.vue'
import FilterBar from '../../../components/decoration/FilterBar.vue'
import {useOverview} from '../../../hooks/decoration/useOverview'
import {useOverviewCharts} from '../../../hooks/decoration/useOverviewCharts'
import {overviewStages,overviewInspection,overviewRisks} from '../../../utils/overviewCharts'
const {t}=useI18n()
const {projectId,tree,report,error,loading,load,changeProject,canOpenReview,openReview}=useOverview()
const {months,chartError,options,summary,trendAvailable,stageHasData,inspectionHasData,label,count,open,stageEvents,inspectionEvents,onChartError}=useOverviewCharts(report,openReview,t)
const summaryIcons=[HomeOutlined,ToolOutlined,FileAddOutlined,CheckCircleOutlined]
// 有数据时使用 ECharts Canvas 渲染；空数据由页面空状态承载，避免绘制空容器。
const library=[LineChart,BarChart,GridComponent,TooltipComponent,LegendComponent,AriaComponent,CanvasRenderer]
const date=(time:number)=>new Date(time).toLocaleString()
</script>
<template>
 <section class="overview-page">
  <header class="overview-header">
   <div><h2>{{t('Decoration.overview.title')}}</h2><p>{{report?`${t('Decoration.overview.updated')} ${date(report.asOf)}`:t('Decoration.overview.subtitle')}}</p></div>
   <FilterBar class="overview-filters" :project-id="projectId||undefined" :tree-data="tree" :loading="loading" @project-change="changeProject" @refresh="load" />
  </header>
  <a-alert v-if="error||chartError" type="error" :message="error||t('Decoration.overview.chartFailed')" show-icon><template #action><a-button @click="load">{{t('Decoration.selfInspection.retry')}}</a-button></template></a-alert>
  <a-spin :spinning="loading">
   <template v-if="report&&options">
    <div class="overview-summary">
     <a-card v-for="(metric,index) in summary" :key="metric.key" :bordered="false" class="summary-card" :class="{'summary-active':metric.key==='decorating'}">
      <div class="summary-heading"><a-tooltip :title="t(`Decoration.overview.metrics.${metric.key}.hint`)"><span>{{label(metric.key)}}</span></a-tooltip><span class="summary-icon"><component :is="summaryIcons[index]" /></span></div>
      <div class="summary-value">{{metric.value.toLocaleString()}}<span>{{t(`Decoration.overview.${['totalHouses','decorating'].includes(metric.key)?'houseUnit':'applicationUnit'}`)}}</span></div>
     </a-card>
    </div>
    <div class="overview-grid">
     <a-card :bordered="false" class="overview-section">
      <div class="section-heading"><div><h3>{{t('Decoration.overview.trendTitle')}}</h3><p>{{t('Decoration.overview.trendSubtitle')}}</p></div><a-radio-group v-model:value="months" size="small" button-style="solid"><a-radio-button :value="6">{{t('Decoration.overview.sixMonths')}}</a-radio-button><a-radio-button :value="12">{{t('Decoration.overview.oneYear')}}</a-radio-button></a-radio-group></div>
      <div v-if="trendAvailable" class="decoration-overview-chart trend-chart"><Echarts :option="options.trend" :library="library" renderer="canvas" @error="onChartError" /></div>
      <a-empty v-else class="chart-unavailable" :description="t('Decoration.overview.trendUnavailable')" />
     </a-card>
     <a-card :bordered="false" class="overview-section">
      <div class="section-heading"><div><h3>{{t('Decoration.overview.stageTitle')}}</h3><p>{{t('Decoration.overview.stageSubtitle')}}</p></div><a-button v-if="canOpenReview" type="link" @click="openReview()">{{t('Decoration.overview.goReview')}}<ArrowRightOutlined /></a-button></div>
      <div v-if="stageHasData" class="decoration-overview-chart stage-chart"><Echarts :option="options.stages" :library="library" renderer="canvas" :events="stageEvents" @error="onChartError" /></div>
      <a-empty v-else class="chart-empty" :description="t('Decoration.overview.chartEmpty')" />
      <div v-if="canOpenReview" class="chart-accessible"><button v-for="key in overviewStages" :key="key" @click="open(key)">{{label(key)}} {{count(key)}} · {{t('Decoration.overview.goReview')}}</button></div>
     </a-card>
     <a-card :bordered="false" class="overview-section">
      <div class="section-heading"><div><h3>{{t('Decoration.overview.inspectionTitle')}}</h3><p>{{t('Decoration.overview.inspectionSubtitle')}}</p></div><a-button v-if="canOpenReview" type="link" @click="openReview()">{{t('Decoration.overview.goReview')}}<ArrowRightOutlined /></a-button></div>
      <div v-if="inspectionHasData" class="decoration-overview-chart inspection-chart"><Echarts :option="options.inspection" :library="library" renderer="canvas" :events="inspectionEvents" @error="onChartError" /></div>
      <a-empty v-else class="chart-empty" :description="t('Decoration.overview.chartEmpty')" />
      <div v-if="canOpenReview" class="chart-accessible"><button v-for="key in overviewInspection" :key="key" @click="open(key)">{{label(key)}} {{count(key)}} · {{t('Decoration.overview.goReview')}}</button></div>
     </a-card>
     <a-card :bordered="false" class="overview-section risk-section">
      <div class="section-heading"><div><h3>{{t('Decoration.overview.riskTitle')}}</h3><p>{{t('Decoration.overview.riskSubtitle')}}</p></div></div>
      <div class="risk-items">
       <a-tooltip v-for="key in overviewRisks" :key="key" :title="t(`Decoration.overview.metrics.${key}.hint`)">
        <button class="risk-item" :class="`risk-${key}`" :disabled="!canOpenReview" @click="open(key)" :aria-label="t('Decoration.overview.goStatus',{name:label(key)})">
         <span class="risk-icon"><FileTextOutlined v-if="key==='renewal'" /><ClockCircleOutlined v-else /></span><span class="risk-copy"><span>{{label(key)}}</span><small>{{t(`Decoration.overview.riskHints.${key}`)}}</small></span><strong>{{count(key)}}<small>{{t('Decoration.overview.applicationUnit')}}</small></strong><ArrowRightOutlined v-if="canOpenReview" class="risk-arrow" />
        </button>
       </a-tooltip>
      </div>
     </a-card>
    </div>
   </template>
  </a-spin>
 </section>
</template>
<style scoped>
.overview-page{height:100%;overflow:auto;padding:1.5rem;background:var(--bg-sunken,#f5f7fb);color:var(--ink-1,#1d293f)}
.overview-header{display:flex;align-items:center;justify-content:space-between;gap:1.5rem;margin-bottom:1.25rem;flex-wrap:wrap}
.overview-header h2{margin:0;font-size:var(--fs-22,1.375rem);font-weight:600}
.overview-header p{margin:.5rem 0 0;color:var(--ink-3,#8594ad);font-size:var(--fs-12,.75rem)}
.overview-filters{margin:0!important}
.overview-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem}
.summary-card,.overview-section{border-radius:var(--jet-theme-radius,.75rem);box-shadow:none;border:1px solid var(--jet-theme-border-secondary,#edf1f7)}
.summary-card :deep(.ant-card-body){padding:1.25rem 1.5rem}
.summary-heading{display:flex;align-items:center;justify-content:space-between;gap:.5rem;color:var(--ink-2,#65758e);font-size:var(--fs-13,.8125rem)}
.summary-icon{display:flex;align-items:center;justify-content:center;width:2.25rem;height:2.25rem;border-radius:var(--jet-theme-radius-sm,.625rem);background:var(--bg-sunken,#f3f6fb);color:var(--ink-3,#8594ad);font-size:var(--fs-20,1.25rem)}
.summary-value{margin-top:.25rem;font-size:var(--fs-36,2.25rem);font-weight:600;line-height:1.2;font-variant-numeric:tabular-nums}
.summary-value>span{margin-left:.5rem;font-size:var(--fs-12,.75rem);font-weight:400;color:var(--ink-3,#8594ad)}
.summary-active{background:var(--info-bg,#eff5ff)}
.summary-active .summary-icon{background:var(--info-bg-hover,#dce9ff);color:var(--info,#3478f6)}
.summary-active .summary-value{color:var(--info,#3478f6)}
.overview-grid{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:1.25rem;margin-top:1.25rem}
.overview-section{min-width:0}
.overview-section :deep(.ant-card-body){padding:1.25rem 1.5rem}
.section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;min-height:3rem}
.section-heading h3{margin:0;font-size:var(--fs-16,1rem);font-weight:600}
.section-heading p{margin:.35rem 0 0;color:var(--ink-3,#8594ad);font-size:var(--fs-12,.75rem)}
.section-heading .ant-btn{padding:0;height:auto;font-size:var(--fs-12,.75rem);white-space:nowrap}
.section-heading :deep(.ant-radio-group){white-space:nowrap}
.decoration-overview-chart{position:relative;display:block;height:270px;margin-top:.75rem;min-width:0}
/* 宿主其他模块存在同名 grid 样式，固定绘制区域以防百分比高度计算为零。 */
.decoration-overview-chart :deep(.echarts-warp){position:absolute;inset:0;width:100%;height:100%}
.inspection-chart{height:245px}
.chart-unavailable{height:270px;display:flex;flex-direction:column;justify-content:center}
.chart-empty{height:180px;display:flex;flex-direction:column;justify-content:center;margin:0}
.risk-items{display:grid;gap:.875rem;margin-top:1.25rem}
.risk-item{display:flex;align-items:center;gap:.875rem;width:100%;border:0;border-radius:var(--jet-theme-radius-sm,.5rem);padding:1rem;color:var(--ink-2,#52617b);font:inherit;text-align:left}
.risk-expired{background:var(--danger-bg,#fff1f0);--risk-color:var(--danger,#ec746a)}
.risk-expiring{background:var(--warning-bg,#fff8ec);--risk-color:var(--warning,#e9a12f)}
.risk-renewal{background:var(--info-bg,#eff5ff);--risk-color:var(--info,#5d87ed)}
.risk-icon{display:flex;padding:.5rem;border-radius:var(--jet-theme-radius-sm,.5rem);background:var(--bg,#fff);color:var(--risk-color);font-size:var(--fs-16,1rem)}
.risk-copy{display:flex;flex:1;flex-direction:column;gap:.25rem;min-width:0;font-size:var(--fs-13,.8125rem)}
.risk-copy small{color:var(--ink-3,#8594ad);font-size:var(--fs-12,.75rem)}
.risk-item strong{color:var(--risk-color);font-size:var(--fs-26,1.625rem);font-weight:600;font-variant-numeric:tabular-nums}
.risk-item strong small{margin-left:.5rem;color:var(--ink-3,#8594ad);font-size:var(--fs-12,.75rem);font-weight:400}
.risk-arrow{font-size:var(--fs-12,.75rem);color:var(--risk-color)}
.risk-item:not(:disabled){cursor:pointer;transition:filter .15s}
.risk-item:not(:disabled):hover{filter:brightness(.98)}
button:focus-visible{outline:2px solid var(--info,#3478f6);outline-offset:3px}
.chart-accessible{position:relative;height:0;overflow:visible}
.chart-accessible button{position:absolute;width:1px;height:1px;padding:0;clip-path:inset(50%);overflow:hidden;white-space:nowrap}
.chart-accessible button:focus{z-index:1;bottom:0;width:auto;height:auto;padding:.5rem 1rem;clip-path:none;background:var(--bg,#fff);border:1px solid var(--info,#3478f6);border-radius:.25rem}
@media(max-width:1200px){.overview-grid{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)}.overview-section :deep(.ant-card-body){padding:1rem}.section-heading{flex-wrap:wrap}.decoration-overview-chart{height:260px}}
@media(max-width:900px){.overview-page{padding:1rem}.overview-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.overview-grid{grid-template-columns:1fr}.section-heading{flex-wrap:nowrap}.decoration-overview-chart{height:260px}.risk-items{margin-top:.75rem}}
</style>
