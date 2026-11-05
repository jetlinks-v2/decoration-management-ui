import {provideUploadScope} from './useUploadScope'
import { ref, watch, onScopeDispose } from 'vue'
import type { DecorationApi } from '../../services/decorationApi'
import type { Application, Task, History, Action, Capabilities, PermitPrintAction, Term } from '../../types/decoration'
import { requestId, errorText, isUncertain } from '../../utils/decoration'
export function useApplicationDetail(api: DecorationApi, id: () => string, taskId?: () => string | undefined, taskTerms?: () => Term[]) {
 const {uploading}=provideUploadScope()
  const row=ref<Application>(),tasks=ref<Task[]>([]),history=ref<History[]>([]),capabilities=ref<Capabilities>({payment:false,refund:false,pushNotification:false})
  const loading=ref(false),saving=ref(false),error=ref(''),uncertain=ref(false),resultMissing=ref(false),taskTotal=ref(0),taskPage=ref(0)
  let generation=0,identityGeneration=0,disposed=false
  onScopeDispose(()=>{disposed=true;generation++;identityGeneration++})
  async function load(){
    const token=++generation;loading.value=true;error.value=''
    try{const [detail,taskResult,logs,features]=await Promise.all([api.read(id()),api.tasks(id(),{pageIndex:taskPage.value,pageSize:20,terms:taskId?.()?[{column:'id',termType:'eq',value:taskId()}]:taskTerms?.()||[]}),api.history(id()),api.capabilities()]);if(disposed||token!==generation)return;row.value=detail;tasks.value=taskResult.data;taskTotal.value=taskResult.total;history.value=logs;capabilities.value=features;if(!pending)uncertain.value=false}catch(e){if(token===generation)error.value=errorText(e)}finally{if(token===generation)loading.value=false}
  }
  let pending: {action:string;input:Action;task:boolean}|undefined
  watch([id,()=>taskId?.(),()=>JSON.stringify(taskTerms?.())],()=>{identityGeneration++;pending=undefined;uncertain.value=false;resultMissing.value=false;saving.value=false;row.value=undefined;tasks.value=[];history.value=[];taskPage.value=0;void load()},{immediate:true})
  async function execute(action:string,body:Partial<Action & PermitPrintAction>={},task=false){
    if(!row.value||saving.value||uncertain.value||uploading.value)return false
    const input:Action={...JSON.parse(JSON.stringify(body)),version:row.value.version,requestId:requestId()};pending={action,input,task};resultMissing.value=false;return send()
  }
  async function send(){
    if(!pending||!row.value||saving.value||uploading.value)return false;const token=identityGeneration;saving.value=true;error.value='';resultMissing.value=false
    try{const result=await (pending.task?api.taskAction(id(),pending.action,pending.input):api.action(id(),pending.action,pending.input));if(disposed||token!==identityGeneration)return false;row.value=result;uncertain.value=false;pending=undefined;await load();return true}catch(e){if(!disposed&&token===identityGeneration){error.value=errorText(e);uncertain.value=isUncertain(e)}return false}finally{if(!disposed&&token===identityGeneration)saving.value=false}
  }
  async function confirm(){
    if(!pending)return load();if(saving.value)return
    const token=identityGeneration,request=pending,applicationId=id();saving.value=true;error.value=''
    const current=()=>!disposed&&token===identityGeneration&&pending===request
    try{const result=await api.actionResult(applicationId,request.input.requestId);if(!current())return;row.value=result;pending=undefined;uncertain.value=false;await load();return true}
    catch(e){if(!current())return;error.value=errorText(e);const status=(e as {status?:number;response?:{status?:number}}).status||(e as {response?:{status?:number}}).response?.status
      if(status===404){try{const result=await api.read(applicationId);if(current()&&result.version===request.input.version)resultMissing.value=true}catch(readError){if(current())error.value=errorText(readError)}}
    }finally{if(!disposed&&token===identityGeneration)saving.value=false}
  }
  async function changeTaskPage(page:number){taskPage.value=page-1;await load()}
  return {uploading,row,tasks,history,capabilities,loading,saving,error,uncertain,resultMissing,retryOriginal:send,taskTotal,taskPage,load,execute,confirm,changeTaskPage}
}
