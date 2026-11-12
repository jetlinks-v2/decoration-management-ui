import {computed,ref,watch} from 'vue'
import type {DetailEntry,DetailStage} from '../../utils/applicationDetailFlow'
import {detailEntry,detailTaskTerms} from '../../utils/applicationDetailFlow'
import {useDiscardConfirm} from './useDiscardConfirm'
/** 切换步骤保留当前阅读位置；有未提交内容时使用页面内确认。 */
export function useApplicationFlow(identity:()=>[string,string|undefined,DetailEntry|undefined],guard:()=>{busy:boolean;dirty:boolean}){
  const stage=ref<DetailStage>('apply'),applicationTab=ref('information')
  const discard=useDiscardConfirm(()=> '当前内容尚未提交，是否放弃修改并切换步骤？')
  watch(identity,([,task,entry])=>{stage.value=detailEntry(entry||(task?'tasks':undefined));applicationTab.value=entry==='materials'?'review':'information'},{immediate:true})
  const taskTerms=computed(()=>detailTaskTerms(stage.value))
  async function select(value:DetailStage){if(value===stage.value||guard().busy)return;if(guard().dirty&&!await discard())return;stage.value=value}
  async function selectApplicationTab(value:string){if(value===applicationTab.value||guard().busy)return;if(guard().dirty&&!await discard())return;applicationTab.value=value}
  return {stage,applicationTab,taskTerms,select,selectApplicationTab}
}
