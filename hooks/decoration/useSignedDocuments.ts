import {ref,computed,watch,onScopeDispose} from 'vue'
import type {DecorationApi} from '../../services/decorationApi'
import type {CreateApplication,FormConfiguration} from '../../types/decoration'
import {documentContent,documentTitle,type DocumentKind,type SignedDocumentInput} from '../../utils/signedDocuments'
import {useUploadActivity} from './useUploadScope'
import {errorText} from '../../utils/decoration'
import {selfInspectionComplete,selfInspectionSnapshot} from '../../utils/selfInspection'
import {selfInspectionImage} from '../../utils/selfInspectionImage'
import {materialDocumentImage} from '../../utils/materialDocumentImage'
/** 签名和正文合成可下载PNG；正文变化或切换房屋后丢弃过期异步回执。 */
export function useSignedDocuments(api:DecorationApi,form:CreateApplication,config:()=>FormConfiguration){
 const saving=ref(false),error=ref('');const activity=useUploadActivity();let generation=0,disposed=false
 const content=(kind:DocumentKind)=>documentContent(kind,form,config())
 const selfDocument=computed(()=>form.signedDocuments?.find(d=>d.kind==='selfInspection'&&d.content===content('selfInspection')))
 watch(()=>[form.projectId,form.spaceId,form.customerId,content('selfInspection'),...config().materials.filter(item=>item.enabled&&item.kind==='material').map(item=>content(`material:${item.id}`))],()=>{
  generation++
  const valid=(form.signedDocuments||[]).filter(document=>(document.kind==='selfInspection'||config().materials.some(item=>item.enabled&&item.kind==='material'&&document.kind===`material:${item.id}`))&&document.content===content(document.kind))
  for(const old of form.signedDocuments||[]){if(old.kind.startsWith('material:')&&!valid.includes(old)){const material=form.materials.find(item=>old.kind===`material:${item.itemId}`);if(material)material.fileIds=material.fileIds.filter(id=>id!==old.documentFileId)}}
  form.signedDocuments=valid
 },{immediate:true,flush:'sync'})
 onScopeDispose(()=>{disposed=true;generation++})
 async function sign(kind:DocumentKind,signatureFileId:string,pages:string[]=[]){
  if(saving.value)return
  if(kind==='selfInspection'&&!selfInspectionComplete(form.selfInspectionItems)){error.value='请完成全部自检项后签字';return}
  const token=generation,snapshot=content(kind),project=form.projectId,selfSnapshot=kind==='selfInspection'?selfInspectionSnapshot(form,config()):undefined
  saving.value=true;error.value='';const done=activity()
  try{
   const signature=await api.download(signatureFileId);const url=URL.createObjectURL(signature)
   try{
    const image=new Image();image.src=url;await image.decode()
    let blob:Blob
    if(selfSnapshot)blob=await selfInspectionImage(selfSnapshot,image)
    else blob=await materialDocumentImage(snapshot,pages,image)
    if(disposed||token!==generation)return
    const receipt=await api.upload(new File([blob],`${documentTitle(kind,config())}.png`,{type:'image/png'}),project)
    if(disposed||token!==generation)return
    const signed:SignedDocumentInput={kind,content:snapshot,signatureFileId,documentFileId:receipt.id}
    form.signedDocuments=[...(form.signedDocuments||[]).filter(d=>d.kind!==kind),signed]
    if(kind.startsWith('material:')){const material=form.materials.find(item=>kind===`material:${item.itemId}`);if(material)material.fileIds=[receipt.id]}
   }finally{URL.revokeObjectURL(url)}
  }catch(e){if(!disposed&&token===generation)error.value=errorText(e)}finally{done();if(!disposed)saving.value=false}
 }
 function updateSelfInspection(key:string,value:unknown){
  if(saving.value||typeof value!=='boolean')return
  form.selfInspectionItems=form.selfInspectionItems?.map(item=>item.key===key?{...item,value}:item)
 }
 return {content,sign,saving,error,selfDocument,updateSelfInspection}
}
