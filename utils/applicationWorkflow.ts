import type {Application} from '../types/decoration'
import {nextRefund,permitReceived,isCompletedWorkflow} from './decoration'
import {reviewItems} from './reviewItems'
export type OwnerStep='apply'|'pay'|'permit'|'first'|'second'|'refund'
export type StepState='active'|'done'|'disabled'
export interface WorkflowStep {key:OwnerStep; title:string; description:string; state:StepState; icon:string}
/** 付款、备案、退费以各自回执为准；手动结束不能被展示成已退费。 */
export function ownerSteps(row?:Application):WorkflowStep[]{
 const reviewed=!!row&&row.depositReviewStatus===1&&reviewItems(row).every(m=>!(m.definition.required||m.fileIds.length)||m.reviewStatus===1)
 const completed=isCompletedWorkflow(row)
 const paid=row?.paymentStatus===2,issued=permitReceived(row?.permit)
 const firstPassed=completed||!!row&&['pending_second_acceptance','second_acceptance_waiting','second_acceptance_in_progress','second_acceptance_failed','acceptance_passed'].includes(row.status)
 const secondPassed=row?.status==='acceptance_passed'||completed
 // 首页与详情共用二验后一次性退款资格。
 const refund=row?nextRefund(row):undefined
 const hasRefundRecord=!!row?.details.refunds?.length
 const refundDescription=completed?'退款已核验，装修办理完成'
  :row?.actualEndTime?'退费未完成，装修办理尚未完成，请联系物业'
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
  {key:'apply',title:'装修申请',icon:'FileTextOutlined',state:state(reviewed,true),description:!row?'当前房屋还未发起装修申请':row.status==='rejected'?'存在不通过资料，请进入修改后重传':reviewed?(paid?'资料已全部通过审核，费用已缴纳':'资料已全部通过审核，请进行费用缴纳'):'资料已提交，等待物业逐项审核'},
  {key:'pay',title:'费用缴纳',icon:'WalletOutlined',state:state(paid,reviewed),description:paid?(issued?'费用已缴纳，备案证明已办理':'费用已缴纳，请联系物业办理装修备案证明'):reviewed?'资料审核已通过，请缴纳装修费用':'资料审核通过后，可办理费用缴纳'},
  {key:'permit',title:'装修备案证明',icon:'SafetyCertificateOutlined',state:state(issued,paid),description:issued?(firstPassed?'备案证明已完成，首次验收已通过':'备案证明已完成，具备验收条件后请申请首次验收'):paid?'请联系物业打印或下载装修备案证明':'缴费完成后，可办理装修备案证明'},
  {key:'first',title:'首次验收',icon:'CheckCircleOutlined',state:state(firstPassed,issued),description:firstPassed?(secondPassed?'首次验收已通过，二次验收已通过':'首次验收已通过，具备验收条件后请申请二次验收'):acceptance(1)},
  {key:'second',title:'二次验收',icon:'AuditOutlined',state:state(!!secondPassed,firstPassed),description:secondPassed?(completed?'二次验收已通过，退款已完成':'二次验收已通过，请办理一次性退费'):acceptance(2)},
  {key:'refund',title:'退费申请',icon:'AccountBookOutlined',state:state(completed,!!refund||hasRefundRecord||!!secondPassed),description:refundDescription}
 ]
}

export interface WorkflowReminder {step:OwnerStep; message:string; action:string; tone:'info'|'success'|'warning'}
/** 以真实回执选择唯一下一步；等待、驳回和已结束不能误导为可以继续办理。 */
export function workflowReminder(row:Application,staff=false):WorkflowReminder {
 const steps=ownerSteps(row),step=steps.find(item=>item.state!=='done')
 if(isCompletedWorkflow(row))return {step:'refund',message:'退款已完成，本次装修办理结束，可在装修记录中查看完整办理记录。',action:'查看退费记录',tone:'success'}
 if(row.status==='finished')return {step:'refund',message:'退费尚未完成，请联系物业核对退款结果。',action:'查看退费记录',tone:'warning'}
 if(!step)return {step:'apply',message:'请查看装修办理进度。',action:'查看详情',tone:'info'}
 const messages:Record<OwnerStep,[string,string]>={
  apply:[row.status==='rejected'?'资料审核存在不通过项，请补充资料后重新提交。':staff?'装修申请已提交，请逐项审核资料和保证金，全部通过后才能缴费。':'装修申请已提交，请等待物业审核；全部通过后可进行费用缴纳。',staff?'前往资料审核':'查看审核结果'],
  pay:['资料已全部通过审核，请进行费用缴纳。',staff?'前往缴费办理':'前往费用缴纳'],
  permit:['费用已缴纳，请'+(staff?'登记施工人员并办理装修备案证明。':'联系物业办理并领取装修备案证明。'),'前往装修备案证明'],
  first:['装修备案证明已完成，具备验收条件后请'+(staff?'发起首次验收。':'申请首次验收。'),staff?'前往首次验收':'申请首次验收'],
  second:['首次验收已通过，具备验收条件后请'+(staff?'发起二次验收。':'申请二次验收。'),staff?'前往二次验收':'申请二次验收'],
  refund:['二次验收已通过，请办理一次性退费；退款成功后，本次装修才算结束。',staff?'前往退费办理':'前往退费申请']
 }
 if(step.key==='first'||step.key==='second'){
  const prefix=step.key,failed=row.status===`${prefix}_acceptance_failed`,waiting=row.status===`${prefix}_acceptance_waiting`,working=row.status===`${prefix}_acceptance_in_progress`
  if(failed)return {step:step.key,message:`${step.title}未通过，请按验收意见整改后重新${staff?'发起':'申请'}验收。`,action:staff?'查看验收结果':'重新申请验收',tone:'warning'}
  if(waiting||working)return {step:step.key,message:waiting?`${step.title}已申请，${staff?'请指派有该项目权限的验收人员。':'请等待物业安排验收人员。'}`:`${step.title}已安排人员，请等待验收反馈。`,action:staff&&waiting?'前往指派验收':'查看验收进度',tone:'info'}
 }
 return {step:step.key,message:messages[step.key][0],action:messages[step.key][1],tone:row.status==='rejected'?'warning':'info'}
}
