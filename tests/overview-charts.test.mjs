import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const built=await build({entryPoints:[fileURLToPath(new URL('../utils/overviewCharts.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs'})
const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(require,module,module.exports)
const {overviewChartOptions,overviewChartMetric,overviewStages,overviewInspection}=module.exports
const t=key=>key
const trend=Array.from({length:12},(_,i)=>({month:`${2025+Math.floor((i+11)/12)}-${String((i+11)%12+1).padStart(2,'0')}`,created:i,ended:i%3}))
const report={asOf:1,metrics:[{key:'pendingReview',group:'property',value:8},{key:'pendingInspection',group:'property',value:3}],trend}
test('6/12个月保留后端跨年月份、零值与两种独立统计，不修改报告',()=>{
 const six=overviewChartOptions(report,6,t),year=overviewChartOptions(report,12,t)
 assert.deepEqual(six.trend.xAxis.data,trend.slice(-6).map(m=>m.month));assert.equal(year.trend.xAxis.data.length,12)
 assert.deepEqual(year.trend.xAxis.data.slice(0,2),['2025-12','2026-01'])
 assert.deepEqual(year.trend.series[0].data,trend.map(m=>m.created));assert.deepEqual(six.trend.series[1].data,trend.slice(-6).map(m=>m.ended))
 assert.equal(report.trend.length,12)
 assert.deepEqual(overviewChartOptions({...report,trend:undefined},6,t).trend.series[0].data,[])
})
test('状态和整改各项计数独立，零值保留，图表没有占比',()=>{
 const options=overviewChartOptions(report,6,t)
 assert.deepEqual(options.stages.series[0].data.map(d=>d.value),[8,0,0,0,0,0])
 assert.deepEqual(options.inspection.series[0].data.map(d=>d.value),[3,0,0,0])
 assert.equal(JSON.stringify(options).includes('%'),false)
 const empty=overviewChartOptions({...report,metrics:[]},6,t);assert.ok(empty.inspection.series[0].data.every(d=>d.value===0))
})
test('柱条与零值坐标标签只钻取本图白名单，趋势或伪造指标不触发',()=>{
 assert.equal(overviewChartMetric({componentType:'series',seriesType:'bar',data:{metric:'pendingReview'}},overviewStages,t),'pendingReview')
 assert.equal(overviewChartMetric({componentType:'xAxis',value:t('Decoration.overview.metrics.ownerRectification.label')},overviewInspection,t),'ownerRectification')
 for(const event of [null,{}, {componentType:'series',seriesType:'line',data:{metric:'pendingReview'}},{componentType:'series',seriesType:'bar',data:{metric:'expired'}},{componentType:'xAxis',value:'garbage'}])assert.equal(overviewChartMetric(event,overviewStages,t),undefined)
})
