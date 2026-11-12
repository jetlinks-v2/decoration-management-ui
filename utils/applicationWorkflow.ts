import type {Application} from '../types/decoration'
import {nextRefund,permitReceived} from './decoration'
import {reviewItems} from './reviewItems'
export type OwnerStep='apply'|'pay'|'permit'|'first'|'second'|'refund'
export type StepState='active'|'done'|'disabled'
export interface WorkflowStep {key:OwnerStep; title:string; description:string; state:StepState; icon:string}
/** 付款、备案、退费以各自回执为准；手动结束不能被展示成已退费。 */
export function ownerSteps(row?:Application):WorkflowStep[]{
 const reviewed=!!row&&row.depositReviewStatus===1&&reviewItems(row).every(m=>!(m.definition.required||m.fileIds.length)||m.reviewStatus===1)
 const paid=row?.paymentStatus===2,issued=permitReceived(row?.permit)
 const firstPassed=row?.refundStatus===2||!!row&&['pending_second_acceptance','second_acceptance_waiting','second_acceptance_in_progress','second_acceptance_failed','acceptance_passed'].includes(row.status)
 const secondPassed=row?.status==='acceptance_passed'||row?.refundStatus===2
 // 首页与详情共用二验后一次性退款资格。
 const refund=row?nextRefund(row):undefined
 const hasRefundRecord=!!row?.details.refunds?.length
 const refundDescription=row?.refundStatus===2?'退款已核验，装修办理完成'
  :row?.actualEndTime?'装修已结束，未完成退费请联系物业'
  :refund?`${refund.label}可办理，金额 ¥${refund.amount}`
  :hasRefundRecord?'可查看已退记录，二次验收通过后结算剩余金额'
  :'二次验收通过后，按协议一次性退还保证金'
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
  {key:'permit',title:'装修备案证明',icon:'SafetyCertificateOutlined',state:state(issued,paid),description:issued?'备案证明已完成，可查看备案信息':paid?'请联系物业打印或下载装修备案证明':'缴费完成后，可办理装修备案证明'},
  {key:'first',title:'首次验收',icon:'CheckCircleOutlined',state:state(firstPassed,issued),description:firstPassed?'首次验收已通过':acceptance(1)},
  {key:'second',title:'二次验收',icon:'AuditOutlined',state:state(!!secondPassed,firstPassed),description:secondPassed?'二次验收已通过':acceptance(2)},
  {key:'refund',title:'退费申请',icon:'AccountBookOutlined',state:state(row?.refundStatus===2,!!refund||hasRefundRecord||!!secondPassed),description:refundDescription}
 ]
}
