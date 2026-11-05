import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {build} from 'esbuild'
import {createRenderer,defineComponent,h,ref,nextTick} from 'vue'
const require=createRequire(import.meta.url)
const {createRouter,createMemoryHistory,RouterView,isNavigationFailure,NavigationFailureType}=require('vue-router')
const compiled=await build({stdin:{contents:`
export {provideUploadScope} from './hooks/decoration/useUploadScope'
export {useFiles} from './hooks/decoration/useFiles'
export {useSignature} from './hooks/decoration/useSignature'
export {useConfigurations} from './hooks/decoration/useConfigurations'
export {useApplicationForm} from './hooks/decoration/useApplicationForm'
export {useApplicationDetail} from './hooks/decoration/useApplicationDetail'
export {useLeaveGuard} from './hooks/decoration/useLeaveGuard'
`,resolveDir:fileURLToPath(new URL('../',import.meta.url))},bundle:true,write:false,platform:'node',format:'cjs',external:['vue','vue-router'],plugins:[{
 name:'public-edges',setup(builder){
  builder.onResolve({filter:/api\/decoration$|useDecorationDictionaries$|^@jetlinks-web\/hooks$/},args=>({path:args.path,namespace:'edge'}))
  builder.onLoad({filter:/.*/,namespace:'edge'},args=>({contents:args.path.includes('api/decoration')?'export const decorationApi=new Proxy({}, {get:(_,key)=>globalThis.__uploadApi[key]})':args.path.includes('useDecorationDictionaries')?'export const useDictionaries=()=>({})':"import {ref} from 'vue';export const usePermission=()=>({hasPerm:ref(true)})"}))
 }
}]})
const module={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(require,module,module.exports)
const hooks=module.exports
const renderer=createRenderer({
 createElement:type=>({type,children:[]}),createText:text=>({text}),createComment:text=>({text}),
 setText(node,text){node.text=text},setElementText(node,text){node.text=text},patchProp(){},
 parentNode:node=>node.parent,nextSibling:node=>node.parent?.children[node.parent.children.indexOf(node)+1],
 insert(node,parent,anchor){if(node.parent)node.parent.children.splice(node.parent.children.indexOf(node),1);const index=anchor?parent.children.indexOf(anchor):-1;parent.children.splice(index<0?parent.children.length:index,0,node);node.parent=parent},
 remove(node){if(node.parent)node.parent.children.splice(node.parent.children.indexOf(node),1);node.parent=undefined}
})
const flush=async()=>{await nextTick();await new Promise(resolve=>setImmediate(resolve));await nextTick()}
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
const event=()=>({target:{files:[new File(['test'],'test.png',{type:'image/png'})],value:'test.png'}})
function mount(owner,children){
 let state;const childStates=[]
 const app=renderer.createApp(defineComponent({setup(){state=owner();return ()=>h('div',children.map((child,index)=>h(defineComponent({setup(){childStates[index]=child(state);return ()=>h('div')}}))))}}))
 app.mount({children:[]});return {state,children:childStates,stop:()=>app.unmount()}
}

test('两个文件上传分别计数，先完成或失败的一份不能解除另一份的保存保护',async()=>{
 const first=deferred(),second=deferred(),saved=[],files=[[],[]]
 globalThis.__uploadApi={projects:async()=>[],configurations:async()=>({data:[],total:0}),saveConfiguration:async row=>saved.push(row)}
 let index=0;const api={upload:()=>[first,second][index++].promise}
 const child=slot=>()=>hooks.useFiles({api,projectId:'p',get value(){return files[slot]}},ids=>files[slot]=ids)
 const view=mount(()=>hooks.useConfigurations(),[child(0),child(1)]);await flush()
 const s=view.state;s.changeProject('p');s.edit();const draft=s.draft.value
 const a=view.children[0].upload(event()),b=view.children[1].upload(event())
 assert.equal(s.uploading.value,true);await s.save();s.changeProject('other');s.changeKind('checks');s.edit()
 assert.equal(saved.length,0);assert.equal(s.projectId.value,'p');assert.equal(s.draft.value,draft);assert.equal(s.kind.value,'agreement')
 first.reject(new Error('测试上传失败'));await a
 assert.equal(s.uploading.value,true);assert.match(view.children[0].error.value,/测试上传失败/);await s.save();assert.equal(saved.length,0)
 second.resolve({id:'received'});await b;assert.equal(s.uploading.value,false);assert.deepEqual(files[1],['received'])
 await s.save();assert.equal(saved.length,1);view.stop()
})

test('上传期间申请不可提交，完成后提交包含真实回执；办理详情也拒绝提前发动作',async()=>{
 for(const type of ['create','action']){
  const pending=deferred(),writes=[];let ids=[]
  const row={id:'d',version:1}
  const api={households:async()=>[],upload:()=>pending.promise,create:async body=>{writes.push(body);return row},read:async()=>row,tasks:async()=>({data:[],total:0}),history:async()=>[],capabilities:async()=>({}),action:async(...args)=>{writes.push(args);return row}}
  const view=mount(()=>type==='create'?hooks.useApplicationForm(api,()=> 'p',()=>{}):hooks.useApplicationDetail(api,()=> 'd'),[()=>hooks.useFiles({api,projectId:'p',get value(){return ids}},next=>ids=next)])
  await flush();const s=view.state
  if(type==='create'){
   s.configuration.value={materials:[]};Object.assign(s.form,{startTime:1,completionTime:2,noticesAccepted:true,contactPhone:'123',constructionUnit:'测试',constructionManager:'测试',managerPhone:'123'})
  }
  const upload=view.children[0].upload(event());assert.equal(s.uploading.value,true)
  if(type==='create')await s.submit();else assert.equal(await s.execute('review',{itemId:'m'}),false)
  assert.equal(writes.length,0)
  pending.resolve({id:'receipt'});await upload;assert.equal(s.uploading.value,false)
  if(type==='create'){s.form.materials=[{itemId:'m',fileIds:ids}];await s.submit();assert.deepEqual(writes[0].materials[0].fileIds,['receipt'])}
  else{await s.execute('review',{annotatedFileId:ids[0]});assert.equal(writes[0][2].annotatedFileId,'receipt')}
  view.stop()
 }
})

test('签名从PNG生成起计入上传，生成失败和上传失败均释放；并发附件尚未完成时保持保护',async()=>{
 const pending=deferred(),blobResult=deferred();let saved,callback
 const canvas=ref({toBlob:cb=>{callback=cb},getContext:()=>({clearRect(){}})})
 const api={upload:()=>pending.promise}
 const view=mount(()=>hooks.provideUploadScope(),[
  ()=>hooks.useSignature(canvas,{api,projectId:'p'},id=>saved=id),
  ()=>hooks.useFiles({api:{upload:()=>blobResult.promise},projectId:'p',value:[]},()=>{})
 ])
 const signature=view.children[0],files=view.children[1];signature.signed.value=true
 const signing=signature.save();assert.equal(view.state.uploading.value,true)
 callback(new Blob(['png']));await flush();const uploading=files.upload(event())
 pending.resolve({id:'signature'});await signing;assert.equal(saved,'signature');assert.equal(view.state.uploading.value,true)
 blobResult.reject(new Error('网络失败'));await uploading;assert.equal(view.state.uploading.value,false)
 signature.signed.value=true;const failed=signature.save();callback(null);await failed
 assert.match(signature.error.value,/签名保存失败/);assert.equal(view.state.uploading.value,false);view.stop()
})

test('旧组件卸载后的晚到回执不写回，也不会污染另一编辑对象的上传状态',async()=>{
 const pending=deferred(),updates=[]
 const first=mount(()=>hooks.provideUploadScope(),[()=>hooks.useFiles({api:{upload:()=>pending.promise},projectId:'old',value:[]},value=>updates.push(value))])
 const operation=first.children[0].upload(event());assert.equal(first.state.uploading.value,true);first.stop()
 const second=mount(()=>hooks.provideUploadScope(),[]);assert.equal(second.state.uploading.value,false)
 pending.resolve({id:'late'});await operation
 assert.deepEqual(updates,[]);assert.equal(first.state.uploading.value,false);assert.equal(second.state.uploading.value,false);second.stop()
})


test('上传回执返回前拒绝路由切换和浏览器离开，失败恢复后允许离开',async()=>{
 const oldWindow=globalThis.window;globalThis.window=new EventTarget()
 const pending=deferred();let uploader,confirmations=0,blocked=0
 const Child=defineComponent({setup(){uploader=hooks.useFiles({api:{upload:()=>pending.promise},projectId:'p',value:[]},()=>{});return ()=>h('div')}})
 const Form=defineComponent({setup(){const {uploading}=hooks.provideUploadScope();hooks.useLeaveGuard({dirty:()=>false,blocked:()=>uploading.value,confirmDiscard:()=>{confirmations++;return true},onBlocked:()=>blocked++});return ()=>h(Child)}})
 const router=createRouter({history:createMemoryHistory(),routes:[{path:'/form',component:Form},{path:'/other',component:{render:()=>h('div')}}]})
 const app=renderer.createApp({render:()=>h(RouterView)});app.use(router)
 await router.push('/form');await router.isReady();app.mount({children:[]});await flush()
 try {
  const operation=uploader.upload(event())
  const leaving=new Event('beforeunload',{cancelable:true});Object.defineProperty(leaving,'returnValue',{writable:true,value:''});window.dispatchEvent(leaving)
  assert.equal(leaving.defaultPrevented,true)
  assert.equal(isNavigationFailure(await router.push('/other'),NavigationFailureType.aborted),true)
  assert.equal(router.currentRoute.value.path,'/form');assert.equal(confirmations,0);assert.equal(blocked,1)
  pending.reject(new Error('测试失败'));await operation;await router.push('/other');assert.equal(router.currentRoute.value.path,'/other')
 }finally{app.unmount();globalThis.window=oldWindow}
})
