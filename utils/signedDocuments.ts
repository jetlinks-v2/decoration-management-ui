import type {CreateApplication,FormConfiguration} from '../types/decoration'
import {selfInspectionContent} from './selfInspection'
export const documentTitles={selfInspection:'装修自检表'} as const
export type DocumentKind='selfInspection'|`material:${string}`
export interface SignedDocumentInput {kind:DocumentKind;content:string;signatureFileId:string;documentFileId:string}
export interface SignedDocument extends SignedDocumentInput {title:string;signedBy:string;signedName:string;signedTime:number}
export function documentTitle(kind:DocumentKind,config:FormConfiguration):string {
 return kind==='selfInspection'?'装修自检表':config.materials.find(item=>kind===`material:${item.id}`)?.name||'装修资料'
}
/** 签署正文绑定本次申请信息及配置模板回执；实际资料图片必须包含模板全文。 */
export function documentContent(kind:DocumentKind,form:CreateApplication,config:FormConfiguration):string {
 if(kind==='selfInspection')return selfInspectionContent(form,config)
 const item=config.materials.find(item=>kind===`material:${item.id}`)
 const date=(value?:number)=>value===undefined?'':new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(value)
 return [item?.name||'装修资料',`房屋：${config.household.spaceName}`,`业主：${config.household.customerName}`,`联系电话：${form.contactPhone}`,
  `施工单位：${form.constructionUnit}`,`施工负责人：${form.constructionManager}`,`负责人电话：${form.managerPhone}`,
  `装修类型：${form.decorationType}`,`施工类型：${form.constructionType}`,`开工日期：${date(form.startTime)}`,`计划竣工日期：${date(form.completionTime)}`,
  `业主证件：${form.ownerCertificate||''}`,`负责人证件：${form.managerCertificate||''}`,`资料模板：${item?.templateFileId||''}`].join('\n')
}
