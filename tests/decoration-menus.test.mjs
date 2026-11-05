import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import assert from 'node:assert/strict'

const built=await build({entryPoints:[fileURLToPath(new URL('../utils/decorationMenus.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs'})
const module={exports:{}}
new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports)
const {decorationMenuPresentation}=module.exports
const definitions=JSON.parse(readFileSync(new URL('../baseMenu.json',import.meta.url),'utf8'))
const sequence=['Overview','Configuration','SelfInspection','Review','Permit','InspectionGroup','FirstAcceptance','SecondAcceptance','Applications'].map(code=>`decoration/${code}`)
const byCode=code=>definitions.find(menu=>menu.code===`decoration/${code}`)
const legacy=()=>sequence.flatMap(code=>{
 const definition=definitions.find(menu=>menu.code===code)
 return code==='decoration/InspectionGroup'?definition.children: [{...definition,children:[]}]
}).map(menu=>({...menu,name:'旧名称',i18nName:'旧国际化名称'}))

test('旧装修一级分组移除，配置与巡检菜单重组并保留原授权和其他系统顺序',()=>{
 const source=legacy().reverse()
 const other={code:'other',name:'其他系统',children:[{code:'b',sortIndex:2},{code:'a',sortIndex:1}]}
 const menus=[other,{code:'decoration/business',children:source},{code:'charging/basic',name:'物业基础管理',children:[]}]
 const before=structuredClone(menus)
 const result=decorationMenuPresentation(menus)
 assert.deepEqual(result.slice(1,-1).map(menu=>menu.code),sequence)
 assert.equal(result[3].name,'装修自检表');assert.equal(result[4].name,'在线审核')
 const config=result[2]
 assert.deepEqual(config.children.map(menu=>menu.name),['装修协议','装修资料配置','巡检与验收内容配置','备案有效期'])
 const sourceConfig=source.find(menu=>menu.code===config.code)
 for(const child of config.children){assert.deepEqual(child.buttons,sourceConfig.buttons);assert.deepEqual(child.permissions,sourceConfig.permissions)}
 const inspection=result[6]
 assert.deepEqual(inspection.children.filter(menu=>menu.options?.show!==false).map(menu=>menu.name),['分配巡检任务','违规记录'])
 assert.equal(inspection.children.find(menu=>menu.code==='decoration/InspectionRecord').meta.hideInMenu,true)
 for(const child of inspection.children){
  const original=source.find(menu=>menu.code===child.code)
  assert.deepEqual(child.buttons,original.buttons);assert.deepEqual(child.permissions,original.permissions)
  assert.equal(child.url,original.url);assert.equal(child.id,original.id)
 }
 assert.deepEqual(result[0],other);assert.deepEqual(result.at(-1),menus.at(-1));assert.deepEqual(menus,before)
 assert.deepEqual(decorationMenuPresentation(result),result)
})
test('部分授权不补充巡检叶子或业务菜单；未知菜单保留',()=>{
 const review={code:'decoration/Review',name:'资料审核',buttons:[{id:'query'}],permissions:[]}
 const record=byCode('InspectionGroup').children.find(menu=>menu.code==='decoration/InspectionRecord')
 const unknown={code:'decoration/Future',name:'后续扩展',buttons:[]}
 const result=decorationMenuPresentation([{code:'decoration/business',children:[unknown,record,review]}])
 assert.deepEqual(result.map(menu=>menu.code),['decoration/Future','decoration/Review','decoration/InspectionGroup'])
 assert.notEqual(result[2].children[0].options?.show,false)
 assert.deepEqual(result[1].buttons,[{id:'query'}]);assert.deepEqual(result[2].children.map(menu=>menu.code),[record.code])
 assert.equal(result[0].name,unknown.name);assert.deepEqual(decorationMenuPresentation([]),[])
})
test('新菜单资源重复处理不嵌套巡检目录，配置子权限不被父级扩大',()=>{
 const menus=structuredClone(definitions)
 menus.find(menu=>menu.code==='decoration/Configuration').children=menus.find(menu=>menu.code==='decoration/Configuration').children.slice(1,2)
 const config=menus.find(menu=>menu.code==='decoration/Configuration');config.children[0].buttons=[]
 const result=decorationMenuPresentation(menus)
 assert.equal(result.find(menu=>menu.code===config.code).children.length,1)
 assert.deepEqual(result.find(menu=>menu.code===config.code).children[0].buttons,[])
 assert.deepEqual(result.find(menu=>menu.code==='decoration/InspectionGroup').children.map(menu=>menu.code),['decoration/Inspection','decoration/InspectionRecord','decoration/Violation'])
 assert.deepEqual(decorationMenuPresentation(result),result)
})
