import {computed,ref,watch,type Ref} from 'vue'
import type {DashboardReport,DashboardMetric} from '../../types/decoration'
import {overviewChartOptions,overviewChartMetric,overviewStages,overviewInspection,type OverviewTranslator} from '../../utils/overviewCharts'

/** 页面图表状态与点击入口；授权及导航仍由useOverview统一处理。 */
export function useOverviewCharts(report:Ref<DashboardReport|undefined>,openReview:(metric?:DashboardMetric)=>void,t:OverviewTranslator){
 const months=ref<6|12>(6),chartError=ref(false)
 const options=computed(()=>report.value?overviewChartOptions(report.value,months.value,t):undefined)
 const metricMap=computed(()=>new Map(report.value?.metrics.map(metric=>[metric.key,metric])||[]))
 const summary=computed(()=>report.value?.metrics.filter(metric=>metric.group==='summary')||[])
 const trendAvailable=computed(()=>report.value?.trend?.length===12)
 const stageHasData=computed(()=>overviewStages.some(key=>(metricMap.value.get(key)?.value||0)>0))
 const inspectionHasData=computed(()=>overviewInspection.some(key=>(metricMap.value.get(key)?.value||0)>0))
 const label=(key:string)=>t(`Decoration.overview.metrics.${key}.label`)
 const count=(key:string)=>metricMap.value.get(key)?.value.toLocaleString()||'0'
 const open=(key:string)=>{const metric=metricMap.value.get(key);if(metric)openReview(metric)}
 const events=(keys:readonly string[])=>({click:(event:unknown)=>{const key=overviewChartMetric(event,keys,t);if(key)open(key)}})
 watch(report,()=>{chartError.value=false})
 return {months,chartError,options,summary,trendAvailable,stageHasData,inspectionHasData,label,count,open,stageEvents:events(overviewStages),inspectionEvents:events(overviewInspection),onChartError:()=>{chartError.value=true}}
}
