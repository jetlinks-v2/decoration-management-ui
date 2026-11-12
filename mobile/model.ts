import type {Task, Term, Household} from '../types/decoration'
export {ownerSteps} from '../utils/applicationWorkflow'
export {isCompletedWorkflow} from '../utils/decoration'
export type {OwnerStep,StepState,WorkflowStep} from '../utils/applicationWorkflow'
export type StaffTab='inspection'|'acceptance'|'history'
/** 仅二验通过并退款成功才办结；条件下推摘要查询，列表不读取详情。 */
export function ownerProcessingTerms(home:Household):Term[]{
 return [
  {column:'projectId',termType:'eq',value:home.projectId},
  {column:'spaceId',termType:'eq',value:home.spaceId},
  {type:'and',terms:[
   {column:'status',termType:'nin',value:['acceptance_passed','finished']},
   {type:'or',terms:[{column:'refundStatus',termType:'not',value:2},{column:'refundStatus',termType:'isnull',value:1,type:'or'}]}
  ]}
 ]
}
export const taskNames:Record<Task['kind'],string>={daily:'日常巡检',inspectionRecord:'巡检记录',firstAcceptance:'首次验收',secondAcceptance:'二次验收'}
export const taskStates:Record<string,string>={pending:'待办理',completed:'已完成',passed:'通过',failed:'不通过',owner_rectification:'待业主整改',rectification_rejected:'整改未通过',waiting_review:'待整改复核',rectified:'整改已完成',reissued:'已重新下发'}
/** 固定工作台条件与项目/搜索分开AND，服务端另注入本人资格与数据范围。 */
export function staffTerms(tab:StaffTab):Term[]{
 if(tab==='history')return [{column:'status',termType:'nin',value:['pending','waiting_review']},{column:'kind',termType:'nin',value:['daily']}]
 if(tab==='acceptance')return [{column:'kind',termType:'in',value:['firstAcceptance','secondAcceptance']},{column:'status',termType:'eq',value:'pending'}]
 return [{type:'and',terms:[{column:'kind',termType:'eq',value:'daily'},{column:'status',termType:'eq',value:'pending'},{type:'or',terms:[{column:'kind',termType:'eq',value:'inspectionRecord'},{column:'status',termType:'eq',value:'waiting_review'}]}]}]
}
export const dateText=(time?:number)=>time?new Date(time).toLocaleString('zh-CN',{hour12:false}):'—'
