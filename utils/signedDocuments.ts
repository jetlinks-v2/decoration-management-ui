import type {CreateApplication,FormConfiguration} from '../types/decoration'
export const documentTitles={selfInspection:'装修自检表',notices:'装修须知',application:'装修申请表',fire:'消防安全责任书'} as const
export type DocumentKind=keyof typeof documentTitles
export interface SignedDocumentInput {kind:DocumentKind;content:string;signatureFileId:string;documentFileId:string}
export interface SignedDocument extends SignedDocumentInput {title:string;signedBy:string;signedName:string;signedTime:number}
/** 文书正文是纯文本快照；签署后编辑申请或配置会使原签名失效。与服务端快照逐字核对。 */
export function documentContent(kind:DocumentKind,form:CreateApplication,config:FormConfiguration):string {
 const common=[`房屋：${config.household.spaceName}`,`业主：${config.household.customerName}`,`联系电话：${form.contactPhone}`,`施工单位：${form.constructionUnit}`,`施工负责人：${form.constructionManager}`,`负责人电话：${form.managerPhone}`].join('\n')
 const agreement=[config.agreement.title,config.agreement.content,...config.agreement.supplements.map(s=>`${s.name}\n${s.content}`)].join('\n')
 // 与后端业务自然日一致，不能用 UTC 截断把上海零点签成前一天。
 const date=(n?:number)=>n===undefined?'':new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(n)
 const text=kind==='selfInspection'?`自检结果：${form.selfInspectionStatus===1?'有问题':'无问题'}\n自检说明：${form.selfInspectionRemark||''}`
 :kind==='application'?`装修类型：${form.decorationType}\n施工类型：${form.constructionType}\n开工日期：${date(form.startTime)}\n计划竣工日期：${date(form.completionTime)}\n业主证件：${form.ownerCertificate||''}\n负责人证件：${form.managerCertificate||''}\n协议保证金：${Number(config.agreement.deposit).toFixed(2)} 元`
 :kind==='fire'?`本人已阅读本项目装修协议及补充条款中的消防安全要求，承诺按约定办理装修并履行消防安全责任。\n${agreement}`:agreement
 return `${documentTitles[kind]}\n${common}\n\n${text}`
}
