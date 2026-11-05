import {ref,watch,onMounted,onScopeDispose} from 'vue'
import {createDecorationApi} from '../services/decorationApi'
import {errorText,projectTree,projectTerms} from '../utils/decoration'
import type {Application,Project} from '../types/decoration'
import {transport,resolveContext,host,cancelRequests} from './transport'
import type {MobileSide} from '../utils/mobileEntry'
export function useMobileDecoration(canLeave:()=>boolean,side:MobileSide='owner'){
 const api=createDecorationApi(transport,side==='owner'),permissions=ref<Record<string,boolean>>({}),projectId=ref(''),projects=ref<ReturnType<typeof projectTree>>([]),rows=ref<Application[]>([]),page=ref(1),total=ref(0),loading=ref(false),error=ref(''),invalid=ref(false),view=ref<'list'|'create'|'detail'>('list'),detailId=ref(''),contextKey=ref(0)
 let generation=0,disposed=false
 async function load(){const token=++generation;loading.value=true;error.value='';try{const result=await api.query({pageIndex:page.value-1,pageSize:10,terms:projectTerms([],projectId.value)});if(token===generation&&!disposed){rows.value=result.data;total.value=result.total}}catch(e){if(token===generation)error.value=errorText(e)}finally{if(token===generation)loading.value=false}}
 async function start(){const token=++generation;loading.value=true;error.value='';permissions.value={};try{const context=await resolveContext();const [tree,grants]=await Promise.all([api.projects(),side==='staff'?host.permissions?.()||Promise.resolve({}):Promise.resolve({})]);if(disposed||invalid.value||token!==generation)return;projectId.value=context.businessProjectId||'';projects.value=projectTree(tree);permissions.value=grants;await load()}catch(e){if(token===generation)error.value=errorText(e)}finally{if(token===generation)loading.value=false}}
 function expire(){invalid.value=true;generation++;cancelRequests();permissions.value={};rows.value=[];projects.value=[];detailId.value='';view.value='list';contextKey.value++;error.value='登录身份已变化，请重新进入装修办理'}
 function navigate(next:'list'|'create'|'detail',id=''){if(next==='create'&&side!=='owner'||!canLeave())return;view.value=next;detailId.value=id;history.pushState({},'','#'+next)}
 function back(){if(!canLeave())return;if(view.value==='list'){void host.back?.();return}view.value='list';detailId.value='';history.replaceState({},'','#list');void load()}
 function changeProject(id?:string){if(!canLeave())return;cancelRequests();generation++;view.value='list';detailId.value='';rows.value=[];page.value=1;projectId.value=id||'';contextKey.value++;void load()}
 function externalProject(event:Event){cancelRequests();generation++;view.value='list';detailId.value='';rows.value=[];page.value=1;projectId.value=(event as CustomEvent<string>).detail;contextKey.value++;void load()}
 function created(row:Application){view.value='detail';detailId.value=row.id;void load()}
 function changePage(value:number){page.value=value;void load()}
 function pop(){if(!canLeave()){history.pushState({},'','#'+view.value);return}view.value='list';detailId.value='';void load()}
 function before(event:BeforeUnloadEvent){if(!canLeave()){event.preventDefault();event.returnValue=''}}
 const resume=()=>{if(document.visibilityState==='visible')void resolveContext().catch(e=>{error.value=errorText(e)})}
 onMounted(()=>{window.addEventListener('decoration:session-expired',expire);window.addEventListener('decoration:project-changed',externalProject);window.addEventListener('popstate',pop);window.addEventListener('beforeunload',before);document.addEventListener('visibilitychange',resume);void start()})
 onScopeDispose(()=>{disposed=true;generation++;cancelRequests();window.removeEventListener('decoration:session-expired',expire);window.removeEventListener('decoration:project-changed',externalProject);window.removeEventListener('popstate',pop);window.removeEventListener('beforeunload',before);document.removeEventListener('visibilitychange',resume)})
 return {api,permissions,projectId,projects,rows,page,total,loading,error,invalid,view,detailId,contextKey,load,start,navigate,back,changeProject,created,changePage}
}
