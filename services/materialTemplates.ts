import firePdfUrl from '../assets/material-templates/preview/消防安全承诺书.pdf?url'
import noticePdfUrl from '../assets/material-templates/preview/装修告知书.pdf?url'
import fireUrl from '../assets/material-templates/消防安全承诺书.docx?url'
import noticeUrl from '../assets/material-templates/装修告知书.docx?url'
import type {MaterialDefinition} from '../types/decoration'
import type {DecorationApi} from './decorationApi'
import {fixedMaterialItem} from '../utils/defaultMaterialItems'

// 使用用户提供的两份Word原文件；PDF仅用于在线阅读和签署。
const templates={
 'fixed-fire-safety':{previewUrl:firePdfUrl,url:fireUrl,name:'消防安全承诺书.docx'},
 'fixed-notice':{previewUrl:noticePdfUrl,url:noticeUrl,name:'装修告知书.docx'}
} as const

export function materialTemplate(item:MaterialDefinition){
 const id=fixedMaterialItem(item)?.id
 return id&&id in templates?templates[id as keyof typeof templates]:undefined
}

/** 保存时按文件内容升级旧模板；同版回执与部分成功结果复用，不改写历史申请附件。 */
export async function prepareMaterialTemplates(api:Pick<DecorationApi,'upload'|'download'>,projectId:string,items:MaterialDefinition[]){
 for(const item of items){
  const template=materialTemplate(item)
  if(!template)continue
  const response=await fetch(template.url)
  if(!response.ok)throw new Error(`无法读取资料模板：${item.name}`)
  const bytes=new Uint8Array(await response.arrayBuffer())
  if(item.templateFileId){
   const existing=new Uint8Array(await (await api.download(item.templateFileId)).arrayBuffer())
   if(existing.length===bytes.length&&existing.every((value,index)=>value===bytes[index]))continue
  }
  const word=template.name.endsWith('.doc')
  const magic=word?[0xd0,0xcf,0x11,0xe0]:[0x50,0x4b,0x03,0x04]
  if(!magic.every((value,index)=>bytes[index]===value))throw new Error(`资料模板文件无效：${item.name}`)
  const file=new File([bytes],template.name,{type:word?'application/msword':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})
  const receipt=await api.upload(file,projectId,undefined,'template')
  item.templateFileId=receipt.id
 }
}
