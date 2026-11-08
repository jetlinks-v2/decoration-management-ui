import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const directory = fileURLToPath(new URL('..', import.meta.url))
const bundle = await build({
  stdin: { contents: `export * from './mobile/auth/session.ts'; export * from './mobile/auth/useLogin.ts'; export * from './mobile/auth/useLoginVerification.ts'`, resolveDir: directory },
  bundle: true, write: false, platform: 'node', format: 'cjs', external: ['vue'],
  define: { 'import.meta.env.BASE_URL': JSON.stringify('/decoration-h5/') },
  plugins: [{ name: 'rsa-contract', setup(builder) {
    builder.onResolve({ filter: /^jsencrypt$/ }, () => ({ path: 'rsa', namespace: 'test' }))
    builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `export default class RSA { setPublicKey(key) { globalThis.rsaKey = key } encrypt(value) { return globalThis.rsaResult === false ? false : 'encrypted:' + value } }` }))
  } }],
})
const config = { applicationId: 'decoration-app', tenantDomain: 'CQHT', title: '装修管理', apiBase: '/api' }
const authorization = { user: { id: 'employee', name: '装修业主' }, permissions: [{ id: 'decoration-owner', actions: ['query'] }] }
const ok = result => ({ ok: true, status: 200, json: async () => ({ status: 200, result }) })
const failed = status => ({ ok: false, status, json: async () => ({ status, message: 'denied' }) })

async function fixture(run) {
  const previous = Object.fromEntries(['location', 'sessionStorage', 'fetch', 'rsaKey', 'rsaResult'].map(key => [key, globalThis[key]]))
  const stored = new Map(), calls = []
  globalThis.location = { origin: 'http://localhost:9300', search: '' }
  globalThis.sessionStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) }
  let respond = (url) => {
    if (url === '/decoration-h5/config.json') return { ok: true, json: async () => config }
    if (url.endsWith('/captcha/config')) return ok({ enabled: true, type: 'image' })
    if (url.includes('/captcha/image')) return ok({ base64: 'data:image/png;base64,image', key: 'captcha-key' })
    if (url.endsWith('/login/configs')) return ok({ encrypt: { enabled: true, id: 'encrypt-id', publicKey: 'public-key' } })
    if (url.endsWith('/authorize/login')) return ok({ token: 'h5-token' })
    if (url.endsWith('/authorize/me')) return ok(authorization)
    return ok([])
  }
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return respond(url, options) }
  const module = { exports: {} }
  new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports)
  try { await run({ ...module.exports, stored, calls, respond: handler => { respond = handler } }) }
  finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value } }
}

async function waitFor(check) {
  for (let count = 0; count < 30; count++) { if (check()) return; await new Promise(resolve => setImmediate(resolve)) }
  assert.fail('expected login verification state')
}

test('H5应用登录：原样提交账号，公开认证不携带PC上下文，RSA后核验应用并校验本人办理入口', () => fixture(async vm => {
  await vm.initializeConfig()
  const login = vm.useLogin()
  Object.assign(login.form, { username: 'test2', password: 'secret' })
  const attempt = login.login()
  await waitFor(() => login.verification.value)
  assert.equal(vm.authState.session, undefined)
  assert.equal(vm.stored.size, 0)
  login.completeVerification({ verifyKey: 'captcha-key', verifyCode: '1234' })
  assert.equal(await attempt, true)
  const request = vm.calls.find(call => call.url.endsWith('/authorize/login')).options
  assert.deepEqual(request.headers, { 'Content-Type': 'application/json' })
  assert.deepEqual(JSON.parse(request.body), { username: 'test2', password: 'encrypted:secret', verifyKey: 'captcha-key', verifyCode: '1234', expires: 3600000, encryptId: 'encrypt-id' })
  assert.equal(globalThis.rsaKey, 'public-key')
  assert.equal(vm.authState.authorization.user.id, 'employee')
  assert.equal(login.form.password, '')
  await vm.sessionRequest('/decoration/mobile/applications/_query', 'POST', { date: '2026-11-06' }, {})
  assert.deepEqual(vm.calls.at(-1).options.headers, { 'X-Access-Token': 'h5-token', 'X-Asset-Scope': 'business_application:decoration-app', 'X-Tenant-Domain': 'CQHT', 'Content-Type': 'application/json' })
  assert.equal(vm.calls.at(-1).options.credentials, 'omit')
}))

test('会话刷新恢复，应用配置变化拒绝旧会话', () => fixture(async vm => {
  await vm.initializeConfig()
  vm.setSession({ token: 'saved-token', applicationId: 'decoration-app', tenantDomain: 'CQHT' })
  await vm.initializeConfig()
  assert.equal(vm.authState.session.token, 'saved-token')
  assert.equal(vm.authState.authorization, undefined)
  vm.respond(() => ({ ok: true, json: async () => ({ ...config, applicationId: 'other-app' }) }))
  await vm.initializeConfig()
  assert.equal(vm.authState.session, undefined)
  assert.equal(vm.stored.size, 0)
}))

test('401回登录、403保留会话；旧请求不能删除或返回新账号的数据', () => fixture(async vm => {
  await vm.initializeConfig()
  const session = token => ({ token, applicationId: 'decoration-app', tenantDomain: 'CQHT' })
  vm.setSession(session('old'))
  vm.respond(() => failed(403))
  await assert.rejects(vm.sessionRequest('/decoration/mobile/applications/_query'), error => error.status === 403)
  assert.equal(vm.authState.session.token, 'old')
  let complete
  vm.respond(() => new Promise(resolve => { complete = resolve }))
  const late = vm.sessionRequest('/decoration/mobile/applications/_query')
  vm.setSession(session('new'))
  complete(failed(401))
  await assert.rejects(late, error => error.message === 'Mobile.contextChanged')
  assert.equal(vm.authState.session.token, 'new')
  vm.respond(() => failed(401))
  await assert.rejects(vm.sessionRequest('/decoration/mobile/applications/_query'), error => error.status === 401)
  assert.equal(vm.authState.session, undefined)
  assert.equal(vm.stored.size, 0)
}))

test('加密失败不明文降级，没有应用权限不进入业务页', () => fixture(async vm => {
  await vm.initializeConfig()
  const login = vm.useLogin()
  Object.assign(login.form, { username: 'test2@CQHT', password: 'secret' })
  globalThis.rsaResult = false
  assert.equal(await login.login(), false)
  assert.equal(vm.calls.some(call => call.url.endsWith('/authorize/login')), false)
  assert.equal(login.error.value, 'Mobile.passwordEncryptFailed')
  globalThis.rsaResult = true
  vm.respond(url => url.endsWith('/authorize/me') ? ok({ user: { id: 'admin' }, permissions: [] })
    : url.endsWith('/authorize/login') ? ok({ token: 'token' })
      : url.endsWith('/captcha/config') ? ok({ enabled: false }) : ok({}))
  assert.equal(await login.login(), false)
  assert.equal(login.error.value, 'Mobile.accessDenied')
  assert.equal(vm.authState.session, undefined)
}))

test('拒绝跨域API及错误应用入口，退出失败仍清理本地登录', () => fixture(async vm => {
  vm.respond(() => ({ ok: true, json: async () => ({ ...config, apiBase: '//other.example/api' }) }))
  await assert.rejects(vm.initializeConfig(), error => error.message === 'Mobile.sameOriginRequired')
  vm.respond(() => ({ ok: true, json: async () => config }))
  globalThis.location.search = '?applicationScope=other'
  await assert.rejects(vm.initializeConfig(), error => error.message === 'Mobile.applicationMismatch')
  globalThis.location.search = ''
  await vm.initializeConfig()
  vm.setSession({ token: 'token', applicationId: 'decoration-app', tenantDomain: 'CQHT' })
  vm.respond(() => failed(503))
  await assert.rejects(vm.logout())
  assert.equal(vm.authState.session, undefined)
  assert.equal(vm.stored.size, 0)
  assert.equal(vm.calls.at(-1).options.method, 'GET')
}))

test('新版挑战验证：首次403只弹验证，重试携带确认头，授权完成前不存储凭证', () => fixture(async vm => {
  await vm.initializeConfig()
  const login = vm.useLogin()
  Object.assign(login.form, { username: 'plain-app-user', password: 'secret' })
  let attempts = 0
  vm.respond((url, options) => {
    if (url.endsWith('/login/configs')) return ok({})
    if (url.endsWith('/captcha/config')) return ok({ enabled: true, type: 'image', loginWithVerify: true })
    if (url.endsWith('/authorize/login')) {
      attempts++
      return attempts === 1 ? { ok: false, status: 403, json: async () => ({ status: 403, result: { type: 'captcha', key: 'challenge' } }) } : ok({ token: 'verified-token' })
    }
    if (url.endsWith('/authorize/me')) {
      assert.equal(vm.stored.size, 0)
      assert.equal(vm.authState.session, undefined)
      assert.equal(options.headers['X-Access-Token'], 'verified-token')
      return ok(authorization)
    }
    return ok({})
  })
  const result = login.login()
  await waitFor(() => login.verification.value)
  assert.equal(login.verification.value.key, 'challenge')
  assert.equal(attempts, 1)
  login.completeVerification({ verification: { key: 'challenge', token: 'confirmed' } })
  assert.equal(await result, true)
  const requests = vm.calls.filter(call => call.url.endsWith('/authorize/login'))
  assert.deepEqual(JSON.parse(requests[1].options.body), JSON.parse(requests[0].options.body))
  assert.equal(requests[1].options.headers['x-verify-key'], 'challenge')
  assert.equal(requests[1].options.headers['x-verify-token'], 'confirmed')
  assert.equal(vm.authState.session.token, 'verified-token')
}))

test('取消安全验证、修改登录输入及重复点击不会创建迟到会话', () => fixture(async vm => {
  await vm.initializeConfig()
  const login = vm.useLogin()
  Object.assign(login.form, { username: 'app-user', password: 'secret' })
  let attempt = login.login()
  await waitFor(() => login.verification.value)
  assert.equal(await login.login(), false)
  login.cancelVerification()
  assert.equal(await attempt, false)
  assert.equal(login.error.value, 'Mobile.loginCancelled')
  assert.equal(vm.calls.some(call => call.url.endsWith('/authorize/login')), false)
  attempt = login.login()
  await waitFor(() => login.verification.value)
  login.form.username = 'other-user'
  login.completeVerification({ verifyKey: 'old', verifyCode: 'old' })
  assert.equal(await attempt, false)
  assert.equal(vm.stored.size, 0)
  vm.respond(url => url.endsWith('/login/configs') ? ok({}) : url.endsWith('/captcha/config') ? ok({ enabled: false })
    : url.endsWith('/authorize/login') ? new Promise(resolve => { globalThis.finishDecorationLogin = resolve }) : ok(authorization))
  attempt = login.login()
  await waitFor(() => globalThis.finishDecorationLogin)
  login.form.tenantDomain = 'OTHER'
  globalThis.finishDecorationLogin(ok({ token: 'late' }))
  delete globalThis.finishDecorationLogin
  assert.equal(await attempt, false)
  assert.equal(vm.authState.session, undefined)
  assert.equal(vm.stored.size, 0)
}))

test('项目编码可由用户填写，会话刷新恢复填写值，ALTCHA绑定登录账号上下文', () => fixture(async vm => {
  vm.respond(() => ({ ok: true, json: async () => ({ ...config, tenantDomain: undefined }) }))
  await vm.initializeConfig()
  const login = vm.useLogin()
  assert.equal(login.form.tenantDomain, '')
  Object.assign(login.form, { tenantDomain: 'PROJECT', username: 'plain-user', password: 'secret' })
  vm.respond(url => url.endsWith('/login/configs') ? ok({}) : url.endsWith('/captcha/config')
    ? ok({ enabled: true, type: 'altcha', loginWithVerify: false, altcha: { contextUrl: '/captcha/context' } })
    : url.endsWith('/captcha/context') ? ok({ contextToken: 'context' }) : url.endsWith('/authorize/login') ? ok({ token: 'altcha-token' }) : ok(authorization))
  const attempt = login.login()
  await waitFor(() => login.verification.value)
  assert.equal(login.verification.value.contextToken, 'context')
  assert.deepEqual(JSON.parse(vm.calls.find(call => call.url.endsWith('/captcha/context')).options.body), { operation: 'login.captcha', target: 'plain-user' })
  login.completeVerification({ proof: 'proof', contextToken: 'context' })
  assert.equal(await attempt, true)
  const body = JSON.parse(vm.calls.find(call => call.url.endsWith('/authorize/login')).options.body)
  assert.equal(body.proof, 'proof')
  assert.equal(body.contextToken, 'context')
  vm.respond(() => ({ ok: true, json: async () => ({ ...config, tenantDomain: undefined }) }))
  await vm.initializeConfig()
  assert.equal(vm.authState.session.tenantDomain, 'PROJECT')
}))

test('验证弹窗使用真实验证接口交换确认凭证，并拒绝过期ALTCHA证明', () => fixture(async vm => {
  const { effectScope } = createRequire(import.meta.url)('vue')
  await vm.initializeConfig()
  const scope = effectScope(), results = []
  const image = scope.run(() => vm.useLoginVerification({ key: 'challenge', config: { enabled: true, type: 'image' } }, result => results.push(result)))
  try {
    await image.load(async () => {})
    image.imageCode.value = ' 1234 '
    vm.respond(url => url.endsWith('/_confirm') ? ok({ token: 'confirmed' }) : ok({}))
    await image.confirmImage()
    assert.deepEqual(results, [{ verification: { key: 'challenge', token: 'confirmed' } }])
    const confirm = vm.calls.at(-1)
    assert.equal(confirm.url, '/api/verify/captcha/_confirm')
    assert.deepEqual(JSON.parse(confirm.options.body), { key: 'challenge', provider: 'image', params: { verifyKey: 'captcha-key', verifyCode: '1234' } })
    assert.equal(confirm.options.headers['X-Access-Token'], undefined)
  } finally { scope.stop() }
  const altchaScope = effectScope()
  const altcha = altchaScope.run(() => vm.useLoginVerification({ contextToken: 'context', config: { enabled: true, type: 'altcha', altcha: { challengeUrl: '/challenge', prevalidateUrl: '/prevalidate' } } }, result => results.push(result)))
  try {
    vm.respond(url => url.endsWith('/prevalidate') ? ok({ proof: 'expired', expiresAt: Date.now() - 1 }) : ok({ challenge: 'challenge' }))
    let configured
    await altcha.load(async challenge => { configured = challenge })
    assert.deepEqual(configured, { challenge: 'challenge' })
    await altcha.verified('payload')
    assert.equal(altcha.error.value, 'Mobile.verificationExpired')
    assert.equal(results.length, 1)
    vm.respond(() => ok({ proof: 'valid', expiresAt: Date.now() + 10000 }))
    await altcha.verified('payload')
    assert.deepEqual(results.at(-1), { proof: 'valid', contextToken: 'context' })
  } finally { altchaScope.stop() }
}))


test('两端分别核验资源与可信业务身份；非员工不能因有菜单而进入员工工作台', () => fixture(async vm => {
  globalThis.location.search = '?side=staff'
  await vm.initializeConfig()
  const session = { token: 'candidate', applicationId: 'decoration-app', tenantDomain: 'CQHT' }
  vm.respond(() => ok(authorization))
  await assert.rejects(vm.verifySession(session), error => error.status === 403)
  vm.respond(url => url.endsWith('/authorize/me') ? ok({ user: { id: 'not-staff' }, permissions: [{ id: 'decoration-task', actions: ['query'] }] }) : failed(403))
  await assert.rejects(vm.verifySession(session), error => error.message === 'Mobile.accessDenied')
  assert.ok(vm.calls.some(call => call.url.endsWith('/decoration/tasks/mine/_query')))
  assert.equal(vm.authState.session, undefined)
  vm.respond(url => url.endsWith('/authorize/me') ? ok({ user: { id: 'staff' }, permissions: [{ id: 'decoration-task', actions: ['query'] }] }) : ok({ data: [], total: 0 }))
  assert.equal((await vm.verifySession(session)).user.id, 'staff')
}))

test('独立会话上传保持multipart，下载支持blob；旧下载晚到不泄漏给新账号', () => fixture(async vm => {
  await vm.initializeConfig()
  const session = token => ({ token, applicationId: 'decoration-app', tenantDomain: 'CQHT' })
  vm.setSession(session('owner-a'))
  const body = new FormData(); body.set('file', new Blob(['file']), 'file.png')
  await vm.sessionRequest('/decoration/attachments', 'POST', body)
  assert.equal(vm.calls.at(-1).options.body, body)
  assert.equal(vm.calls.at(-1).options.headers['Content-Type'], undefined)
  const file = new Blob(['receipt'])
  vm.respond(() => ({ ok: true, status: 200, blob: async () => file }))
  assert.equal(await vm.sessionRequest('/decoration/attachments/f/download', 'GET', undefined, { responseType: 'blob' }), file)
  let complete
  vm.respond(() => ({ ok: true, status: 200, blob: () => new Promise(resolve => { complete = resolve }) }))
  const late = vm.sessionRequest('/decoration/attachments/f/download', 'GET', undefined, { responseType: 'blob' })
  await waitFor(() => complete)
  vm.setSession(session('owner-b')); complete(file)
  await assert.rejects(late, error => error.message === 'Mobile.contextChanged')
  for (const path of ['//evil/api', '/authorize/../login', '/authorize/%2e%2e/login'])
    await assert.rejects(vm.sessionRequest(path), error => error.status === 400)
}))
