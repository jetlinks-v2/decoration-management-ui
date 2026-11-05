import type {SessionContext} from '../types/decoration'
export class SessionError extends Error {constructor(public status:number,message:string){super(message)}}
export function identity(context:SessionContext){return JSON.stringify([context.userId,context.applicationId,context.sessionEntryCode,context.tenantId||''])}
export function validateContext(context:SessionContext){if(!context||![context.userId,context.applicationId,context.sessionEntryCode].every(v=>typeof v==='string'&&!!v.trim()))throw new SessionError(401,'请从已登录的应用重新进入装修办理');return context}
/** 入口编码只选择已有会话；不能推导业务项目或将应用ID当作租户。 */
export function browserSession(entry:string,app:string,raw:string|null,platformToken:unknown,origin:string){
 let session:{id?:string;domain?:string;token?:string;apiUrl?:string}={}
 if(entry){try{session=JSON.parse(raw||'null');if(!session||typeof session!=='object'||Array.isArray(session))throw new Error()}catch{throw new SessionError(401,'当前入口尚未登录')}}
 const token=entry?session.token:platformToken
 if(!app||typeof token!=='string'||!token.trim())throw new SessionError(401,'请先登录 SaaS 应用')
 const api=new URL(session.apiUrl||'/api',origin);if(api.origin!==origin)throw new SessionError(400,'装修服务必须使用同源地址')
 return {token,api:api.pathname.replace(/\/$/,''),tenant:session.domain&&session.domain!==app?session.domain:undefined}
}
export function validatePath(path:string){
 if(!path.startsWith('/decoration/')||path.includes('://')||path.includes('\\')||decodeURIComponent(path).includes('..'))throw new SessionError(400,'无效请求地址')
}
