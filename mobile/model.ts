import type {Application, Task, Term} from '../types/decoration'
export type OwnerStep='apply'|'pay'|'permit'|'first'|'second'|'refund'
export type StaffTab='inspection'|'acceptance'|'history'
export type StepState='active'|'done'|'disabled'
export interface WorkflowStep {key:OwnerStep; title:string; description:string; state:StepState; icon:string}
/** 付款、领证、退费以各自回执为准；手动结束不能被展示成已退费。 */
export function ownerSteps(row?:Application):WorkflowStep[]{
 const reviewed=!!row&&row.depositReviewStatus===1&&row.details.materials.every(m=>!(m.definition.required||m.fileIds.length)||m.reviewStatus===1)
 const paid=row?.paymentStatus===2,issued=row?.permit?.printTime!=null
 const firstPassed=row?.refundStatus===2||!!row&&['pending_second_acceptance','second_acceptance_waiting','second_acceptance_in_progress','second_acceptance_failed','acceptance_passed'].includes(row.status)
 const secondPassed=row?.status==='acceptance_passed'||row?.refundStatus===2
 const state=(done:boolean,enabled:boolean):StepState=>done?'done':enabled?'active':'disabled'
 const acceptance=(type:1|2)=>{
  const prefix=type===1?'first':'second'
  if(row?.status===`${prefix}_acceptance_failed`)return '验收未通过，请整改后重新申请'
  if(row?.status===`${prefix}_acceptance_waiting`)return '验收已申请，等待物业安排人员'
  if(row?.status===`${prefix}_acceptance_in_progress`)return '物业正在办理，请耐心等待验收结果'
  return '装修完成后，选择日期申请物业验收'
 }
 return [
  {key:'apply',title:'装修申请',icon:'FileTextOutlined',state:state(reviewed,true),description:!row?'当前房屋还未发起装修申请':row.status==='rejected'?'存在不通过资料，请进入修改后重传':reviewed?'申请已完成，可查看资料审核结果':'资料已提交，等待物业逐项审核'},
  {key:'pay',title:'费用缴纳',icon:'WalletOutlined',state:state(paid,reviewed),description:paid?'费用已核验，查看缴费记录':reviewed?'资料审核已通过，请缴纳装修费用':'资料审核通过后，可办理费用缴纳'},
  {key:'permit',title:'领取装修备案证明',icon:'SafetyCertificateOutlined',state:state(issued,paid),description:issued?'装修备案证明已领取，可查看备案信息':paid?'请到物业前台领取装修备案证明':'缴费完成后，可领取装修备案证明'},
  {key:'first',title:'首次验收',icon:'CheckCircleOutlined',state:state(firstPassed,issued),description:firstPassed?'首次验收已通过':acceptance(1)},
  {key:'second',title:'二次验收',icon:'AuditOutlined',state:state(!!secondPassed,firstPassed),description:secondPassed?'二次验收已通过':acceptance(2)},
  {key:'refund',title:'退费申请',icon:'AccountBookOutlined',state:state(row?.refundStatus===2,!!secondPassed),description:row?.refundStatus===2?'退款已核验，装修办理完成':secondPassed?'验收已通过，可提交退费申请':'二次验收通过后，可申请退还保证金'}
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
