export type MobileSide = 'staff' | 'owner'

/** 入口只选择已有应用会话，不传递令牌、用户或房屋身份。 */
export function mobileEntry(applicationId: string, sessionEntry: string, side: MobileSide): string {
  if (!applicationId) return ''
  const query = new URLSearchParams({ applicationScope: applicationId, side })
  if (sessionEntry) query.set('projectCode', sessionEntry)
  return `/decoration-h5/?${query}`
}

/** 老入口默认业主端；员工模式仅改变界面，权限仍由服务端验证。 */
export function mobileSide(search: string): MobileSide {
  return new URLSearchParams(search).get('side') === 'staff' ? 'staff' : 'owner'
}

export interface AuthorizedMenu {
  code: string
  buttons?: { id: string }[]
  children?: AuthorizedMenu[]
}

/** 仅复用本人装修业务菜单的操作授权，基础档案或其他模块按钮不参与。 */
export function mobilePermissions(menus: AuthorizedMenu[]): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  const business = new Set(['Applications', 'Review', 'Permit', 'Inspection', 'InspectionRecord', 'Violation', 'FirstAcceptance', 'SecondAcceptance'].map(code => `decoration/${code}`))
  function visit(items: AuthorizedMenu[]) {
    for (const menu of items) {
      if (business.has(menu.code)) for (const button of menu.buttons || []) result[button.id] = true
      if (menu.children) visit(menu.children)
    }
  }
  visit(menus)
  return result
}
