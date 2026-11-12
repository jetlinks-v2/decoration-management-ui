import {computed} from 'vue'
import {usePermission} from '@jetlinks-web/hooks'
import type {DetailStage} from '../../utils/applicationDetailFlow'
import menus from '../../baseMenu.json'
type MenuNode={code:string;buttons?:{id:string}[];children?:MenuNode[]}
/** 共用详情按当前步骤读取既有菜单按钮授权，不把入口页的按钮授权误当成整个流程授权。 */
export function useDetailPermissions(stage:()=>DetailStage){
  const nodes:MenuNode[]=[]
  function visit(items:MenuNode[]){for(const item of items){nodes.push(item);if(item.children)visit(item.children)}}
  visit(menus as MenuNode[])
  const grants=nodes.flatMap(menu=>(menu.buttons||[]).map(button=>({menu:menu.code,key:button.id,granted:usePermission(`${menu.code}:${button.id}`).hasPerm})))
  const sources:Record<DetailStage,string[]>={apply:['Review'],pay:['Permit'],permit:['Permit'],first:['FirstAcceptance'],second:['SecondAcceptance'],refund:['SecondAcceptance'],inspection:['Inspection','InspectionRecord','Violation'],history:[]}
  return computed<Record<string,boolean>>(()=>{
    const current=new Set(['decoration/Applications',...sources[stage()].map(name=>`decoration/${name}`)])
    return Object.fromEntries([...new Set(grants.map(grant=>grant.key))].map(key=>[key,grants.some(grant=>grant.key===key&&current.has(grant.menu)&&grant.granted.value)]))
  })
}
