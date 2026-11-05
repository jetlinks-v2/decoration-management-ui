import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createRenderer,defineComponent,h,nextTick} from 'vue'
const require=createRequire(import.meta.url)
async function bundle(relative,plugins=[]){
 const result=await build({entryPoints:[fileURLToPath(new URL(relative,import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['vue'],plugins})
 const loaded={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,loaded,loaded.exports);return loaded.exports
}
const {mobileEntry,mobileSide,mobilePermissions}=await bundle('../utils/mobileEntry.ts')
const {useMobileDecoration}=await bundle('../mobile/useMobileDecoration.ts',[{name:'mobile-host',setup(builder){
 builder.onResolve({filter:/^\.\/transport$/},args=>({path:args.path,namespace:'host'}))
 builder.onLoad({filter:/.*/,namespace:'host'},()=>({contents:`
 export const transport=(...args)=>globalThis.__mobileHost.request(...args)
 export const resolveContext=()=>globalThis.__mobileHost.context()
 export const host={permissions:()=>globalThis.__mobileHost.permissions(),back(){}}
 export const cancelRequests=()=>{}
 `}))
}}])
const flush=async()=>{await nextTick();await new Promise(resolve=>setImmediate(resolve));await nextTick()}
function mount(side,host){
 globalThis.__mobileHost=host
 const previous={window:globalThis.window,document:globalThis.document,history:globalThis.history}
 globalThis.window=new EventTarget();globalThis.document=new EventTarget();globalThis.history={pushState(){},replaceState(){}}
 const renderer=createRenderer({createElement:()=>({}),createText:()=>({}),createComment:()=>({}),insert(){},remove(){},setText(){},setElementText(){},patchProp(){},parentNode(){},nextSibling(){}})
 let state;const app=renderer.createApp(defineComponent({setup(){state=useMobileDecoration(()=>true,side);return ()=>h('div')}}));app.mount({})
 return {state,stop(){app.unmount();Object.assign(globalThis,previous)}}
}
function host(){
 const paths=[],grants=[]
 return {paths,grants,context:async()=>({userId:'u',applicationId:'app',sessionEntryCode:'session'}),permissions:async()=>{grants.push('read');return {review:true}},request:async path=>{paths.push(path);return path.endsWith('/projects')?[]:{data:[{id:'record'}],total:1}}}
}
test('两个入口区分员工/业主，仅携带应用和会话入口，不拼接身份或令牌',()=>{
 for(const side of ['staff','owner']){
  const url=new URL(mobileEntry('app &中','session/中',side),'https://park.example')
  assert.equal(url.pathname,'/decoration-h5/');assert.equal(url.origin,'https://park.example')
  assert.deepEqual([...url.searchParams.keys()],['applicationScope','side','projectCode'])
  assert.equal(url.searchParams.get('applicationScope'),'app &中');assert.equal(url.searchParams.get('projectCode'),'session/中');assert.equal(mobileSide(url.search),side)
 }
 assert.equal(mobileEntry('','session','staff'),'');assert.equal(mobileSide(''),'owner');assert.equal(mobileSide('?side=admin'),'owner')
 assert.equal(new URL(mobileEntry('app','','owner'),'https://park.example').searchParams.has('projectCode'),false)
})
test('员工操作只来源于本人装修业务按钮，其他模块与档案权限不参与',()=>{
 assert.deepEqual(mobilePermissions([{code:'wrapper',children:[{code:'decoration/Review',buttons:[{id:'review'}]},{code:'decoration/Inspection',buttons:[{id:'assign'}]},{code:'decoration/Customer',buttons:[{id:'delete'}]},{code:'patrol/Tasks',buttons:[{id:'handle'}]}]}]),{review:true,assign:true})
 assert.deepEqual(mobilePermissions([]),{})
})
test('员工端读取员工接口及当前操作授权，不能进入业主新增；身份过期清空授权和数据',async()=>{
 const source=host(),view=mount('staff',source)
 try{
  await flush();assert.equal(view.state.api.mine,false);assert.ok(source.paths.includes('/decoration/applications/_query'));assert.deepEqual(source.grants,['read'])
  assert.deepEqual(view.state.permissions.value,{review:true});view.state.navigate('create');assert.equal(view.state.view.value,'list')
  window.dispatchEvent(new Event('decoration:session-expired'));assert.deepEqual(view.state.permissions.value,{});assert.deepEqual(view.state.rows.value,[]);assert.equal(view.state.invalid.value,true)
 }finally{view.stop()}
})
test('业主端继续读取本人接口，不获取员工授权；员工授权失败不查询业务数据',async()=>{
 const source=host(),owner=mount('owner',source)
 try{await flush();assert.equal(owner.state.api.mine,true);assert.ok(source.paths.includes('/decoration/mobile/applications/_query'));assert.deepEqual(source.grants,[])}finally{owner.stop()}
 const failed=host();failed.permissions=async()=>{throw new Error('授权服务不可用')}
 const staff=mount('staff',failed)
 try{await flush();assert.deepEqual(staff.state.permissions.value,{});assert.match(staff.state.error.value,/授权服务不可用/);assert.equal(failed.paths.some(path=>path.endsWith('/_query')),false)}finally{staff.stop()}
})
