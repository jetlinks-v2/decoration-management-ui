import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {readFileSync,existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {test} from 'node:test'
import assert from 'node:assert/strict'

const root=fileURLToPath(new URL('..',import.meta.url))
const host=process.env.RUNTIME_UI_ROOT||[resolve(root,'../../..','sass平台/cloud.jetlinks/runtime-ui'),resolve(root,'../..')]
 .find(path=>existsSync(resolve(path,'jetlinks-web-core/src/utils/application-scope.ts')))
assert(host,'Set RUNTIME_UI_ROOT to the runtime-ui checkout')
const built=await build({plugins:[{name:'application-scope',setup(builder){
 builder.onResolve({filter:/^@jetlinks-web-core\/utils\/application-scope$/},()=>({path:resolve(host,'jetlinks-web-core/src/utils/application-scope.ts')}))
}}],entryPoints:[fileURLToPath(new URL('../utils/decorationMenus.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs'})
const module={exports:{}}
new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports)
const {decorationMenuPresentation,decorationMenuFilter}=module.exports
const menuDefinitions=JSON.parse(readFileSync(new URL('../baseMenu.json',import.meta.url),'utf8'))
const definitions=menuDefinitions[0].children
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
 assert.deepEqual(inspection.children.filter(menu=>menu.options?.show!==false).map(menu=>menu.name),['分配巡检任务','巡检记录','违规记录'])
 assert.equal(inspection.children.find(menu=>menu.code==='decoration/InspectionRecord').meta.hideInMenu,false)
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


test('授权资源保留装修管理根节点，项目与无应用上下文不展开',()=>{
 const [root]=menuDefinitions
 assert.equal(root.id,'decoration-business');assert.equal(root.code,'decoration/business');assert.equal(root.name,'装修管理')
 assert.equal(root.options.show,true);assert.deepEqual(root.permissions,[]);assert.deepEqual(root.buttons,[])
 assert.deepEqual(root.children.map(menu=>menu.code),[...sequence,'decoration/Mobile'])
 const menus=structuredClone(menuDefinitions)
 for(const applicationScope of [undefined,'',' ','__jetlinks_project__','business_application:__jetlinks_project__']){
  assert.equal(decorationMenuFilter.filter(menus,{applicationScope}),menus)
 }
})

test('独立装修应用展开已授权根，不补菜单、不改ID与按钮权限且不影响公共菜单',()=>{
 const review={...byCode('Review'),buttons:[]}
 const basic={id:'charging-basic',code:'charging/basic',children:[{id:'charging-User',code:'charging/User'}]}
 const other={code:'other',children:[{code:'other/Page'}]}
 const menus=[other,{...menuDefinitions[0],children:[review]},basic],before=structuredClone(menus)
 const result=decorationMenuFilter.filter(menus,{applicationScope:'decoration-app'})
 assert.deepEqual(result,[other,{...review,i18nName:undefined},basic])
 assert.equal(result[1].id,review.id);assert.deepEqual(result[1].buttons,[])
 assert.deepEqual(menus,before)
 assert.deepEqual(decorationMenuFilter.filter(result,{applicationScope:'decoration-app'}),result)
 assert.deepEqual(decorationMenuFilter.filter([{...menuDefinitions[0],children:[]}],{applicationScope:'decoration-app'}),[])
})
