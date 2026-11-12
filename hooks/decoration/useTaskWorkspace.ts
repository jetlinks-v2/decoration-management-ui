import {computed,ref} from 'vue'
import {useWorkspace} from './useWorkspace'
import {decorationApi} from '../../api/decoration'
import {taskQueryTerms,projectTerms,errorText} from '../../utils/decoration'
import type {Query,Task} from '../../types/decoration'
export function useTaskWorkspace(kind:()=>Task['kind'],allRecords:()=>boolean=()=>false,decorationId:()=>string|undefined=()=>undefined){
 const base=useWorkspace(()=>kind()==='inspectionRecord'&&allRecords()?'inspectionRecords':({daily:'inspection',inspectionRecord:'violations',firstAcceptance:'first',secondAcceptance:'second'} as Record<string,string>)[kind()]),taskId=ref(''),inspectionTaskId=ref('')
 const mergedInspection=computed(()=>kind()==='inspectionRecord'&&allRecords())
 const params=computed(()=>({...(kind().includes('Acceptance')?{sorts:[{name:'modifyTime',order:'desc'},{name:'id',order:'desc'}]}:mergedInspection.value?{sorts:[{name:'modifyTime',order:'desc'}]}:{}),terms:[...(mergedInspection.value?projectTerms(base.appliedTerms.value,base.projectId.value):taskQueryTerms(kind(),base.appliedTerms.value,base.projectId.value,allRecords())),...(decorationId()?[{column:'decorationId',termType:'eq',value:decorationId()}]:[])]}))
 async function request(query:Query,context?:{signal:AbortSignal}){
  base.error.value=''
  try{
   const currentKind=kind()
   const result=await (currentKind==='firstAcceptance'||currentKind==='secondAcceptance'
    ?decorationApi.acceptanceRecords(currentKind,query,context?.signal)
    :mergedInspection.value?decorationApi.inspectionRecords(query,context?.signal):decorationApi.queryTasks(query,context?.signal))
   return {success:true,result}
  }catch(e){if(!context?.signal.aborted)base.error.value=errorText(e);throw e}
 }
 /** 汇总记录打开该类验收的全部任务，避免只显示某个人或某一轮。 */
 function open(decorationId:string,id:string){base.detailId.value=decorationId;inspectionTaskId.value=mergedInspection.value?id:'';taskId.value=mergedInspection.value||kind()==='firstAcceptance'||kind()==='secondAcceptance'?'':id}
 return {...base,taskId,inspectionTaskId,mergedInspection,params,request,open}
}
