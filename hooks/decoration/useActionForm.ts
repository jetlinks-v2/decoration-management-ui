import { ref, reactive, watch, computed } from 'vue'
import type { DecorationApi } from '../../services/decorationApi'
import type { Employee, Action, Role } from '../../types/decoration'
import { errorText } from '../../utils/decoration'
import { useRoleOptions } from './useRoleOptions'
export function useActionForm(api:DecorationApi,action:()=>string,emit:(name:string,body:Partial<Action>,task:boolean)=>void,initial:()=>Partial<Action>=()=>({}),labels:()=>Role[]=()=>[]){
 const employees=ref<Employee[]>([]),error=ref(''),loading=ref(false)
 const roleOptions=useRoleOptions(api,labels)
 const form=reactive<Partial<Action>>({remark:'',type:1,assigneeIds:[],inspectionRoles:[],months:3,workers:[]})
 let token=0
 async function searchEmployees(keyword=''){const id=++token;loading.value=true;error.value='';try{const result=await api.employees({pageSize:50,terms:keyword?[{column:'name',termType:'like',value:`%${keyword}%`}]:[]});if(id===token)employees.value=result.data}catch(e){if(id===token)error.value=errorText(e)}finally{if(id===token)loading.value=false}}
 watch(action,value=>{Object.assign(form,{remark:'',type:1,assigneeIds:[],inspectionRoles:[],months:3,workers:[],startTime:undefined,endTime:undefined,completionTime:undefined,actualEndTime:undefined,acceptanceDate:undefined,reviewRoleId:undefined,reference:undefined},initial());if(value==='acceptance/assign'||value==='acceptance')void searchEmployees()},{immediate:true})
 function submit(){const name=action(); if(name==='end'&&!form.remark?.trim()){error.value='请填写结束原因';return}
  if(name==='acceptance'&&!form.acceptanceDate){error.value='请选择申请验收日期';return}
  if(name==='actual-end-time'&&!form.actualEndTime){error.value='请选择实际结束时间';return}
  if(name==='inspection/assign'&&(!form.inspectionRoles?.length||form.inspectionRoles.some(role=>!Number.isInteger(role.intervalDays)||role.intervalDays<1||role.intervalDays>1000)||!form.reviewRoleId||!form.startTime||!form.endTime||form.endTime<form.startTime)){error.value='请选择巡检角色，填写各角色的巡检间隔、整改复核角色和有效时段';return}
  if(name==='permit'&&(!form.safetyPerson||!form.safetyPhone||!form.content)){error.value='请填写安全负责人和装修内容';return}
  emit(name,{...form},name.includes('/assign')||name==='rectification/reassign')
 }
 watch(action,value=>{if(value==='inspection/assign')void roleOptions.search()},{immediate:true})
 // 选中项保留名称和已填周期，远程关键字查询不会清掉既有选择。
 const selectedRoles=computed(()=>form.inspectionRoles?.map(role=>role.roleId)||[])
 const inspectionOptions=computed(()=>Array.from(new Map([...(form.inspectionRoles||[]).map(role=>({id:role.roleId,name:role.roleName||role.roleId})),...roleOptions.roles.value].map(role=>[role.id,role])).values()))
 function changeRoles(value:unknown){const ids=Array.isArray(value)?value.filter((id):id is string=>typeof id==='string'):[];form.inspectionRoles=ids.map(id=>form.inspectionRoles?.find(role=>role.roleId===id)||{roleId:id,roleName:roleOptions.roles.value.find(role=>role.id===id)?.name,intervalDays:1})}
 return {form,employees,error,loading,searchEmployees,submit,roleOptions,selectedRoles,inspectionOptions,changeRoles}
}
