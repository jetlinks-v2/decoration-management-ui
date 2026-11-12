import {computed,ref,watch} from 'vue'
import dayjs from 'dayjs'
import type {DecorationApi} from '../../services/decorationApi'
import type {Application,Household} from '../../types/decoration'
import {useApplicationForm} from './useApplicationForm'
import {applicationContactError} from '../../utils/contactValidation'
import {documentContent} from '../../utils/signedDocuments'
import {selfInspectionComplete} from '../../utils/selfInspection'

/** 业主申请按信息、自检、图纸、逐项资料签字顺序办理；每步复用同一份申请草稿。 */
export function useOwnerApplicationForm(api:DecorationApi,household:()=>Household,submitted:(row:Application)=>void){
 const state=useApplicationForm(api,()=>household().projectId,submitted)
 const {form,configuration,error,households,selected,saving,uploading,uncertain}=state
 watch(households,items=>{if(items.some(item=>item.relationshipId===household().relationshipId))selected.value=household().relationshipId},{immediate:true})
 const step=ref(0),materialIndex=ref(0),busy=computed(()=>saving.value||uploading.value),dirty=computed(()=>!!selected.value||!!form.constructionUnit)
 const materials=computed(()=>configuration.value?.materials.filter(item=>item.enabled&&item.kind==='material').sort((a,b)=>a.sort-b.sort)||[])
 const currentMaterial=computed(()=>materials.value[materialIndex.value])
 const selfSigned=computed(()=>!!configuration.value&&selfInspectionComplete(form.selfInspectionItems)&&form.signedDocuments?.some(document=>document.kind==='selfInspection'&&document.content===documentContent('selfInspection',form,configuration.value!)))
 const dates=computed(()=>({start:form.startTime?dayjs(form.startTime).format('YYYY-MM-DD'):'',end:form.completionTime?dayjs(form.completionTime).format('YYYY-MM-DD'):''}))
 function materialSigned(id:string){const kind=`material:${id}` as const;return !!configuration.value&&!!form.signedDocuments?.some(document=>document.kind===kind&&document.content===documentContent(kind,form,configuration.value!))}
 function next(){
  if(busy.value||uncertain.value||!configuration.value)return
  if(step.value===0){
   if(!form.contactPhone||!form.constructionUnit||!form.constructionManager||!form.managerPhone||!form.startTime||!form.completionTime||!form.noticesAccepted){error.value='请填写申请信息并确认装修须知与协议';return}
   const contact=applicationContactError(form);if(contact){error.value=contact;return}
   if(form.completionTime<form.startTime){error.value='计划竣工日期不能早于开工日期';return}
  }
  if(step.value===1&&!selfSigned.value){error.value='请完成自检项并确认业主签名，保存签字自检表后继续';return}
  if(step.value===2){const missing=configuration.value.materials.find(item=>item.enabled&&item.kind==='drawing'&&item.required&&!form.materials.some(upload=>upload.itemId===item.id&&upload.fileIds.length));if(missing){error.value=`请上传：${missing.name}`;return}}
  if(step.value===3){const item=currentMaterial.value;if(item?.required&&!materialSigned(item.id)){error.value=`请签署：${item.name}`;return}materialIndex.value++}
  else step.value++
  error.value=''
 }
 function back(){if(busy.value||uncertain.value)return;if(step.value===3&&materialIndex.value>0)materialIndex.value--;else step.value--;error.value=''}
 function editMaterial(index:number){if(!busy.value&&!uncertain.value)materialIndex.value=index}
 async function submit(){
  if(!selfSigned.value){step.value=1;error.value='自检表尚未签署或内容已变更，请重新确认并签字';return}
  await state.submit()
 }
 return {...state,step,materialIndex,materials,currentMaterial,materialSigned,editMaterial,busy,dirty,dates,next,back,submit}
}
