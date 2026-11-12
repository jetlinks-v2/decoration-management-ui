import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePermission } from '@jetlinks-web/hooks'
import { decorationApi } from '../../api/decoration'
import { downloadBlob } from '../../services/blobDownload'
import { projectTree, applicationQueryTerms, errorText } from '../../utils/decoration'
import type { ConditionTerm, ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter/types'
import type { Project, Query, Term } from '../../types/decoration'
export function useWorkspace(mode:()=>string) {
 const route=useRoute(),router=useRouter()
 const routeProject=()=>mode()==='review'&&typeof route.query.overviewProject==='string'?route.query.overviewProject:undefined
 const projectId=ref<string|undefined>(routeProject()),projects=ref<Project[]>([]),terms=ref<ConditionTerm[]>([]),error=ref(''),loading=ref(false),detailId=ref(''),createOpen=ref(false),table=ref<{reload:()=>void}>()
 const appliedTerms=ref<ConditionTerm[]>([])
 const menu=({review:'Review',permits:'Permit',first:'FirstAcceptance',second:'SecondAcceptance',inspection:'Inspection',inspectionRecords:'InspectionRecord',violations:'Violation',selfInspection:'SelfInspection'} as Record<string,string>)[mode()]||'Applications'
 const actions=['notify','create','review','resubmit','acceptance','rectification','payment','refund','permit','print','extend','save','end','assign','handle','audit','taskReview','export']
 const grants=Object.fromEntries(actions.map(action=>[action,usePermission(`decoration/${menu}:${action}`).hasPerm]))
 // 审核页与装修记录共用创建动作；复用既有授权，不因入口移动要求扩大角色权限。
 const existingCreate=usePermission('decoration/Applications:create').hasPerm
 const permissions=computed(()=>Object.fromEntries(actions.map(action=>[action,action==='create'?mode()==='review'&&(!!grants.create?.value||!!existingCreate.value):!!grants[action]?.value])))
 const tree=computed(()=>projectTree(projects.value))
 // 仅接收概况公开指标，仍由原查询执行权限、分页与统一状态条件。
 const overviewKeys=new Set(['totalHouses','decorating','monthNew','monthEnded','pendingReview','pendingPermit','pendingInspection','pendingRectificationReview','firstAcceptance','secondAcceptance','pendingRefund','rejected','pendingPayment','ownerRectification','expired','expiring','renewal'])
 const overviewMetric=computed(()=>{
  const key=route.query.overviewMetric,asOf=Number(route.query.overviewAsOf)
  return mode()==='review'&&typeof key==='string'&&overviewKeys.has(key)&&Number.isSafeInteger(asOf)&&asOf>0?{key,asOf}:undefined
 })
 const params=computed(()=>({terms:[...applicationQueryTerms(mode(),appliedTerms.value,projectId.value),...(overviewMetric.value?[{column:'id',termType:'decoration-overview-metric',value:{metric:overviewMetric.value.key,asOf:overviewMetric.value.asOf}}]:[])]}))
 function clearOverviewFilter(){const query={...route.query};delete query.overviewMetric;delete query.overviewAsOf;void router.replace({query})}
 // 同一审核页再次从概况进入时刷新范围；不把筛选条件泄漏到其他业务页面。
 watch(()=>route.query.overviewProject,()=>{if(mode()==='review')projectId.value=routeProject()})
 watch(()=>[route.query.overviewMetric,route.query.overviewAsOf],()=>{if(mode()==='review'){detailId.value='';reload()}})
 // 只查询组件正式输出，草稿不触发请求；包含/日期等转换由统一筛选组件拥有。
 function changeFilters(value:ConditionFilterChangePayload){appliedTerms.value=value.filter.terms}
 async function loadProjects(){loading.value=true;error.value='';try{projects.value=await decorationApi.projects()}catch(e){error.value=errorText(e)}finally{loading.value=false}}
 async function exportRows(){loading.value=true;error.value='';try{downloadBlob(await decorationApi.export(params.value),'装修记录.csv')}catch(e){error.value=errorText(e)}finally{loading.value=false}}
 async function request(query:Query,context?:{signal:AbortSignal}){error.value='';try{return {success:true,result:await (mode()==='review'?decorationApi.reviewList(query,context?.signal):decorationApi.query(query,context?.signal))}}catch(e){if(!context?.signal.aborted)error.value=errorText(e);throw e}}
 function changeProject(value?:string){projectId.value=value;detailId.value='';createOpen.value=false;table.value?.reload()}
 function reload(){table.value?.reload()}
 onMounted(loadProjects)
 return {projectId,tree,terms,appliedTerms,changeFilters,error,loading,detailId,createOpen,table,permissions,overviewMetric,clearOverviewFilter,params,request,loadProjects,changeProject,reload,exportRows}
}
