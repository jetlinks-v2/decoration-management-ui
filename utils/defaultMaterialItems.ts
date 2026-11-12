import type {MaterialDefinition} from '../types/decoration'

/** 原装修资料配置的固定项目；效果图沿用原系统默认非必填。 */
export const fixedMaterialItems: ReadonlyArray<MaterialDefinition> = [
 {id:'fixed-fire-safety',name:'消防责任书',kind:'material',source:'upload',required:true,enabled:true,sort:0},
 {id:'fixed-notice',name:'装修须知',kind:'material',source:'upload',required:true,enabled:true,sort:1},
 {id:'fixed-service-agreement',name:'服务协议',kind:'material',source:'upload',required:true,enabled:true,sort:2},
 {id:'fixed-application-form',name:'申请表确认',kind:'material',source:'upload',required:true,enabled:true,sort:3},
 {id:'fixed-demolition-plan',name:'拆改图',kind:'drawing',source:'upload',required:true,enabled:true,sort:4},
 {id:'fixed-original-plan',name:'原始平面图',kind:'drawing',source:'upload',required:true,enabled:true,sort:5},
 {id:'fixed-utility-plan',name:'水电气图',kind:'drawing',source:'upload',required:true,enabled:true,sort:6},
 {id:'fixed-effect-picture',name:'效果图',kind:'drawing',source:'upload',required:false,enabled:true,sort:7},
 {id:'fixed-owner-id',name:'业主身份证正反面',kind:'drawing',source:'upload',required:true,enabled:true,sort:8}
]

export function fixedMaterialItem(item:MaterialDefinition){
 return fixedMaterialItems.find(fixed=>fixed.kind===item.kind&&(fixed.id===item.id||fixed.name===item.name))
}

/** 仅补编辑草稿缺项，匹配旧名称时保留其ID、模板回执、启用及必填设置。 */
export function withFixedMaterialItems(items:MaterialDefinition[]):MaterialDefinition[]{
 const fixed=fixedMaterialItems.map(template=>{
  const existing=items.find(item=>item.kind===template.kind&&item.id===template.id)
   ||items.find(item=>item.kind===template.kind&&item.name===template.name)
  return {...template,...existing,name:template.name}
 })
 return [...fixed,...items.filter(item=>!fixedMaterialItem(item))].map((item,sort)=>({...item,sort}))
}
