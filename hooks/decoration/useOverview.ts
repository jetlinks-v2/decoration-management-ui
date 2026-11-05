import {ref,onMounted,onScopeDispose} from 'vue'
import {decorationApi} from '../../api/decoration'
import {projectTree,projectTerms,errorText} from '../../utils/decoration'
import type {OverviewReport} from '../../types/decoration'
/** 同一请求代次更新项目树与统计，失败不伪装为零，切换项目清除旧统计。 */
export function useOverview(){
 const projectId=ref(''),tree=ref<ReturnType<typeof projectTree>>([]),report=ref<OverviewReport>(),error=ref(''),loading=ref(false)
 let generation=0,disposed=false
 async function load(){const token=++generation;loading.value=true;error.value='';try{const [projects,result]=await Promise.all([decorationApi.projects(),decorationApi.statistics({terms:projectTerms([],projectId.value)})]);if(!disposed&&token===generation){tree.value=projectTree(projects);report.value=result}}catch(e){if(!disposed&&token===generation)error.value=errorText(e)}finally{if(token===generation)loading.value=false}}
 function changeProject(value?:string){projectId.value=value||'';report.value=undefined;void load()}
 onMounted(load)
 onScopeDispose(()=>{disposed=true;generation++})
 return {projectId,tree,report,error,loading,load,changeProject}
}
