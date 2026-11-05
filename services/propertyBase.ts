import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'
import type { PropertyBaseApis } from '@property-base-ui/public-api'

/** 注册完成后读取公共目录，缺少模块时让页面显示加载失败，不伪造空字典。 */
export function propertyBaseApis() {
  const getDictionaryTypes = moduleRegistry.getResourceItem<PropertyBaseApis['getDictionaryTypes']>('property-base-ui', 'apis', 'getDictionaryTypes')
  const getDictionaryItems = moduleRegistry.getResourceItem<PropertyBaseApis['getDictionaryItems']>('property-base-ui', 'apis', 'getDictionaryItems')
  if (!getDictionaryTypes || !getDictionaryItems) throw new Error('物业基础管理模块未加载')
  return { getDictionaryTypes, getDictionaryItems }
}
