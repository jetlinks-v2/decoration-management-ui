import {computed,ref} from 'vue'
import {useWorkspace} from './useWorkspace'
import {decorationApi} from '../../api/decoration'
import {taskQueryTerms,errorText} from '../../utils/decoration'
import type {Query,Task} from '../../types/decoration'
export function useTaskWorkspace(kind:()=>Task['kind'],allRecords:()=>boolean=()=>false,decorationId:()=>string|undefined=()=>undefined){
 const base=useWorkspace(()=>kind()==='inspectionRecord'&&allRecords()?'inspectionRecords':({daily:'inspection',inspectionRecord:'violations',firstAcceptance:'first',secondAcceptance:'second'} as Record<string,string>)[kind()]),taskId=ref('')
 const params=computed(()=>({terms:[...taskQueryTerms(kind(),base.appliedTerms.value,base.projectId.value,allRecords()),...(decorationId()?[{column:'decorationId',termType:'eq',value:decorationId()}]:[])]}))
 async function request(query:Query,context?:{signal:AbortSignal}){
  base.error.value=''
  try{
   const currentKind=kind()
   const result=await (currentKind==='firstAcceptance'||currentKind==='secondAcceptance'
    ?decorationApi.acceptanceRecords(currentKind,query,context?.signal)
    :decorationApi.queryTasks(query,context?.signal))
   return {success:true,result}
  }catch(e){if(!context?.signal.aborted)base.error.value=errorText(e);throw e}
 }
 /** 汇总记录打开该类验收的全部任务，避免只显示某个人或某一轮。 */
 function open(decorationId:string,id:string){base.detailId.value=decorationId;taskId.value=kind()==='firstAcceptance'||kind()==='secondAcceptance'?'':id}
 return {...base,taskId,params,request,open}
}
