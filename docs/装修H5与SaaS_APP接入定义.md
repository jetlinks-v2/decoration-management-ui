# 装修 H5 接入定义

源码已迁至 [decoration-management-wx-ui](https://github.com/jetlinks-v2/decoration-management-wx-ui)，本仓库只维护 PC 模块及 PC 使用的共享业务能力。

正式交付使用统一移动主工程 `cloud.jetlinks.mobile`，模块 ID 为 `decoration-app`，真实模板编码为 `DecorationManagement`。在主工程执行 `pnpm install --frozen-lockfile` 和 `pnpm build:app decoration-app`；输出为外壳与业务组合产物。采用 Vue 3 与 Vant 4，模块页面通过公开 `@jetlinks-mobile-core` 接收可信项目、应用及请求能力。

业主、员工视图分别位于 `/applications/decoration-app/owner`、`/applications/decoration-app/staff`；侧别只决定界面，不授予权限。应用未绑定、模板不匹配时不发送业务请求，切换上下文或卸载时取消旧请求并清空页面。返回由官方同步 Back 钩子消费，待提交表单异步确认后再返回；嵌入环境不操作浏览器历史。

独立调试保留 `/decoration-h5/?applicationScope=<真实应用ID>&side=owner|staff`，使用自建账号密码登录、按平台配置加密及验证码，不读取 PC 登录缓存，不从 URL 接收 token。静态配置仅提供标题与同源 API 地址，不预填租户或应用 ID。

业务接口继续使用 `/decoration/**`，业主端读取本人专属接口，员工端读取本人菜单按钮与任务资格。JSON、FormData、受控 Blob 均走统一请求；正式外壳负责 token、租户头及 `X-Asset-Scope: business_application:<实例ID>`。原生 APP 和真实财务消息环境的联调结果需单独确认。
