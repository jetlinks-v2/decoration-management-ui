import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {parse,compileScript} from 'vue/compiler-sfc'
import {createSSRApp,createRenderer,defineComponent,h,ref,nextTick} from 'vue'
import {renderToString} from 'vue/server-renderer'
import {createI18n} from 'vue-i18n'
const require=createRequire(import.meta.url)
const compiled=await build({stdin:{contents:'export {usePermitDocument} from "./hooks/decoration/usePermitDocument";export {default as Certificate} from "./components/decoration/PermitCertificate.vue";export {createDecorationApi} from "./services/decorationApi"',resolveDir:fileURLToPath(new URL('../',import.meta.url))},bundle:true,write:false,platform:'node',format:'cjs',external:['vue','vue-i18n'],plugins:[{name:'permit-document',setup(builder){
 builder.onResolve({filter:/services\/(permitImage|blobDownload)$/},args=>({path:args.path,namespace:'browser-edge'}))
 builder.onLoad({filter:/.*/,namespace:'browser-edge'},args=>({contents:args.path.endsWith('permitImage')?'export const capturePermitImage=(...args)=>globalThis.__permitImage.capture(...args);export const printPermitImage=(...args)=>globalThis.__permitImage.print(...args)':'export const downloadBlob=(...args)=>globalThis.__permitImage.download(...args)'}))
 builder.onLoad({filter:/\.vue$/},args=>{const {descriptor}=parse(readFileSync(args.path,'utf8'),{filename:args.path});return {contents:compileScript(descriptor,{id:'permit-certificate',inlineTemplate:true}).content,loader:'ts',resolveDir:fileURLToPath(new URL('../components/decoration/',import.meta.url))}})
}}]})
const module={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(require,module,module.exports)
const {usePermitDocument,Certificate,createDecorationApi}=module.exports
const i18n=()=>createI18n({legacy:false,locale:'zh',messages:{zh:JSON.parse(readFileSync(new URL('../locales/lang/zh.json',import.meta.url),'utf8'))}})
const renderer=createRenderer({createElement:()=>({}),insert:()=>{},remove:()=>{},createText:()=>({}),createComment:()=>({}),setText:()=>{},setElementText:()=>{},parentNode:()=>null,nextSibling:()=>null,patchProp:()=>{}})
const application=()=>({id:'d',version:1,spaceName:'测试房号',ownerName:'测试业主',contactPhone:'测试电话',permit:{number:'TEST-001',startTime:0,endTime:86400000}})
function mount(overrides={}){
 const events=[],row=ref(application()),document={application:application(),sealDataUrl:'data:image/png;base64,test',sealDigest:'a'.repeat(64)}
 const detail={row,saving:ref(false),error:ref(''),uncertain:ref(false),resultMissing:ref(false),execute:async(name,body)=>{events.push(['execute',name,body]);row.value={...row.value,version:2};return true},confirm:async()=>true,retryOriginal:async()=>true,...overrides}
 const api={permitDocument:async id=>{events.push(['prepare',id]);return document},upload:async(file,project,id,purpose)=>{events.push(['upload',file,project,id,purpose]);return {id:'snapshot'}},download:async id=>{events.push(['read-image',id]);return png}}
 const png=new Blob(['png'],{type:'image/png'})
 globalThis.__permitImage={capture:async element=>{events.push(['capture',element]);return png},print:async blob=>{events.push(['print',blob]);return ()=>events.push(['release'])},download:(...args)=>events.push(['download',...args])}
 let state;const target={certificate:true}
 const app=renderer.createApp(defineComponent({setup(){state=usePermitDocument(api,detail,()=>target,()=>events.push(['changed']));return ()=>h('div')}}));app.use(i18n());app.mount({})
 return {app,state,events,detail,api,document,png,target}
}
test('备案证件通过受权只读接口获取，路径编码且不隐式登记打印',async()=>{
 const calls=[],api=createDecorationApi(async(...args)=>{calls.push(args);return {}},false)
 await api.permitDocument('a/b');assert.equal(calls[0][0],'/decoration/applications/a%2Fb/permit/document');assert.equal(calls[0][1],'GET')
 const x=mount();x.api.permitDocument=async()=>{throw new Error('项目章服务尚未接通')}
 await x.state.prepare();assert.equal(x.state.view.value.open,true);assert.match(x.state.view.value.error,/项目章服务尚未接通/);assert.equal(x.state.view.value.document,undefined)
 await x.state.print();assert.equal(x.events.length,0);assert.equal(x.state.close(),true);x.app.unmount()
})
test('图片完整生成后才登记打印，PNG下载保持只读',async()=>{
 const x=mount();await x.state.prepare();await x.state.download()
 assert.deepEqual(x.events.map(event=>event[0]),['prepare','capture','download']);assert.match(x.events[2][2],/装修开工证-测试房号.png/)
 x.events.length=0;await x.state.print()
 assert.deepEqual(x.events.map(event=>event[0]),['capture','upload','execute','print','changed']);assert.equal(x.events[1][4],'permit');assert.equal(x.events[2][1],'permit/print');assert.equal(x.events[2][2].sealDigest,'a'.repeat(64));assert.equal(x.events[2][2].snapshotFileId,'snapshot');assert.equal(x.events[3][1],x.png)
 x.app.unmount();assert.equal(x.events.at(-1)[0],'release')
})
test('损坏图片、过时版本和项目切换不会登记打印，迟到预览不能覆盖新对象',async()=>{
 const x=mount();await x.state.prepare();globalThis.__permitImage.capture=async()=>{throw new Error('图片解码失败')};await x.state.print();assert.match(x.state.view.value.error,/图片解码失败/);assert.equal(x.events.some(event=>event[0]==='execute'),false)
 globalThis.__permitImage.capture=async()=>x.png;x.detail.row.value={...x.detail.row.value,version:3};await x.state.print();assert.match(x.state.view.value.error,/记录已变更/);assert.equal(x.events.some(event=>event[0]==='execute'),false)
 let resolve;x.api.permitDocument=()=>new Promise(done=>resolve=done);const pending=x.state.prepare();x.detail.row.value={...x.detail.row.value,id:'other'};await nextTick();resolve(x.document);await pending
 assert.equal(x.state.view.value.open,false);assert.equal(x.state.view.value.document,undefined);assert.equal(x.state.busy.value,false);x.app.unmount()
})
test('提交中和未知结果禁止离开，先核对原请求成功后只输出同一图片',async()=>{
 const x=mount();let finish;await x.state.prepare()
 x.detail.execute=async()=>{x.events.push(['execute']);return new Promise(done=>finish=()=>{x.detail.uncertain.value=true;done(false)})}
 const pending=x.state.print();await new Promise(setImmediate);assert.equal(x.state.close(),false);await x.state.print();finish();await pending
 assert.equal(x.state.close(),false);await x.state.download();await x.state.prepare();assert.equal(x.events.filter(event=>event[0]==='execute').length,1)
 x.detail.confirm=async()=>{x.events.push(['lookup']);x.detail.uncertain.value=false;return true};await x.state.recover()
 assert.equal(x.events.filter(event=>event[0]==='print').length,1);assert.equal(x.events.filter(event=>event[0]==='execute').length,1);assert.equal(x.state.close(),true);x.app.unmount()
})
test('确定失败展示业务错误，打印设备失败重试不再次登记',async()=>{
 const x=mount();await x.state.prepare();x.detail.execute=async()=>{x.detail.error.value='项目章已变更';return false};await x.state.print();assert.equal(x.state.view.value.error,'项目章已变更');assert.equal(x.events.some(event=>event[0]==='print'),false)
 x.detail.execute=async()=>{x.events.push(['execute']);return true};globalThis.__permitImage.print=async()=>{throw new Error('打印设备不可用')};await x.state.print();assert.match(x.state.view.value.error,/打印设备不可用/)
 globalThis.__permitImage.print=async()=>{x.events.push(['print']);return ()=>{}};await x.state.print();assert.equal(x.events.filter(event=>event[0]==='execute').length,1);assert.equal(x.events.filter(event=>event[0]==='print').length,1);x.app.unmount()
})
test('实际证件模板保留13项须知、施工时段、上海日期及项目章，文本内容转义',async()=>{
 const app=application();app.spaceName='<script>bad()</script>';app.ownerName='测试业主'
 const html=await renderToString(createSSRApp(Certificate,{document:{application:app,sealDataUrl:'data:image/png;base64,test',sealDigest:'a'.repeat(64)}}))
 assert.match(html,/装修开工证/);assert.match(html,/13、严禁封闭检查口/);assert.match(html,/上午 8:00/);assert.match(html,/下午 14:00/);assert.match(html,/1970\/01\/01 08:00:00/);assert.match(html,/alt="项目章"/);assert.match(html,/TEST-001/);assert.match(html,/&lt;script&gt;bad\(\)&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>/)
})

test('重开预览、下载和重印使用已保存原图，不重新截图或上传',async()=>{
 const x=mount();x.document.snapshotFileId='saved-image';await x.state.prepare()
 assert.ok(x.state.view.value.snapshotUrl.startsWith('blob:'))
 await x.state.download();await x.state.print()
 assert.equal(x.events.some(event=>event[0]==='capture'||event[0]==='upload'),false)
 assert.deepEqual(x.events.find(event=>event[0]==='execute')[2],{sealDigest:'a'.repeat(64),snapshotFileId:'saved-image'})
 assert.equal(x.events.find(event=>event[0]==='print')[1],x.png);x.app.unmount()
})
test('图片上传期间切换申请不会将迟到快照提交给其他申请',async()=>{
 const x=mount();let complete;x.api.upload=()=>new Promise(resolve=>complete=resolve)
 await x.state.prepare();const printing=x.state.print();await new Promise(setImmediate)
 x.detail.row.value={...x.detail.row.value,id:'other'};await nextTick();complete({id:'old-snapshot'});await printing
 assert.equal(x.events.some(event=>event[0]==='execute'),false);x.app.unmount()
})
