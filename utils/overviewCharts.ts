import type {EChartsCoreOption} from 'echarts/core'
import type {DashboardReport} from '../types/decoration'

export const overviewStages=['pendingReview','pendingPayment','pendingPermit','firstAcceptance','secondAcceptance','pendingRefund'] as const
export const overviewInspection=['pendingInspection','ownerRectification','pendingRectificationReview','rejected'] as const
export const overviewRisks=['expired','expiring','renewal'] as const
export type OverviewTranslator=(key:string)=>string
const colors={blue:'#3478f6',green:'#2fbaa5',orange:'#efa94f',purple:'#8b95eb',text:'#52617b',muted:'#8594ad',line:'#eaf0f8'}

/** 只展示后端按北京时间补齐的自然月；6/12月切换不重取数据或伪造缺失趋势。 */
export function overviewChartOptions(report:DashboardReport,months:6|12,t:OverviewTranslator):{trend:EChartsCoreOption;stages:EChartsCoreOption;inspection:EChartsCoreOption}{
 const label=(key:string)=>t(`Decoration.overview.metrics.${key}.label`)
 const metrics=new Map(report.metrics.map(metric=>[metric.key,metric.value]))
 const value=(key:string)=>metrics.get(key)||0
 const trend=report.trend?.slice(-months)||[]
 const axis={axisLine:{show:false},axisTick:{show:false},axisLabel:{color:colors.muted,fontSize:12},splitLine:{lineStyle:{color:colors.line,type:'dashed' as const}}}
 const tooltip={renderMode:'richText' as const,confine:true}
 const numeric={...axis,type:'value' as const,min:0,minInterval:1,name:t('Decoration.overview.applicationUnit'),nameTextStyle:{color:colors.muted,fontSize:11},max:(extent:{max:number})=>Math.max(extent.max,1)}
 return {
  trend:{
   aria:{enabled:true},color:[colors.blue,colors.green],tooltip:{...tooltip,trigger:'axis'},
   legend:{right:0,top:2,itemWidth:16,itemHeight:8,textStyle:{color:colors.muted,fontSize:12}},
   grid:{top:48,left:12,right:20,bottom:8,containLabel:true},
   xAxis:{...axis,type:'category',boundaryGap:false,data:trend.map(month=>month.month),splitLine:{show:false},axisLabel:{color:colors.muted,fontSize:11,hideOverlap:true}},
   yAxis:numeric,
   series:[
    {name:t('Decoration.overview.createdSeries'),type:'line',smooth:.25,symbolSize:7,lineStyle:{width:3},itemStyle:{borderWidth:2,borderColor:'#fff'},areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'rgba(52,120,246,.12)'},{offset:1,color:'rgba(52,120,246,0)'}]}},data:trend.map(month=>month.created)},
    {name:t('Decoration.overview.endedSeries'),type:'line',smooth:.25,symbol:'diamond',symbolSize:8,lineStyle:{width:2,type:'dashed'},itemStyle:{borderWidth:2,borderColor:'#fff'},data:trend.map(month=>month.ended)}
   ]
  },
  stages:{
   aria:{enabled:true},tooltip:{...tooltip,trigger:'item',formatter:'{b}: {c}'},
   grid:{top:8,left:0,right:32,bottom:0,containLabel:true},
   xAxis:{type:'value',min:0,max:(extent:{max:number})=>Math.max(extent.max,1)*1.15,show:false},
   yAxis:{...axis,type:'category',inverse:true,triggerEvent:true,data:overviewStages.map(label),splitLine:{show:false},axisLabel:{color:colors.text,fontSize:12,margin:16}},
   series:[{type:'bar',barWidth:10,showBackground:true,backgroundStyle:{color:'#f2f5fb',borderRadius:5},itemStyle:{color:colors.blue,borderRadius:5},label:{show:true,position:'right',distance:10,color:colors.text},data:overviewStages.map(key=>({name:label(key),value:value(key),metric:key}))}]
  },
  inspection:{
   aria:{enabled:true},tooltip:{...tooltip,trigger:'item',formatter:'{b}: {c}'},
   grid:{top:30,left:12,right:12,bottom:8,containLabel:true},
   xAxis:{...axis,type:'category',triggerEvent:true,data:overviewInspection.map(label),splitLine:{show:false},axisLabel:{color:colors.text,fontSize:12,interval:0,margin:16}},yAxis:numeric,
   series:[{type:'bar',barMaxWidth:42,label:{show:true,position:'top',color:colors.text,distance:8},data:overviewInspection.map((key,index)=>({name:label(key),value:value(key),metric:key,itemStyle:{color:[colors.blue,colors.orange,colors.green,colors.purple][index],borderRadius:[5,5,0,0]}}))}]
  }
 }
}

/** 图表series或坐标标签只允许钻取本图的已知指标，零值标签同样可点击。 */
export function overviewChartMetric(event:unknown,keys:readonly string[],t:OverviewTranslator):string|undefined{
 if(!event||typeof event!=='object')return
 if('componentType' in event&&event.componentType==='series'&&'seriesType' in event&&event.seriesType==='bar'&&'data' in event){
  const data=event.data
  if(data&&typeof data==='object'&&'metric' in data&&typeof data.metric==='string'&&keys.includes(data.metric))return data.metric
 }
 if('componentType' in event&&['xAxis','yAxis'].includes(String(event.componentType))&&'value' in event){
  return keys.find(key=>t(`Decoration.overview.metrics.${key}.label`)===event.value)
 }
}
