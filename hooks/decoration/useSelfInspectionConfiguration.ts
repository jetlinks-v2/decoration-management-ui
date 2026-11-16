import {computed,ref,watch} from 'vue'
import type {Configuration,SelfInspectionDefinition} from '../../types/decoration'
import {requestId} from '../../utils/decoration'

interface SelfInspectionCategory {id:string;name:string;items:SelfInspectionDefinition[]}
type Translator=(key:string,params?:Record<string,string|number>)=>string

/** 先维护分类、再添加自检项；保存继续使用原有分组字段，保留已有项目ID及申请快照。 */
export function useSelfInspectionConfiguration(configuration:()=>Configuration,busy:()=>boolean,t:Translator){
 const categories=ref<SelfInspectionCategory[]>([]),error=ref('')
 const enabledCount=computed(()=>categories.value.reduce((count,category)=>count+category.items.filter(item=>item.enabled).length,0))
 watch(()=>configuration().content.selfInspections,items=>{
  const grouped=new Map<string,SelfInspectionCategory>()
  for(const item of [...items].sort((a,b)=>a.sort-b.sort)){
   let category=grouped.get(item.group)
   if(!category){category={id:item.group,name:item.groupTitle,items:[]};grouped.set(item.group,category)}
   category.items.push(item)
  }
  categories.value=[...grouped.values()];error.value=''
 },{immediate:true})
 function sync(){
  const items=categories.value.flatMap(category=>category.items.map(item=>{
   item.group=category.id;item.groupTitle=category.name.trim();item.optionTitle='是否正常';return item
  }))
  configuration().content.selfInspections.splice(0,configuration().content.selfInspections.length,...items)
 }
 function addCategory(){if(busy())return;categories.value.push({id:requestId(),name:'',items:[]});error.value=''}
 function renameCategory(category:SelfInspectionCategory,name:string){if(busy())return;category.name=name;sync()}
 function removeCategory(category:SelfInspectionCategory){if(busy())return;categories.value=categories.value.filter(value=>value.id!==category.id);sync();error.value=''}
 function addItem(category:SelfInspectionCategory){
  if(busy()||!category.name.trim())return
  const items=configuration().content.selfInspections
  if(items.length>=200){error.value=t('Decoration.selfInspectionConfiguration.tooMany');return}
  category.items.push({id:requestId(),group:category.id,groupTitle:category.name.trim(),optionTitle:'是否正常',name:'',enabled:true,sort:Math.max(0,...items.map(item=>item.sort))+1})
  sync();error.value=''
 }
 function removeItem(category:SelfInspectionCategory,id:string){if(busy())return;category.items=category.items.filter(item=>item.id!==id);sync()}
 /** 空分类不能写入原有扁平契约，保存前要求补齐名称及自检项，避免草稿静默丢失。 */
 function validate(){
  error.value='';const names=new Set<string>()
  for(const category of categories.value){
   const name=category.name.trim()
   if(!name){error.value=t('Decoration.selfInspectionConfiguration.nameRequired');return false}
   if(names.has(name)){error.value=t('Decoration.selfInspectionConfiguration.duplicateName',{name});return false}names.add(name)
   if(!category.items.length){error.value=t('Decoration.selfInspectionConfiguration.emptyCategory',{name});return false}
   if(category.items.some(item=>!item.name.trim())){error.value=t('Decoration.selfInspectionConfiguration.itemRequired',{name});return false}
   if(category.items.some(item=>!Number.isInteger(item.sort)||item.sort<1)){error.value=t('Decoration.selfInspectionConfiguration.invalidSort');return false}
  }
  sync();return true
 }
 return {categories,enabledCount,error,addCategory,renameCategory,removeCategory,addItem,removeItem,validate}
}
