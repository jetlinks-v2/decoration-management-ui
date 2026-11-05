import {ref,onScopeDispose} from 'vue'
import type {DecorationApi} from '../../services/decorationApi'
import type {Role} from '../../types/decoration'
import {errorText} from '../../utils/decoration'
/** 按关键字查询公开角色目录；晚到结果不能覆盖新搜索，目录失败明确展示。 */
export function useRoleOptions(api:DecorationApi,initial:()=>Role[]=()=>[]){
 const roles=ref<Role[]>([]),loading=ref(false),error=ref('')
 const known=new Map<string,Role>()
 let generation=0
 async function search(keyword=''){
  const token=++generation;loading.value=true;error.value=''
  try{const page=await api.roles({pageSize:50,terms:keyword?[{column:'name',termType:'like',value:`%${keyword}%`}]:[]});if(token===generation){roles.value=page.data;page.data.forEach(role=>known.set(role.id,role))}}
  catch(e){if(token===generation){roles.value=[];error.value=errorText(e)}}
  finally{if(token===generation)loading.value=false}
 }
 onScopeDispose(()=>{generation++})
 function options(ids:(string|undefined)[]=[]){const all=new Map(roles.value.map(role=>[role.id,role]));for(const id of ids){const selected=initial().find(role=>role.id===id)||known.get(id||'');if(selected&&!all.has(selected.id))all.set(selected.id,selected)}return Array.from(all.values())}
 return {roles,loading,error,search,options}
}
