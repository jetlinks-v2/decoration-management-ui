import type {CheckItem,CheckResult,Violation} from '../types/decoration'

/** 巡检及两次验收统一由逐项判断生成总结果，整改期限在提交时统一补入不合格项。 */
export function checkFeedback(items:CheckItem[],values:CheckResult[],deadline?:number):{passed:boolean;results:CheckResult[];violations:Violation[];error:string;needsDeadline:boolean}{
 const checks=items.filter(item=>item.enabled),results:CheckResult[]=[],violations:Violation[]=[]
 for(const item of checks){
  const result=values.find(value=>value.itemId===item.id)
  const filled=item.inputType==='image'?!!result?.fileIds.length:!!result?.value?.trim()
  if(item.required&&!filled)return {passed:false,results:[],violations:[],error:`请填写检查项“${item.name}”的结果`,needsDeadline:false}
  if(!result)continue
  if(!result.qualified&&!result.rectification?.trim())return {passed:false,results:[],violations:[],error:`请填写检查项“${item.name}”的整改内容`,needsDeadline:false}
  results.push(result.qualified?{...result,rectification:undefined,deadline:undefined}:{...result,rectification:result.rectification!.trim(),deadline})
  if(!result.qualified)violations.push({location:[item.category,item.name].filter(Boolean).join(' · '),rectification:result.rectification!.trim(),fileIds:[...result.fileIds]})
 }
 const passed=results.every(result=>result.qualified)
 return {passed,results,violations,error:'',needsDeadline:!passed&&!deadline}
}
