import {LocalStore} from '@jetlinks-web/utils'
import {TOKEN_KEY} from '@jetlinks-web/constants'
import type {Method,SessionContext,Transport} from '../types/decoration'
import {identity,validateContext,validatePath,browserSession,SessionError} from './session'
import {mobilePermissions,type AuthorizedMenu} from '../utils/mobileEntry'
export interface DecorationHost {
 context():Promise<SessionContext>
 request<T>(input:{path:string;method:Method;body?:unknown;signal?:AbortSignal;responseType?:'blob'}):Promise<T>
 back?():void|Promise<void>
 permissions?():Promise<Record<string,boolean>>
 confirmDiscard?():Promise<boolean>
}
declare global{interface Window{decorationHost?:DecorationHost}}
const params=new URLSearchParams(location.search),entry=params.get('projectCode')||'',app=params.get('applicationScope')||''
let initial='',browserIdentity='',businessProject:string|undefined
const active=new Set<AbortController>()
let invalidated=false
export function cancelRequests(){active.forEach(c=>c.abort());active.clear()}
function changed():never{invalidated=true;cancelRequests();window.dispatchEvent(new Event('decoration:session-expired'));throw new SessionError(401,'登录身份已变化，请重新进入装修办理')}
function session(){const value=browserSession(entry,app,entry?localStorage.getItem(`project_${entry}`):null,LocalStore.get(TOKEN_KEY),location.origin)
 const key=JSON.stringify([entry,app,value.token,value.tenant]);if(browserIdentity&&browserIdentity!==key)changed();browserIdentity=key;return value}
/** 身份每次请求重新读取；没有URL令牌、自动写入重试或multipart Content-Type覆盖。 */
async function fetchBrowser<T>(path:string,method:Method,body?:unknown,signal?:AbortSignal,responseType?:'blob'):Promise<T>{
 const current=session(),controller=new AbortController();active.add(controller)
 const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort()
 const timeout=setTimeout(abort,30000)
 const headers:Record<string,string>={[TOKEN_KEY]:current.token,'X-Asset-Scope':`business_application:${app}`}
 if(current.tenant)headers['X-Tenant-Domain']=current.tenant
 if(body!==undefined&&!(body instanceof FormData))headers['Content-Type']='application/json'
 try{const response=await fetch(current.api+path,{method,headers,credentials:'same-origin',signal:controller.signal,body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body)})
  if(response.ok&&responseType==='blob')return await response.blob() as T
  const result=await response.json().catch(()=>null)
  if(!response.ok||!result||result.success===false||result.status&&result.status!==200){if(response.status===401)changed();throw new SessionError(response.status===200?result?.status||502:response.status,result?.message||'请求失败，请重试')}
  return result.result as T
 }finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);active.delete(controller)}
}
export const host:DecorationHost=window.decorationHost||{
 async context(){const me=await fetchBrowser<{user:{id:string}}>('/authorize/me','GET');session();return {userId:me.user.id,applicationId:app,sessionEntryCode:entry||'platform',tenantId:session().tenant}},
 request:input=>fetchBrowser(input.path,input.method,input.body,input.signal,input.responseType),
 async permissions(){
  const menus=await fetchBrowser<AuthorizedMenu[]>('/menu/user-own/tree','POST',{paging:false,terms:[{column:'owner',value:'app'}],sorts:[{name:'sortIndex',order:'asc'}]})
  if(!Array.isArray(menus))throw new SessionError(502,'无法读取当前账号的装修操作授权')
  return mobilePermissions(menus)
 }
}
export async function resolveContext(){if(invalidated)changed();const context=validateContext(await host.context()),key=identity(context);if(initial&&initial!==key)changed();if(initial&&businessProject!==context.businessProjectId){cancelRequests();window.dispatchEvent(new CustomEvent('decoration:project-changed',{detail:context.businessProjectId||''}))}initial=key;businessProject=context.businessProjectId;return context}
export const transport:Transport=async<T>(path:string,method:Method,body?:unknown,signal?:AbortSignal,responseType?:'blob'):Promise<T>=>{
 validatePath(path);await resolveContext();const controller=new AbortController();active.add(controller)
 const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort()
 try{const result=await host.request<T>({path,method,body,signal:controller.signal,responseType});await resolveContext();return result}
 finally{signal?.removeEventListener('abort',abort);active.delete(controller)}
}
