import {computed,ref,watch} from 'vue'
import type {CheckItem,Configuration} from '../../types/decoration'
import {requestId} from '../../utils/decoration'

export interface CheckCategoryDraft {id:string;name:string;sort:number;items:CheckItem[]}
type Translator=(key:string,params?:Record<string,string|number>)=>string
/** 分类是编辑层级；保存仍沿用检查项的category/categorySort，兼容导入和既有申请快照。 */
export function useCheckConfiguration(configuration:()=>Configuration,busy:()=>boolean,t:Translator){
 const groups=ref<CheckCategoryDraft[]>([]),error=ref('')
 const ready=computed(()=>{const value=configuration();return !!(value.projectId&&value.houseType&&['first','second'].includes(value.decorationType)&&['daily','firstAcceptance','secondAcceptance'].includes(value.scene))})
 const total=computed(()=>groups.value.reduce((count,group)=>count+group.items.length,0))
 // 仅在替换配置或检查数组时重建分类，输入分类名时不会丢失尚未添加检查项的分类草稿。
 watch(()=>configuration().content.checks,items=>{
  const categories=new Map<string,CheckCategoryDraft>()
  for(const item of items){
   const name=item.category?.trim()||''
   let group=categories.get(name)
   if(!group){group={id:requestId(),name,sort:item.categorySort??categories.size+1,items:[]};categories.set(name,group)}
   group.items.push(item)
  }
  groups.value=[...categories.values()].sort((a,b)=>a.sort-b.sort)
  groups.value.forEach(group=>group.items.sort((a,b)=>a.sort-b.sort))
  error.value=''
 },{immediate:true})
 /** 分类改名、排序或增删同步到同一份检查项草稿，保留检查项ID与参考附件。 */
 function sync(){
  const items=groups.value.flatMap(group=>group.items.map(item=>{item.category=group.name.trim();item.categorySort=group.sort;return item}))
  configuration().content.checks.splice(0,configuration().content.checks.length,...items)
 }
 function editable(){return ready.value&&!busy()}
 function addCategory(){
  if(!editable())return
  groups.value.push({id:requestId(),name:'',sort:Math.max(0,...groups.value.map(group=>group.sort||0))+1,items:[]});error.value=''
 }
 function renameCategory(group:CheckCategoryDraft,name:string){if(!editable())return;group.name=name;sync()}
 function sortCategory(group:CheckCategoryDraft,value:number|string|null){if(!editable())return;group.sort=Number(value??0);sync()}
 function removeCategory(group:CheckCategoryDraft){if(!editable())return;groups.value=groups.value.filter(item=>item.id!==group.id);sync();error.value=''}
 function addItem(group:CheckCategoryDraft){
  if(!editable()||!group.name.trim())return
  if(total.value>=200){error.value=t('Decoration.checkConfiguration.tooMany');return}
  group.items.push({id:requestId(),category:group.name.trim(),categorySort:group.sort,name:'',inputType:'text',required:true,enabled:true,options:[],sort:Math.max(0,...group.items.map(item=>item.sort))+1});sync();error.value=''
 }
 function removeItem(group:CheckCategoryDraft,id:string){if(!editable())return;group.items=group.items.filter(item=>item.id!==id);sync()}
 /** 空分类不能被扁平存储，保存前明确提示补充检查项；重复分类名也不能隐式合并。 */
 function validate(){
  error.value=''
  if(!ready.value){error.value=t('Decoration.checkConfiguration.chooseScope');return false}
  const names=new Set<string>()
  for(const group of groups.value){
   const name=group.name.trim()
   if(!name){error.value=t('Decoration.checkConfiguration.nameRequired');return false}
   if(names.has(name)){error.value=t('Decoration.checkConfiguration.duplicateName',{name});return false}names.add(name)
   if(!Number.isInteger(group.sort)||group.sort<1){error.value=t('Decoration.checkConfiguration.invalidSort');return false}
   if(!group.items.length){error.value=t('Decoration.checkConfiguration.emptyCategory',{name});return false}
   for(const item of group.items){
    if(!item.name.trim()){error.value=t('Decoration.checkConfiguration.itemRequired',{name});return false}
    if(item.inputType==='option'&&!item.options.some(value=>value.trim())){error.value=t('Decoration.checkConfiguration.optionsRequired',{name:item.name});return false}
    if(item.inputType==='number'&&item.min!=null&&item.max!=null&&item.min>item.max){error.value=t('Decoration.checkConfiguration.invalidRange',{name:item.name});return false}
   }
  }
  sync();return true
 }
 return {groups,ready,total,error,addCategory,renameCategory,sortCategory,removeCategory,addItem,removeItem,validate}
}
