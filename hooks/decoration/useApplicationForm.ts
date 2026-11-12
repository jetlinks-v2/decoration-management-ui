import {documentContent,type DocumentKind} from '../../utils/signedDocuments'
import {applicationContactError} from '../../utils/contactValidation'
import {provideUploadScope} from './useUploadScope'
import { ref, reactive, watch, onScopeDispose } from 'vue'
import type { DecorationApi } from '../../services/decorationApi'
import type { CreateApplication, FormConfiguration, Household, Application } from '../../types/decoration'
import { requestId, errorText, isUncertain } from '../../utils/decoration'
import {emptySelfInspectionItems,selfInspectionComplete,selfInspectionStatus} from '../../utils/selfInspection'
function emptyForm(projectId:string,owner=false):CreateApplication {
 return {requestId:requestId(),projectId,spaceId:'',customerId:'',contactPhone:'',ownerCertificate:'',constructionUnit:'',constructionManager:'',managerPhone:'',managerCertificate:'',constructionType:1,decorationType:'first',noticesAccepted:false,selfInspectionItems:owner?emptySelfInspectionItems():[],selfInspectionStatus:0,selfInspectionRemark:'',selfInspectionFiles:[],signatureFiles:[],signedDocuments:[],materials:[],startTime:undefined,completionTime:undefined}
}
export function useApplicationForm(api: DecorationApi, project: () => string, submitted: (row: Application) => void) {
 const {uploading}=provideUploadScope()
 const form=reactive<CreateApplication>(emptyForm(project(),api.mine))
 const households=ref<Household[]>([]),selected=ref(''),configuration=ref<FormConfiguration>(),loading=ref(false),saving=ref(false),error=ref(''),uncertain=ref(false),resultMissing=ref(false)
 let generation=0,directoryGeneration=0,configGeneration=0,disposed=false,pending:CreateApplication|undefined
 onScopeDispose(()=>{disposed=true;generation++;directoryGeneration++;configGeneration++})
 async function load(){
  const token=++directoryGeneration;loading.value=true;error.value=''
  try{const data=await api.households(project());if(!disposed&&token===directoryGeneration)households.value=data}
  catch(e){if(token===directoryGeneration)error.value=errorText(e)}finally{if(token===directoryGeneration)loading.value=false}
 }
 watch(project,()=>{generation++;configGeneration++;directoryGeneration++;selected.value='';configuration.value=undefined;households.value=[];Object.assign(form,emptyForm(project(),api.mine));pending=undefined;uncertain.value=false;resultMissing.value=false;saving.value=false;if(project())void load()},{immediate:true})
 // 业主自检由逐项答案汇总，PC导入线下签字文件；切换房屋均清空旧自检。
 watch(selected,()=>{form.selfInspectionItems=api.mine?emptySelfInspectionItems():[];form.signedDocuments=[];form.selfInspectionFiles=[]},{flush:'sync'})
 watch(()=>form.selfInspectionItems?.map(item=>`${item.key}:${item.value}`).join('|'),()=>{if(api.mine)form.selfInspectionStatus=selfInspectionStatus(form.selfInspectionItems)},{flush:'sync'})
 watch(()=>form.signedDocuments?.find(item=>item.kind==='selfInspection')?.documentFileId,id=>{if(api.mine)form.selfInspectionFiles=id?[id]:[]},{flush:'sync'})
 watch([selected,()=>form.decorationType],async()=>{
  const token=++configGeneration;configuration.value=undefined;form.materials=[]
  const home=households.value.find(h=>h.relationshipId===selected.value);if(!home)return
  form.spaceId=home.spaceId;form.customerId=home.customerId;form.contactPhone=home.telephone;loading.value=true;error.value=''
  try{const config=await api.form(project(),home.spaceId,home.customerId,form.decorationType);if(disposed||token!==configGeneration)return;configuration.value=config;form.materials=config.materials.filter(m=>m.enabled).map(m=>({itemId:m.id,fileIds:[]}))}
  catch(e){if(token===configGeneration)error.value=errorText(e)}finally{if(token===configGeneration)loading.value=false}
 })
 async function submit(){
  if(saving.value||uploading.value||!configuration.value||uncertain.value)return
  if(!form.startTime||!form.completionTime||!form.noticesAccepted||!form.contactPhone||!form.constructionManager||!form.constructionUnit||!form.managerPhone){error.value='请填写必填信息并确认装修须知';return}
  if(form.completionTime<form.startTime){error.value='竣工时间不能早于开始时间';return}
  const contactError=applicationContactError(form);if(contactError){error.value=contactError;return}
  if(api.mine&&!selfInspectionComplete(form.selfInspectionItems)){error.value='请完成全部自检项并签署装修自检表';return}
  const missing=configuration.value.materials.find(m=>m.enabled&&m.required&&!form.materials.find(u=>u.itemId===m.id)?.fileIds.length)
  if(missing){error.value=`请上传或签署：${missing.name}`;return}
  if(!api.mine&&!form.selfInspectionFiles.length){error.value='请导入业主签字后的装修自检表';return}
  if(api.mine){
   const expected:DocumentKind[]=['selfInspection',...configuration.value.materials.filter(item=>item.enabled&&item.kind==='material'&&form.materials.some(upload=>upload.itemId===item.id&&upload.fileIds.length)).map(item=>`material:${item.id}` as const)]
   const unsigned=expected.find(kind=>!form.signedDocuments?.some(document=>document.kind===kind&&document.content===documentContent(kind,form,configuration.value!)))
   if(unsigned){error.value=unsigned==='selfInspection'?'请签署装修自检表':`请签署：${configuration.value.materials.find(item=>unsigned===`material:${item.id}`)?.name||'装修资料'}`;return}
  }
  // 选填项可留空；只提交实际上传项，避免空附件触发服务端逐项校验。
  pending=JSON.parse(JSON.stringify({...form,materials:form.materials.filter(item=>item.fileIds.length)}));await send()
 }
 /** 未知结果保留原表单和幂等键；只有用户明确点击才重发原请求。 */
 async function send(){
  if(!pending||saving.value||uploading.value)return;const token=generation;saving.value=true;error.value='';resultMissing.value=false
  try{const row=await api.create(pending);if(!disposed&&token===generation){uncertain.value=false;pending=undefined;submitted(row)}}
  catch(e){if(!disposed&&token===generation){uncertain.value=isUncertain(e);error.value=errorText(e);if(!uncertain.value)pending=undefined}}
  finally{if(!disposed&&token===generation)saving.value=false}
 }
 async function confirmResult(){
  if(saving.value||!pending)return;const token=generation;saving.value=true;error.value=''
  try{const row=await api.creationResult(pending.requestId);if(!disposed&&token===generation){uncertain.value=false;pending=undefined;submitted(row)}}
  catch(e){if(token===generation){error.value=errorText(e);if((e as {status?:number;response?:{status?:number}}).status===404||(e as {response?:{status?:number}}).response?.status===404){resultMissing.value=true;error.value='尚未查到已提交结果，可以核对后重试原申请'}}}
  finally{if(token===generation)saving.value=false}
 }
 return {uploading,form,households,selected,configuration,loading,saving,error,uncertain,resultMissing,load,submit,confirmResult,retryOriginal:send}
}
