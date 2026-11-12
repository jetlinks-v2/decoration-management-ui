import firePdfUrl from '../assets/material-templates/preview/TY-SNBD-GC-024_消防安全承诺书.pdf?url'
import noticePdfUrl from '../assets/material-templates/preview/TY-SNBD-GC-019_装修告知书.pdf?url'
import agreementPdfUrl from '../assets/material-templates/preview/TY-SNBD-GC-018_装修管理服务协议.pdf?url'
import applicationPdfUrl from '../assets/material-templates/preview/TY-SNBD-GC-012_装修申请表.pdf?url'
import fireUrl from '../assets/material-templates/TY-SNBD-GC-024_消防安全承诺书.docx?url'
import noticeUrl from '../assets/material-templates/TY-SNBD-GC-019_装修告知书.docx?url'
import agreementUrl from '../assets/material-templates/TY-SNBD-GC-018_装修管理服务协议.doc?url'
import applicationUrl from '../assets/material-templates/TY-SNBD-GC-012_装修申请表.docx?url'
import type {MaterialDefinition} from '../types/decoration'
import type {DecorationApi} from './decorationApi'
import {fixedMaterialItem} from '../utils/defaultMaterialItems'

// 原版空白文件随业务模块交付，不在浏览器保留旧系统地址、账号或存储密钥。
const templates={
 'fixed-fire-safety':{previewUrl:firePdfUrl,url:fireUrl,name:'TY-SNBD-GC-024_消防安全承诺书.docx'},
 'fixed-notice':{previewUrl:noticePdfUrl,url:noticeUrl,name:'TY-SNBD-GC-019_装修告知书.docx'},
 'fixed-service-agreement':{previewUrl:agreementPdfUrl,url:agreementUrl,name:'TY-SNBD-GC-018_装修管理服务协议.doc'},
 'fixed-application-form':{previewUrl:applicationPdfUrl,url:applicationUrl,name:'TY-SNBD-GC-012_装修申请表.docx'}
} as const

export function materialTemplate(item:MaterialDefinition){
 const id=fixedMaterialItem(item)?.id
 return id&&id in templates?templates[id as keyof typeof templates]:undefined
}

/** 保存前通过现有私有附件接口登记模板；已存在的回执和部分成功结果均保留。 */
export async function prepareMaterialTemplates(api:Pick<DecorationApi,'upload'>,projectId:string,items:MaterialDefinition[]){
 for(const item of items){
  const template=materialTemplate(item)
  if(!template||item.templateFileId)continue
  const response=await fetch(template.url)
  if(!response.ok)throw new Error(`无法读取资料模板：${item.name}`)
  const bytes=new Uint8Array(await response.arrayBuffer())
  const word=template.name.endsWith('.doc')
  const magic=word?[0xd0,0xcf,0x11,0xe0]:[0x50,0x4b,0x03,0x04]
  if(!magic.every((value,index)=>bytes[index]===value))throw new Error(`资料模板文件无效：${item.name}`)
  const file=new File([bytes],template.name,{type:word?'application/msword':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})
  const receipt=await api.upload(file,projectId,undefined,'template')
  item.templateFileId=receipt.id
 }
}
