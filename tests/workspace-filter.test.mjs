import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createRenderer,defineComponent,h,nextTick,reactive} from 'vue'
const require=createRequire(import.meta.url)
const built=await build({stdin:{contents:'export {useWorkspace} from "./useWorkspace";export {useTaskWorkspace} from "./useTaskWorkspace";export {setGrants} from "@jetlinks-web/hooks"',resolveDir:fileURLToPath(new URL('../hooks/decoration',import.meta.url))},bundle:true,write:false,platform:'node',format:'cjs',external:['vue'],plugins:[{
 name:'workspace-dependencies',setup(builder){
  builder.onResolve({filter:/api\/decoration$|^@jetlinks-web\/hooks$|^vue-router$/},args=>({path:args.path,namespace:'dependency'}))
  builder.onLoad({filter:/.*/,namespace:'dependency'},args=>({contents:args.path==='vue-router'?"export const useRoute=()=>globalThis.__workspaceRoute;export const useRouter=()=>({replace:({query})=>{globalThis.__workspaceRoute.query=query;return Promise.resolve()}})":args.path.includes('api/decoration')?'export const decorationApi={projects:async()=>[],query:async(...args)=>globalThis.__workspaceQuery("full",...args),reviewList:async(...args)=>globalThis.__workspaceQuery("review",...args),queryTasks:async(...args)=>globalThis.__workspaceQuery("tasks",...args),inspectionRecords:async(...args)=>globalThis.__workspaceQuery("inspections",...args),acceptanceRecords:async(...args)=>globalThis.__workspaceQuery("acceptances",...args)}':"import {computed,ref} from 'vue';const grants=ref({});export const setGrants=value=>{grants.value=value};export const usePermission=code=>({hasPerm:computed(()=>!!grants.value[code])})"}))
 }
}]})
const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(require,module,module.exports)
function mount(setup,query={}){
 globalThis.__workspaceRoute=reactive({query})
 const renderer=createRenderer({createElement:()=>({}),createText:()=>({}),createComment:()=>({}),setText(){},setElementText(){},parentNode(){},nextSibling(){},insert(){},remove(){},patchProp(){}})
 let state;const app=renderer.createApp(defineComponent({setup(){state=setup();return ()=>h('div')}}));app.mount({});return {state,stop:()=>app.unmount()}
}
test('在线审核仅请求轻量分页，不预取逐条详情，其他流程保持原查询',async()=>{
 const calls=[];globalThis.__workspaceQuery=async(...args)=>{calls.push(args);return {data:[],total:0}}
 for(const mode of ['review','all','permits','first','second']) {
  const view=mount(()=>module.exports.useWorkspace(()=>mode)),signal=new AbortController().signal,query={pageIndex:0,pageSize:20}
  try {await view.state.request(query,{signal});assert.deepEqual(calls.at(-1),[mode==='review'?'review':'full',query,signal])}
  finally {view.stop()}
 }
 assert.equal(calls.length,5);delete globalThis.__workspaceQuery
})
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

test('房屋巡检固定装修范围，用户OR条件不能扩大范围；合并列表由服务端固定周期任务',()=>{
 for(const kind of ['daily','inspectionRecord']){
  const view=mount(()=>module.exports.useTaskWorkspace(()=>kind,()=>true,()=> 'decoration-a'))
  try{
   const state=view.state
   state.changeFilters({filter:{terms:[{type:'or',column:'decorationId',termType:'eq',value:'decoration-b'}]}})
   const terms=state.params.value.terms
   assert.deepEqual(terms.at(-1),{column:'decorationId',termType:'eq',value:'decoration-a'})
   if(kind==='daily')assert.deepEqual(terms.at(-2),{column:'kind',termType:'eq',value:kind})
   else assert.equal(terms.some(term=>term.column==='kind'),false)
   assert.equal(terms[0].type,'and')
   assert.equal(terms.some(term=>term.column==='status'),false)
  }finally{view.stop()}
 }
})

test('在线审核接收概况状态与项目，允许清除且不影响其他页面',async()=>{
 const query={overviewProject:'project-a',overviewMetric:'pendingReview',overviewAsOf:'123',applicationScope:'app-a'}
 const view=mount(()=>module.exports.useWorkspace(()=>'review'),query);await nextTick();const state=view.state
 assert.equal(state.projectId.value,'project-a');assert.equal(state.overviewMetric.value.key,'pendingReview')
 assert.deepEqual(state.params.value.terms.at(-1),{column:'id',termType:'decoration-overview-metric',value:{metric:'pendingReview',asOf:123}})
 state.changeProject('project-b');state.clearOverviewFilter();await nextTick()
 assert.equal(state.overviewMetric.value,undefined);assert.equal(state.projectId.value,'project-b');assert.equal(globalThis.__workspaceRoute.query.applicationScope,'app-a');view.stop()
 for(const mode of ['all','first','permits']){const other=mount(()=>module.exports.useWorkspace(()=>mode),query);assert.equal(other.state.overviewMetric.value,undefined);assert.equal(other.state.projectId.value,undefined);other.stop()}
 const invalid=mount(()=>module.exports.useWorkspace(()=>'review'),{overviewMetric:'unknown',overviewAsOf:'bad'});assert.equal(invalid.state.overviewMetric.value,undefined);invalid.stop()
})

 test('验收记录请求服务端汇总分页并打开所有轮次，巡检仍按个人任务查询',async()=>{
  const calls=[];globalThis.__workspaceQuery=async(...args)=>{calls.push(args);return {data:[],total:0}}
  try{
   for(const kind of ['firstAcceptance','secondAcceptance','daily','inspectionRecord']){
    const view=mount(()=>module.exports.useTaskWorkspace(()=>kind))
    try{
     const signal=new AbortController().signal,query={pageIndex:2,pageSize:20,terms:view.state.params.value.terms}
     await view.state.request(query,{signal})
     const acceptance=kind.includes('Acceptance')
     assert.deepEqual(calls.at(-1),acceptance?['acceptances',kind,query,signal]:['tasks',query,signal])
     view.state.open('decoration','task')
     assert.equal(view.state.detailId.value,'decoration');assert.equal(view.state.taskId.value,acceptance?'':'task')
    }finally{view.stop()}
   }
  }finally{delete globalThis.__workspaceQuery}
 })

test('合并巡检请求服务端按任务汇总分页，打开原任务及其反馈整改',async()=>{
 const calls=[];globalThis.__workspaceQuery=async(...args)=>{calls.push(args);return {data:[],total:0}}
 const view=mount(()=>module.exports.useTaskWorkspace(()=> 'inspectionRecord',()=>true))
 try{
  const signal=new AbortController().signal,query={pageIndex:1,pageSize:20,...view.state.params.value}
  await view.state.request(query,{signal});assert.deepEqual(calls,[['inspections',query,signal]])
  assert.deepEqual(query.sorts,[{name:'modifyTime',order:'desc'}])
  view.state.open('decoration','scheduled-task')
  assert.equal(view.state.detailId.value,'decoration');assert.equal(view.state.taskId.value,'')
  assert.equal(view.state.inspectionTaskId.value,'scheduled-task')
 }finally{view.stop();delete globalThis.__workspaceQuery}
})
