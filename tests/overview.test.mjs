import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createRenderer,defineComponent,h,nextTick} from 'vue'
const require=createRequire(import.meta.url)
const built=await build({entryPoints:[fileURLToPath(new URL('../hooks/decoration/useOverview.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['vue'],plugins:[{
 name:'overview-dependencies',setup(builder){
  builder.onResolve({filter:/api\/decoration$|^@jetlinks-web-core\/store$/},args=>({path:args.path,namespace:'dependency'}))
  builder.onLoad({filter:/.*/,namespace:'dependency'},args=>({contents:args.path.includes('api/decoration')?'export const decorationApi=new Proxy({}, {get:(_,name)=>(...args)=>globalThis.__overviewApi[name](...args)})':'export const useMenuStore=()=>globalThis.__overviewMenus'}))
 }
}]})
const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(require,module,module.exports)
const flush=async()=>{await nextTick();await new Promise(resolve=>setImmediate(resolve));await nextTick()}
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return {resolve,promise}}
function mount(overrides={}){
 globalThis.__overviewMenus={getMenu:()=>({}),jumpPage:(...args)=>globalThis.__overviewNavigation=args}
 globalThis.__overviewApi={projects:async()=>[],dashboard:async()=>({asOf:1,metrics:[]}),...overrides}
 const renderer=createRenderer({createElement:()=>({}),createText:()=>({}),createComment:()=>({}),setText(){},setElementText(){},parentNode(){},nextSibling(){},insert(){},remove(){},patchProp(){}})
 let state;const app=renderer.createApp(defineComponent({setup(){state=module.exports.useOverview();return ()=>h('div')}}));app.mount({})
 return {state,stop:()=>app.unmount()}
}
test('概况项目切换/清空均重新统计，保留统一概况报告，旧响应不能覆盖新项目',async()=>{
 const calls=[],old=deferred();let delay=false,number=0
 const view=mount({dashboard:async query=>{calls.push(JSON.parse(JSON.stringify(query)));return delay?old.promise:{asOf:123,metrics:[{key:'pendingReview',group:'property',value:++number}]}}})
 await flush();const s=view.state;assert.equal(s.report.value.metrics[0].value,1)
 delay=true;s.changeProject('old');assert.equal(s.report.value,undefined);await flush();assert.equal(calls.at(-1).terms[1].value,'old')
 delay=false;s.changeProject('new');await flush();assert.equal(s.report.value.metrics[0].value,2)
 old.resolve({asOf:1,metrics:[{key:'pendingReview',group:'property',value:999}]});await flush();assert.equal(s.report.value.metrics[0].value,2)
 s.openReview(s.report.value.metrics[0]);assert.deepEqual(globalThis.__overviewNavigation,['decoration/Review',{query:{overviewProject:'new',overviewMetric:'pendingReview',overviewAsOf:'123'}}]);assert.equal('requestDetails' in s,false)
 s.changeProject();await flush();assert.equal(calls.at(-1).terms.some(term=>term.column==='projectId'),false);assert.equal(s.report.value.metrics[0].value,3);view.stop()
})
test('统计或项目目录失败显示错误，不将失败转换为零户数；刷新后可恢复',async()=>{
 let fail=true;const view=mount({dashboard:async()=>{if(fail)throw new Error('统计服务不可用');return {asOf:1,metrics:[{key:'pendingReview',group:'property',value:8}]}}})
 await flush();const s=view.state;assert.match(s.error.value,/统计服务不可用/);assert.equal(s.report.value,undefined);assert.equal(s.loading.value,false)
 fail=false;await s.load();assert.equal(s.report.value.metrics[0].value,8);assert.equal(s.error.value,'');fail=true;await s.load();assert.equal(s.report.value,undefined);assert.match(s.error.value,/统计服务不可用/);view.stop()
 const directory=mount({projects:async()=>{throw new Error('项目目录不可用')}});await flush();assert.match(directory.state.error.value,/项目目录不可用/);assert.equal(directory.state.report.value,undefined);directory.stop()
})
test('概况卸载后异步结果不更新树和数据',async()=>{
 const pending=deferred();const view=mount({projects:()=>pending.promise});await flush();view.stop()
 pending.resolve([{id:'project',name:'项目',organizationType:'project'}]);await flush();assert.deepEqual(view.state.tree.value,[]);assert.equal(view.state.report.value,undefined)
})

test('概况仅导航到已授权在线审核，不在首页查询列表；总入口不带状态筛选',async()=>{
 const view=mount();await flush();view.state.openReview();assert.deepEqual(globalThis.__overviewNavigation,['decoration/Review',{query:{}}]);view.stop()
 const denied=mount();globalThis.__overviewMenus.getMenu=()=>undefined;globalThis.__overviewNavigation=undefined
 await flush();assert.equal(denied.state.canOpenReview.value,false);denied.state.openReview();assert.equal(globalThis.__overviewNavigation,undefined);denied.stop()
})
