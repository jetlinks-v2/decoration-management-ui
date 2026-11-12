import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {build} from 'esbuild'
import {parse,compileScript} from 'vue/compiler-sfc'
import {createRenderer,defineComponent,h,nextTick} from 'vue'
import {createI18n} from 'vue-i18n'
import {test} from 'node:test'

import assert from 'node:assert/strict'

const require=createRequire(import.meta.url)
async function component(relative){
 const filename=fileURLToPath(new URL(relative,import.meta.url))
 const {descriptor}=parse(readFileSync(filename,'utf8'),{filename})
 const result=await build({stdin:{contents:compileScript(descriptor,{id:'simulated-finance',inlineTemplate:true}).content,loader:'ts',resolveDir:filename.slice(0,filename.lastIndexOf('/'))},bundle:true,write:false,platform:'node',format:'cjs',external:['vue','vue-i18n'],plugins:[{name:'unrelated-dialogs',setup(builder){
  builder.onResolve({filter:/\.vue$/},args=>({path:args.path,namespace:'child'}))
  builder.onLoad({filter:/.*/,namespace:'child'},()=>({contents:`import {h} from 'vue';export default {setup:()=>()=>h('child')}`}))
  builder.onResolve({filter:/useDetailPermissions$/},()=>({path:'permissions',namespace:'grants'}))
  builder.onLoad({filter:/.*/,namespace:'grants'},()=>({contents:`import {computed} from 'vue';export const useDetailPermissions=()=>computed(()=>globalThis.__financePermissions)`}))
  builder.onResolve({filter:/usePermitDocument$/},()=>({path:'permit',namespace:'helper'}))
  builder.onResolve({filter:/useDiscardConfirm$/},()=>({path:'discard',namespace:'helper'}))
  builder.onLoad({filter:/.*/,namespace:'helper'},args=>({contents:args.path==='permit'?`import {ref} from 'vue';export const usePermitDocument=()=>({busy:ref(false),view:ref({})})`:`export const useDiscardConfirm=()=>async()=>true`}))
 }}]})
 const loaded={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,loaded,loaded.exports)
 return loaded.exports.default
}
const PC=await component('../components/decoration/ApplicationDetail.vue')
const H5=await component('../mobile/components/OwnerApplicationDetail.vue')
const renderer=createRenderer({
 createElement:type=>({type,children:[],props:{}}),createText:text=>({text}),createComment:()=>({}),setText(n,t){n.text=t},setElementText(n,t){n.text=t},patchProp(n,k,_,v){n.props[k]=v},parentNode:n=>n.parent,nextSibling:n=>n.parent?.children[n.parent.children.indexOf(n)+1]??null,
 insert(n,p,a){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);const i=a?p.children.indexOf(a):-1;p.children.splice(i<0?p.children.length:i,0,n);n.parent=p},remove(n){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);n.parent=undefined}
})
const flush=async()=>{await nextTick();await new Promise(resolve=>setImmediate(resolve));await nextTick()}
const text=n=>(n.text||'')+(n.children||[]).map(text).join('')
function mount(target,operation,{simulated=true,permission=true}={}){
 globalThis.__financePermissions={[operation]:permission}
 let row={id:'application',version:7,source:'pc_admin',status:operation==='payment'?'pending_payment':'acceptance_passed',paymentStatus:operation==='payment'?0:2,refundStatus:0,paidAmount:1000,approvedDeposit:1000,details:{agreement:{deposit:1000,refundAmount:1000},materials:[],refunds:[]}}
 const calls=[],api={mine:target===H5,read:async()=>row,tasks:async()=>({data:[],total:0}),history:async()=>[],capabilities:async()=>({payment:true,refund:true,pushNotification:false,simulated}),action:async(id,action,input)=>{calls.push({id,action,input});row={...row,version:8,...(operation==='payment'?{status:'pending_permit',paymentStatus:2,paymentReference:'SIM-PAYMENT-1'}:{status:'finished',refundStatus:2,refundedAmount:1000,actualEndTime:1})};return row}}
 const root={children:[]},app=renderer.createApp(target,{id:row.id,api,permissions:{[operation]:permission},initialTab:operation==='payment'?'finance':'refund',step:operation==='payment'?'pay':'refund'})
 for(const name of ['a-spin','a-alert','a-button','a-tabs','a-tab-pane','a-descriptions','a-descriptions-item','a-list','a-timeline','a-timeline-item','a-modal']){
  app.component(name,defineComponent({inheritAttrs:false,setup:(_,ctx)=>()=>h(name,ctx.attrs,ctx.slots.default?.())}))
 }
 app.use(createI18n({legacy:false,locale:'zh',messages:{zh:{Mobile:{confirmPayment:'确认缴费',confirmRefund:'申请退费'}}}}));app.config.warnHandler=()=>{};app.mount(root)
 const find=(p,n=root)=>p(n)?n:(n.children||[]).map(c=>find(p,c)).find(Boolean)
 return {calls,find,root,stop:()=>app.unmount()}
}
for(const [name,target] of [['PC',PC],['业主H5',H5]])for(const operation of ['payment','refund']){
 test(`${name}点击模拟${operation==='payment'?'缴费':'退款'}走独立接口，服务端生成单据后刷新状态`,async t=>{
  const view=mount(target,operation);t.after(view.stop);await flush()
  const button=view.find(n=>n.type==='a-button'&&text(n).startsWith(target===H5?operation==='payment'?'确认缴费':'申请退费':operation==='payment'?'模拟缴费':'模拟退款'))
  assert.ok(button);assert.equal(!!button.props.disabled,false)
  await button.props.onClick();await flush()
  assert.equal(view.calls.length,1)
  assert.equal(view.calls[0].action,`simulation/${operation}`)
  assert.equal(view.calls[0].input.version,7);assert.ok(view.calls[0].input.requestId)
  assert.equal('reference' in view.calls[0].input,false)
  assert.equal(view.find(n=>n.type==='a-button'&&text(n).startsWith(target===H5?operation==='payment'?'确认缴费':'申请退费':operation==='payment'?'模拟缴费':'模拟退款')),undefined)
 })
}
test('PC缺资金权限不显示模拟按钮，真实模式仍打开财务核验表单',async t=>{
 const denied=mount(PC,'payment',{permission:false});t.after(denied.stop);await flush()
 assert.equal(denied.find(n=>n.type==='a-button'&&text(n).includes('缴费')),undefined)
 const real=mount(PC,'payment',{simulated:false});t.after(real.stop);await flush()
 const button=real.find(n=>n.type==='a-button'&&text(n)==='缴费核验');assert.ok(button)
 await button.props.onClick();await flush();assert.equal(real.calls.length,0)
 assert.equal(real.find(n=>n.type==='a-modal').props.open,true)
})
test('真实模式的物业代登记申请在业主H5保留前台核验提示',async t=>{
 const view=mount(H5,'refund',{simulated:false});t.after(view.stop);await flush()
 assert.ok(view.find(n=>n.type==='a-alert'&&n.props.message?.includes('联系物业前台核验财务单据')))
 assert.equal(view.find(n=>n.type==='a-button'&&text(n).includes('退款')),undefined)
 assert.equal(view.calls.length,0)
})
