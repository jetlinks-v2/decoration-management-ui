import {computed,watch} from 'vue'
import type {MaterialDefinition} from '../../types/decoration'
import {requestId} from '../../utils/decoration'
import {fixedMaterialItem,withFixedMaterialItems} from '../../utils/defaultMaterialItems'

/** 两类项目共用存储，界面分组；按稳定ID删除，避免分组索引误删另一类。 */
export function useMaterialItems(items:()=>MaterialDefinition[],busy:()=>boolean,includeFixed=false){
 if(includeFixed)watch(items,rows=>rows.splice(0,rows.length,...withFixedMaterialItems(rows)),{immediate:true})
 const sections=computed(()=>([
  {kind:'material' as const,title:'配置资料项',addLabel:'新增资料',nameLabel:'资料名称'},
  {kind:'drawing' as const,title:'配置图纸项',addLabel:'新增',nameLabel:'图纸名称'}
 ]).map(section=>({...section,rows:items().filter(item=>item.kind===section.kind)})))
 function add(kind:MaterialDefinition['kind']){
  if(busy())return
  const rows=items()
  rows.push({id:requestId(),name:'',kind,source:'upload',required:true,enabled:true,sort:Math.max(-1,...rows.map(item=>item.sort))+1})
 }
 function remove(id:string){if(busy())return;const rows=items(),index=rows.findIndex(item=>item.id===id);if(index>=0&&(!includeFixed||!fixedMaterialItem(rows[index])))rows.splice(index,1)}
 return {sections,add,remove}
}
