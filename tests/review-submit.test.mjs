import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {build} from 'esbuild'
import {parse,compileScript} from 'vue/compiler-sfc'
import {createRenderer,defineComponent,h,nextTick,reactive} from 'vue'
import {test} from 'node:test'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {Form}=require('ant-design-vue')
const filename=fileURLToPath(new URL('../components/decoration/ReviewPanel.vue',import.meta.url))
const {descriptor}=parse(readFileSync(filename,'utf8'),{filename})
const compiled=compileScript(descriptor,{id:'review-submit',inlineTemplate:true})
const result=await build({stdin:{contents:compiled.content,loader:'ts',resolveDir:filename.slice(0,filename.lastIndexOf('/'))},bundle:true,write:false,platform:'node',format:'cjs',external:['vue'],plugins:[{name:'attachment-ui',setup(builder){
 builder.onResolve({filter:/useDiscardConfirm$/},args=>({path:args.path,namespace:'discard'}))
 builder.onLoad({filter:/.*/,namespace:'discard'},()=>({contents:'export const useDiscardConfirm=()=>async()=>true'}))
 builder.onResolve({filter:/\.vue$/},args=>({path:args.path,namespace:'child'}))
 builder.onLoad({filter:/.*/,namespace:'child'},args=>({contents:`import {defineComponent,h} from 'vue';export default defineComponent({inheritAttrs:false,setup(_,ctx){return ()=>h('${args.path.includes('ImageAnnotation')?'annotation-editor':'file-picker'}',ctx.attrs)}})`}))
}}]})
const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports)
const ReviewPanel=module.exports.default
const renderer=createRenderer({
 createElement:type=>({type,children:[],props:{}}),createText:text=>({text}),createComment:()=>({}),setText(n,t){n.text=t},setElementText(n,t){n.text=t},patchProp(n,k,_,v){n.props[k]=v},parentNode:n=>n.parent,nextSibling:n=>n.parent?.children[n.parent.children.indexOf(n)+1]??null,
 insert(n,p,a){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);const i=a?p.children.indexOf(a):-1;p.children.splice(i<0?p.children.length:i,0,n);n.parent=p},remove(n){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);n.parent=undefined}
})
const flush=async()=>{await nextTick();await new Promise(resolve=>setImmediate(resolve));await nextTick()}
function mount(){
 const calls=[],state=reactive({busy:false,row:{id:'application',projectId:'p',paymentStatus:0,depositReviewStatus:0,details:{selfInspectionFiles:[],agreement:{deposit:1000},materials:[{definition:{id:'drawing',name:'平面图',kind:'drawing'},fileIds:['source'],reviewStatus:0}]}}})
 const root={children:[]},app=renderer.createApp(defineComponent({setup:()=>()=>h(ReviewPanel,{...state,api:{download:async()=>new Blob(['image'],{type:'image/png'})},canReview:true,onAction:(...args)=>calls.push(args)})}))
 app.component('a-table',defineComponent({props:['columns','dataSource'],setup:(props,ctx)=>()=>h('table',props.dataSource.flatMap(record=>props.columns.map(column=>h('cell',ctx.slots.bodyCell?.({column,record})))))}))
 app.component('a-modal',defineComponent({props:['open'],setup:(props,ctx)=>()=>props.open?h('modal',ctx.slots.default?.()):null}))
 const pass=defineComponent({inheritAttrs:false,setup:(_,ctx)=>()=>h('field',ctx.attrs,ctx.slots.default?.())})
 for(const n of ['a-section','a-space','a-tag','a-descriptions','a-descriptions-item','a-form-item','a-select','a-input-number','a-radio-group','a-radio','a-textarea','a-button','a-alert'])app.component(n,pass)
 // 使用真实 Form 的 submit → 校验 → finish 链路，防止替身掩盖缺少 model。
 app.component('a-form',Form);app.config.warnHandler=()=>{};app.mount(root)
 const text=n=>(n.text||'')+(n.children||[]).map(text).join('')
 const find=(p,n=root)=>p(n)?n:(n.children||[]).map(c=>find(p,c)).find(Boolean)
 return {calls,state,find,click:async label=>{const node=find(n=>n.props?.onClick&&text(n)===label);assert.ok(node,label);node.props.onClick();await flush()},stop:()=>app.unmount(),submit:async()=>{find(n=>n.type==='form').props.onSubmit({preventDefault(){},stopPropagation(){}});await flush()}}
}
test('真实Ant Design表单提交会发出保证金审核，不因缺少model静默失效',async t=>{
 const view=mount();t.after(view.stop);await view.click('审核保证金');await view.submit()
 assert.equal(view.calls.length,1);assert.equal(view.calls[0][0],'review');assert.equal(view.calls[0][1].itemId,'deposit');assert.equal(view.calls[0][1].amount,1000)
})
test('批注未保存或正在提交不发审核，保存后提交原图、批注图片及标记',async t=>{
 const view=mount();t.after(view.stop)
 await view.click('审核')
 const editor=view.find(n=>n.type==='annotation-editor');editor.props.onDirty(true);await flush();await view.submit();assert.equal(view.calls.length,0)
 const marks=[{x:.1,y:.2,width:.3,height:.4,text:'补充尺寸'}];editor.props.onSaved('annotated','source',marks);editor.props.onDirty(false);await flush()
 view.state.busy=true;await flush();await view.submit();assert.equal(view.calls.length,0)
 view.state.busy=false;await flush();await view.submit();assert.equal(view.calls.length,1)
 assert.deepEqual(view.calls[0][1],{itemId:'drawing',result:1,remark:'',amount:undefined,annotatedFileId:'annotated',annotationSourceFileId:'source',annotations:marks})
})
test('已通过资料和保证金不再出现审批按钮，保留查看',async t=>{
 const view=mount();t.after(view.stop)
 view.state.row.details.materials[0].reviewStatus=1;view.state.row.depositReviewStatus=1;await flush()
 const text=n=>(n.text||'')+(n.children||[]).map(text).join('')
 assert.equal(view.find(n=>n.props?.onClick&&['审核','审核保证金'].includes(text(n))),undefined)
 assert.ok(view.find(n=>n.props?.onClick&&text(n)==='查看'))
})
test('未提交的选填图纸明确显示未提交且没有空查看和审核入口',async t=>{
 const view=mount();t.after(view.stop)
 view.state.row.details.materials[0].definition.required=false;view.state.row.details.materials[0].fileIds=[];await flush()
 const text=n=>(n.text||'')+(n.children||[]).map(text).join('')
 assert.ok(view.find(n=>text(n)==='未提交'))
 assert.equal(view.find(n=>n.props?.onClick&&['查看','审核'].includes(text(n))),undefined)
})
