import {ref,onMounted,onScopeDispose,computed} from 'vue'
import {createDecorationApi} from '../services/decorationApi'
import {errorText,projectTree,projectTerms} from '../utils/decoration'
import type {Application,Household,Task,Project} from '../types/decoration'
import {transport,resolveContext,host,cancelRequests} from './transport'
import type {MobileSide} from '../utils/mobileEntry'
import {staffTerms,type StaffTab,type OwnerStep} from './model'
export function useMobileDecoration(canLeave:()=>boolean|Promise<boolean>,side:MobileSide='owner',shouldBlockUnload:()=>boolean=()=>false){
 const api=createDecorationApi(transport,side==='owner')
 const permissions=ref<Record<string,boolean>>({}),projectId=ref(''),projects=ref<ReturnType<typeof projectTree>>([])
 const households=ref<Household[]>([]),householdId=ref(''),current=ref<Application>(),rectificationCount=ref(0)
 const rows=ref<Application[]>([]),taskRows=ref<Task[]>([]),staffTab=ref<StaffTab>('inspection')
 const page=ref(1),total=ref(0),loading=ref(false),error=ref(''),invalid=ref(false)
 const view=ref<'list'|'create'|'detail'|'history'>('list'),detailId=ref(''),taskId=ref(''),detailStep=ref<OwnerStep|'rectification'|'overview'>('overview'),contextKey=ref(0)
 const household=computed(()=>households.value.find(h=>h.relationshipId===householdId.value))
 let generation=0,disposed=false
 const live=(token:number)=>token===generation&&!disposed&&!invalid.value
 function clear(){rows.value=[];taskRows.value=[];current.value=undefined;rectificationCount.value=0;total.value=0}
 async function load(){
  if(invalid.value)return
  const token=++generation;loading.value=true;error.value=''
  try{
   if(side==='staff'){
    const result=await api.myTasks({pageIndex:page.value-1,pageSize:10,terms:projectTerms(staffTerms(staffTab.value),projectId.value)})
    if(live(token)){taskRows.value=result.data;total.value=result.total}
   }else{
    if(!projectId.value){clear();return}
    const homes=await api.households(projectId.value);if(!live(token))return
    households.value=homes
    if(!homes.some(h=>h.relationshipId===householdId.value))householdId.value=homes[0]?.relationshipId||''
    const home=household.value
    if(!home){clear();return}
    const terms=projectTerms([{column:'spaceId',termType:'eq',value:home.spaceId},{column:'customerId',termType:'eq',value:home.customerId}],projectId.value)
    // 当前流程独立查最新一条，不能由历史页码或首屏十条记录推断。
    const [latest,history]=await Promise.all([api.query({pageIndex:0,pageSize:1,terms}),api.query({pageIndex:page.value-1,pageSize:10,terms})])
    if(!live(token))return
    current.value=latest.data[0];rows.value=history.data;total.value=history.total;rectificationCount.value=0
    if(current.value){const pending=await api.tasks(current.value.id,{pageSize:1,terms:[{column:'kind',termType:'eq',value:'inspectionRecord'},{column:'status',termType:'in',value:['owner_rectification','rectification_rejected']}]});if(live(token))rectificationCount.value=pending.total}
   }
  }catch(e){if(live(token))error.value=errorText(e)}finally{if(live(token))loading.value=false}
 }
 async function start(){
  const token=++generation;loading.value=true;error.value='';permissions.value={}
  try{
   const context=await resolveContext()
   const [tree,grants]=await Promise.all([api.projects(),side==='staff'?host.permissions?.()||Promise.resolve({}):Promise.resolve({})])
   if(!live(token))return
   const flatten=(items:Project[]):Project[]=>items.flatMap(item=>[item,...flatten(item.children||[])])
   const first=flatten(tree).find(node=>(typeof node.organizationType==='string'?node.organizationType:node.organizationType?.value)==='project')
   projectId.value=context.businessProjectId||(side==='owner'?first?.id||'':'')
   projects.value=projectTree(tree);permissions.value=grants;await load()
  }catch(e){if(live(token))error.value=errorText(e)}finally{if(live(token))loading.value=false}
 }
 function expire(){invalid.value=true;generation++;cancelRequests();permissions.value={};clear();households.value=[];householdId.value='';projects.value=[];detailId.value='';view.value='list';contextKey.value++;loading.value=false;error.value='登录身份已变化，请重新进入装修办理'}
 async function navigate(next:typeof view.value,id='',step:typeof detailStep.value='overview',selectedTask=''){
  if((next==='create'&&side!=='owner')||!await canLeave()||disposed||invalid.value)return
  view.value=next;detailId.value=id;detailStep.value=step;taskId.value=selectedTask;history.pushState({},'','#'+next)
 }
 async function back(){if(!await canLeave()||disposed||invalid.value)return;if(view.value==='list'){void host.back?.();return}view.value='list';detailId.value='';taskId.value='';history.replaceState({},'','#list');void load()}
 function resetProject(id:string){cancelRequests();generation++;view.value='list';detailId.value='';taskId.value='';clear();households.value=[];householdId.value='';page.value=1;projectId.value=id;contextKey.value++;void load()}
 async function changeProject(id?:string){if(await canLeave()&&!disposed&&!invalid.value)resetProject(id||'')}
 async function changeHouse(id:string){if(!await canLeave()||disposed||invalid.value)return;cancelRequests();generation++;clear();householdId.value=id;page.value=1;contextKey.value++;void load()}
 async function changeTab(tab:StaffTab){if(!await canLeave()||disposed||invalid.value)return;staffTab.value=tab;page.value=1;taskRows.value=[];void load()}
 function externalProject(event:Event){resetProject((event as CustomEvent<string>).detail)}
 function created(row:Application){view.value='detail';detailId.value=row.id;detailStep.value='apply';void load()}
 function changePage(value:number){page.value=value;void load()}
 async function pop(){if(!await canLeave()){if(!disposed)history.pushState({},'','#'+view.value);return}if(disposed||invalid.value)return;view.value='list';detailId.value='';taskId.value='';void load()}
 // 浏览器关闭/刷新只能同步拦截，不能在卸载回调中再启动页面确认弹窗。
 function before(event:BeforeUnloadEvent){if(shouldBlockUnload()){event.preventDefault();event.returnValue=''}}
 const resume=()=>{if(document.visibilityState==='visible')void resolveContext().catch(e=>{error.value=errorText(e)})}
 onMounted(()=>{window.addEventListener('decoration:session-expired',expire);window.addEventListener('decoration:project-changed',externalProject);window.addEventListener('popstate',pop);window.addEventListener('beforeunload',before);document.addEventListener('visibilitychange',resume);void start()})
 onScopeDispose(()=>{disposed=true;generation++;cancelRequests();window.removeEventListener('decoration:session-expired',expire);window.removeEventListener('decoration:project-changed',externalProject);window.removeEventListener('popstate',pop);window.removeEventListener('beforeunload',before);document.removeEventListener('visibilitychange',resume)})
 return {api,permissions,projectId,projects,households,householdId,household,current,rectificationCount,rows,taskRows,staffTab,page,total,loading,error,invalid,view,detailId,taskId,detailStep,contextKey,load,start,navigate,back,changeProject,changeHouse,changeTab,created,changePage}
}
