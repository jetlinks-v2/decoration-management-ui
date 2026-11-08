import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createRenderer,defineComponent,h,nextTick} from 'vue'
const require=createRequire(import.meta.url)
const built=await build({entryPoints:[fileURLToPath(new URL('../hooks/decoration/useConfigurations.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['vue'],plugins:[{
 name:'configuration-dependencies',setup(builder){
  builder.onResolve({filter:/api\/decoration$|useDecorationDictionaries$|^@jetlinks-web\/hooks$/},args=>({path:args.path,namespace:'dependency'}))
  builder.onLoad({filter:/.*/,namespace:'dependency'},args=>({contents:args.path.includes('api/decoration')?'export const decorationApi=new Proxy({}, {get:(_,name)=>(...args)=>globalThis.__configurationApi[name](...args)})':args.path.endsWith('useDecorationDictionaries')?'export const useDictionaries=()=>({})':"import {ref} from 'vue';export const usePermission=()=>({hasPerm:ref(true)})"}))
 }
}]})
const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(require,module,module.exports)
const flush=async()=>{await nextTick();await new Promise(resolve=>setImmediate(resolve));await nextTick()}
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return {resolve,promise}}
function mount(api){
 globalThis.__configurationApi=api
 const renderer=createRenderer({createElement:()=>({}),createText:()=>({}),createComment:()=>({}),setText(){},setElementText(){},parentNode(){},nextSibling(){},insert(){},remove(){},patchProp(){}})
 let state;const app=renderer.createApp(defineComponent({setup(){state=module.exports.useConfigurations();return ()=>h('div')}}));app.mount({})
 return {state,stop:()=>app.unmount()}
}
test('配置筛选从首页查询，类别切换清除隐藏筛选，旧分页响应不会覆盖结果',async()=>{
 const calls=[],pending=deferred();let delay=false
 const view=mount({projects:async()=>[],configurations:async query=>{calls.push(JSON.parse(JSON.stringify(query)));return delay?pending.promise:{data:[{id:'current'}],total:1}}})
 await flush();const s=view.state;s.page.value=2;delay=true;const old=s.load();await flush()
 delay=false;s.changeFilters({filter:{terms:[{column:'houseType',termType:'eq',value:'residential'}]}});await flush()
 assert.equal(s.page.value,1);assert.equal(calls.at(-1).pageIndex,0)
 assert.equal(calls.at(-1).terms[0].terms[0].column,'houseType')
 pending.resolve({data:[{id:'stale'}],total:21});await old
 assert.equal(s.rows.value[0].id,'current')
 s.changeKind('validity');await flush();assert.deepEqual(s.terms.value,[])
 assert.equal(calls.at(-1).terms.at(-1).value,'validity')
 assert.equal(calls.at(-1).pageIndex,0);view.stop()
})
test('项目切换和清空时重新请求，关闭原项目草稿',async()=>{
 const calls=[],pending=deferred();let delay=false
 const view=mount({projects:async()=>[],configurations:async query=>{calls.push(JSON.parse(JSON.stringify(query)));return delay?pending.promise:{data:[{id:'old-project'}],total:1}}})
 await flush();const s=view.state;s.changeProject('p');await flush();s.edit();assert.equal(s.draft.value.projectId,'p')
 delay=true;s.changeProject('next');assert.deepEqual(s.rows.value,[]);assert.equal(s.total.value,0)
 await flush();assert.equal(s.draft.value,undefined)
 assert.equal(calls.at(-1).terms.find(term=>term.column==='projectId').value,'next')
 delay=false;s.changeProject('');await flush();assert.equal(calls.at(-1).terms.some(term=>term.column==='projectId'),false)
 pending.resolve({data:[{id:'late-project'}],total:1});await flush();assert.equal(s.rows.value[0].id,'old-project')
 view.stop()
})
test('配置只使用正式筛选条件，空选项草稿不查询；类别切换清除已经生效的条件',async()=>{
 const calls=[];const view=mount({projects:async()=>[],configurations:async query=>{calls.push(JSON.parse(JSON.stringify(query)));return {data:[],total:0}}})
 await flush();const s=view.state,count=calls.length;s.terms.value=[{column:'name',termType:'like',value:''}];await flush();assert.equal(calls.length,count)
 s.changeFilters({filter:{terms:[{column:'name',termType:'like',value:'%专用%'}]}});await flush();assert.equal(calls.at(-1).terms[0].terms[0].value,'%专用%')
 s.changeKind('checks');await flush();assert.deepEqual(calls.at(-1).terms[0].terms,[]);view.stop()
})
test('先打开配置草稿再选择项目，空项目不能保存，切换草稿项目清除旧附件且不改变列表范围',async()=>{
 const writes=[];const view=mount({projects:async()=>[],configurations:async()=>({data:[],total:0}),saveConfiguration:async row=>writes.push(row)})
 try{
  await flush();const s=view.state;s.edit();assert.ok(s.draft.value);assert.equal(s.draft.value.projectId,'')
  await s.save();assert.equal(writes.length,0);assert.match(s.error.value,/请选择所属项目/)
  s.changeDraftProject('p');s.draft.value.content.materials.push({templateFileId:'old-project-file'})
  s.changeDraftProject('q');assert.equal(s.draft.value.projectId,'q');assert.deepEqual(s.draft.value.content.materials,[])
  assert.equal(s.projectId.value,'');await s.save();assert.equal(writes[0].projectId,'q')
 }finally{view.stop()}
})
test('资料配置无需填写名称，保存自动补内部名称且保留历史名称和材料身份',async()=>{
 const writes=[];const view=mount({projects:async()=>[],configurations:async()=>({data:[],total:0}),saveConfiguration:async row=>writes.push(row)})
 try{
  await flush();const s=view.state;s.changeKind('materials');s.changeProject('p');s.edit();s.draft.value.houseType='residential'
  s.draft.value.content.materials.push({id:'signed',name:'原资料',kind:'material',source:'sign',required:false,enabled:true,sort:3,templateFileId:'receipt'})
  await s.save();assert.equal(writes[0].name,'装修资料配置');assert.equal(writes[0].content.materials[0].templateFileId,'receipt');assert.equal(writes[0].content.materials[0].source,'sign')
  s.edit({...writes[0],id:'existing',version:2,name:'原有名称'});await s.save();assert.equal(writes[1].name,'原有名称')
 }finally{view.stop()}
})
test('资料关闭直接丢弃草稿，保存中和结果未知时禁止关闭',async()=>{
 const pending=deferred();let saves=0
 const view=mount({projects:async()=>[],configurations:async()=>({data:[],total:0}),saveConfiguration:async()=>{saves++;return pending.promise}})
 try{
  await flush();const s=view.state;s.changeKind('materials');s.changeProject('p');s.edit();s.draft.value.name='未保存修改';assert.equal(s.closeDraft(),true);assert.equal(s.draft.value,undefined);assert.equal(saves,0)
  s.edit();const saving=s.save();assert.equal(s.closeDraft(),false);assert.ok(s.draft.value);pending.resolve({});await saving
  s.edit();s.uncertain.value=true;assert.equal(s.closeDraft(),false);s.uncertain.value=false;assert.equal(s.closeDraft(),true)
 }finally{view.stop()}
})

test('编辑历史协议合并两期为一次性总额，保留原始记录且提交不携带分期字段',async()=>{
 let submitted
 const view=mount({projects:async()=>[],configurations:async()=>({data:[],total:0}),saveConfiguration:async body=>{submitted=body}})
 await flush()
 const row={projectId:'p',kind:'agreement',name:'历史装修协议',content:{agreement:{deposit:1000,firstRefund:600,secondRefund:400}}}
 view.state.edit(row)
 assert.equal(view.state.draft.value.content.agreement.refundAmount,1000)
 assert.equal(view.state.draft.value.content.agreement.firstRefund,undefined)
 assert.equal(row.content.agreement.firstRefund,600)
 await view.state.save()
 assert.equal(submitted.content.agreement.refundAmount,1000)
 assert.ok(!('secondRefund' in submitted.content.agreement))
 view.stop()
})
