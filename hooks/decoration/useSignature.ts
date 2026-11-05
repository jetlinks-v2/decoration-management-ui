import { ref, watch, onScopeDispose, type Ref } from 'vue'
import type { DecorationApi } from '../../services/decorationApi'
import { errorText } from '../../utils/decoration'
import { useUploadActivity } from './useUploadScope'
/** Pointer事件统一触控/鼠标，签名保存真实PNG并取得私有文件回执。 */
export function useSignature(canvas: Ref<HTMLCanvasElement | undefined>, props: {api: DecorationApi; projectId: string; decorationId?: string}, onSave: (id: string) => void) {
  const signed=ref(false), saving=ref(false), error=ref(''); let drawing=false,generation=0,disposed=false
  const startUpload=useUploadActivity()
  watch(()=>[props.projectId,props.decorationId],()=>{generation++;saving.value=false;error.value='';clear()})
  onScopeDispose(()=>{disposed=true;generation++})
  function point(e: PointerEvent) {const box=canvas.value!.getBoundingClientRect(); return [(e.clientX-box.left)*640/box.width,(e.clientY-box.top)*240/box.height] as const}
  function start(e: PointerEvent) {if(saving.value)return; const c=canvas.value!, context=c.getContext('2d')!; c.setPointerCapture(e.pointerId); context.beginPath(); context.moveTo(...point(e)); context.lineWidth=3; context.lineCap='round'; drawing=true}
  function move(e: PointerEvent) {if(!drawing)return; const context=canvas.value!.getContext('2d')!; context.lineTo(...point(e)); context.stroke(); signed.value=true}
  function end(){drawing=false}
  function clear(){canvas.value?.getContext('2d')?.clearRect(0,0,640,240);signed.value=false}
  async function save(){if(!signed.value||saving.value)return;const token=generation,projectId=props.projectId,decorationId=props.decorationId;saving.value=true;error.value='';const finishUpload=startUpload();try{const blob=await new Promise<Blob>((resolve,reject)=>canvas.value!.toBlob(b=>b?resolve(b):reject(new Error('签名保存失败')),'image/png'));if(disposed||token!==generation)return;const receipt=await props.api.upload(new File([blob],'签名.png',{type:'image/png'}),projectId,decorationId);if(disposed||token!==generation)return;onSave(receipt.id);clear()}catch(e){if(!disposed&&token===generation)error.value=errorText(e)}finally{finishUpload();if(!disposed&&token===generation)saving.value=false}}
  return {start,move,end,clear,save,saving,error,signed}
}
