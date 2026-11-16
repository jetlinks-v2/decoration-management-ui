import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {effectScope,reactive,nextTick} from 'vue'
import {test} from 'node:test'
import assert from 'node:assert/strict'

const built=await build({entryPoints:[fileURLToPath(new URL('../hooks/decoration/useSelfInspectionConfiguration.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['vue']})
const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports)
const item=(id,group,groupTitle,sort)=>({id,group,groupTitle,sort,name:id,optionTitle:'是否完好',enabled:true})
function mount(items=[]){
 const scope=effectScope(),state=reactive({value:{content:{selfInspections:items}},busy:false})
 let editor;scope.run(()=>editor=module.exports.useSelfInspectionConfiguration(()=>state.value,()=>state.busy,key=>key))
 return {scope,state,editor}
}
test('先新增并命名分类，再在分类下新增自检项，保存沿用既有接口字段',()=>{
 const {scope,state,editor}=mount()
 try{
  editor.addCategory();const category=editor.categories.value[0]
  assert.equal(state.value.content.selfInspections.length,0)
  editor.addItem(category);assert.equal(category.items.length,0)
  editor.renameCategory(category,'设施检查');editor.addItem(category);category.items[0].name='电话线'
  assert.equal(editor.validate(),true)
  assert.equal(state.value.content.selfInspections[0].groupTitle,'设施检查')
  assert.equal(state.value.content.selfInspections[0].name,'电话线')
  assert.equal(state.value.content.selfInspections[0].optionTitle,'是否正常')
  category.items[0].enabled=false;assert.equal(editor.enabledCount.value,0)
 }finally{scope.stop()}
})
test('已有配置按分类还原，分类改名同步下属项，保存重开保留自检项ID',async()=>{
 const {scope,state,editor}=mount([item('phone','finish','设施检查',1),item('network','finish','设施检查',2),item('water','drainage','排水检查',101)])
 try{
  assert.deepEqual(editor.categories.value.map(category=>category.name),['设施检查','排水检查'])
  editor.renameCategory(editor.categories.value[0],'线路检查')
  assert.ok(state.value.content.selfInspections.slice(0,2).every(value=>value.groupTitle==='线路检查'))
  assert.equal(state.value.content.selfInspections[2].groupTitle,'排水检查')
  assert.equal(editor.validate(),true)
  state.value=JSON.parse(JSON.stringify(state.value));await nextTick()
  assert.deepEqual(editor.categories.value[0].items.map(value=>value.id),['phone','network'])
 }finally{scope.stop()}
})
test('空分类与重名分类不能静默丢失，删除仅影响所属项，保存时不可编辑',()=>{
 const {scope,state,editor}=mount([item('phone','finish','设施检查',1),item('water','drainage','排水检查',101)])
 try{
  const [first,second]=editor.categories.value
  editor.renameCategory(second,'设施检查');assert.equal(editor.validate(),false);assert.match(editor.error.value,/duplicateName/)
  editor.renameCategory(second,'排水检查');editor.removeItem(second,'water');assert.equal(editor.validate(),false);assert.match(editor.error.value,/emptyCategory/)
  editor.removeCategory(second);assert.deepEqual(state.value.content.selfInspections.map(value=>value.id),['phone'])
  state.busy=true;editor.addCategory();editor.removeCategory(first);editor.addItem(first);editor.renameCategory(first,'修改')
  assert.equal(editor.categories.value.length,1);assert.equal(first.name,'设施检查');assert.equal(first.items.length,1)
 }finally{scope.stop()}
})
