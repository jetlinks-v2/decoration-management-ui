import type {Application,Term} from '../types/decoration'
import {ownerSteps,type OwnerStep} from './applicationWorkflow'
export type DetailStage=OwnerStep|'inspection'|'history'
export type DetailEntry='overview'|'materials'|'tasks'|'permit'|'finance'|'history'|'first'|'second'|'refund'
/** 保留菜单入口定位；验收和巡检分别查询全量该类型任务，不能前端过滤当前分页。 */
export function detailEntry(entry?:DetailEntry):DetailStage {
  return ({overview:'apply',materials:'apply',tasks:'inspection',permit:'permit',finance:'pay',history:'history',first:'first',second:'second',refund:'refund'} as const)[entry||'overview']
}
export function detailTaskTerms(stage:DetailStage,inspectionTaskId?:string):Term[]{
  if(stage==='inspection'&&inspectionTaskId)return [{type:'and',terms:[{column:'id',termType:'eq',value:inspectionTaskId},{type:'or',column:'parentId',termType:'eq',value:inspectionTaskId}]}]
  if(stage==='first'||stage==='second')return [{column:'kind',termType:'eq',value:stage==='first'?'firstAcceptance':'secondAcceptance'}]
  if(stage==='inspection')return [{column:'kind',termType:'in',value:['daily','inspectionRecord']}]
  return []
}
export function detailStageActions(stage:DetailStage,names:string[],row:Application):string[]{
  return names.filter(name=>{
    if(stage==='pay')return ['payment','simulation/payment'].includes(name)
    if(stage==='refund')return ['refund','simulation/refund'].includes(name)
    if(stage==='permit')return name==='permit'||name.startsWith('permit/')
    if(stage==='inspection')return name==='inspection/assign'
    if(stage==='first'||stage==='second'){
      const type=stage==='first'?1:2
      return name==='acceptance/assign'?row.acceptanceType===type:name==='acceptance'&&(type===1?row.acceptanceType===0||row.status==='first_acceptance_failed':['pending_second_acceptance','second_acceptance_failed'].includes(row.status))
    }
    return false
  })
}
/** PC与H5共享办理资格，文案按物业操作调整；未开始步骤仍可查看历史，不放宽服务端动作权限。 */
export function detailFlow(row:Application){
  return ownerSteps(row).map(step=>({...step,title:step.key==='permit'?'装修备案证明':step.title,
    description:step.key==='apply'?(step.state==='done'?step.description:row.status==='rejected'?'存在驳回项，待补充重传':'核对申请信息并逐项审核资料')
      :step.key==='pay'?(step.state==='done'?step.description:step.state==='active'?'审核已通过，请进行费用缴纳':'待装修申请审核通过')
      :step.key==='permit'?(step.state==='done'?step.description.replace('申请首次验收','发起首次验收'):step.state==='active'?'办理备案，打印或下载证件':'待费用缴纳完成')
      :step.key==='first'&&step.state==='disabled'?'待完成装修备案证明'
      :step.key==='second'&&step.state==='disabled'?'待首次验收通过'
      :step.key==='refund'&&step.state==='disabled'?'待二次验收通过':step.description.replace('请申请二次验收','请发起二次验收').replace('重新申请','重新发起')}))
}
