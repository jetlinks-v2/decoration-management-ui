import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createRenderer,defineComponent,h,nextTick} from 'vue'
const require=createRequire(import.meta.url)
const built=await build({stdin:{contents:'export {useWorkspace} from "./useWorkspace";export {useTaskWorkspace} from "./useTaskWorkspace";export {setGrants} from "@jetlinks-web/hooks"',resolveDir:fileURLToPath(new URL('../hooks/decoration',import.meta.url))},bundle:true,write:false,platform:'node',format:'cjs',external:['vue'],plugins:[{
 name:'workspace-dependencies',setup(builder){
  builder.onResolve({filter:/api\/decoration$|^@jetlinks-web\/hooks$/},args=>({path:args.path,namespace:'dependency'}))
  builder.onLoad({filter:/.*/,namespace:'dependency'},args=>({contents:args.path.includes('api/decoration')?'export const decorationApi={projects:async()=>[]}':"import {computed,ref} from 'vue';const grants=ref({});export const setGrants=value=>{grants.value=value};export const usePermission=code=>({hasPerm:computed(()=>!!grants.value[code])})"}))
 }
}]})
const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(require,module,module.exports)
function mount(setup){
 const renderer=createRenderer({createElement:()=>({}),createText:()=>({}),createComment:()=>({}),setText(){},setElementText(){},parentNode(){},nextSibling(){},insert(){},remove(){},patchProp(){}})
 let state;const app=renderer.createApp(defineComponent({setup(){state=setup();return ()=>h('div')}}));app.mount({});return {state,stop:()=>app.unmount()}
}
test('申请和任务共用正式筛选输出，编辑草稿不改变查询，固定项目和页面范围保持在外层',async()=>{
 for(const setup of [()=>module.exports.useWorkspace(()=> 'all'),()=>module.exports.useTaskWorkspace(()=> 'inspectionRecord',()=>true)]){
  const view=mount(setup),s=view.state;await nextTick();const before=JSON.parse(JSON.stringify(s.params.value))
  s.terms.value=[{column:'createTime',termType:'btw',value:[]}];assert.deepEqual(JSON.parse(JSON.stringify(s.params.value)),before)
  const output=[{column:'spaceName',termType:'like',value:'%101%'},{type:'or',column:'createTime',termType:'btw',value:[1,2]}]
  s.changeFilters({filter:{terms:output}});s.changeProject('project')
  assert.deepEqual(JSON.parse(JSON.stringify(s.params.value.terms[0])),{type:'and',terms:output})
  assert.deepEqual(s.params.value.terms[1],{column:'projectId',termType:'eq',value:'project'})
  s.changeFilters({filter:{terms:[]}});assert.deepEqual(s.params.value.terms[0].terms,[]);view.stop()
 }
})
test('资料审核复用已有新增申请授权，仅限创建动作且无授权时拒绝',async()=>{
 const view=mount(()=>module.exports.useWorkspace(()=>'review'))
 try{
  module.exports.setGrants({});assert.equal(view.state.permissions.value.create,false)
  module.exports.setGrants({'decoration/Applications:create':true})
  assert.equal(view.state.permissions.value.create,true)
  for(const action of ['review','resubmit','permit','export'])assert.equal(view.state.permissions.value[action],false)
  module.exports.setGrants({'decoration/Review:create':true});assert.equal(view.state.permissions.value.create,true)
  module.exports.setGrants({});assert.equal(view.state.permissions.value.create,false)
 }finally{view.stop();module.exports.setGrants({})}
})
test('其他流程页面不继承装修记录的新增授权',()=>{
 module.exports.setGrants({'decoration/Applications:create':true})
 try{
  for(const mode of ['permits','first','second','selfInspection','inspection','violations']){
   const view=mount(()=>module.exports.useWorkspace(()=>mode))
   try{assert.equal(view.state.permissions.value.create,false,mode)}finally{view.stop()}
  }
  const view=mount(()=>module.exports.useWorkspace(()=>'all'))
  try{assert.equal(view.state.permissions.value.create,false)}finally{view.stop()}
 }finally{module.exports.setGrants({})}
})
