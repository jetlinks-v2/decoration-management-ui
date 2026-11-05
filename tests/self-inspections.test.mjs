import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createRenderer,defineComponent,h,nextTick} from 'vue'
const require=createRequire(import.meta.url)
const built=await build({entryPoints:[fileURLToPath(new URL('../hooks/decoration/useSelfInspections.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['vue'],plugins:[{
 name:'self-inspection-dependencies',setup(builder){
  builder.onResolve({filter:/api\/decoration$|^@jetlinks-web\/hooks$/},args=>({path:args.path,namespace:'dependency'}))
  builder.onLoad({filter:/.*/,namespace:'dependency'},args=>({contents:args.path.includes('api/decoration')?'export const decorationApi=new Proxy({}, {get:(_,name)=>(...args)=>globalThis.__selfInspectionApi[name](...args)})':"import {ref} from 'vue';export const usePermission=()=>({hasPerm:ref(true)})"}))
 }
}]})
const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(require,module,module.exports)
const flush=async()=>{await nextTick();await new Promise(resolve=>setImmediate(resolve));await nextTick()}
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return {resolve,promise}}
function mount(overrides={}){
 globalThis.__selfInspectionApi={projects:async()=>[],selfInspections:async()=>({data:[],total:0}),selfInspection:async id=>({id}),...overrides}
 const renderer=createRenderer({createElement:()=>({}),createText:()=>({}),createComment:()=>({}),setText(){},setElementText(){},parentNode(){},nextSibling(){},insert(){},remove(){},patchProp(){}})
 let state;const app=renderer.createApp(defineComponent({setup(){state=module.exports.useSelfInspections();return ()=>h('div')}}));app.mount({})
 return {state,stop:()=>app.unmount()}
}
test('自检筛选复位分页，OR条件在项目约束内部，清空项目关闭旧详情并丢弃旧查询',async()=>{
 const calls=[],pending=deferred();let delay=false
 const view=mount({selfInspections:async query=>{calls.push(JSON.parse(JSON.stringify(query)));return delay?pending.promise:{data:[{id:'current'}],total:25}}})
 await flush();const s=view.state;s.changeProject('project');await flush();s.changePage(2);await flush()
 const filters=[{column:'spaceName',termType:'like',value:'101'},{type:'or',column:'projectName',termType:'like',value:'项目'}]
 s.changeFilters({filter:{terms:filters}});await flush();assert.equal(s.page.value,1);assert.equal(calls.at(-1).pageIndex,0)
 assert.deepEqual(calls.at(-1).terms,[{type:'and',terms:filters},{column:'projectId',termType:'eq',value:'project'}])
 await s.openDetail('old');assert.equal(s.detail.value.id,'old')
 delay=true;s.changeProject('next');assert.equal(s.detailOpen.value,false);assert.deepEqual(s.rows.value,[]);await flush()
 delay=false;s.changeProject();await flush();assert.equal(calls.at(-1).terms.some(term=>term.column==='projectId'),false)
 pending.resolve({data:[{id:'stale'}],total:1});await flush();assert.equal(s.rows.value[0].id,'current');view.stop()
})
test('自检条件编辑草稿不会发请求，正式change采用组件输出的模糊值和完整日期',async()=>{
 const calls=[];const view=mount({selfInspections:async query=>{calls.push(JSON.parse(JSON.stringify(query)));return {data:[],total:0}}})
 await flush();const s=view.state;const count=calls.length
 s.terms.value=[{column:'createTime',termType:'btw',value:[]}];await flush();assert.equal(calls.length,count)
 s.terms.value=[{column:'spaceName',termType:'like',value:'101'}];await flush();assert.equal(calls.length,count)
 const output=[{column:'spaceName',termType:'like',value:'%101%'},{column:'createTime',termType:'btw',value:[1900000000000,1900600000000]}]
 s.changeFilters({filter:{terms:output}});await flush();assert.deepEqual(calls.at(-1).terms[0].terms,output);view.stop()
})
test('自检详情切换不显示旧结果，关闭后不重开；删除最后一页复位页码',async()=>{
 const old=deferred(),deleted=[],queries=[];let removed=false
 const view=mount({selfInspection:id=>id==='old'?old.promise:Promise.resolve({id}),deleteSelfInspection:async row=>{deleted.push({...row});removed=true},selfInspections:async query=>{queries.push(query.pageIndex);return removed?{data:query.pageIndex?[]:[{id:'remaining'}],total:20}:{data:[{id:'last'}],total:21}}})
 await flush();const s=view.state;const pending=s.openDetail('old');await s.openDetail('new');old.resolve({id:'old'});await pending;assert.equal(s.detail.value.id,'new')
 s.closeDetail();assert.equal(s.detail.value,undefined)
 s.changePage(2);await flush();await s.remove({id:'last',version:3})
 assert.deepEqual(deleted,[{id:'last',version:3}]);assert.equal(s.page.value,1);assert.deepEqual(queries.slice(-2),[1,0]);assert.equal(s.rows.value[0].id,'remaining');view.stop()
})
test('自检查询失败明确展示，删除失败保留记录且不自动重试',async()=>{
 let writes=0;const view=mount({selfInspections:async()=>{throw new Error('目录不可用')},deleteSelfInspection:async()=>{writes++;throw new Error('版本冲突')}})
 await flush();const s=view.state;assert.match(s.error.value,/目录不可用/)
 s.rows.value=[{id:'one',version:1}];await s.remove(s.rows.value[0]);assert.equal(writes,1);assert.equal(s.rows.value.length,1);assert.match(s.error.value,/版本冲突/);view.stop()
})
