import {ref,onMounted,onScopeDispose,computed} from 'vue'
import {createDecorationApi} from '../services/decorationApi'
import {errorText,projectTree,projectTerms} from '../utils/decoration'
import type {Application,Task,Project,OwnerHouse,OwnerApplicationSummary,DecorationNotice} from '../types/decoration'
import {transport,resolveContext,host,cancelRequests} from './transport'
import {mobileNoticeTarget,type MobileSide} from '../utils/mobileEntry'
import {staffTerms,ownerProcessingTerms,type StaffTab,type OwnerStep} from './model'
import {identity} from './session'
export function useMobileDecoration(canLeave:()=>boolean|Promise<boolean>,side:MobileSide='owner',shouldBlockUnload:()=>boolean=()=>false){
 const api=createDecorationApi(transport,side==='owner')
 const permissions=ref<Record<string,boolean>>({}),projectId=ref(''),projects=ref<ReturnType<typeof projectTree>>([])
 const houses=ref<OwnerHouse[]>([]),householdId=ref(''),current=ref<Application>(),rectificationCount=ref(0)
 const households=computed(()=>houses.value.map(home=>home.household))
 const house=computed(()=>houses.value.find(home=>home.household.relationshipId===householdId.value))
 const household=computed(()=>house.value?.household)
 const rows=ref<OwnerApplicationSummary[]>([]),taskRows=ref<Task[]>([]),staffTab=ref<StaffTab>('inspection')
 const notices=ref<DecorationNotice[]>([])
 const page=ref(1),total=ref(0),loading=ref(false),error=ref(''),invalid=ref(false)
 const view=ref<'list'|'history'|'notifications'|'workflow'|'create'|'detail'>('list'),detailId=ref(''),taskId=ref(''),detailStep=ref<OwnerStep|'rectification'|'overview'>('overview'),contextKey=ref(0)
 // 根页签同时保存详情的返回来源，不将首页选房用作记录或通知的筛选条件。
 const ownerTab=ref<'list'|'history'|'notifications'>('list')
 let generation=0,disposed=false,projectPreferenceKey='',entryApplied=false
 function rememberProject(){try{if(projectPreferenceKey)sessionStorage.setItem(projectPreferenceKey,projectId.value)}catch{/* 存储不可用不影响办理。 */}}
 const live=(token:number)=>token===generation&&!disposed&&!invalid.value
 function clear(){rows.value=[];notices.value=[];taskRows.value=[];current.value=undefined;rectificationCount.value=0;total.value=0}
 async function loadProcessing(token:number){
  const selected=house.value
  if(!selected){if(live(token)){rows.value=[];total.value=0}return}
  const result=await api.ownerApplications({pageIndex:page.value-1,pageSize:10,terms:ownerProcessingTerms(selected.household),sorts:[{name:'createTime',order:'desc'}]})
  if(live(token)){rows.value=result.data;total.value=result.total}
 }
 async function load(){
  if(invalid.value)return
  const token=++generation;loading.value=true;error.value=''
  try{
   if(side==='staff'){
    const result=await api.myTasks({pageIndex:page.value-1,pageSize:10,terms:projectTerms(staffTerms(staffTab.value),projectId.value)})
    if(live(token)){taskRows.value=result.data;total.value=result.total}
   }else if(view.value==='list'){
    // 首页由服务端返回全部本人房屋及按房聚合的申请数，不按项目逐次切换或请求详情。
    const result=await api.ownerHouses();if(live(token)){
     houses.value=result
     // 房屋选择限定首页在办申请及新增；记录页不受影响。
     if(householdId.value&&!result.some(home=>home.household.relationshipId===householdId.value)){householdId.value='';projectId.value=''}
    }
    if(live(token))await loadProcessing(token)
   }else if(view.value==='notifications'){
    const result=await api.ownerNotifications({pageIndex:page.value-1,pageSize:10,sorts:[{name:'createTime',order:'desc'}]})
    if(live(token)){notices.value=result.data;total.value=result.total}
   }else if(view.value==='history'){
    // 记录独立查询本人全部有权申请，不携带首页房屋或项目选择。
    const result=await api.ownerApplications({pageIndex:page.value-1,pageSize:10,terms:[],sorts:[{name:'createTime',order:'desc'}]})
    if(live(token)){rows.value=result.data;total.value=result.total}
   }else if(view.value==='workflow'&&detailId.value){
    const row=await api.read(detailId.value);if(!live(token))return
    current.value=row
    const pending=await api.tasks(row.id,{pageSize:1,terms:[{column:'kind',termType:'eq',value:'inspectionRecord'},{column:'status',termType:'in',value:['owner_rectification','rectification_rejected']}]})
    if(live(token))rectificationCount.value=pending.total
   }
  }catch(e){if(live(token))error.value=errorText(e)}finally{if(live(token))loading.value=false}
 }
 async function start(){
  const token=++generation;loading.value=true;error.value='';permissions.value={}
  try{
   const context=await resolveContext()
   if(side==='staff'){
    const [tree,grants]=await Promise.all([api.projects(),host.permissions?.()||Promise.resolve({})])
    if(!live(token))return
    const flatten=(items:Project[]):Project[]=>items.flatMap(item=>[item,...flatten(item.children||[])])
    const available=flatten(tree).filter(node=>(typeof node.organizationType==='string'?node.organizationType:node.organizationType?.value)==='project')
    projectPreferenceKey=`decoration:project:${side}:${identity(context)}`
    let remembered='';try{remembered=sessionStorage.getItem(projectPreferenceKey)||''}catch{/* 首次进入沿用默认项目。 */}
    projectId.value=context.businessProjectId||(available.some(node=>node.id===remembered)?remembered:'')
    rememberProject();projects.value=projectTree(tree);permissions.value=grants
   }
   if(live(token)){
    if(side==='owner'&&!entryApplied){
     entryApplied=true
     const target=typeof location==='undefined'?undefined:mobileNoticeTarget(location.search)
     if(target){detailId.value=target.id;detailStep.value=target.step;view.value='detail'}
    }
    await load()
   }
  }catch(e){if(live(token))error.value=errorText(e)}finally{if(live(token))loading.value=false}
 }
 function expire(){invalid.value=true;generation++;cancelRequests();permissions.value={};clear();houses.value=[];householdId.value='';projects.value=[];detailId.value='';view.value='list';ownerTab.value='list';contextKey.value++;loading.value=false;error.value='登录身份已变化，请重新进入装修办理'}
 async function navigate(next:typeof view.value,id='',step:typeof detailStep.value='overview',selectedTask=''){
  if((next==='create'&&(side!=='owner'||loading.value||!!error.value||!household.value||house.value?.processing))||!await canLeave()||disposed||invalid.value)return
  if(next==='create'){
   // 首页可能停留期间被PC或其他业主发起申请，进入填表前以最新房屋占用结果核验。
   const token=generation+1;await load()
   if(!live(token)||error.value||!household.value||house.value?.processing)return
  }
  cancelRequests();generation++;loading.value=false;error.value=''
  if(next==='workflow'&&id!==detailId.value){current.value=undefined;rectificationCount.value=0}
  if(next==='list'||next==='history'||next==='notifications'){page.value=1;rows.value=[];notices.value=[];total.value=0}
  if(side==='owner'&&(next==='list'||next==='history'||next==='notifications'))ownerTab.value=next
  view.value=next;detailId.value=id;detailStep.value=step;taskId.value=selectedTask;history.pushState({},'','#'+next)
  if(next==='workflow'||next==='history'||next==='notifications'||next==='list')void load()
 }
 async function back(push=true){
  if(!await canLeave()||disposed||invalid.value)return false
  if(view.value==='list'){void host.back?.();return true}
  cancelRequests();generation++;loading.value=false;error.value=''
  // 流程返回进入前的根页签，首页选房保持不变。
  if(side==='owner'&&view.value==='detail')view.value='workflow'
  else if(side==='owner'&&view.value==='workflow'){view.value=ownerTab.value;detailId.value='';current.value=undefined;rectificationCount.value=0;rows.value=[];total.value=0}
  else{view.value='list';ownerTab.value='list';detailId.value='';taskId.value='';clear()}
  if(push)history.pushState({},'','#'+view.value)
  void load();return true
 }
 function resetProject(id:string){cancelRequests();generation++;view.value='list';detailId.value='';taskId.value='';clear();page.value=1;projectId.value=id;rememberProject();contextKey.value++;void load()}
 async function changeProject(id?:string){if(side==='staff'&&await canLeave()&&!disposed&&!invalid.value)resetProject(id||'')}
 async function changeHouse(id?:string){
  if(side!=='owner'||view.value!=='list'||loading.value||!await canLeave()||disposed||invalid.value)return
  const selected=houses.value.find(home=>home.household.relationshipId===id);if(id&&!selected)return
  cancelRequests();const token=++generation
  clear();householdId.value=selected?.household.relationshipId||'';projectId.value=selected?.household.projectId||'';page.value=1;contextKey.value++;loading.value=true;error.value=''
  // 选择只查询该房屋的轻量在办摘要，复用已加载房屋，避免重复读取公共档案。
  try{await loadProcessing(token)}catch(e){if(live(token))error.value=errorText(e)}finally{if(live(token))loading.value=false}
 }
 async function changeTab(tab:StaffTab){if(!await canLeave()||disposed||invalid.value)return;staffTab.value=tab;page.value=1;taskRows.value=[];void load()}
 function externalProject(event:Event){if(side==='staff')resetProject((event as CustomEvent<string>).detail)}
 function created(row:Application){current.value=row;view.value='workflow';ownerTab.value='list';detailId.value=row.id;detailStep.value='overview';history.replaceState({},'','#workflow');if(house.value){house.value.applicationCount++;house.value.processing=true}void load()}
 async function applicationChanged(row:Application){
  if(side==='owner'){
   if(detailId.value===row.id)current.value=row
   // 一笔历史申请结束不能替代整套房屋的占用状态，始终读取服务端房屋汇总。
   const token=generation
   try{const result=await api.ownerHouses();if(live(token))houses.value=result}
   catch(e){if(live(token))error.value=errorText(e)}
  }else await load()
 }
 function changePage(value:number){page.value=value;void load()}
 async function pop(){if(!await back(false)&&!disposed)history.pushState({},'','#'+view.value)}
 function before(event:BeforeUnloadEvent){if(shouldBlockUnload()){event.preventDefault();event.returnValue=''}}
 const resume=()=>{if(document.visibilityState==='visible')void resolveContext().then(()=>{if(side==='owner'&&view.value==='list'&&!loading.value&&!shouldBlockUnload())void load()}).catch(e=>{error.value=errorText(e)})}
 onMounted(()=>{window.addEventListener('decoration:session-expired',expire);window.addEventListener('decoration:project-changed',externalProject);window.addEventListener('popstate',pop);window.addEventListener('beforeunload',before);document.addEventListener('visibilitychange',resume);void start()})
 onScopeDispose(()=>{disposed=true;generation++;cancelRequests();window.removeEventListener('decoration:session-expired',expire);window.removeEventListener('decoration:project-changed',externalProject);window.removeEventListener('popstate',pop);window.removeEventListener('beforeunload',before);document.removeEventListener('visibilitychange',resume)})
 return {api,permissions,projectId,projects,houses,house,households,householdId,household,current,rectificationCount,rows,notices,taskRows,staffTab,ownerTab,page,total,loading,error,invalid,view,detailId,taskId,detailStep,contextKey,load,start,navigate,back,changeProject,changeHouse,changeTab,created,applicationChanged,changePage}
}
