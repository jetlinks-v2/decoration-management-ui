import {computed,ref} from 'vue'
import {useWorkspace} from './useWorkspace'
import {decorationApi} from '../../api/decoration'
import {taskQueryTerms,errorText} from '../../utils/decoration'
import type {Query,Task} from '../../types/decoration'
export function useTaskWorkspace(kind:()=>Task['kind'],allRecords:()=>boolean=()=>false){
 const base=useWorkspace(()=>kind()==='inspectionRecord'&&allRecords()?'inspectionRecords':({daily:'inspection',inspectionRecord:'violations',firstAcceptance:'first',secondAcceptance:'second'} as Record<string,string>)[kind()]),taskId=ref('')
 const params=computed(()=>({terms:taskQueryTerms(kind(),base.appliedTerms.value,base.projectId.value,allRecords())}))
 async function request(query:Query,context?:{signal:AbortSignal}){base.error.value='';try{return {success:true,result:await decorationApi.queryTasks(query,context?.signal)}}catch(e){if(!context?.signal.aborted)base.error.value=errorText(e);throw e}}
 function open(decorationId:string,id:string){base.detailId.value=decorationId;taskId.value=id}
 return {...base,taskId,params,request,open}
}
