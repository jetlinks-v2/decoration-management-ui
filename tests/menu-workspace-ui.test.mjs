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
  builder.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:''}))
  builder.onResolve({filter:/^ant-design-vue$|\.vue$|ConditionFilter$|api\/decoration$|useDecorationDictionaries$|useLeaveGuard$|^vue-i18n$|^@jetlinks-web\/hooks$/},args=>({path:args.path,namespace:'edge'}))
  builder.onLoad({filter:/.*/,namespace:'edge'},args=>{
   if(args.path==='ant-design-vue')return {contents:"import {defineComponent,h} from 'vue';const popup=tag=>defineComponent({props:['open'],setup(props,ctx){return ()=>props.open?h(tag,ctx.slots.default?.()):null}});export const Modal=popup('modal'),Drawer=popup('drawer')"}
   if(args.path.includes('api/decoration'))return {contents:'export const decorationApi=new Proxy({}, {get:(_,key)=>globalThis.__menuApi[key]})'}
   if(args.path.endsWith('useDecorationDictionaries'))return {contents:"import {ref} from 'vue';export const useDictionaries=()=>({failed:ref(false),options:()=>[],text:()=>'',reload(){}})"}
   if(args.path.endsWith('useLeaveGuard'))return {contents:'export const useLeaveGuard=()=>({allowLeave:()=>true})'}
   if(args.path==='vue-i18n')return {contents:'export const useI18n=()=>({t:key=>key})'}
   if(args.path==='@jetlinks-web/hooks')return {contents:"import {ref} from 'vue';export const usePermission=()=>({hasPerm:ref(true)})"}
   const tag=args.path.endsWith('ApplicationForm.vue')?'application-form':args.path.endsWith('ConfigurationEditor.vue')?'configuration-editor':args.path.endsWith('ProjectTreeSelect.vue')?'project-select':'stub'
   return {contents:`import {defineComponent,h} from 'vue';export default defineComponent({inheritAttrs:false,setup(_,ctx){return ()=>h('${tag}',ctx.attrs,ctx.slots.project?.())}})`}
  })
 }}]})
 const loaded={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(require,loaded,loaded.exports);return loaded.exports.default
}
const Applications=await loadSfc('../views/decoration/Applications/index.vue')
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
 for(const name of ['j-pro-table','a-table','a-alert','a-empty'])app.component(name,defineComponent({setup(){return ()=>h('stub')}}))
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
