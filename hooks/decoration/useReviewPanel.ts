import {computed,reactive,ref,watch,onScopeDispose} from 'vue'
import type {Application,Material,Action} from '../../types/decoration'
import type {DecorationApi} from '../../services/decorationApi'
import type {ImageMark} from '../../utils/imageAnnotations'
import {attachmentFormat} from '../../utils/attachmentFormat'
import {reviewItems} from '../../utils/reviewItems'
import {useDiscardConfirm} from './useDiscardConfirm'
/** 每次只编辑一个审核项；提交仍使用原有版本锁、幂等和逐项审核接口。 */
export function useReviewPanel(props:{row:Application;api:DecorationApi;canReview:boolean;busy:boolean},submit:(name:string,input:Partial<Action>)=>void){
  const selected=ref<Material>(),open=ref(false),editing=ref(false),annotationDirty=ref(false),imageIds=ref<string[]>([]),previewId=ref('')
  const review=reactive({itemId:'',result:1,remark:'',amount:0,annotated:[] as string[],annotationSourceFileId:undefined as string|undefined,annotations:[] as ImageMark[]})
  const snapshot=ref(''),dirty=computed(()=>open.value&&editing.value&&(annotationDirty.value||JSON.stringify(review)!==snapshot.value))
  const editable=computed(()=>props.canReview&&!props.row.actualEndTime&&props.row.paymentStatus===0&&!props.row.permit)
  const groups=computed(()=>[
    {title:'装修图纸审核',items:reviewItems(props.row).filter(item=>item.definition.kind==='drawing')},
    {title:'装修资料审核',items:reviewItems(props.row).filter(item=>item.definition.kind!=='drawing')}
  ])
  const confirmDiscard=useDiscardConfirm(()=> '当前审核意见或批注尚未提交，是否放弃修改？')
  let generation=0
  async function show(item?:Material,edit=false){
    if(edit&&(!editable.value||(item?item.reviewStatus===1:props.row.depositReviewStatus===1)))return
    if(dirty.value&&!await confirmDiscard())return
    const token=++generation
    selected.value=item;previewId.value=item?.fileIds[0]||'';editing.value=edit;annotationDirty.value=false;imageIds.value=[]
    Object.assign(review,{itemId:item?.definition.id||'deposit',result:item?.reviewStatus===2?2:1,remark:item?.remark||'',amount:props.row.approvedDeposit||props.row.details.agreement.deposit,annotated:item?.annotatedFileId?[item.annotatedFileId]:[],annotationSourceFileId:item?.annotationSourceFileId,annotations:(item?.annotations||[]).map(mark=>({...mark}))})
    snapshot.value=JSON.stringify(review);open.value=true
    // 批注只列真实图片，Word、PDF、Excel保留各自的阅读预览。
    await Promise.all((item?.fileIds||[]).map(async id=>{
      try{const format=await attachmentFormat(await props.api.download(id));if(token===generation&&open.value&&format.type.startsWith('image/'))imageIds.value=[...imageIds.value,id]}
      catch{/* 查看入口独立显示可重试错误，不阻断其他附件审核。 */}
    }))
  }
  async function close(){if(props.busy)return;if(dirty.value&&!await confirmDiscard())return;generation++;open.value=false}
  function annotated(id:string,source:string,marks:ImageMark[]){review.annotated=[id];review.annotationSourceFileId=source;review.annotations=marks;annotationDirty.value=false}
  function finish(){
    if(props.busy||!editable.value||annotationDirty.value)return
    submit('review',{itemId:review.itemId,result:review.result,remark:review.remark,amount:review.itemId==='deposit'?review.amount:undefined,annotatedFileId:review.annotated[0],annotationSourceFileId:review.annotationSourceFileId,annotations:review.annotations})
  }
  onScopeDispose(()=>generation++)
  watch(()=>props.row.version,()=>{generation++;open.value=false})
  return {previewId,selected,open,editing,annotationDirty,imageIds,review,dirty,editable,groups,show,close,annotated,finish}
}
