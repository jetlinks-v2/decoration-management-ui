import type { MenuFilterDefinition, MenuItem } from '@jetlinks-web-core/types/module'
import { isProjectApplicationScope } from '@jetlinks-web-core/utils/application-scope'
import baseMenus from '../baseMenu.json'

const businessMenus = baseMenus[0].children
const configuration = businessMenus.find(menu => menu.code === 'decoration/Configuration')!
const inspection = businessMenus.find(menu => menu.code === 'decoration/InspectionGroup')!
const workflow = businessMenus.filter(menu => !['decoration/basic', 'decoration/Mobile'].includes(menu.code))
const workflowCodes = new Set(workflow.map(menu => menu.code))
const inspectionCodes = new Set(inspection.children!.map(menu => menu.code))
const definitions = new Map<string, MenuItem>()
function collect(menus: MenuItem[]) {
  menus.forEach(menu => { definitions.set(menu.code, menu); if (menu.children) collect(menu.children) })
}
collect(workflow)

/** 旧配置页的四个类别拆成导航入口，沿用该页原有权限与按钮，不增加业务操作权限。 */
function configurationChildren(source: MenuItem): MenuItem[] {
  return configuration.children!.map(definition => ({
    ...definition, ...source, code: definition.code, url: definition.url,
    name: definition.name, sortIndex: definition.sortIndex,
    id: `${source.id || source.code}:${definition.code}`,
    buttons: source.buttons, children: [],
    options: { ...source.options, componentCode: undefined },
    meta: { ...source.meta, componentCode: undefined },
    i18nName: undefined,
  }))
}

/** 巡检记录独立展示全部周期任务；只调整已授权入口的可见性。 */
function inspectionChildren(children: MenuItem[]): MenuItem[] {
  return children.map(menu => menu.code === 'decoration/InspectionRecord'
    ? { ...menu, options: { ...menu.options, show: true }, meta: { ...menu.meta, hideInMenu: false } }
    : menu)
}

/** 项目导航与授权页保留系统分组；独立应用才展开装修根节点。 */
export const decorationMenuFilter: MenuFilterDefinition = {
  code: 'decoration-process-order',
  filter(menus, { applicationScope }) {
    if (!applicationScope?.trim() || isProjectApplicationScope(applicationScope)) return menus
    return decorationMenuPresentation(menus)
  },
}

/** 仅重组独立应用中已授权的入口，其他系统的层级和顺序不变。 */
export function decorationMenuPresentation(menus: MenuItem[]): MenuItem[] {
  return present(menus)
}

function present(menus: MenuItem[], parentCode?: string): MenuItem[] {
  let result = menus.flatMap(menu => menu.code === 'decoration/business'
    ? present(menu.children || [], parentCode)
    : [menu.children ? { ...menu, children: present(menu.children, menu.code) } : menu])
  result = result.map(menu => {
    const definition = definitions.get(menu.code)
    const presented = definition ? { ...menu, name: definition.name, i18nName: undefined, sortIndex: definition.sortIndex } : menu
    if (menu.code === configuration.code && !menu.children?.length) {
      return { ...presented, children: configurationChildren(menu) }
    }
    return presented
  })
  // 老环境的巡检入口原为三个平级菜单，归入同一目录但不补充未授权的叶子。
  const leaves = result.filter(menu => inspectionCodes.has(menu.code))
  if (leaves.length && parentCode !== inspection.code) {
    const existing = result.find(menu => menu.code === inspection.code)
    let children = [...(existing?.children || []), ...leaves]
      .filter((menu, index, all) => all.findIndex(item => item.code === menu.code) === index)
      .sort((a, b) => (definitions.get(a.code)?.sortIndex || 0) - (definitions.get(b.code)?.sortIndex || 0))
    children = inspectionChildren(children)
    const group: MenuItem = existing ? { ...existing, children } : {
      ...inspection, appId: leaves[0].appId, children,
    }
    const first = result.findIndex(menu => inspectionCodes.has(menu.code) || menu.code === inspection.code)
    result = result.flatMap((menu, index) => index === first ? [group] : inspectionCodes.has(menu.code) || menu.code === inspection.code ? [] : [menu])
  }
  // 分配、记录、违规各保留已授权入口，不新增授权叶子。
  if (parentCode === inspection.code) result = inspectionChildren(result)
  const ordered = result.filter(menu => workflowCodes.has(menu.code))
    .sort((a, b) => (definitions.get(a.code)?.sortIndex || 0) - (definitions.get(b.code)?.sortIndex || 0))
  const first = result.findIndex(menu => workflowCodes.has(menu.code))
  return result.flatMap((menu, index) => index === first ? ordered : workflowCodes.has(menu.code) ? [] : [menu])
}
