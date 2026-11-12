import {ref,watch,onScopeDispose,nextTick} from 'vue'
import type {DecorationApi} from '../../services/decorationApi'
import {attachmentFormat} from '../../utils/attachmentFormat'
import {errorText} from '../../utils/decoration'
/** 所有预览使用有权回执读取，不把认证令牌或私有地址传给外部Office服务。 */
export function useAttachmentPreview(props:{id:string;api:DecorationApi},container:()=>HTMLElement|undefined){
  const loading=ref(false),error=ref(''),name=ref(''),kind=ref(''),url=ref(''),text=ref('')
  const sheets=ref<string[]>([]),sheet=ref(''),rows=ref<string[][]>([]),truncated=ref(false)
  let generation=0,disposed=false,workbook:import('xlsx').WorkBook|undefined
  function clear(){if(url.value)URL.revokeObjectURL(url.value);url.value='';container()?.replaceChildren();workbook=undefined;sheets.value=[];rows.value=[];text.value='';kind.value=''}
  async function selectSheet(value:string){
    sheet.value=value
    if(!workbook)return
    const XLSX=await import('xlsx'),data=XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[value],{header:1,raw:false,defval:''})
    truncated.value=data.length>2000||data.some(row=>row.length>100)
    rows.value=data.slice(0,2000).map(row=>row.slice(0,100).map(String))
  }
  watch(()=>props.id,async id=>{
    const token=++generation;clear();error.value='';if(!id)return;loading.value=true
    try{
      const metadata=await props.api.attachmentInfo(id),blob=await props.api.download(id)
      if(disposed||token!==generation)return
      name.value=metadata.name
      const format=await attachmentFormat(blob,metadata.name)
      if(disposed||token!==generation)return
      kind.value=format.extension
      if(format.type.startsWith('image/')||format.extension==='pdf')url.value=URL.createObjectURL(new Blob([blob],{type:format.type}))
      else if(format.extension==='docx'){
        const {renderAsync}=await import('docx-preview');await nextTick()
        if(disposed||token!==generation||!container())return
        // 每份文档独立容器，迟到的解析结果不能覆盖下一份文件。
        const stage=document.createElement('div');container()!.replaceChildren(stage)
        await renderAsync(await blob.arrayBuffer(),stage,undefined,{inWrapper:true,breakPages:true,ignoreLastRenderedPageBreak:false})
        if(disposed||token!==generation)stage.remove()
      }else if(['xls','xlsx'].includes(format.extension)){
        const XLSX=await import('xlsx');if(disposed||token!==generation)return
        workbook=XLSX.read(await blob.arrayBuffer(),{type:'array',sheetRows:2001,cellHTML:false,cellFormula:false})
        sheets.value=workbook.SheetNames;await selectSheet(sheets.value[0])
      }else if(format.extension==='doc'){
        const result=await props.api.wordText(id);if(disposed||token!==generation)return;text.value=result
      }else error.value='此文件格式暂不支持在线预览，请下载后使用相应软件打开。'
    }catch(e){if(!disposed&&token===generation)error.value=errorText(e)}finally{if(token===generation)loading.value=false}
  },{immediate:true})
  onScopeDispose(()=>{disposed=true;generation++;clear()})
  return {loading,error,name,kind,url,text,sheets,sheet,rows,truncated,selectSheet}
}
