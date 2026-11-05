import { request } from '@jetlinks-web/core'
import { createDecorationApi } from '../services/decorationApi'
import type { Transport } from '../types/decoration'
/** 沿用宿主认证、应用上下文和错误处理，统一确认success再读取result。 */
const transport: Transport = async <T>(path: string, method: 'GET' | 'POST' | 'DELETE', body?: unknown, signal?: AbortSignal, responseType?: 'blob'): Promise<T> => {
  if (responseType === 'blob') {
    const response = method === 'POST' ? await request.post(path, body, { responseType: 'blob', signal }) : await request.get(path, undefined, { responseType: 'blob', signal })
    const blob=response instanceof Blob?response:response.data
    if(!(blob instanceof Blob))throw new Error(response.message||'文件读取失败')
    if(blob.type.includes('json')){const data=JSON.parse(await blob.text());throw Object.assign(new Error(data.message||'文件读取失败'),{status:data.status||502,code:data.code})}
    return blob as T
  }
  const response = method === 'GET' ? await request.get(path, undefined, { signal })
    : method === 'DELETE' ? await request.remove(path)
    : await request.post(path, body, { signal })
  if (!response.success) throw Object.assign(new Error(response.message || '请求失败'), {status:response.status||502,code:response.code})
  return response.result
}
export const decorationApi = createDecorationApi(transport, false)
