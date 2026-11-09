import { getModuleRoutesMap } from '@jetlinks-web/utils'
import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'
import registerSetting from './register'
import { decorationMenuFilter } from './utils/decorationMenus'
import { name } from './package.json'

const routerModules = import.meta.glob('./views/**/index.vue')

/** 由宿主调用注册，登录、项目及应用上下文均沿用 SaaS 运行端。 */
const register = () => moduleRegistry.register(name, registerSetting)

export default {
  getAsyncRoutesMap: () => getModuleRoutesMap(routerModules),
  getExtraRoutesMap: () => ({}),
  getComponents: () => ({}),
  getCoreRouteOverrides: () => [],
  getMenuFilters: () => [decorationMenuFilter],
  register
}
