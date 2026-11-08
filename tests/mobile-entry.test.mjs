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
 return {paths,grants,context:async()=>({userId:'u',applicationId:'app',sessionEntryCode:'session'}),permissions:async()=>{grants.push('read');return {review:true}},request:async path=>{paths.push(path);return path.endsWith('/projects')?[{id:'project',name:'项目',organizationType:'project'}]:path.includes('/households/')?[{relationshipId:'home',spaceId:'house',customerId:'owner',projectId:'project'}]:path.includes('/tasks/')?{data:[],total:0}:{data:[{id:'record'}],total:1}}}
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
  await flush();assert.equal(view.state.api.mine,false);assert.ok(source.paths.includes('/decoration/tasks/mine/_query'));assert.deepEqual(source.grants,['read'])
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

const {ownerSteps,staffTerms}=await bundle('../mobile/model.ts')
function application(patch={}){return {id:'one',status:'reviewing',depositReviewStatus:0,paymentStatus:0,refundStatus:0,...patch,details:{agreement:{deposit:1000},materials:[],...patch.details}}}
test('业主六步流程以审核、付款、打印、验收、退款的真实状态解锁，结束不能冒充退费',()=>{
 assert.deepEqual(ownerSteps().map(s=>s.state),['active','disabled','disabled','disabled','disabled','disabled'])
 const paid=application({status:'pending_permit',depositReviewStatus:1,paymentStatus:2})
 assert.deepEqual(ownerSteps(paid).map(s=>s.state),['done','done','active','disabled','disabled','disabled'])
 const rejected=application({status:'rejected',depositReviewStatus:1,details:{materials:[{definition:{required:true},fileIds:['f'],reviewStatus:2}]}})
 assert.equal(ownerSteps(rejected)[0].state,'active');assert.equal(ownerSteps(rejected)[1].state,'disabled')
 const first=application({...paid,status:'pending_second_acceptance',permit:{printTime:1}})
 assert.deepEqual(ownerSteps(first).map(s=>s.state),['done','done','done','done','active','disabled'])
 const ended=application({...paid,status:'finished',actualEndTime:2,refundStatus:0})
 assert.notEqual(ownerSteps(ended)[5].state,'done')
 const refunded=application({...first,status:'finished',refundStatus:2})
 assert.deepEqual(ownerSteps(refunded).map(s=>s.state),['done','done','done','done','done','done'])
})
test('业主首页仅二验后开放一次性退款，历史已退记录可查看且不重复退款',()=>{
 const first=application({status:'pending_second_acceptance',paymentStatus:2,paidAmount:1000,details:{agreement:{deposit:1000,firstRefund:600,secondRefund:400},materials:[],firstAcceptancePassedTime:1,refunds:[]}})
 const refund=row=>ownerSteps(row).find(s=>s.key==='refund')
 assert.equal(refund(first).state,'disabled');assert.match(refund(first).description,/二次验收通过后.*一次性/)
 const settled={...first,refundedAmount:600,details:{...first.details,refunds:[{stage:'first',amount:600,settledTime:2}]}}
 assert.equal(refund(settled).state,'active');assert.match(refund(settled).description,/查看已退记录.*二次验收/)
 const final={...settled,status:'acceptance_passed'};assert.match(refund(final).description,/一次性退款.*400/)
 const zeroFirst={...first,details:{...first.details,agreement:{deposit:1000,firstRefund:0,secondRefund:1000}}};assert.equal(refund(zeroFirst).state,'disabled')
 const legacy={...first,details:{...first.details,agreement:{deposit:1000}}};assert.equal(refund(legacy).state,'disabled')
 const finished={...settled,status:'finished',actualEndTime:3,refundStatus:2};assert.equal(refund(finished).state,'done')
 const ended={...settled,status:'finished',actualEndTime:3};assert.equal(refund(ended).state,'active');assert.match(refund(ended).description,/未完成退费请联系物业/)
})
function matches(row,terms){let match=true;for(let i=0;i<terms.length;i++){const term=terms[i],actual=term.terms?matches(row,term.terms):term.termType==='in'?term.value.includes(row[term.column]):term.termType==='nin'?!term.value.includes(row[term.column]):row[term.column]===term.value;match=i===0?actual:term.type==='or'?match||actual:match&&actual}return match}
test('员工巡检含待办与整改复核，验收只含待办，历史不混入未办理任务',()=>{
 for(const [row,tabs] of [
  [{kind:'daily',status:'pending'},['inspection']],
  [{kind:'daily',status:'completed'},[]],
  [{kind:'inspectionRecord',status:'waiting_review'},['inspection']],
  [{kind:'firstAcceptance',status:'pending'},['acceptance']],
  [{kind:'secondAcceptance',status:'passed'},['history']],
  [{kind:'inspectionRecord',status:'owner_rectification'},['history']]
 ])assert.deepEqual(['inspection','acceptance','history'].filter(tab=>matches(row,staffTerms(tab))),tabs)
})
test('切换业主房屋后，旧房屋晚到申请和整改结果不能覆盖当前房屋',async()=>{
 const source=host(),homes=[{relationshipId:'one',spaceId:'house-one',customerId:'owner',projectId:'project'},{relationshipId:'two',spaceId:'house-two',customerId:'owner',projectId:'project'}]
 let release;const waiting=new Promise(resolve=>release=resolve),queries=[]
 source.request=async(path,method,body)=>{
  if(path.endsWith('/projects'))return [{id:'project',name:'项目',organizationType:'project'}]
  if(path.includes('/households/'))return homes
  if(path.includes('/tasks/'))return {data:[],total:0}
  queries.push(body)
  const space=body.terms.flatMap(term=>term.terms||[term]).find(term=>term.column==='spaceId')?.value
  if(space==='house-one')await waiting
  return {data:[{id:space,version:1}],total:1}
 }
 const owner=mount('owner',source)
 try{
  await flush();assert.equal(owner.state.household.value.spaceId,'house-one')
  owner.state.changeHouse('two');await flush();assert.equal(owner.state.current.value.id,'house-two')
  release();await flush();assert.equal(owner.state.current.value.id,'house-two');assert.equal(owner.state.rows.value[0].id,'house-two')
  owner.state.changePage(2);await flush();assert.equal(owner.state.current.value.id,'house-two')
  assert.ok(queries.some(q=>q.pageIndex===0&&q.pageSize===1));assert.ok(queries.some(q=>q.pageIndex===1&&q.pageSize===10))
 }finally{release();owner.stop()}
})
