import { ref, reactive, watch, computed, onScopeDispose } from 'vue'
import type { DecorationApi } from '../../services/decorationApi'
import type { Employee, Action, Role } from '../../types/decoration'
import { errorText } from '../../utils/decoration'
import { useRoleOptions } from './useRoleOptions'
export function useActionForm(api:DecorationApi,action:()=>string,emit:(name:string,body:Partial<Action>,task:boolean)=>void,initial:()=>Partial<Action>=()=>({}),labels:()=>Role[]=()=>[],selectEmployeeMessage=()=> '请选择验收人员',projectId:()=>string|undefined=()=>undefined){
 const employees=ref<Employee[]>([]),error=ref(''),loading=ref(false)
 const employeeSearchState=ref<'idle'|'loading'|'success'|'error'>('idle'),employeeError=ref('')
 const roleOptions=useRoleOptions(api,labels)
 const form=reactive<Partial<Action>>({remark:'',type:1,assigneeIds:[],inspectionRoles:[],months:3,workers:[]})
 let token=0
 let searchTimer:ReturnType<typeof setTimeout>|undefined,employeeRequest:AbortController|undefined
 function cancelEmployeeSearch(){++token;clearTimeout(searchTimer);searchTimer=undefined;employeeRequest?.abort();employeeRequest=undefined}
 // 项目切换使旧请求失效，禁止把上一项目的人选带入下一笔申请。
 async function searchEmployees(keyword=''){
  cancelEmployeeSearch()
  const id=token,project=projectId(),name=keyword.trim();employees.value=[];employeeError.value='';employeeSearchState.value='idle'
  // 后端先限定当前应用成员和有效员工，再校验各人的项目权限。
  if(!project||api.mine){loading.value=false;return}
  const controller=new AbortController();employeeRequest=controller
  loading.value=true;employeeSearchState.value='loading'
  try{const result=await api.employees(project,{pageSize:50,terms:name?[{column:'name',termType:'like',value:`%${name}%`}]:[]},controller.signal);if(id===token){employees.value=result.data;employeeSearchState.value='success'}}
  catch(e){if(id===token&&!controller.signal.aborted){employeeError.value=errorText(e);employeeSearchState.value='error'}}finally{if(id===token){loading.value=false;employeeRequest=undefined}}
 }
 // 输入停顿后再查询；切换条件及卸载时取消计时器和旧请求，不复用跨项目权限结果。
 function scheduleEmployeeSearch(keyword=''){
  cancelEmployeeSearch();employees.value=[];employeeError.value='';employeeSearchState.value='idle'
  if(!projectId()||api.mine){loading.value=false;return}
  loading.value=true;employeeSearchState.value='loading';searchTimer=setTimeout(()=>{void searchEmployees(keyword)},300)
 }
 watch(action,()=>{Object.assign(form,{remark:'',type:1,assigneeIds:[],inspectionRoles:[],months:3,workers:[],safetyPerson:undefined,safetyPhone:undefined,content:undefined,entrusted:false,startTime:undefined,endTime:undefined,completionTime:undefined,actualEndTime:undefined,acceptanceDate:undefined,reviewRoleId:undefined,reference:undefined},initial())},{immediate:true})
 // 动作和项目同时更新也只查询一次；不复用上一项目的候选或错误状态。
 watch([action,projectId],([value])=>{cancelEmployeeSearch();employees.value=[];form.assigneeIds=[];loading.value=false;error.value='';employeeError.value='';employeeSearchState.value='idle';if(['acceptance/assign','acceptance'].includes(value))void searchEmployees()},{immediate:true})
 onScopeDispose(cancelEmployeeSearch)
 function submit(){const name=action(); if(name==='end'&&!form.remark?.trim()){error.value='请填写结束原因';return}
  if(name==='acceptance/assign'&&!form.assigneeIds?.length){error.value=selectEmployeeMessage();return}
  if(name==='acceptance'&&!form.acceptanceDate){error.value='请选择申请验收日期';return}
  if(name==='actual-end-time'&&!form.actualEndTime){error.value='请选择实际结束时间';return}
  if(name==='inspection/assign'&&(!form.inspectionRoles?.length||form.inspectionRoles.some(role=>!Number.isInteger(role.intervalDays)||role.intervalDays<1||role.intervalDays>1000)||!form.reviewRoleId)){error.value='请选择巡查角色和整改复核角色，并填写各角色的巡检频率（每1至1000天一次）';return}
  if(['permit','permit/workers'].includes(name)&&(!form.safetyPerson||!form.safetyPhone||!form.content)){error.value='请填写安全负责人和装修内容';return}
  if(name==='permit/workers'&&form.workers?.some(worker=>!worker.name.trim()||!worker.phone.trim()||!worker.certificate.trim()||!worker.entryTime||!worker.expirationTime||worker.expirationTime<worker.entryTime)){error.value='请完整填写施工人员姓名、证件、电话、进场和截止日期，截止日期不能早于进场日期';return}
  emit(name,{...form},name.includes('/assign')||name==='rectification/reassign')
 }
 watch(action,value=>{if(value==='inspection/assign')void roleOptions.search()},{immediate:true})
 // 选中项保留名称和已填周期，远程关键字查询不会清掉既有选择。
 const selectedRoles=computed(()=>form.inspectionRoles?.map(role=>role.roleId)||[])
 const inspectionOptions=computed(()=>Array.from(new Map([...(form.inspectionRoles||[]).map(role=>({id:role.roleId,name:role.roleName||role.roleId})),...roleOptions.roles.value].map(role=>[role.id,role])).values()))
 function changeRoles(value:unknown){const ids=Array.isArray(value)?value.filter((id):id is string=>typeof id==='string'):[];form.inspectionRoles=ids.map(id=>form.inspectionRoles?.find(role=>role.roleId===id)||{roleId:id,roleName:roleOptions.roles.value.find(role=>role.id===id)?.name,intervalDays:1})}
 return {form,employees,error,loading,employeeSearchState,employeeError,searchEmployees,scheduleEmployeeSearch,submit,roleOptions,selectedRoles,inspectionOptions,changeRoles}
}
