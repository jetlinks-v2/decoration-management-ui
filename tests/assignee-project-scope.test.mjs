import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {effectScope,ref,nextTick} from 'vue'
const require=createRequire(import.meta.url)
async function load(entry){const result=await build({entryPoints:[fileURLToPath(new URL(entry,import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['vue']});const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);return module.exports}
const {useActionForm}=await load('../hooks/decoration/useActionForm.ts')
const {createDecorationApi}=await load('../services/decorationApi.ts')
const flush=async()=>{await nextTick();await new Promise(resolve=>setImmediate(resolve));await nextTick()}

test('候选接口显式携带目标项目和姓名查询',async()=>{
 const calls=[],api=createDecorationApi(async(...args)=>{calls.push(args);return {data:[]}},false)
 const query={pageSize:50,terms:[{column:'name',termType:'like',value:'%张%'}]}
 const controller=new AbortController()
 await api.employees('project/a',query,controller.signal)
 assert.equal(calls[0][0],'/decoration/directory/employees/_query?projectId=project%2Fa')
 assert.equal(calls[0][1],'POST');assert.equal(calls[0][2],query)
 assert.equal(calls[0][3],controller.signal)
})

test('人员搜索防抖，只请求最后关键字并取消旧请求，卸载后不再发送',async t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 const scope=effectScope(),calls=[]
 const api={employees:(id,query,signal)=>new Promise(resolve=>calls.push({id,query,signal,resolve}))}
 const form=scope.run(()=>useActionForm(api,()=> 'acceptance/assign',()=>{},()=>({}),()=>[],()=>'',()=> 'p'))
 t.after(()=>scope.stop())
 assert.equal(calls.length,1)
 form.scheduleEmployeeSearch('张');assert.equal(calls[0].signal.aborted,true)
 form.scheduleEmployeeSearch('张三')
 t.mock.timers.tick(299);assert.equal(calls.length,1)
 t.mock.timers.tick(1);assert.equal(calls.length,2)
 assert.equal(calls[1].query.terms[0].value,'%张三%')
 calls[0].resolve({data:[{id:'old',name:'旧结果'}]});await flush()
 assert.deepEqual(form.employees.value,[]);assert.equal(form.loading.value,true)
 calls[1].resolve({data:[{id:'new',name:'张三'}]});await flush()
 assert.equal(form.employees.value[0].id,'new');assert.equal(form.loading.value,false)
 form.scheduleEmployeeSearch('李');scope.stop();t.mock.timers.tick(300)
 assert.equal(calls.length,2)
})

test('动作和项目同时切换只查询一次，新项目不执行旧搜索',async t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 const scope=effectScope(),project=ref('p1'),action=ref('acceptance'),calls=[]
 const api={employees:async(id,query,signal)=>{calls.push({id,query,signal});return {data:[]}}}
 const form=scope.run(()=>useActionForm(api,()=>action.value,()=>{},()=>({}),()=>[],()=>'',()=>project.value))
 t.after(()=>scope.stop());await flush()
 form.scheduleEmployeeSearch('张')
 project.value='p2';action.value='acceptance/assign';await flush()
 assert.equal(calls.length,2);assert.equal(calls[1].id,'p2')
 assert.deepEqual(calls[1].query.terms,[])
 t.mock.timers.tick(300);assert.equal(calls.length,2)
})

test('切换项目清空已选人员，迟到的旧项目响应不能覆盖新人选',async t=>{
 const scope=effectScope(),project=ref('p1'),calls=[]
 const api={employees:(id,query)=>new Promise(resolve=>calls.push({id,query,resolve}))}
 const form=scope.run(()=>useActionForm(api,()=> 'acceptance/assign',()=>{},()=>({}),()=>[],()=> '请选择验收人员',()=>project.value))
 t.after(()=>scope.stop())
 assert.equal(calls[0].id,'p1')
 form.form.assigneeIds=['old'];project.value='p2';await nextTick()
 assert.deepEqual(form.form.assigneeIds,[]);assert.deepEqual(form.employees.value,[])
 calls[1].resolve({data:[{id:'new',name:'新人员'}]});await flush()
 calls[0].resolve({data:[{id:'old',name:'旧人员'}]});await flush()
 assert.deepEqual(form.employees.value.map(person=>person.id),['new'])
 const search=form.searchEmployees('张');assert.equal(calls[2].id,'p2');assert.equal(calls[2].query.terms[0].value,'%张%');calls[2].resolve({data:[]});await search
})

test('缺少项目和业主申请不查询员工；查询失败有错误状态',async t=>{
 let count=0;const scope=effectScope();t.after(()=>scope.stop())
 const api={employees:async()=>{count++;throw Error('目录不可用')}}
 const project=ref(undefined)
 const form=scope.run(()=>useActionForm(api,()=> 'acceptance',()=>{},()=>({}),()=>[],()=>'',()=>project.value))
 await flush();assert.equal(count,0)
 project.value='p';await flush();assert.equal(count,1);assert.match(form.employeeError.value,/目录不可用/);assert.equal(form.employeeSearchState.value,'error');assert.equal(form.error.value,'');assert.equal(form.loading.value,false)
 const owner=scope.run(()=>useActionForm({...api,mine:true},()=> 'acceptance',()=>{},()=>({}),()=>[],()=>'',()=> 'p'))
 await flush();assert.equal(count,1);assert.deepEqual(owner.employees.value,[])
})


test('查询失败不会显示为无匹配；修改姓名后清除旧错误并恢复结果',async t=>{
 t.mock.timers.enable({apis:['setTimeout']})
 const scope=effectScope(),calls=[];t.after(()=>scope.stop())
 const api={employees:(id,query)=>new Promise((resolve,reject)=>calls.push({id,query,resolve,reject}))}
 const form=scope.run(()=>useActionForm(api,()=> 'acceptance/assign',()=>{},()=>({}),()=>[],()=>'',()=> 'p'))
 calls[0].reject(Error('候选人员过多'));await flush()
 assert.equal(form.employeeSearchState.value,'error');assert.match(form.employeeError.value,/候选人员过多/)
 form.scheduleEmployeeSearch(' 张三 ')
 assert.equal(form.employeeError.value,'');assert.equal(form.employeeSearchState.value,'loading')
 t.mock.timers.tick(300);assert.equal(calls[1].query.terms[0].value,'%张三%')
 calls[1].resolve({data:[]});await flush()
 assert.equal(form.employeeSearchState.value,'success');assert.deepEqual(form.employees.value,[])
})
