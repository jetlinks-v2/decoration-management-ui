import {ref,computed,onMounted,onScopeDispose} from 'vue'
import {useMenuStore} from '@jetlinks-web-core/store'
import {decorationApi} from '../../api/decoration'
import {projectTree,projectTerms,errorText} from '../../utils/decoration'
import type {DashboardReport,DashboardMetric} from '../../types/decoration'
/** 同一请求代次更新项目树与统计，失败不伪装为零，切换项目清除旧统计。 */
export function useOverview(){
 const projectId=ref(''),tree=ref<ReturnType<typeof projectTree>>([]),report=ref<DashboardReport>(),error=ref(''),loading=ref(false)
 const menus=useMenuStore()
 const canOpenReview=computed(()=>!!menus.getMenu('decoration/Review'))
 // 概况只承载统计；通过宿主已授权菜单进入在线审核，保留项目与报告时刻。
 function openReview(metric?:DashboardMetric){
  if(!canOpenReview.value)return
  menus.jumpPage('decoration/Review',{query:{
   ...(projectId.value?{overviewProject:projectId.value}:{}),
   ...(metric&&report.value?{overviewMetric:metric.key,overviewAsOf:String(report.value.asOf)}:{})
  }})
 }
 let generation=0,disposed=false
 async function load(){const token=++generation;loading.value=true;error.value='';report.value=undefined;try{const [projects,result]=await Promise.all([decorationApi.projects(),decorationApi.dashboard({terms:projectTerms([],projectId.value)})]);if(!disposed&&token===generation){tree.value=projectTree(projects);report.value=result}}catch(e){if(!disposed&&token===generation)error.value=errorText(e)}finally{if(token===generation)loading.value=false}}
 function changeProject(value?:string){projectId.value=value||'';report.value=undefined;void load()}
 onMounted(load)
 onScopeDispose(()=>{disposed=true;generation++})
 return {projectId,tree,report,error,loading,load,changeProject,canOpenReview,openReview}
}
