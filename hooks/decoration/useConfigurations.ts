import {provideUploadScope} from './useUploadScope'
import {ref,computed,onMounted,onScopeDispose} from 'vue'
import {usePermission} from '@jetlinks-web/hooks'
import {useDictionaries} from '../useDecorationDictionaries'
import {decorationApi as api} from '../../api/decoration'
import {projectTree,projectTerms,configurationQueryTerms,refundTotal,errorText,isUncertain} from '../../utils/decoration'
import type {ConditionTerm,ConditionFilterChangePayload} from '@jetlinks-web-core/components/ConditionFilter/types'
import type {Configuration,ConfigurationKind} from '../../types/decoration'
export const kinds:{value:ConfigurationKind;label:string;menu:string}[]=[{value:'agreement',label:'装修协议',menu:'AgreementConfiguration'},{value:'materials',label:'装修资料配置',menu:'MaterialConfiguration'},{value:'checks',label:'巡检与验收内容配置',menu:'CheckConfiguration'},{value:'validity',label:'备案有效期',menu:'ValidityConfiguration'}]
export function emptyConfiguration(projectId:string,kind:ConfigurationKind):Configuration{return {projectId,kind,houseType:'',decorationType:kind==='materials'||kind==='checks'?'first':'',scene:kind==='checks'?'daily':'',name:'',enabled:true,version:0,content:{agreement:kind==='agreement'?{title:'装修协议',content:'',chargeItemId:'',chargeItemName:'',deposit:1000,fees:{},supplements:[]}:undefined,materials:[],checks:[],validityMonths:3}}}
export function useConfigurations(initialKind:ConfigurationKind='agreement'){
 const {uploading}=provideUploadScope()
 const dictionary=useDictionaries()
 const projectNames=computed(()=>{const names:Record<string,string>={},pending=[...tree.value];while(pending.length){const node=pending.pop()!;names[node.value]=node.title;pending.push(...node.children)}return names})
 const terms=ref<ConditionTerm[]>([])
 const appliedTerms=ref<ConditionTerm[]>([])
 const projectId=ref(''),tree=ref<ReturnType<typeof projectTree>>([]),kind=ref<ConfigurationKind>(initialKind),rows=ref<Configuration[]>([]),total=ref(0),page=ref(1),loading=ref(false),saving=ref(false),error=ref(''),draft=ref<Configuration>(),uncertain=ref(false)
 const menu=kinds.find(item=>item.value===initialKind)!.menu
 const legacySave=usePermission('decoration/Configuration:save').hasPerm,legacyDelete=usePermission('decoration/Configuration:delete').hasPerm
 const sectionSave=usePermission(`decoration/${menu}:save`).hasPerm,sectionDelete=usePermission(`decoration/${menu}:delete`).hasPerm
 const canSave=computed(()=>legacySave.value||sectionSave.value),canDelete=computed(()=>legacyDelete.value||sectionDelete.value)
 let generation=0,disposed=false
 onScopeDispose(()=>{disposed=true;generation++})
 async function load(){const token=++generation;loading.value=true;error.value='';try{const result=await api.configurations({pageIndex:page.value-1,pageSize:20,terms:configurationQueryTerms(kind.value,appliedTerms.value,projectId.value)});if(token===generation&&!disposed){rows.value=result.data;total.value=result.total}}catch(e){if(token===generation)error.value=errorText(e)}finally{if(token===generation)loading.value=false}}
 async function save(){if(!draft.value||saving.value||uncertain.value||uploading.value)return;if(!draft.value.projectId){error.value='请选择所属项目';return}
 // 资料配置按维度识别，名称仅保留为既有接口的内部字段，不要求用户重复填写。
 if(draft.value.kind==='materials'&&!draft.value.name.trim())draft.value.name='装修资料配置'
 saving.value=true;error.value='';try{await api.saveConfiguration(structuredClone(JSON.parse(JSON.stringify(draft.value))));draft.value=undefined;await load()}catch(e){error.value=errorText(e);uncertain.value=isUncertain(e)}finally{saving.value=false}}
 /** 配置弹窗关闭直接丢弃草稿；外部写入或结果未知时必须先完成或核对。 */
 function closeDraft(){if(saving.value||uncertain.value||uploading.value){error.value='正在上传、保存或核对结果，请稍后再关闭';return false}draft.value=undefined;return true}
 async function remove(row:Configuration){if(saving.value||uploading.value)return;saving.value=true;error.value='';try{await api.deleteConfiguration(row);await load()}catch(e){error.value=errorText(e)}finally{saving.value=false}}
 function edit(row?:Configuration){if(uploading.value)return;draft.value=row?JSON.parse(JSON.stringify(row)):emptyConfiguration(projectId.value,kind.value);const agreement=draft.value?.content.agreement;if(agreement&&(agreement.firstRefund!=null||agreement.secondRefund!=null)){agreement.refundAmount=refundTotal(agreement,agreement.deposit);delete agreement.firstRefund;delete agreement.secondRefund}uncertain.value=false}
 // 新增表单独立选择项目；切换时重建草稿，避免沿用旧项目的附件和费用配置。
 function changeDraftProject(value?:string){if(saving.value||uncertain.value||uploading.value)return;draft.value=emptyConfiguration(value||'',kind.value)}
 // 切换对象范围后立即移除旧行，避免加载中或失败时把旧项目、旧类别的操作留在新范围下。
 function changeProject(value:string){if(saving.value||uncertain.value||uploading.value)return;draft.value=undefined;rows.value=[];total.value=0;projectId.value=value||'';page.value=1;void load()}
 function changeKind(value:string|number){if(saving.value||uncertain.value||uploading.value)return;draft.value=undefined;rows.value=[];total.value=0;kind.value=value as ConfigurationKind;terms.value=[];appliedTerms.value=[];page.value=1;void load()}
 // 新筛选从首页查询；沿用generation防止旧分页响应覆盖当前条件。
 function changeFilters(value:ConditionFilterChangePayload){appliedTerms.value=value.filter.terms;page.value=1;void load()}
 async function confirm(){if(!draft.value)return;const key=draft.value;try{const result=await api.configurations({pageSize:100,terms:projectTerms([{column:'kind',termType:'eq',value:key.kind},{column:'houseType',termType:'eq',value:key.houseType},{column:'decorationType',termType:'eq',value:key.decorationType},{column:'scene',termType:'eq',value:key.scene}],key.projectId)});const current=result.data[0];if(current&&current.version>key.version){draft.value=current;error.value='已读取当前保存结果，请核对配置内容'}else error.value='尚未发现已保存结果，可以使用原配置再次保存';uncertain.value=false;await load()}catch(e){error.value=errorText(e)}}
 onMounted(async()=>{try{tree.value=projectTree(await api.projects());await load()}catch(e){error.value=errorText(e)}})
 return {uploading,api,kinds,dictionary,projectNames,projectId,tree,kind,terms,changeFilters,rows,total,page,loading,saving,error,draft,uncertain,canSave,canDelete,load,save,closeDraft,remove,edit,changeDraftProject,changeProject,changeKind,confirm}
}
