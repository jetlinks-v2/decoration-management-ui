import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {build} from 'esbuild'
import {parse,compileScript} from 'vue/compiler-sfc'
import {createRenderer,defineComponent,h,nextTick,reactive} from 'vue'
import {createI18n} from 'vue-i18n'
import {test} from 'node:test'
import assert from 'node:assert/strict'

const require=createRequire(import.meta.url)
const {Form}=require('ant-design-vue')
const filename=fileURLToPath(new URL('../components/decoration/ActionForm.vue',import.meta.url))
const {descriptor}=parse(readFileSync(filename,'utf8'),{filename})
const compiled=compileScript(descriptor,{id:'acceptance-action-form',inlineTemplate:true})
const result=await build({stdin:{contents:compiled.content,loader:'ts',resolveDir:filename.slice(0,filename.lastIndexOf('/'))},bundle:true,write:false,platform:'node',format:'cjs',external:['vue','vue-i18n'],plugins:[{name:'unrelated-worker-fields',setup(builder){builder.onResolve({filter:/WorkerRegistrationFields\.vue$/},()=>({path:'workers',namespace:'child'}));builder.onLoad({filter:/.*/,namespace:'child'},()=>({contents:"import {h} from 'vue';export default {setup:()=>()=>h('worker-fields')}"}))}}]})
const loaded={exports:{}}
new Function('require','module','exports',result.outputFiles[0].text)(require,loaded,loaded.exports)
const ActionForm=loaded.exports.default
const renderer=createRenderer({
 createElement:type=>({type,children:[],props:{}}),createText:text=>({text}),createComment:()=>({}),setText(n,t){n.text=t},setElementText(n,t){n.text=t},patchProp(n,k,_,v){n.props[k]=v},parentNode:n=>n.parent,nextSibling:n=>n.parent?.children[n.parent.children.indexOf(n)+1]??null,
 insert(n,p,a){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);const i=a?p.children.indexOf(a):-1;p.children.splice(i<0?p.children.length:i,0,n);n.parent=p},remove(n){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);n.parent=undefined}
})
const flush=async()=>{await nextTick();await new Promise(resolve=>setImmediate(resolve));await nextTick()}
function mount(action,row){
 const calls=[],state=reactive({action,row,busy:false}),root={children:[]}
 const api={employees:async()=>({data:[]}),roles:async()=>({data:[{id:'patrol-a',name:'巡查甲'},{id:'patrol-b',name:'巡查乙'},{id:'review',name:'整改复核'}]})}
 const app=renderer.createApp(defineComponent({setup:()=>()=>h(ActionForm,{...state,api,onSubmit:(...args)=>calls.push(args)})}))
 for(const name of ['a-form-item','a-radio-group','a-radio','a-date-picker','a-select','a-textarea','a-button','a-alert','a-input-number','a-descriptions','a-descriptions-item']){
  app.component(name,defineComponent({inheritAttrs:false,setup:(_,ctx)=>()=>h(name,ctx.attrs,ctx.slots.default?.())}))
 }
 app.component('a-form',Form)
 app.use(createI18n({legacy:false,locale:'zh',messages:{zh:{}}}))
 app.config.warnHandler=()=>{};app.mount(root)
 const find=(p,n=root)=>p(n)?n:(n.children||[]).map(c=>find(p,c)).find(Boolean)
 return {calls,state,find,stop:()=>app.unmount(),submit:async()=>{find(n=>n.type==='form').props.onSubmit({preventDefault(){},stopPropagation(){}});await flush()}}
}

test('PC验收申请按阶段初始化，切换至指派后提交保留本轮二验类型',async t=>{
 const view=mount('acceptance',{status:'pending_second_acceptance',acceptanceType:1})
 t.after(view.stop)
 assert.equal(view.find(n=>n.type==='a-radio-group'),undefined);assert.ok(view.find(n=>n.type==='span'&&(n.text==='二次验收'||n.children?.some(c=>c.text==='二次验收'))))
 view.find(n=>n.type==='a-date-picker').props['onUpdate:value']({valueOf:()=>1900000000000})
 await view.submit()
 assert.equal(view.calls[0][0],'acceptance');assert.equal(view.calls[0][1].type,2)
 view.state.row={status:'second_acceptance_waiting',acceptanceType:2}
 view.state.action='acceptance/assign';await flush();view.find(n=>n.type==='a-select').props['onUpdate:value'](['inspector']);await view.submit()
 assert.equal(view.calls[1][0],'acceptance/assign');assert.equal(view.calls[1][1].type,2);assert.equal(view.calls[1][2],true)
})

test('PC首验、首验重提默认首验，二验重提默认二验',t=>{
 for(const [status,expected] of [['permit_issued',1],['first_acceptance_failed',1],['second_acceptance_failed',2]]){
  const view=mount('acceptance',{status});t.after(view.stop)
  assert.equal(view.find(n=>n.type==='a-radio-group'),undefined);assert.ok(view.find(n=>n.type==='span'&&(n.text===(expected===2?'二次验收':'首次验收')||n.children?.some(c=>c.text===(expected===2?'二次验收':'首次验收')))),status)
 }
})

test('巡检分配直接展示房号业主，不选择日期，各角色频率独立并可保留',async t=>{
 const view=mount('inspection/assign',{spaceName:'一栋101',ownerName:'业主甲',completionTime:1900000000000,inspectionPlan:{inspectionRoles:[{roleId:'patrol-a',roleName:'巡查甲',intervalDays:3}],reviewRoleId:'review'}})
 t.after(view.stop);await flush()
 assert.ok(view.find(n=>n.type==='a-descriptions-item'&&n.props.label==='房号'&&n.children.some(c=>c.text==='一栋101')))
 assert.ok(view.find(n=>n.type==='a-descriptions-item'&&n.props.label==='业主姓名'&&n.children.some(c=>c.text==='业主甲')))
 assert.equal(view.find(n=>n.type==='a-date-picker'),undefined)
 const roles=view.find(n=>n.type==='a-select'&&n.props.mode==='multiple')
 roles.props['onUpdate:value'](['patrol-a','patrol-b']);await flush()
 const frequency=view.find(n=>n.type==='a-form-item'&&n.props.label==='巡查乙 · 巡检频率')
 view.find(n=>n.type==='a-input-number',frequency).props['onUpdate:value'](5)
 await view.submit()
 assert.equal(view.calls[0][0],'inspection/assign');assert.equal(view.calls[0][2],true)
 assert.deepEqual(view.calls[0][1].inspectionRoles.map(role=>[role.roleId,role.intervalDays]),[['patrol-a',3],['patrol-b',5]])
 assert.equal(view.calls[0][1].startTime,undefined);assert.equal(view.calls[0][1].endTime,undefined)
})

test('巡检频率拒绝零、非整数和超限值',async t=>{
 const view=mount('inspection/assign',{inspectionPlan:{inspectionRoles:[{roleId:'patrol-a',roleName:'巡查甲',intervalDays:1}],reviewRoleId:'review'}})
 t.after(view.stop);await flush()
 for(const invalid of [0,1.5,1001]){
  view.find(n=>n.type==='a-input-number').props['onUpdate:value'](invalid);await view.submit()
  assert.equal(view.calls.length,0)
 }
 view.find(n=>n.type==='a-input-number').props['onUpdate:value'](2);await view.submit();assert.equal(view.calls.length,1)
})
