import {onScopeDispose,ref,watch} from 'vue'
import type {DecorationApi} from '../../services/decorationApi'
import {errorText} from '../../utils/decoration'
/** 私有快照经认证读取，切换申请或卸载后释放URL，迟到响应不能覆盖新证件。 */
export function usePermitSnapshot(api:DecorationApi,fileId:()=>string|undefined){
 const url=ref(''),error=ref(''),loading=ref(false)
 let generation=0
 function release(){if(url.value)URL.revokeObjectURL(url.value);url.value=''}
 async function load(){
  const token=++generation,id=fileId();release();error.value='';loading.value=!!id
  if(!id)return
  try{const blob=await api.download(id);if(token===generation)url.value=URL.createObjectURL(blob)}
  catch(e){if(token===generation)error.value=errorText(e)}
  finally{if(token===generation)loading.value=false}
 }
 watch(fileId,load,{immediate:true})
 onScopeDispose(()=>{generation++;release()})
 return {url,error,loading,load}
}
