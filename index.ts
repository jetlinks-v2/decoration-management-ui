import { getModuleRoutesMap } from '@jetlinks-web/utils'
import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'
import registerSetting from './register'
import { decorationMenuFilter } from './utils/decorationMenus'
import { name } from './package.json'
import {defineAsyncComponent} from 'vue'
import i18n from '@jetlinks-web-core/locales'

const routerModules = import.meta.glob('./views/**/index.vue')

/** 由宿主调用注册，登录、项目及应用上下文均沿用 SaaS 运行端。 */
const register = () => moduleRegistry.register(name, registerSetting)

export default {
  getAsyncRoutesMap: () => getModuleRoutesMap(routerModules),
  getExtraRoutesMap: () => ({}),
  getComponents: () => ({}),
  getCoreRouteOverrides: () => [],
  getMenuFilters: () => [decorationMenuFilter],
  // 复用宿主公开通知扩展点，公共消息中心点击可打开装修详情，不修改SaaS实现。
  getRegisterComponents:()=>[
    {targetPage:'notification-detail',code:'property-decoration',component:defineAsyncComponent(()=>import('./components/decoration/NotificationDetail.vue'))},
    {targetPage:'notification-provider',code:'property-decoration',props:{metadata:()=>({provider:'property-decoration',name:i18n.global.t('Decoration.notice.title'),type:{id:'property-decoration',name:i18n.global.t('Decoration.notice.title')}})}}
  ],
  register
}
