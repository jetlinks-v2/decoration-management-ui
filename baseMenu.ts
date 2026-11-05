import baseMenu from './baseMenu.json'
import p from './package.json'

type MenuItem = {
  children?: MenuItem[]
  options?: Record<string, unknown>
  [key: string]: unknown
}

const handleMenu = (items: MenuItem[]): MenuItem[] =>
  items.map((item) => ({
    ...item,
    children: item.children ? handleMenu(item.children) : undefined,
    options: { appName: p.id || p.name, ...item.options },
    runtime: true
  }))

export default () => handleMenu(baseMenu)
