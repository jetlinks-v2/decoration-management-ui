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
function mount(side,host,canLeave=()=>true,shouldBlockUnload=()=>false){
 globalThis.__mobileHost=host
 const previous={window:globalThis.window,document:globalThis.document,history:globalThis.history}
 globalThis.window=new EventTarget();globalThis.document=new EventTarget();globalThis.history={pushState(){},replaceState(){}}
 const renderer=createRenderer({createElement:()=>({}),createText:()=>({}),createComment:()=>({}),insert(){},remove(){},setText(){},setElementText(){},patchProp(){},parentNode(){},nextSibling(){}})
 let state;const app=renderer.createApp(defineComponent({setup(){state=useMobileDecoration(canLeave,side,shouldBlockUnload);return ()=>h('div')}}));app.mount({})
 return {state,stop(){app.unmount();Object.assign(globalThis,previous)}}
}
function home(id='house',project='project',processing=false){return {household:{relationshipId:id,spaceId:id,customerId:'owner',projectId:project,spaceName:id,customerName:'业主'},projectName:project,applicationCount:processing?1:0,processing}}
function host(){
 const paths=[],grants=[]
 return {paths,grants,context:async()=>({userId:'u',applicationId:'app',sessionEntryCode:'session'}),permissions:async()=>{grants.push('read');return {review:true}},request:async path=>{paths.push(path);return path.endsWith('/projects')?[{id:'project',name:'项目',organizationType:'project'}]:path.endsWith('/_houses')?[home()]:path.includes('/tasks/')?{data:[],total:0}:path.endsWith('/_summaries')?{data:[{id:'record',status:'reviewing',refundStatus:0}],total:1}:path.endsWith('/record')?application({id:'record'}):{data:[],total:0}}}
}
test('H5等待页面确认再返回或切页，浏览器刷新只同步保护、不启动确认弹窗',async()=>{
 let answer,confirmations=0,dirty=true
 const source=host(),view=mount('owner',source,()=>{confirmations++;return new Promise(resolve=>{answer=resolve})},()=>dirty)
 try{
  await flush()
  const leaving=view.state.navigate('history');await flush()
  assert.equal(view.state.view.value,'list')
  answer(false);await leaving;assert.equal(view.state.view.value,'list')
  const accepted=view.state.navigate('history');await flush();answer(true);await accepted
  assert.equal(view.state.view.value,'history')
  const event=new Event('beforeunload',{cancelable:true});Object.defineProperty(event,'returnValue',{writable:true,value:''});window.dispatchEvent(event)
  assert.equal(event.defaultPrevented,true);assert.equal(confirmations,2)
  dirty=false
  const clean=new Event('beforeunload',{cancelable:true});window.dispatchEvent(clean)
  assert.equal(clean.defaultPrevented,false);assert.equal(confirmations,2)
 }finally{view.stop()}
})
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
 try{await flush();assert.equal(owner.state.api.mine,true);assert.ok(source.paths.includes('/decoration/mobile/applications/_houses'));assert.equal(source.paths.some(path=>path.endsWith('/projects')),false);assert.equal(owner.state.household.value,undefined);assert.deepEqual(source.grants,[])}finally{owner.stop()}
 const failed=host();failed.permissions=async()=>{throw new Error('授权服务不可用')}
 const staff=mount('staff',failed)
 try{await flush();assert.deepEqual(staff.state.permissions.value,{});assert.match(staff.state.error.value,/授权服务不可用/);assert.equal(failed.paths.some(path=>path.endsWith('/_query')),false)}finally{staff.stop()}
})

const {ownerSteps,staffTerms,ownerProcessingTerms}=await bundle('../mobile/model.ts')
function application(patch={}){return {id:'one',projectId:'project',spaceId:'house',status:'reviewing',depositReviewStatus:0,paymentStatus:0,refundStatus:0,...patch,details:{agreement:{deposit:1000},materials:[],...patch.details}}}
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
 const ended={...settled,status:'finished',actualEndTime:3};assert.equal(refund(ended).state,'active');assert.match(refund(ended).description,/退费未完成.*请联系物业/)
})
function matches(row,terms){let match=true;for(let i=0;i<terms.length;i++){const term=terms[i],actual=term.terms?matches(row,term.terms):term.termType==='in'?term.value.includes(row[term.column]):term.termType==='nin'?!term.value.includes(row[term.column]):term.termType==='not'?row[term.column]!=null&&row[term.column]!==term.value:term.termType==='isnull'?row[term.column]==null:row[term.column]===term.value;match=i===0?actual:term.type==='or'?match||actual:match&&actual}return match}
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
test('首页选房后留在首页，申请带入房屋，记录独立查询本人全部记录',async()=>{
 const source=host(),fallback=source.request,queries=[]
 source.request=async(path,method,body)=>{
  if(path.endsWith('/_houses'))return [home('one','p1'),home('two','p2')]
  if(path.endsWith('/_summaries')){queries.push(body);return {data:[{id:'record',spaceId:'one',projectId:'p1'}],total:12}}
  return fallback(path,method,body)
 }
 const owner=mount('owner',source)
 try{
  await flush();await owner.state.navigate('create');assert.equal(owner.state.view.value,'list')
  await owner.state.changeHouse('two');await flush()
  assert.equal(owner.state.view.value,'list');assert.equal(owner.state.household.value.spaceId,'two');assert.equal(queries.length,1);assert.deepEqual(queries[0].terms,ownerProcessingTerms(home('two','p2').household))
  await owner.state.navigate('create');assert.equal(owner.state.view.value,'create');assert.equal(owner.state.household.value.projectId,'p2')
  await owner.state.back();await flush();assert.equal(owner.state.view.value,'list');assert.equal(owner.state.household.value.spaceId,'two')
  await owner.state.navigate('history');await flush();assert.deepEqual(queries.at(-1).terms,[])
  assert.equal(owner.state.rows.value[0].spaceId,'one')
  owner.state.changePage(2);await flush();assert.equal(queries.at(-1).pageIndex,1)
  await owner.state.navigate('workflow','record');await flush();assert.equal(owner.state.current.value.id,'record')
  await owner.state.navigate('detail','record','pay');await owner.state.back();await flush();assert.equal(owner.state.view.value,'workflow')
  await owner.state.back();await flush();assert.equal(owner.state.view.value,'history')
  await owner.state.back();await flush();assert.equal(owner.state.view.value,'list');assert.equal(owner.state.household.value.spaceId,'two')
  await owner.state.changeHouse();assert.equal(owner.state.household.value,undefined)
 }finally{owner.stop()}
})
test('无需选房可查看装修记录，离开后晚到响应不覆盖首页',async()=>{
 const source=host(),fallback=source.request,queries=[]
 let release;const waiting=new Promise(resolve=>release=resolve)
 source.request=async(path,method,body)=>{
  if(path.endsWith('/_summaries')){queries.push(body);await waiting;return {data:[{id:'record'}],total:1}}
  return fallback(path,method,body)
 }
 const owner=mount('owner',source)
 try{
  await flush();await owner.state.navigate('history');await flush()
  assert.equal(owner.state.household.value,undefined);assert.deepEqual(queries[0].terms,[])
  await owner.state.back();await flush();release();await flush()
  assert.equal(owner.state.view.value,'list');assert.deepEqual(owner.state.rows.value,[])
 }finally{release();owner.stop()}
})
test('通知按本人全部申请摘要分页，不受首页房屋影响；流程返回原通知页签',async()=>{
 const source=host(),fallback=source.request,queries=[]
 source.request=async(path,method,body)=>{
  if(path.endsWith('/_summaries')){queries.push(body);return {data:[{id:'record',status:'pending_payment',refundStatus:0}],total:12}}
  return fallback(path,method,body)
 }
 const owner=mount('owner',source)
 try{
  await flush();await owner.state.changeHouse('house');await owner.state.navigate('notifications');await flush()
  assert.equal(owner.state.ownerTab.value,'notifications');assert.deepEqual(queries.at(-1).terms,[])
  assert.equal(source.paths.some(path=>path.endsWith('/record')),false)
  owner.state.changePage(2);await flush();assert.equal(queries.at(-1).pageIndex,1)
  await owner.state.navigate('workflow','record');await flush()
  await owner.state.navigate('detail','record','pay');await owner.state.back();await flush()
  assert.equal(owner.state.view.value,'workflow');await owner.state.back();await flush()
  assert.equal(owner.state.view.value,'notifications');assert.equal(owner.state.ownerTab.value,'notifications')
  await owner.state.navigate('list');await flush();assert.equal(owner.state.household.value.spaceId,'house')
 }finally{owner.stop()}
})
test('通知请求晚到不能覆盖记录页，身份失效后清空通知和页签',async()=>{
 const source=host(),fallback=source.request;let release,count=0
 const waiting=new Promise(resolve=>release=resolve)
 source.request=async(path,...args)=>{
  if(path.endsWith('/_summaries')&&++count===1){await waiting;return {data:[{id:'old-notice'}],total:1}}
  return fallback(path,...args)
 }
 const owner=mount('owner',source)
 try{
  await flush();await owner.state.navigate('notifications');await owner.state.navigate('history');await flush()
  release();await flush();assert.equal(owner.state.rows.value[0].id,'record');assert.equal(owner.state.ownerTab.value,'history')
  window.dispatchEvent(new Event('decoration:session-expired'));assert.deepEqual(owner.state.rows.value,[]);assert.equal(owner.state.ownerTab.value,'list')
 }finally{release();owner.stop()}
})
test('办理中房屋禁止重复申请，记录更新自身房屋，失效关系清理选择',async()=>{
 const source=host(),fallback=source.request;let available=[home('house','project',true),home('other','p2')]
 source.request=async(path,...args)=>path.endsWith('/_houses')?available:path.endsWith('/record')?application({id:'record',status:'finished',refundStatus:2,paymentStatus:2,depositReviewStatus:1,permit:{printTime:1}}):fallback(path,...args)
 const owner=mount('owner',source)
 try{
  await flush();await owner.state.changeHouse('house');await owner.state.navigate('create');assert.equal(owner.state.view.value,'list')
  await owner.state.changeHouse('other');await owner.state.navigate('history');await flush()
  await owner.state.navigate('workflow','record');await flush();available[0].processing=false;await owner.state.applicationChanged(owner.state.current.value)
  assert.equal(owner.state.houses.value.find(home=>home.household.spaceId==='house').processing,false)
  assert.equal(owner.state.household.value.spaceId,'other')
  await owner.state.navigate('list');await flush();await owner.state.navigate('create');assert.equal(owner.state.view.value,'create')
  await owner.state.back();await flush();assert.equal(owner.state.view.value,'list')
  available=[];await owner.state.load();assert.equal(owner.state.household.value,undefined);assert.equal(owner.state.householdId.value,'')
  await owner.state.navigate('create');assert.equal(owner.state.view.value,'list')
 }finally{owner.stop()}
})
test('填表前重新核验房屋占用，其他会话已发起时不允许进入新增',async()=>{
 const source=host(),fallback=source.request;let occupied=false
 source.request=async(path,...args)=>path.endsWith('/_houses')?[home('house','project',occupied)]:fallback(path,...args)
 const owner=mount('owner',source)
 try{
  await flush();await owner.state.changeHouse('house');occupied=true
  await owner.state.navigate('create');assert.equal(owner.state.view.value,'list');assert.equal(owner.state.house.value.processing,true)
 }finally{owner.stop()}
})
test('单笔装修已结束不能覆盖服务端返回的整套房屋占用状态',async()=>{
 const source=host(),fallback=source.request
 source.request=async(path,...args)=>path.endsWith('/_houses')?[home('house','project',true)]:fallback(path,...args)
 const owner=mount('owner',source)
 try{
  await flush();await owner.state.changeHouse('house')
  await owner.state.applicationChanged(application({status:'finished',refundStatus:2}))
  assert.equal(owner.state.house.value.processing,true)
  await owner.state.navigate('create');assert.equal(owner.state.view.value,'list')
 }finally{owner.stop()}
})
test('业主全房屋接口失败显示错误，不显示部分房屋；身份过期清空房屋和申请',async()=>{
 const source=host(),fallback=source.request;let fail=false
 source.request=async(path,...args)=>{if(fail&&path.endsWith('/_houses'))throw new Error('目录不可用');return fallback(path,...args)}
 const owner=mount('owner',source)
 try{
  await flush();fail=true;await owner.state.load();assert.match(owner.state.error.value,/目录不可用/)
  window.dispatchEvent(new Event('decoration:session-expired'));assert.deepEqual(owner.state.houses.value,[]);assert.deepEqual(owner.state.rows.value,[])
 }finally{owner.stop()}
})
test('员工刷新仍保留有权项目，撤权后清理旧项目选择',async()=>{
 const previous=globalThis.sessionStorage,values=new Map();globalThis.sessionStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}
 const source=host(),request=source.request;let allowed=['project','other']
 source.request=async(path,...args)=>path.endsWith('/projects')?allowed.map(id=>({id,name:id,organizationType:'project'})):request(path,...args)
 let staff
 try{
  staff=mount('staff',source);await flush();await staff.state.changeProject('other');await flush();staff.stop();staff=undefined
  staff=mount('staff',source);await flush();assert.equal(staff.state.projectId.value,'other');staff.stop();staff=undefined
  allowed=['project'];staff=mount('staff',source);await flush();assert.equal(staff.state.projectId.value,'')
 }finally{staff?.stop();globalThis.sessionStorage=previous}
})

test('办理中条件限定当前房屋，二验通过且退款成功才从申请页移除',()=>{
 const terms=ownerProcessingTerms(home().household)
 for(const status of ['reviewing','rejected','pending_payment','permit_issued','acceptance_passed','finished']){
  for(const refundStatus of [0,1,2,null]){
   const row={projectId:'project',spaceId:'house',status,refundStatus}
   assert.equal(matches(row,terms),!(['acceptance_passed','finished'].includes(status)&&refundStatus===2),`${status}/${refundStatus}`)
   assert.equal(matches({...row,spaceId:'other'},terms),false)
   assert.equal(matches({...row,projectId:'other'},terms),false)
  }
 }
})
test('申请页加载轻量在办摘要，点开进入流程并返回原选房；记录仍含全部申请',async()=>{
 const source=host(),fallback=source.request,queries=[]
 const records=[
  {id:'record',projectId:'project',spaceId:'house',status:'permit_issued',refundStatus:0},
  {id:'finished',projectId:'project',spaceId:'house',status:'finished',refundStatus:2},
  {id:'another',projectId:'p2',spaceId:'two',status:'reviewing',refundStatus:0}
 ]
 source.request=async(path,method,body)=>{
  source.paths.push(path)
  if(path.endsWith('/_houses'))return [home('house','project',true),home('two','p2',true)]
  if(path.endsWith('/_summaries')){queries.push(body);const data=records.filter(row=>matches(row,body.terms));return {data,total:data.length}}
  return fallback(path,method,body)
 }
 const owner=mount('owner',source)
 try{
  await flush();assert.equal(queries.length,0)
  await owner.state.changeHouse('house');await flush()
  assert.deepEqual(owner.state.rows.value.map(row=>row.id),['record'])
  assert.equal(source.paths.filter(path=>path.endsWith('/_houses')).length,1)
  assert.equal(source.paths.some(path=>path.endsWith('/record')),false)
  await owner.state.navigate('create');assert.equal(owner.state.view.value,'list')
  await owner.state.navigate('workflow','record');await flush()
  assert.equal(owner.state.current.value.id,'record');assert.equal(owner.state.ownerTab.value,'list')
  await owner.state.back();await flush();assert.equal(owner.state.view.value,'list');assert.equal(owner.state.householdId.value,'house')
  await owner.state.changeHouse('two');assert.deepEqual(owner.state.rows.value.map(row=>row.id),['another'])
  await owner.state.navigate('history');await flush()
  assert.deepEqual(queries.at(-1).terms,[]);assert.equal(owner.state.rows.value.length,3)
  await owner.state.navigate('list');await flush();await owner.state.changeHouse()
  assert.deepEqual(owner.state.rows.value,[]);assert.equal(owner.state.total.value,0)
 }finally{owner.stop()}
})
test('申请页晚到响应不能覆盖历史，新增成功后返回申请页并展示新记录',async()=>{
 const source=host(),fallback=source.request;let release,delayed=true
 const waiting=new Promise(resolve=>release=resolve)
 source.request=async(path,method,body)=>{
  if(path.endsWith('/_summaries')&&body.terms.length&&delayed){await waiting;return {data:[{id:'stale'}],total:1}}
  return fallback(path,method,body)
 }
 const owner=mount('owner',source)
 try{
  await flush();const choosing=owner.state.changeHouse('house');await flush()
  await owner.state.navigate('history');await flush();release();await choosing
  assert.equal(owner.state.rows.value[0].id,'record');assert.equal(owner.state.view.value,'history')
  delayed=false;await owner.state.navigate('list');await flush()
  owner.state.created(application({id:'record'}));await flush()
  await owner.state.back();await flush()
  assert.equal(owner.state.view.value,'list');assert.equal(owner.state.householdId.value,'house')
  assert.equal(owner.state.rows.value[0].id,'record')
 }finally{release();owner.stop()}
})
