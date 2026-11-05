import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {parse,compileScript} from 'vue/compiler-sfc'
import {createSSRApp,h} from 'vue'
import {renderToString} from 'vue/server-renderer'
import {createI18n} from 'vue-i18n'

const require=createRequire(import.meta.url)
async function loadComponent(name){
const filename=fileURLToPath(new URL(`../components/decoration/${name}.vue`,import.meta.url))
const built=await build({entryPoints:[filename],bundle:true,write:false,platform:'node',format:'cjs',external:['vue','vue-i18n'],plugins:[{
 name:'vue-results',setup(builder){
  // 仅替换附件入口，历史检查内容和模板执行实际组件源码。
  builder.onResolve({filter:/FilePicker\.vue$/},()=>({path:'files',namespace:'stub'}))
  builder.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:"import {h} from 'vue';export default {props:{readonly:Boolean,value:Array},setup:p=>()=>h('span',{'data-readonly':String(p.readonly),'data-files':p.value.join(',')})}"}))
  builder.onLoad({filter:/\.vue$/},args=>{const {descriptor}=parse(readFileSync(args.path,'utf8'),{filename:args.path});return {contents:compileScript(descriptor,{id:'task-results',inlineTemplate:true}).content,loader:'ts',resolveDir:fileURLToPath(new URL('../components/decoration/',import.meta.url))}})
 }
}]})
const loaded={exports:{}}
new Function('require','module','exports',built.outputFiles[0].text)(require,loaded,loaded.exports)
return loaded.exports.default
}
const TaskResults=await loadComponent('TaskResults')

test('历史检查结果保留零值、未填写及不合格内容，附件全部只读',async()=>{
 const task={details:{checks:[
  {id:'zero',name:'数值检查',enabled:true,min:0,max:10},
  {id:'missing',name:'未填检查',enabled:true},
  {id:'failed',name:'外观检查',enabled:true,exampleFileId:'example'},
 ],results:[{itemId:'zero',value:'0',qualified:true,fileIds:[]},{itemId:'failed',qualified:false,rectification:'恢复外立面',deadline:1900000000000,fileIds:['evidence']} ]}}
 const app=createSSRApp(TaskResults,{task,row:{id:'d',projectId:'p'},api:{}})
 const section={setup:(_,context)=>()=>h('section',context.slots.default?.())}
 app.component('ACollapse',section);app.component('ACollapsePanel',section)
 const html=await renderToString(app)
 assert.match(html,/检查值：0 · 合格/);assert.match(html,/未填写/);assert.match(html,/不合格/)
 assert.match(html,/恢复外立面/);assert.match(html,/整改截止日期/)
 assert.match(html,/data-files="evidence"/);assert.match(html,/data-files="example"/)
 assert.equal((html.match(/data-readonly="true"/g)||[]).length,3)
 assert.doesNotMatch(html,/<input|<textarea|<select/)
})

test('整改办理记录同时展示审核、两次整改、驳回复核和角色快照，附件保持只读',async()=>{
 const component=await loadComponent('TaskHandlingRecords')
 const base={operatorId:'operator',time:1900000000000,reviewRoleId:'review',reviewRoleName:'原复核角色',fileIds:[]}
 const records=[
  {...base,action:'auditViolation',status:'owner_rectification',operatorName:'通知审核人',remark:'通知可以发出'},
  {...base,action:'submitRectification',status:'waiting_review',operatorName:'业主',remark:'第一次整改',fileIds:['first-photo']},
  {...base,action:'reviewRectification',status:'rectification_rejected',operatorName:'原复核人',remark:'仍需整改'},
  {...base,action:'reassignReviewRole',status:'rectification_rejected',operatorName:'管理员',reviewRoleName:'新复核角色'},
  {...base,action:'submitRectification',status:'waiting_review',operatorName:'业主',remark:'第二次整改',fileIds:['second-photo']},
  {...base,action:'reviewRectification',status:'rectified',operatorName:'新复核人',remark:'整改已通过',reviewRoleName:'新复核角色'}
 ]
 const app=createSSRApp(component,{records,row:{id:'d',projectId:'p'},api:{}})
 app.use(createI18n({legacy:false,locale:'zh',messages:{zh:{Decoration:{taskStates:{owner_rectification:'待整改',waiting_review:'待复核',rectification_rejected:'整改驳回',rectified:'已整改'}}}}}))
 const section={setup:(_,context)=>()=>h('section',context.slots.default?.())}
 for(const name of ['ACollapse','ACollapsePanel','ATimeline','ATimelineItem'])app.component(name,section)
 const html=await renderToString(app)
 for(const text of ['整改通知审核','通知审核人','第一次整改','第二次整改','仍需整改','原复核角色','新复核角色','新复核人','已整改'])assert.ok(html.includes(text),text)
 assert.ok(html.indexOf('第一次整改')<html.indexOf('第二次整改'))
 assert.match(html,/data-files="first-photo"/);assert.match(html,/data-files="second-photo"/)
 assert.equal((html.match(/data-readonly="true"/g)||[]).length,2)
 assert.doesNotMatch(html,/<input|<textarea|<select/)
})
