import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {effectScope,reactive,nextTick} from 'vue'
import {test} from 'node:test'
import assert from 'node:assert/strict'
const compiled=await build({entryPoints:[fileURLToPath(new URL('../hooks/decoration/useCheckConfiguration.ts',import.meta.url))],bundle:true,write:false,format:'cjs',platform:'node',external:['vue']})
const module={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports)
const configuration=(checks=[])=>({projectId:'p',kind:'checks',houseType:'residential',decorationType:'first',scene:'daily',content:{checks,materials:[]},enabled:true,version:0})
const item=(id,category,categorySort,sort)=>({id,category,categorySort,sort,name:id,inputType:'text',options:[],enabled:true,required:true,exampleFileId:'file-'+id})
const mount=(value=configuration())=>{const scope=effectScope(),state=reactive({value,busy:false});let editor;scope.run(()=>{editor=module.exports.useCheckConfiguration(()=>state.value,()=>state.busy,key=>key)});return {state,editor,stop:()=>scope.stop()}}
test('检查内容先确定完整场景范围，再新增分类，分类命名后才能添加下属检查项',()=>{
 const view=mount({...configuration(),houseType:''});const {editor,state}=view
 try{
  assert.equal(editor.ready.value,false);editor.addCategory();assert.equal(editor.groups.value.length,0);assert.equal(editor.validate(),false)
  state.value.houseType='residential';editor.addCategory();const group=editor.groups.value[0];assert.ok(group);assert.equal(state.value.content.checks.length,0)
  editor.addItem(group);assert.equal(group.items.length,0)
  editor.renameCategory(group,'消防安全');editor.addItem(group);group.items[0].name='消防通道'
  assert.equal(editor.validate(),true);assert.equal(state.value.content.checks[0].category,'消防安全');assert.equal(state.value.content.checks[0].categorySort,1)
 }finally{view.stop()}
})
test('旧扁平配置按分类和排序还原，改名排序同步整组，保存重开保留检查项ID与附件',async()=>{
 const view=mount(configuration([item('water','给排水',2,1),item('b','消防安全',1,2),item('a','消防安全',1,1)]));const {editor,state}=view
 try{
  assert.deepEqual(editor.groups.value.map(g=>g.name),['消防安全','给排水']);assert.deepEqual(editor.groups.value[0].items.map(i=>i.id),['a','b'])
  editor.renameCategory(editor.groups.value[0],'消防设施');editor.sortCategory(editor.groups.value[0],3)
  assert.ok(state.value.content.checks.filter(i=>['a','b'].includes(i.id)).every(i=>i.category==='消防设施'&&i.categorySort===3))
  assert.equal(editor.validate(),true)
  const stored=JSON.parse(JSON.stringify(state.value));state.value=stored;await nextTick()
  assert.deepEqual(editor.groups.value.map(g=>g.name),['给排水','消防设施'])
  assert.equal(editor.groups.value[1].items[0].id,'a');assert.equal(editor.groups.value[1].items[0].exampleFileId,'file-a')
 }finally{view.stop()}
})
test('重复分类和空分类不能静默丢失；删除分类只删除所属检查项，忙碌时不可修改',()=>{
 const view=mount(configuration([item('a','消防',1,1),item('b','水电',2,1)]));const {editor,state}=view
 try{
  const [first,second]=editor.groups.value;editor.renameCategory(second,' 消防 ');assert.equal(editor.validate(),false);assert.match(editor.error.value,/duplicateName/)
  editor.renameCategory(second,'水电');editor.removeItem(second,'b');assert.equal(editor.validate(),false);assert.match(editor.error.value,/emptyCategory/)
  editor.removeCategory(second);assert.deepEqual(state.value.content.checks.map(i=>i.id),['a']);assert.equal(editor.validate(),true)
  state.busy=true;editor.removeCategory(first);editor.renameCategory(first,'changed');editor.addItem(first);editor.addCategory()
  assert.equal(editor.groups.value.length,1);assert.equal(first.name,'消防');assert.equal(first.items.length,1)
 }finally{view.stop()}
})
test('替换项目草稿清除旧分类；选项和数值范围错误阻止保存',async()=>{
 const view=mount(configuration([item('a','消防',1,1)]));const {editor,state}=view
 try{
  const check=editor.groups.value[0].items[0];check.inputType='option';assert.equal(editor.validate(),false);check.options=['合格'];assert.equal(editor.validate(),true)
  check.inputType='number';check.min=10;check.max=1;assert.equal(editor.validate(),false);check.max=10;assert.equal(editor.validate(),true)
  state.value={...configuration(),projectId:'q'};await nextTick();assert.equal(editor.groups.value.length,0);assert.equal(editor.validate(),true)
 }finally{view.stop()}
})
