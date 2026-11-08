# 装修 H5 与 SaaS APP 接入定义

## 范围

装修 H5 与 PC 使用同一业务服务 `/decoration/**`。H5 独立入口、会话适配、路由和构建产物 `dist-mobile/`，部署静态路径 `/decoration-h5/`，请求使用同源 `/api`。不加载 SaaS 桌面布局，不再编写微信小程序。旧装修小程序的业务页面与新 H5 对照见同目录功能对照。

`window.decorationHost` 是装修侧拟定的宿主契约，不是已存在的 SaaS APP API。浏览器可以先验收；APP Bridge 和真机尚未验收。

## 会话及身份

PC装修概况提供员工与业主入口，`side=staff`为员工办理视图，`side=owner`（或旧链接省略）为业主办理视图。side只决定界面与接口，不能提升权限。员工端使用 `/decoration/applications/**`，业主端使用 `/decoration/mobile/applications/**`。浏览器员工授权从当前应用的 `/menu/user-own/tree`读取，只复用本人装修业务菜单按钮；公共基础档案及其他模块按钮不参与。APP宿主可提供 `permissions(): Promise<Record<string, boolean>>` 返回已授权装修操作；未提供时员工详情只读，不默认放开操作。身份变化清除操作授权，后端逐请求校验业务身份与数据范围。

context 返回 `{ userId, applicationId, sessionEntryCode, tenantId?, businessProjectId? }`。其中 sessionEntryCode 只是 SaaS 会话入口编码；businessProjectId 才是基础组织 project ID。URL 不接受令牌和用户身份，不通过 URL 获得数据权限；后端从认证/应用上下文校验每次请求，H5 传入的 userId 只是切换检测信号。

独立浏览器页面使用装修登录页，通过 SaaS 正常认证接口登录；图片验证码、安全验证及 RSA 密码加密按平台配置启用。令牌仅写入本标签页 sessionStorage，不读取 PC localStorage，不把身份或令牌放入入口链接。静态 config.json 提供应用与租户入口配置，登录后先核验当前应用权限及本人业务接口，再展示页面。401 仅清除发起该请求的会话，旧账号迟到响应不能清掉新登录。原生宿主适配器在加载 H5 前注入，逐请求读取当前 context。账号、应用、会话入口、租户任一变化后取消请求、清理列表/详情/附件/表单并要求重新进入；项目切换清空选中记录、页码和待提交数据，晚到响应不能覆盖新项目。

业主本人资格由基础服务的有效客户房屋关系及认证账号判断；管理查询权限不能替代业主资格。H5 不接受 ownerId 参数代办。

## 传输契约

- `context(): Promise<DecorationContext>`：读取当前可信会话。
- `request({path, method, body?, signal?}): Promise<T>`：path 只允许 `/decoration/` 业务相对路径。宿主负责认证头和应用上下文，返回解包业务结果；保留HTTP/业务错误。JSON、FormData、Blob 分开处理，不对 multipart 手写 Content-Type。
- `back?(): void | Promise<void>`：首页返回交给原生关闭容器；内部页面使用 H5 历史。
- `confirmDiscard?(): Promise<boolean>`：原生主动关闭WebView前与页面协商；不能依靠 beforeunload 阻止强制销毁。

浏览器默认30秒超时并支持AbortController取消。身份变化或页面卸载取消正在读取的数据；写入超时显示结果待确认，先查询申请/记录和版本，不自动重新办理。上传失败保留表单，只有服务器已返回文件ID的附件才可以提交。重试不能生成新的业务幂等键。

附件上传、下载、预览必须经过装修授权接口，以服务持有的文件ID关联申请、项目和应用。客户端URL或任意外部fileId不能直接成为有效附件；预览不把token放URL，不向任意跨域站点发送认证头。

## 页面与返回

业主首页先选择项目及本人的关联房屋，以六步卡片呈现装修申请、费用缴纳、领取装修备案证明、首次验收、二次验收和退费申请。新申请按自检与须知、申请信息、资料与图纸三步填写，保留上传和签署、驳回重传、整改反馈及历史记录。可办理动作取后端状态与资格，不能靠步骤条赋予权限。

员工首页为巡检任务、验收任务和历史记录。个人任务使用 `/decoration/tasks/mine/_query`，服务端从当前认证员工、角色及统一项目范围筛选后分页；历史按实际执行人及办理记录中的操作者归属，不因当前角色相同而获得他人历史。巡检不通过直接下发业主整改，不保留整改通知审批；整改提交后的角色复核保留。任务可见与外部推送受理分开，不假定消息送达。

表单离开提示未保存；提交中禁止重复点击。网络失败分为明确失败与结果待确认；超时不显示办理成功。首页返回、浏览器后退、原生返回均须保留上述约定。

## WebView

viewport-fit=cover，CSS env(safe-area-inset-*)；原生已留白时传装修safe-top/bottom为0避免叠加。最小320px、长表单可滚动、VisualViewport/resize软键盘适配，按钮不得遮挡输入。拍照采用浏览器file input/capture，签名采用canvas并保存真实文件；扫码、定位、支付和通知不预设APP能力。未接通真实支付、财务、推送时显示明确不可用；经授权的测试实例可显式启用后端模拟提供方，页面须展示模拟提示，模拟回执不能证明真实资金交易或消息送达。

## 接入验收

1. 浏览器：真实会话、项目切换、申请/驳回重传/附件、取消、上传失败、写入结果待确认、未保存退出。
2. 服务：认证失效、跨应用/项目/人员访问拒绝，附件和导出同授权，幂等/并发校验。
3. APP：iOS WKWebView/Android WebView存储隔离、multipart、下载预览、相机、签名、键盘和安全区、原生返回、切换账号清理、前后台恢复。
4. 财务：接入后核对真实订单/单据、金额、业务归属和退款结果。正式APP对接、付款和推送在完成真实联调前保持待验收。
