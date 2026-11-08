import {ref,watch,onScopeDispose} from 'vue'
import type {DecorationApi} from '../../services/decorationApi'
import {errorText} from '../../utils/decoration'
export function useChargeItems(api:DecorationApi,project:()=>string){
 const items=ref<{id:string;name:string}[]>([]),loading=ref(false),error=ref('');let generation=0,disposed=false
 onScopeDispose(()=>{disposed=true;generation++})
 async function search(name=''){
  const token=++generation;items.value=[];error.value='';if(!project()){loading.value=false;return}loading.value=true
  try{const page=await api.chargeItems(project(),{pageSize:100,terms:name?[{column:'name',termType:'like',value:name}]:[]});if(!disposed&&token===generation)items.value=page.data}
  catch(e){if(!disposed&&token===generation)error.value=errorText(e)}finally{if(!disposed&&token===generation)loading.value=false}
 }
 watch(project,()=>search(),{immediate:true})
 return {items,loading,error,search}
}
