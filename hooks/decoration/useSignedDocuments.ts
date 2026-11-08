import {ref,watch,onScopeDispose} from 'vue'
import type {DecorationApi} from '../../services/decorationApi'
import type {CreateApplication,FormConfiguration} from '../../types/decoration'
import {documentTitles,documentContent,type DocumentKind,type SignedDocumentInput} from '../../utils/signedDocuments'
import {useUploadActivity} from './useUploadScope'
import {errorText} from '../../utils/decoration'
/** 签名和正文合成可下载PNG；正文变化或切换房屋后丢弃过期异步回执。 */
export function useSignedDocuments(api:DecorationApi,form:CreateApplication,config:()=>FormConfiguration){
 const saving=ref(false),error=ref('');const activity=useUploadActivity();let generation=0,disposed=false
 const content=(kind:DocumentKind)=>documentContent(kind,form,config())
 watch(()=>Object.keys(documentTitles).map(k=>content(k as DocumentKind)),()=>{generation++;form.signedDocuments=(form.signedDocuments||[]).filter(d=>d.content===content(d.kind))},{immediate:true})
 onScopeDispose(()=>{disposed=true;generation++})
 async function sign(kind:DocumentKind,signatureFileId:string){
  if(saving.value)return;const token=generation,snapshot=content(kind),project=form.projectId
  saving.value=true;error.value='';const done=activity()
  try{
   const signature=await api.download(signatureFileId);const url=URL.createObjectURL(signature)
   try{
    const image=new Image();image.src=url;await image.decode()
    const canvas=document.createElement('canvas');canvas.width=1000;const measure=canvas.getContext('2d');if(!measure)throw new Error('浏览器不支持文书生成')
    measure.font='24px sans-serif';const lines:string[]=[]
    for(const paragraph of snapshot.split('\n')){let line='';for(const char of paragraph){if(measure.measureText(line+char).width>880){lines.push(line);line=''}line+=char}lines.push(line)}
    canvas.height=140+lines.length*38+250;if(canvas.height>30000)throw new Error('文书内容过长，请精简协议内容后签署')
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#202020';ctx.font='24px sans-serif'
    lines.forEach((line,i)=>ctx.fillText(line,60,70+i*38));const y=100+lines.length*38
    ctx.fillText('签署确认：',60,y);ctx.drawImage(image,230,y-25,640,240)
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('文书图片生成失败')),'image/png'))
    if(disposed||token!==generation)return
    const receipt=await api.upload(new File([blob],`${documentTitles[kind]}.png`,{type:'image/png'}),project)
    if(disposed||token!==generation)return
    const signed:SignedDocumentInput={kind,content:snapshot,signatureFileId,documentFileId:receipt.id}
    form.signedDocuments=[...(form.signedDocuments||[]).filter(d=>d.kind!==kind),signed]
   }finally{URL.revokeObjectURL(url)}
  }catch(e){if(!disposed&&token===generation)error.value=errorText(e)}finally{done();if(!disposed)saving.value=false}
 }
 return {content,sign,saving,error}
}
