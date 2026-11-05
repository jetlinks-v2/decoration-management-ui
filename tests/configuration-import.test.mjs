import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {effectScope,createSSRApp,h} from 'vue'
import {parse,compileScript} from 'vue/compiler-sfc'
import {renderToString} from 'vue/server-renderer'
import {createI18n} from 'vue-i18n'

const require=createRequire(import.meta.url)
async function load(entry,plugins=[]) {
  const result=await build({entryPoints:[fileURLToPath(new URL(entry,import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['vue','vue-i18n'],plugins})
  const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);return module.exports
}
const {useConfigurationImport}=await load('../hooks/decoration/useConfigurationImport.ts')
const {createDecorationApi}=await load('../services/decorationApi.ts')
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {resolve,reject,promise}}
const failure=(status,code)=>Object.assign(new Error('failed'),{status,code})
const success={totalCount:1,validCount:1,importedCount:1,errors:[],configurations:[{id:'c',projectId:'p',version:2}],attachmentIds:[]}
const invalid={...success,validCount:0,importedCount:0,configurations:[],errors:[{rowNumber:2,columnName:'所属项目*',cellValue:'unknown',code:'project'}]}
function mounted(api) {
  const scope=effectScope();let refreshes=0
  const state=scope.run(()=>useConfigurationImport(api,async()=>{refreshes++},key=>key))
  state.show();return {state,stop:()=>scope.stop(),refreshes:()=>refreshes}
}
const file=()=>new File(['data'],'检查配置.xlsx')

test('模板使用Blob，导入携带原始文件和请求号，结果核对仅GET',async()=>{
  const calls=[],api=createDecorationApi(async(...args)=>{calls.push(args);return {}},false),input=file()
  await api.checkImportTemplate();await api.importChecks(input,'a/b');await api.checkImportResult('a/b')
  assert.equal(calls[0][0],'/decoration/configurations/checks/import-template');assert.equal(calls[0][4],'blob')
  assert.equal(calls[1][0],'/decoration/configurations/checks/import?requestId=a%2Fb');assert.equal(calls[1][1],'POST')
  assert.ok(calls[1][2] instanceof FormData);assert.equal(calls[1][2].get('file'),input)
  assert.equal(calls[2][0],'/decoration/configurations/checks/import-result/a%2Fb');assert.equal(calls[2][1],'GET');assert.equal(calls[2][2],undefined)
})
test('未选文件、错误扩展和超限文件不提交；一次导入完成前阻止重复、换文件和丢弃',async()=>{
  const pending=deferred(),writes=[],view=mounted({importChecks:(...args)=>{writes.push(args);return pending.promise}}),s=view.state
  await s.submit();assert.match(s.view.value.error,/fileRequired/)
  s.select(new File(['x'],'invalid.xls'));assert.equal(s.view.value.fileName,'')
  s.select(new File([new Uint8Array(10*1024*1024+1)],'large.xlsx'));assert.equal(s.view.value.fileName,'')
  const original=file();s.select(original);const write=s.submit();await s.submit();s.select(new File(['new'],'new.xlsx'));s.discard()
  assert.equal(writes.length,1);assert.equal(s.view.value.fileName,original.name);assert.equal(s.blocked.value,true);assert.equal(s.view.value.open,true)
  pending.resolve(success);await write;assert.equal(view.refreshes(),1);assert.equal(s.blocked.value,false);assert.equal(s.dirty.value,false)
  await s.submit();assert.equal(writes.length,1);s.discard();assert.equal(s.view.value.open,false);view.stop()
})
test('超时后先只读核对，404保留未知状态，显式重试使用同一文件和同一键',async()=>{
  const writes=[],reads=[],view=mounted({importChecks:async(...args)=>{writes.push(args);if(writes.length===1)throw new TypeError('network');return success},checkImportResult:async key=>{reads.push(key);throw failure(404)}}),s=view.state
  const original=file();s.select(original);await s.submit();assert.equal(s.view.value.uncertain,true)
  await s.submit();await s.retryOriginal();s.select(new File(['new'],'new.xlsx'));s.discard();assert.equal(writes.length,1)
  await s.confirmResult();assert.equal(reads[0],writes[0][1]);assert.equal(writes.length,1);assert.equal(s.view.value.resultMissing,true)
  await s.retryOriginal();assert.equal(writes.length,2);assert.equal(writes[1][0],original);assert.equal(writes[1][1],writes[0][1]);assert.equal(s.view.value.uncertain,false);assert.equal(view.refreshes(),1);view.stop()
})
test('只读核对发现成功收据即刷新，核对中不允许再次提交或核对',async()=>{
  const pending=deferred();let writes=0,reads=0
  const view=mounted({importChecks:async()=>{writes++;throw failure(504)},checkImportResult:()=>{reads++;return pending.promise}}),s=view.state
  s.select(file());await s.submit();const check=s.confirmResult();await s.confirmResult();await s.retryOriginal();assert.equal(writes,1);assert.equal(reads,1)
  pending.resolve(success);await check;assert.equal(s.view.value.result,success);assert.equal(s.view.value.uncertain,false);assert.equal(view.refreshes(),1);view.stop()
})
test('首次目录503是确定未写入，可关闭；更早存在未知提交时不能用后续503或校验失败解除',async()=>{
  // 宿主保留Axios外层ERR_BAD_RESPONSE，业务码在response.data，必须优先读取业务码。
  const view=mounted({importChecks:async()=>{throw Object.assign(new Error('failed'),{code:'ERR_BAD_RESPONSE',response:{status:503,data:{code:'error.decoration.directory_unavailable'}}})}}),s=view.state
  s.select(file());await s.submit();assert.equal(s.view.value.uncertain,false);assert.equal(s.blocked.value,false);s.discard();assert.equal(s.view.value.open,false);view.stop()
  for(const next of [()=>Promise.reject(failure(503,'error.decoration.directory_unavailable')),()=>Promise.resolve(invalid)]) {
    let writes=0;const unknown=mounted({importChecks:()=>++writes===1?Promise.reject(failure(504)):next(),checkImportResult:async()=>{throw failure(404)}}),u=unknown.state
    u.select(file());await u.submit();await u.confirmResult();await u.retryOriginal();assert.equal(u.view.value.uncertain,true);assert.equal(u.blocked.value,true);unknown.stop()
  }
})
test('整批校验失败显示行错误且不刷新，可换文件再提交新请求',async()=>{
  const writes=[],view=mounted({importChecks:async(...args)=>{writes.push(args);return invalid}}),s=view.state
  s.select(file());await s.submit();assert.equal(s.view.value.result,invalid);assert.equal(s.view.value.uncertain,false);assert.equal(view.refreshes(),0)
  s.select(new File(['fixed'],'fixed.xlsx'));assert.equal(s.view.value.result,undefined);await s.submit();assert.notEqual(writes[0][1],writes[1][1]);view.stop()
})
test('卸载后的晚到提交响应不刷新、不修改原界面；只读失败保持未知',async()=>{
  const pending=deferred(),view=mounted({importChecks:()=>pending.promise}),s=view.state
  s.select(file());const write=s.submit();view.stop();pending.resolve(success);await write;assert.equal(view.refreshes(),0);assert.equal(s.view.value.result,undefined)
  const other=mounted({importChecks:async()=>{throw failure(504)},checkImportResult:async()=>{throw failure(503)}}),u=other.state
  u.select(file());await u.submit();await u.confirmResult();assert.equal(u.view.value.uncertain,true);assert.equal(u.view.value.resultMissing,false);other.stop()
})

const {default:Dialog}=await load('../components/decoration/ConfigurationImportDialog.vue',[{name:'vue-import',setup(builder){
  builder.onLoad({filter:/\.vue$/},args=>{const {descriptor}=parse(readFileSync(args.path,'utf8'),{filename:args.path});return {contents:compileScript(descriptor,{id:'configuration-import',inlineTemplate:true}).content,loader:'ts'}})
}}])
const messages=JSON.parse(readFileSync(new URL('../locales/lang/zh.json',import.meta.url),'utf8'))
async function render(view) {
  const app=createSSRApp(Dialog,{view:{open:true,fileName:'检查.xlsx',busy:false,uncertain:false,resultMissing:false,...view},beforeUpload:()=>false})
  app.use(createI18n({legacy:false,locale:'zh',messages:{zh:messages}}))
  const section={setup:(_,ctx)=>()=>h('section',[ctx.slots.default?.(),ctx.slots.footer?.()])}
  for(const name of ['AModal','ASpace','AUploadDragger'])app.component(name,section)
  app.component('AButton',{setup:(_,ctx)=>()=>h('button',ctx.attrs,ctx.slots.default?.())})
  app.component('AAlert',{props:['message','description'],setup:p=>()=>h('p',[p.message,p.description])})
  app.component('ATable',{props:['dataSource'],setup:p=>()=>h('table',p.dataSource.map(row=>h('tr',[row.rowNumber,row.columnName,row.cellValue,row.reason].map(value=>h('td',String(value))))))})
  return renderToString(app)
}
test('实际导入弹窗展示物理行和中文原因，原始值转义；未知结果仅提供核对和原请求重试',async()=>{
  const html=await render({result:{...invalid,errors:[{...invalid.errors[0],rowNumber:9,cellValue:'<img onerror=bad>'}]}})
  assert.match(html,/本次未导入/);assert.match(html,/<td>9<\/td>/);assert.match(html,/项目不存在或无权访问/);assert.match(html,/&lt;img onerror=bad&gt;/);assert.doesNotMatch(html,/<img/)
  const unknown=await render({uncertain:true,resultMissing:true})
  assert.match(unknown,/导入结果待确认/);assert.match(unknown,/核对导入结果/);assert.match(unknown,/重试原请求/);assert.doesNotMatch(unknown,/开始导入/)
  const saved=await render({result:success});assert.match(saved,/已导入1行，保存1份配置/)
})
