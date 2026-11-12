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
async function load(path){
 const filename=fileURLToPath(new URL(path,import.meta.url))
 const result=await build({entryPoints:[filename],bundle:true,write:false,platform:'node',format:'cjs',external:['vue','vue-i18n'],plugins:[{name:'task-access',setup(builder){
  builder.onResolve({filter:/(FilePicker|CheckForm|TaskResults|TaskHandlingRecords)\.vue$/},()=>({path:'child',namespace:'stub'}))
  builder.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export default {render:()=>null}'}))
  builder.onLoad({filter:/\.vue$/},args=>{const {descriptor}=parse(readFileSync(args.path,'utf8'),{filename:args.path});return {contents:compileScript(descriptor,{id:'task-access',inlineTemplate:true}).content,loader:'ts',resolveDir:args.path.slice(0,args.path.lastIndexOf('/'))}})
 }}]})
 const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports)
 return module.exports.default
}
const Pc=await load('../components/decoration/TaskPanel.vue'),Mobile=await load('../mobile/components/MobileTaskRecord.vue')
const task=(overrides={})=>({id:'task',kind:'firstAcceptance',status:'pending',assigneeId:'inspector',round:1,details:{checks:[],results:[],fileIds:[],inspectionRoles:[],violations:[],rectificationFiles:[]},...overrides})
async function render(component,value,grants={}){
 const app=createSSRApp(component,{row:{id:'application',projectId:'project'},...(component===Pc?{tasks:[value],canRectify:false}:{task:value}),api:{},busy:false,canHandle:true,canReview:true,...grants})
 app.use(createI18n({legacy:false,locale:'zh',missingWarn:false,fallbackWarn:false,messages:{zh:{}}}))
 const section={setup:(_,ctx)=>()=>h('section',ctx.slots.default?.())}
 for(const name of ['AEmpty','ASelect','AInput','ATextarea','ASpace','AButton','AForm','AFormItem','ARadioGroup','ARadio','AAlert'])app.component(name,section)
 app.component('AModal',{props:['open'],setup:(p,ctx)=>()=>p.open?h('section',ctx.slots.default?.()):null})
 return renderToString(app)
}

test('PC与H5均要求菜单权限和当前任务资格同时成立，缺失资格不显示办理入口',async()=>{
 for(const component of [Pc,Mobile]){
  const action=component===Pc?'办理':'确认提交'
  for(const feedbackAllowed of [undefined,false])assert.ok(!(await render(component,task({feedbackAllowed}))).includes(action))
  assert.ok((await render(component,task({feedbackAllowed:true}))).includes(action))
  assert.ok(!(await render(component,task({feedbackAllowed:true}),{canHandle:false})).includes(action))
  assert.ok(!(await render(component,task({feedbackAllowed:true,status:'passed'}))).includes(action))
 }
})

test('整改复核入口按复核角色资格与菜单权限取交集',async()=>{
 for(const component of [Pc,Mobile]){
  const action=component===Pc?'办理':'确认提交'
  const review=task({kind:'inspectionRecord',status:'waiting_review',reviewAllowed:true})
  assert.ok((await render(component,review)).includes(action))
  assert.ok(!(await render(component,{...review,reviewAllowed:false})).includes(action))
  assert.ok(!(await render(component,review,{canReview:false})).includes(action))
 }
})

test('业主仍可提交属于本人的整改，不依赖员工任务资格',async()=>{
 assert.ok((await render(Mobile,task({kind:'inspectionRecord',status:'owner_rectification'}),{owner:true,canHandle:false,canReview:false})).includes('提交整改，申请复核'))
})
