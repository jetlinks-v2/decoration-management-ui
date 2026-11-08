import {ref,computed,onScopeDispose,watch} from 'vue'
import type {DecorationApi} from '../../services/decorationApi'
import {drawMarks,type ImageMark} from '../../utils/imageAnnotations'
import {errorText} from '../../utils/decoration'
import {useUploadActivity} from './useUploadScope'
export function useImageAnnotation(api:DecorationApi, scope:()=>{projectId:string;decorationId:string;sourceId?:string;marks?:ImageMark[]}, saved:(fileId:string,sourceId:string,marks:ImageMark[])=>void){
 const imageUrl=ref(''),marks=ref<ImageMark[]>([]),loading=ref(false),saving=ref(false),error=ref('')
 const savedSnapshot=ref('');const dirty=computed(()=>JSON.stringify({source:scope().sourceId,marks:marks.value})!==savedSnapshot.value)
 const startUpload=useUploadActivity();let generation=0,disposed=false
 function clear(){if(imageUrl.value)URL.revokeObjectURL(imageUrl.value);imageUrl.value=''}
 watch(()=>scope().sourceId,async id=>{
  const token=++generation;clear();marks.value=(scope().marks||[]).map(m=>({...m}));savedSnapshot.value=JSON.stringify({source:id,marks:marks.value});error.value=''
  if(!id){loading.value=false;return}loading.value=true
  try{const blob=await api.download(id);if(disposed||token!==generation)return
   if(!['image/png','image/jpeg','image/webp','image/gif'].includes(blob.type))throw new Error('此附件不是可批注图片，请选择 PNG、JPEG、WebP 或 GIF 图片')
   imageUrl.value=URL.createObjectURL(blob)
  }catch(e){if(token===generation)error.value=errorText(e)}finally{if(token===generation)loading.value=false}
 },{immediate:true})
 onScopeDispose(()=>{disposed=true;generation++;clear()})
 async function save(){
  if(saving.value||loading.value||!imageUrl.value||!scope().sourceId)return
  const token=generation,sourceId=scope().sourceId!,snapshot=marks.value.map(m=>({...m})),context=scope()
  saving.value=true;error.value='';const done=startUpload()
  try{
   const image=new Image();image.src=imageUrl.value;await image.decode()
   if(image.naturalWidth*image.naturalHeight>24000000)throw new Error('图片超过2400万像素，请压缩后再批注')
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error('浏览器不支持图片批注')
   ctx.drawImage(image,0,0);drawMarks(ctx,snapshot,canvas.width,canvas.height)
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('批注图片生成失败')),'image/png'))
   const result=await api.upload(new File([blob],'审核批注.png',{type:'image/png'}),context.projectId,context.decorationId)
   if(!disposed&&token===generation){savedSnapshot.value=JSON.stringify({source:sourceId,marks:snapshot});saved(result.id,sourceId,snapshot)}
  }catch(e){if(!disposed&&token===generation)error.value=errorText(e)}finally{done();if(!disposed)saving.value=false}
 }
 return {imageUrl,marks,loading,saving,error,dirty,save}
}
