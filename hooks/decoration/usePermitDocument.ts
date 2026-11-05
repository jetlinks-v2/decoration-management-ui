import {computed,onScopeDispose,ref,watch,nextTick} from 'vue'
import {useI18n} from 'vue-i18n'
import type {DecorationApi} from '../../services/decorationApi'
import type {PermitDocument} from '../../types/decoration'
import type {useApplicationDetail} from './useApplicationDetail'
import {capturePermitImage,printPermitImage} from '../../services/permitImage'
import {downloadBlob} from '../../services/blobDownload'
import {errorText} from '../../utils/decoration'

type Detail=Pick<ReturnType<typeof useApplicationDetail>,'row'|'saving'|'error'|'uncertain'|'resultMissing'|'execute'|'confirm'|'retryOriginal'>
/** 先完整生成带章证件，再登记打印；沿用原动作幂等/未知结果核对，不因重开预览重写业务。 */
export function usePermitDocument(api:DecorationApi,detail:Detail,element:()=>HTMLElement|undefined,onChanged:()=>void) {
 const {t}=useI18n(),open=ref(false),document=ref<PermitDocument>(),working=ref(false),error=ref('')
 let generation=0,disposed=false,pendingImage:Blob|undefined,registered=false,releasePrint:(()=>void)|undefined
 const busy=computed(()=>working.value||detail.saving.value)
 const view=computed(()=>({open:open.value,document:document.value,busy:busy.value,error:error.value,uncertain:detail.uncertain.value,resultMissing:detail.resultMissing.value}))
 const message=(value:unknown)=>{const key=errorText(value);return t(key)}
 function clear(){generation++;document.value=undefined;pendingImage=undefined;registered=false;error.value='';open.value=false;working.value=false}
 watch(()=>detail.row.value?.id,clear)
 onScopeDispose(()=>{disposed=true;clear();releasePrint?.()})
 async function prepare(){
  if(busy.value||detail.uncertain.value||!detail.row.value)return
  const token=++generation,id=detail.row.value.id;open.value=true;working.value=true;error.value='';document.value=undefined;pendingImage=undefined;registered=false
  try{const result=await api.permitDocument(id);if(!disposed&&token===generation)document.value=result}
  catch(e){if(!disposed&&token===generation)error.value=message(e)}
  finally{if(!disposed&&token===generation)working.value=false}
 }
 function close(){if(busy.value||detail.uncertain.value)return false;clear();return true}
 async function capture(){
  const snapshot=document.value;await nextTick();const target=element()
  if(!snapshot||!target)throw new Error('Decoration.permitDocument.notReady')
  const image=await capturePermitImage(target)
  if(disposed||snapshot!==document.value||snapshot.application.id!==detail.row.value?.id||snapshot.application.version!==detail.row.value?.version)throw new Error('Decoration.permitDocument.changed')
  return image
 }
 async function output(){
  if(!pendingImage)return
  releasePrint?.();releasePrint=await printPermitImage(pendingImage);pendingImage=undefined;registered=false
  if(document.value&&detail.row.value)document.value={...document.value,application:detail.row.value}
  onChanged()
 }
 async function print(){
  if(busy.value||detail.uncertain.value||!document.value)return
  working.value=true;error.value=''
  try{
   if(!registered){pendingImage=await capture();registered=await detail.execute('permit/print',{sealDigest:document.value.sealDigest})}
   if(registered)await output();else error.value=detail.error.value
  }
  catch(e){if(!disposed)error.value=message(e)}
  finally{if(!disposed)working.value=false}
 }
 async function recover(retry=false){
  if(busy.value||!pendingImage)return
  working.value=true;error.value=''
  try{if(await (retry?detail.retryOriginal():detail.confirm())){registered=true;await output()}else error.value=detail.error.value}
  catch(e){if(!disposed)error.value=message(e)}
  finally{if(!disposed)working.value=false}
 }
 async function download(){
  if(busy.value||detail.uncertain.value||!document.value)return
  working.value=true;error.value=''
  try{downloadBlob(await capture(),`装修开工证-${document.value.application.spaceName}.png`)}
  catch(e){if(!disposed)error.value=message(e)}
  finally{if(!disposed)working.value=false}
 }
 return {view,busy,prepare,close,print,download,recover}
}
