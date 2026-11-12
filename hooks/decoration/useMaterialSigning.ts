import {ref,computed,watch,onScopeDispose} from 'vue'
import type {MaterialDefinition,CreateApplication,FormConfiguration} from '../../types/decoration'
import type {DecorationApi} from '../../services/decorationApi'
import {loadMaterialPages} from '../../services/materialDocument'
import {useSignedDocuments} from './useSignedDocuments'
import {errorText} from '../../utils/decoration'

/** 当前资料独立加载正文；切换项目、资料或模板时释放旧预览并拒绝晚到结果。 */
export function useMaterialSigning(api:DecorationApi,form:CreateApplication,configuration:()=>FormConfiguration,item:()=>MaterialDefinition){
 const documents=useSignedDocuments(api,form,configuration),pages=ref<string[]>([]),loading=ref(false),error=ref('')
 let generation=0,disposed=false
 const signed=computed(()=>form.signedDocuments?.find(document=>document.kind===`material:${item().id}`&&document.content===documents.content(document.kind)))
 const release=()=>{pages.value.forEach(URL.revokeObjectURL);pages.value=[]}
 async function load(){
  const token=++generation;release();loading.value=true;error.value=''
  try{const urls=await loadMaterialPages(api,item());if(disposed||token!==generation)urls.forEach(URL.revokeObjectURL);else pages.value=urls}
  catch(e){if(!disposed&&token===generation)error.value=errorText(e)}finally{if(!disposed&&token===generation)loading.value=false}
 }
 watch(()=>[form.projectId,item().id,item().templateFileId],()=>{void load()},{immediate:true})
 onScopeDispose(()=>{disposed=true;generation++;release()})
 async function sign(signature:string){if(!loading.value&&pages.value.length)await documents.sign(`material:${item().id}`,signature,pages.value)}
 return {pages,loading,error,load,sign,signed,saving:documents.saving,signError:documents.error}
}
