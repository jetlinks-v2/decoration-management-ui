import type {CreateApplication,FormConfiguration,SelfInspectionDefinition,SelfInspectionItem} from '../types/decoration'

/** 沿用原业主端的九项自检内容；显示、正文快照和图片使用同一份定义。 */
export const selfInspectionGroups=[
 {key:'finish',optionTitle:'是否完好',title:'检测项目是否完好',items:[
  {key:'phoneLine',text:'电话线'},{key:'cableTvLine',text:'闭路线'},{key:'broadbandLine',text:'宽带线路'},
  {key:'videoIntercom',text:'可视分机'},{key:'doorMagnet',text:'门磁'},{key:'other',text:'其他'}]},
 {key:'drainage',optionTitle:'排水是否通畅',title:'排水是否通畅',items:[
  {key:'kitchenDrainage',text:'厨房排水'},{key:'masterBathroomDrainage',text:'主卫排水'},{key:'balconyDrainage',text:'生活阳台排水'}]}
] as const
export type SelfInspectionGroup={key:string;optionTitle:string;title:string;items:{key:string;text:string}[]}
export const defaultSelfInspectionDefinitions=():SelfInspectionDefinition[]=>selfInspectionGroups.flatMap((group,groupIndex)=>group.items.map((item,index)=>({id:item.key,group:group.key,groupTitle:group.title,optionTitle:group.optionTitle,name:item.text,enabled:true,sort:groupIndex*100+index+1})))
export function selfInspectionGroupsFor(definitions?:SelfInspectionDefinition[]):SelfInspectionGroup[] {
 const source=(definitions?.length?definitions:defaultSelfInspectionDefinitions()).filter(item=>item.enabled).sort((a,b)=>a.sort-b.sort)
 const groups=new Map<string,SelfInspectionGroup>()
 for(const item of source){const group=groups.get(item.group)||{key:item.group,optionTitle:'是否正常',title:item.groupTitle,items:[]};group.items.push({key:item.id,text:item.name});groups.set(item.group,group)}
 return [...groups.values()]
}
export const emptySelfInspectionItems=(definitions?:SelfInspectionDefinition[]):SelfInspectionItem[]=>selfInspectionGroupsFor(definitions).flatMap(group=>group.items.map(item=>({key:item.key,value:true})))
export function selfInspectionComplete(items:SelfInspectionItem[]=[],definitions?:SelfInspectionDefinition[]):boolean {
 const keys=selfInspectionGroupsFor(definitions).flatMap(group=>group.items.map(item=>item.key))
 return items.length===keys.length&&keys.every(key=>items.filter(item=>item.key===key&&typeof item.value==='boolean').length===1)
}
export const selfInspectionStatus=(items:SelfInspectionItem[]=[]):0|1=>items.some(item=>item.value===false)?1:0
export function selfInspectionSnapshot(form:CreateApplication,configuration:FormConfiguration){
 const groups=selfInspectionGroupsFor(configuration.selfInspections)
 return {metadata:[`房屋：${configuration.household.spaceName}`,`业主：${configuration.household.customerName}`,`联系电话：${form.contactPhone}`],
  groups:groups.map(group=>({...group,items:group.items.map(item=>({...item,value:form.selfInspectionItems?.find(value=>value.key===item.key)?.value}))})),
  status:selfInspectionStatus(form.selfInspectionItems)}
}
export type SelfInspectionSnapshot=ReturnType<typeof selfInspectionSnapshot>
export function selfInspectionContent(form:CreateApplication,configuration:FormConfiguration):string {
 const snapshot=selfInspectionSnapshot(form,configuration)
 return ['装修自检表',...snapshot.metadata,'',...snapshot.groups.flatMap(group=>[group.title,...group.items.map(item=>`${item.text}：${typeof item.value==='boolean'?(item.value?'是':'否'):'未确认'}`),'']),`处理状态：${snapshot.status===1?'有问题':'没问题'}`].join('\n')
}
