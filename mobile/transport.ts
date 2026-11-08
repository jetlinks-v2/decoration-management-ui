import {mobileMessages} from './messages'
import {authState, sessionRequest} from './auth/session'
import type {Method,SessionContext,Transport} from '../types/decoration'
import {identity,validateContext,validatePath,SessionError} from './session'
import {mobilePermissions,type AuthorizedMenu} from '../utils/mobileEntry'
export interface DecorationHost {
 context():Promise<SessionContext>
 request<T>(input:{path:string;method:Method;body?:unknown;signal?:AbortSignal;responseType?:'blob'}):Promise<T>
 back?():void|Promise<void>
 permissions?():Promise<Record<string,boolean>>
 confirmDiscard?():Promise<boolean>
}
declare global{interface Window{decorationHost?:DecorationHost}}
let initial='',businessProject:string|undefined
const active=new Set<AbortController>()
let invalidated=false
export function cancelRequests(){active.forEach(c=>c.abort());active.clear()}
function changed():never{invalidated=true;cancelRequests();window.dispatchEvent(new Event('decoration:session-expired'));throw new SessionError(401,'登录身份已变化，请重新进入装修办理')}
export const host:DecorationHost=window.decorationHost||{
 async context(){
  const session=authState.session,me=authState.authorization
  if(!session||!me?.user?.id)throw new SessionError(401,'请先登录装修应用')
  return {userId:me.user.id,applicationId:session.applicationId,sessionEntryCode:'decoration-h5',tenantId:session.tenantDomain}
 },
 async request(input){try{return await sessionRequest(input.path,input.method,input.body,{signal:input.signal,responseType:input.responseType})}catch(error){if(error instanceof SessionError&&error.message.startsWith('Mobile.'))error.message=mobileMessages[error.message.slice(7) as keyof typeof mobileMessages]||error.message;throw error}},
 async permissions(){
  const menus=await sessionRequest<AuthorizedMenu[]>('/menu/user-own/tree','POST',{paging:false,terms:[{column:'owner',value:'app'}],sorts:[{name:'sortIndex',order:'asc'}]})
  if(!Array.isArray(menus))throw new SessionError(502,'无法读取当前账号的装修操作授权')
  return mobilePermissions(menus)
 }
}
export async function resolveContext(){if(!window.decorationHost)return validateContext(await host.context());if(invalidated)changed();const context=validateContext(await host.context()),key=identity(context);if(initial&&initial!==key)changed();if(initial&&businessProject!==context.businessProjectId){cancelRequests();window.dispatchEvent(new CustomEvent('decoration:project-changed',{detail:context.businessProjectId||''}))}initial=key;businessProject=context.businessProjectId;return context}
export const transport:Transport=async<T>(path:string,method:Method,body?:unknown,signal?:AbortSignal,responseType?:'blob'):Promise<T>=>{
 validatePath(path);await resolveContext();const controller=new AbortController();active.add(controller)
 const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort()
 try{const result=await host.request<T>({path,method,body,signal:controller.signal,responseType});await resolveContext();return result}
 finally{signal?.removeEventListener('abort',abort);active.delete(controller)}
}
