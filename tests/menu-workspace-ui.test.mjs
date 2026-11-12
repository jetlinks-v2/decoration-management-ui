import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {build} from 'esbuild'
import {parse,compileScript} from 'vue/compiler-sfc'
import {createRenderer,defineComponent,h,nextTick} from 'vue'
import {test} from 'node:test'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
async function loadSfc(relative){
 const filename=fileURLToPath(new URL(relative,import.meta.url)),{descriptor}=parse(readFileSync(filename,'utf8'),{filename})
 const compiled=compileScript(descriptor,{id:relative,inlineTemplate:true})
 const built=await build({stdin:{contents:compiled.content,loader:'ts',resolveDir:filename.slice(0,filename.lastIndexOf('/'))},bundle:true,write:false,platform:'node',format:'cjs',external:['vue'],plugins:[{name:'ui-edges',setup(builder){
  builder.onResolve({filter:/\.css$/},args=>({path:args.path,namespace:'empty'}))
  builder.onResolve({filter:/\.(pdf|docx?)\?url$/},args=>({path:args.path,namespace:'asset'}))
  builder.onLoad({filter:/.*/,namespace:'asset'},args=>({contents:`export default ${JSON.stringify(args.path)}`}))
  builder.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:''}))
  builder.onResolve({filter:/^ant-design-vue$|\.vue$|ConditionFilter$|api\/decoration$|useDecorationDictionaries$|useLeaveGuard$|^vue-i18n$|^vue-router$|^@jetlinks-web\/hooks$/},args=>({path:args.path,namespace:'edge'}))
  builder.onLoad({filter:/.*/,namespace:'edge'},args=>{
   if(args.path==='ant-design-vue')return {contents:"import {defineComponent,h} from 'vue';const popup=tag=>defineComponent({props:['open'],setup(props,ctx){return ()=>props.open?h(tag,ctx.slots.default?.()):null}});export const Modal=popup('modal'),Drawer=popup('drawer')"}
   if(args.path.includes('api/decoration'))return {contents:'export const decorationApi=new Proxy({}, {get:(_,key)=>globalThis.__menuApi[key]})'}
   if(args.path.endsWith('useDecorationDictionaries'))return {contents:"import {ref} from 'vue';export const useDictionaries=()=>({failed:ref(false),options:()=>[],text:()=>'',reload(){}})"}
   if(args.path.endsWith('useLeaveGuard'))return {contents:'export const useLeaveGuard=()=>({allowLeave:()=>true,allowClose:()=>true})'}
   if(args.path==='vue-router')return {contents:'export const useRoute=()=>({query:{}});export const useRouter=()=>({replace(){}})'}
   if(args.path==='vue-i18n')return {contents:'export const useI18n=()=>({t:key=>key})'}
   if(args.path==='@jetlinks-web/hooks')return {contents:"import {ref} from 'vue';export const usePermission=code=>({hasPerm:ref(globalThis.__menuGrants?.[code]??true)})"}
   const tag=args.path.endsWith('InspectionAssignment.vue')?'inspection-assignment':args.path.endsWith('ApplicationForm.vue')?'application-form':args.path.endsWith('ApplicationDetail.vue')?'application-detail':args.path.endsWith('ConfigurationEditor.vue')?'configuration-editor':args.path.endsWith('ProjectTreeSelect.vue')?'project-select':args.path.endsWith('TaskWorkspace.vue')?'task-workspace':'stub'
   return {contents:`import {defineComponent,h} from 'vue';export const __esModule=true;export default defineComponent({inheritAttrs:false,setup(_,ctx){return ()=>h('${tag}',ctx.attrs,ctx.slots.project?.())}})`}
  })
 }}]})
 const loaded={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(require,loaded,loaded.exports);return loaded.exports.default
}
const Applications=await loadSfc('../views/decoration/Applications/index.vue')
const TaskWorkspace=await loadSfc('../components/decoration/TaskWorkspace.vue')
const AcceptanceWorkspace=await loadSfc('../components/decoration/AcceptanceWorkspace.vue')
const Configuration=await loadSfc('../components/decoration/ConfigurationWorkspace.vue')
const ApplicationForm=await loadSfc('../components/decoration/ApplicationForm.vue')
const renderer=createRenderer({
 createElement:type=>({type,children:[],props:{}}),createText:text=>({text}),createComment:()=>({}),
 setText(node,text){node.text=text},setElementText(node,text){node.text=text},patchProp(node,key,old,value){node.props[key]=value},
 parentNode:node=>node.parent,nextSibling:()=>null,
 insert(node,parent,anchor){if(node.parent)node.parent.children.splice(node.parent.children.indexOf(node),1);const index=anchor?parent.children.indexOf(anchor):-1;parent.children.splice(index<0?parent.children.length:index,0,node);node.parent=parent},
 remove(node){if(node.parent)node.parent.children.splice(node.parent.children.indexOf(node),1)}
})
const flush=async()=>{await nextTick();await new Promise(resolve=>setImmediate(resolve));await nextTick()}
function mount(component,props){
 const app=renderer.createApp(component,props),root={children:[]}
 app.config.warnHandler=()=>{}
 const pass=defineComponent({inheritAttrs:false,setup(_,ctx){return ()=>h('div',ctx.attrs,ctx.slots.default?.())}})
 for(const name of ['a-space','a-spin','a-form','a-form-item'])app.component(name,pass)
 app.component('a-button',defineComponent({inheritAttrs:false,setup(_,ctx){return ()=>h('button',ctx.attrs,ctx.slots.default?.())}}))
 app.component('a-drawer',defineComponent({props:['open'],setup(props,ctx){return ()=>props.open?h('drawer',ctx.slots.default?.()):null}}))
 for(const name of ['a-table','a-alert','a-empty'])app.component(name,defineComponent({setup(){return ()=>h('stub')}}))
 app.component('a-modal',defineComponent({props:['open'],setup(props,ctx){return ()=>props.open?h('modal',ctx.attrs,ctx.slots.default?.()):null}}))
 app.component('a-tabs',pass);app.component('a-tab-pane',pass)
 app.component('j-pro-table',defineComponent({setup(_,ctx){ctx.expose({reload(){}});return ()=>h('table',(globalThis.__menuRows||[]).map(row=>ctx.slots.actions?.(row)))}}))
 app.mount(root)
 const findAll=(predicate,node=root)=>[...(predicate(node)?[node]:[]),...(node.children||[]).flatMap(child=>findAll(predicate,child))]
 const text=node=>(node.text||'')+(node.children||[]).map(text).join('')
 return {root,findAll,button:label=>findAll(node=>node.type==='button'&&text(node)===label)[0],stop:()=>app.unmount()}
}
const api=()=>({projects:async()=>[],configurations:async()=>({data:[],total:0}),query:async()=>({data:[],total:0})})
test('在线审核未选项目也能点击新增并渲染申请表单，装修记录不显示新增',async t=>{
 globalThis.__menuApi=api()
 const review=mount(Applications,{mode:'review'});t.after(review.stop);await flush()
 const button=review.button('新增装修申请');assert.ok(button);assert.ok(!button.props.disabled)
 button.props.onClick();await flush()
 const form=review.findAll(node=>node.type==='application-form')[0]
 assert.ok(form);assert.equal(form.props['project-id'],'');assert.deepEqual(form.props.projects,[])
 const records=mount(Applications,{mode:'all'});t.after(records.stop);await flush()
 assert.equal(records.button('新增装修申请'),undefined)
})
test('审核列表按状态显示审核、缴费和详情，直接定位对应步骤，已缴费不再提供缴费入口',async t=>{
 globalThis.__menuApi=api()
 t.after(()=>{globalThis.__menuRows=[]})
 for(const [status,label,tab] of [
  ['reviewing','审核','materials'],['rejected','审核','materials'],['pending_payment','缴费','finance'],
  ['pending_permit','详情','overview'],['permit_issued','详情','overview'],['finished','详情','overview']
 ]) {
  globalThis.__menuRows=[{id:status,status}]
  const view=mount(Applications,{mode:'review'})
  try {
   await flush();const button=view.button(label);assert.ok(button,status)
   if(status!=='pending_payment')assert.equal(view.button('缴费'),undefined)
   button.props.onClick();await flush()
   const detail=view.findAll(node=>node.type==='application-detail')[0]
   assert.equal(detail.props.id,status);assert.equal(detail.props['initial-tab'],tab)
   assert.equal(detail.props['initial-action'],undefined)
  } finally {view.stop()}
 }
})
test('PC验收入口要求完成备案、办理权限和本轮资格；空列表及已发起记录不出现发起按钮',async t=>{
 globalThis.__menuApi=api()
 t.after(()=>{globalThis.__menuRows=[];delete globalThis.__menuGrants})
 const received={endTime:Date.now()+86400000,collectedTime:Date.now(),prints:[{}]}
 const base={id:'first',source:'pc_admin',acceptanceType:0,status:'permit_issued',permit:received}
 for(const [mode,row,visible] of [
  ['first',undefined,false],['first',{...base,permit:undefined},false],
  ['first',{...base,permit:{printTime:Date.now(),prints:[{}]}},true],
  ['first',{...base,permit:{downloadTime:Date.now(),prints:[{outputType:'download'}]}},true],
  ['first',base,true],['first',{...base,status:'first_acceptance_waiting',acceptanceType:1},false],
  ['first',{...base,status:'first_acceptance_in_progress',acceptanceType:1},false],
  ['first',{...base,actualEndTime:Date.now()},false],['first',{...base,source:'h5_owner'},false],
  ['first',{...base,status:'first_acceptance_failed',acceptanceType:1},true],
  ['second',{...base,status:'pending_second_acceptance',acceptanceType:1},true]
 ]) {
  globalThis.__menuRows=row?[row]:[]
  const view=mount(Applications,{mode})
  try {
   await flush();const button=view.button('发起验收');assert.equal(!!button,visible,`${mode}:${row?.status}:${row?.source}`)
   if(button){button.props.onClick();await flush();const detail=view.findAll(node=>node.type==='application-detail')[0];assert.equal(detail.props['initial-action'],'acceptance');assert.equal(detail.props['initial-tab'],mode)}
  } finally {view.stop()}
 }
 globalThis.__menuRows=[base];globalThis.__menuGrants={'decoration/FirstAcceptance:acceptance':false}
 const denied=mount(Applications,{mode:'first'})
 try{await flush();assert.equal(denied.button('发起验收'),undefined);assert.ok(denied.button('详情'))}finally{denied.stop()}
})
test('首验二验办理及记录列表可直接指派，限制当前阶段与原指派权限',async t=>{
 globalThis.__menuApi=api()
 t.after(()=>{globalThis.__menuRows=[];delete globalThis.__menuGrants})
 for(const [mode,kind,menu] of [['first','firstAcceptance','FirstAcceptance'],['second','secondAcceptance','SecondAcceptance']]){
  for(const recordList of [false,true]){
   const component=recordList?TaskWorkspace:Applications
   const props=recordList?{kind}:{mode}
   const row={id:'acceptance-a',decorationId:'decoration-a',source:'h5_owner',status:recordList?'waiting_assignment':`${mode}_acceptance_waiting`,decorationStatus:`${mode}_acceptance_waiting`}
   for(const [candidate,granted,visible] of [
    [row,true,true],
    [row,false,false],
    [{...row,status:recordList?'pending':`${mode}_acceptance_in_progress`},true,false],
    [{...row,status:recordList?'passed':'acceptance_passed'},true,false],
    [recordList?{...row,decorationStatus:'finished'}:{...row,actualEndTime:Date.now()},true,false]
   ]){
    globalThis.__menuRows=[candidate];globalThis.__menuGrants={[`decoration/${menu}:assign`]:granted,'decoration/Applications:assign':granted}
    const view=mount(component,props)
    try{
     await flush();const button=view.button('指派');assert.equal(!!button,visible,`${mode}:${recordList}:${candidate.status}:${granted}`)
     if(button){
      button.props.onClick();await flush()
      const detail=view.findAll(node=>node.type==='application-detail')[0]
      assert.equal(detail.props.id,recordList?row.decorationId:row.id)
      assert.equal(detail.props['initial-action'],'acceptance/assign');assert.equal(detail.props['initial-tab'],mode)
     }
    }finally{view.stop()}
   }
  }
 }
})
test('合并验收页只有一个列表，支持待发起与失败重提，并沿用详情已有指派授权',async t=>{
 globalThis.__menuApi=api()
 t.after(()=>{globalThis.__menuRows=[];delete globalThis.__menuGrants})
 for(const [type,kind,menu] of [['first','firstAcceptance','FirstAcceptance'],['second','secondAcceptance','SecondAcceptance']]){
  const page=mount(AcceptanceWorkspace,{type})
  try{await flush();const lists=page.findAll(node=>node.type==='task-workspace');assert.equal(lists.length,1);assert.equal(lists[0].props.kind,kind)}finally{page.stop()}
  for(const [status,allowed,granted] of [['not_requested',true,true],['failed',true,true],['not_requested',false,true],['not_requested',true,false]]){
   globalThis.__menuRows=[{id:'decoration',decorationId:'decoration',status,requestAllowed:allowed}]
   globalThis.__menuGrants={[`decoration/${menu}:acceptance`]:granted,'decoration/Applications:acceptance':granted}
   const view=mount(TaskWorkspace,{kind})
   try{
    await flush();const button=view.button('发起验收');assert.equal(!!button,allowed&&granted)
    if(button){button.props.onClick();await flush();const detail=view.findAll(node=>node.type==='application-detail')[0];assert.equal(detail.props['initial-action'],'acceptance');assert.equal(detail.props['initial-tab'],type)}
   }finally{view.stop()}
  }
  globalThis.__menuRows=[{id:'decoration',decorationId:'decoration',status:'waiting_assignment',decorationStatus:`${type}_acceptance_waiting`}]
  globalThis.__menuGrants={[`decoration/${menu}:assign`]:false,'decoration/Applications:assign':true}
  const inherited=mount(TaskWorkspace,{kind})
  try{await flush();assert.ok(inherited.button('指派'));assert.ok(inherited.button('详情'))}finally{inherited.stop()}
 }
})
test('配置按独立菜单类别加载，未选项目可在弹窗基础信息内选择项目',async t=>{
 const queries=[];globalThis.__menuApi={...api(),configurations:async query=>{queries.push(query);return {data:[],total:0}}}
 const view=mount(Configuration,{kind:'materials'});t.after(view.stop);await flush()
 assert.equal(queries[0].terms.at(-1).value,'materials')
 const button=view.button('新增配置');assert.ok(button);assert.ok(!button.props.disabled)
 button.props.onClick();await flush()
 assert.equal(view.findAll(node=>node.type==='modal').length,1)
 assert.equal(view.findAll(node=>node.type==='configuration-editor')[0].props.value.projectId,'')
 const selectors=view.findAll(node=>node.type==='project-select')
 selectors.at(-1).props['onUpdate:value']('p');await flush()
 assert.equal(view.findAll(node=>node.type==='configuration-editor')[0].props.value.projectId,'p')
})
test('空项目申请不查询房屋，在表单选择项目后再加载该项目房屋关系',async t=>{
 const reads=[];const view=mount(ApplicationForm,{api:{households:async project=>{reads.push(project);return []}},projectId:'',projects:[]});t.after(view.stop);await flush()
 assert.deepEqual(reads,[])
 const selector=view.findAll(node=>node.type==='project-select')[0];assert.ok(selector)
 selector.props['onUpdate:value']('p');await flush();assert.deepEqual(reads,['p'])
})

test('分配任务直接打开独立弹窗，不打开装修详情；无指派权限隐藏按钮',async t=>{
 globalThis.__menuApi=api();globalThis.__menuRows=[{id:'decoration-a',spaceName:'101'}]
 t.after(()=>{globalThis.__menuRows=[];delete globalThis.__menuGrants})
 const view=mount(Applications,{mode:'inspection'})
 try{
  await flush();await view.button('Decoration.inspection.assign').props.onClick();await flush();await flush()
  const assignment=view.findAll(node=>node.type==='inspection-assignment')
  assert.equal(assignment.length,1);assert.equal(assignment[0].props.id,'decoration-a')
  assert.equal(view.findAll(node=>node.type==='application-detail').length,0)
  assignment[0].props.onAssigned();await flush();assert.equal(view.findAll(node=>node.type==='modal').length,0)
 }finally{view.stop()}
 globalThis.__menuGrants={'decoration/Inspection:assign':false}
 const denied=mount(Applications,{mode:'inspection'})
 try{await flush();assert.equal(denied.button('Decoration.inspection.assign'),undefined);assert.ok(denied.button('Decoration.inspection.records'))}finally{denied.stop()}
})

test('巡检记录从装修行打开，只传当前装修ID；分配任务保留原指派权限入口',async t=>{
 globalThis.__menuApi=api();globalThis.__menuRows=[{id:'decoration-a',spaceName:'101'},{id:'decoration-b',spaceName:'102'}]
 t.after(()=>{globalThis.__menuRows=[]})
 const view=mount(Applications,{mode:'inspection'});t.after(view.stop);await flush()
 const recordButtons=view.findAll(node=>node.type==='button'&&node.children?.some(child=>child.text==='Decoration.inspection.records'))
 assert.equal(recordButtons.length,2)
 recordButtons[1].props.onClick();await flush()
 // 测试替身保留ES模块标记，使Vue按真实动态导入语义解析default组件。
 await flush()
 const workspaces=view.findAll(node=>node.type==='task-workspace')
 assert.equal(workspaces.length,1)
 assert.deepEqual(workspaces.map(node=>node.props['decoration-id']),['decoration-b'])
 assert.deepEqual(workspaces.map(node=>node.props.kind),['inspectionRecord'])
 assert.equal(workspaces[0].props['all-records'],'')
})

test('验收汇总记录打开对应验收步骤且不按单任务截断历史',async t=>{
 globalThis.__menuApi=api();globalThis.__menuRows=[{id:'decoration',decorationId:'decoration'}]
 t.after(()=>{globalThis.__menuRows=[]})
 for(const [kind,tab] of [['firstAcceptance','first'],['secondAcceptance','second'],['daily','tasks']]){
  const view=mount(TaskWorkspace,{kind})
  try{
   await flush();view.button(kind==='daily'?'查看与办理':'详情').props.onClick();await flush()
   const detail=view.findAll(node=>node.type==='application-detail')[0]
   assert.equal(detail.props.id,'decoration');assert.equal(detail.props['initial-tab'],tab)
   assert.equal(detail.props['task-id'],tab==='tasks'?'decoration':'')
  }finally{view.stop()}
 }
})

test('合并巡检待办按执行资格显示去巡检，打开详情关联同一次任务',async t=>{
 globalThis.__menuApi=api();globalThis.__menuRows=[{id:'scheduled',decorationId:'decoration',status:'pending',feedbackAllowed:true}]
 t.after(()=>{globalThis.__menuRows=[]})
 const view=mount(TaskWorkspace,{kind:'inspectionRecord',allRecords:true})
 try{
  await flush();assert.ok(view.button('去巡检'));view.button('去巡检').props.onClick();await flush()
  const detail=view.findAll(node=>node.type==='application-detail')[0]
  assert.equal(detail.props['inspection-task-id'],'scheduled');assert.equal(detail.props['task-id'],'')
 }finally{view.stop()}
 globalThis.__menuRows=[{id:'scheduled',decorationId:'decoration',status:'pending',feedbackAllowed:false}]
 const denied=mount(TaskWorkspace,{kind:'inspectionRecord',allRecords:true})
 try{await flush();assert.equal(denied.button('去巡检'),undefined);assert.ok(denied.button('详情'))}finally{denied.stop()}
})
