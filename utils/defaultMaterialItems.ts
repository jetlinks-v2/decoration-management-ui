import type {MaterialDefinition} from '../types/decoration'

/** 原装修资料配置的固定项目；效果图沿用原系统默认非必填。 */
export const fixedMaterialItems: ReadonlyArray<MaterialDefinition> = [
 {id:'fixed-fire-safety',name:'消防安全承诺书',kind:'material',source:'upload',required:true,enabled:true,sort:0},
 {id:'fixed-notice',name:'装修告知书',kind:'material',source:'upload',required:true,enabled:true,sort:1},
 {id:'fixed-demolition-plan',name:'拆改图',kind:'drawing',source:'upload',required:true,enabled:true,sort:2},
 {id:'fixed-original-plan',name:'原始平面图',kind:'drawing',source:'upload',required:true,enabled:true,sort:3},
 {id:'fixed-utility-plan',name:'水电气图',kind:'drawing',source:'upload',required:true,enabled:true,sort:4},
 {id:'fixed-effect-picture',name:'效果图',kind:'drawing',source:'upload',required:false,enabled:true,sort:5},
 {id:'fixed-owner-id',name:'业主身份证正反面',kind:'drawing',source:'upload',required:true,enabled:true,sort:6}
]

// 兼容旧配置的资料名称，以稳定ID关联旧模板和启用设置，避免重复补项。
const legacyMaterialNames:Record<string,string>={'消防责任书':'fixed-fire-safety','装修须知':'fixed-notice'}
export function fixedMaterialItem(item:MaterialDefinition){
 return fixedMaterialItems.find(fixed=>fixed.kind===item.kind&&(fixed.id===item.id||fixed.name===item.name||(item.kind==='material'&&fixed.id===legacyMaterialNames[item.name])))
}

/** 编辑草稿移除已下线的服务协议和申请表确认；保留其余ID、设置和历史申请快照。 */
export function withFixedMaterialItems(items:MaterialDefinition[]):MaterialDefinition[]{
 items=items.filter(item=>!(item.kind==='material'&&(['fixed-service-agreement','fixed-application-form'].includes(item.id)||['服务协议','装修管理服务协议','申请表确认','装修申请表'].includes(item.name))))
 const fixed=fixedMaterialItems.map(template=>{
  const existing=items.find(item=>item.kind===template.kind&&item.id===template.id)
   ||items.find(item=>fixedMaterialItem(item)?.id===template.id)
  return {...template,...existing,name:template.name}
 })
 return [...fixed,...items.filter(item=>!fixedMaterialItem(item))].map((item,sort)=>({...item,sort}))
}
