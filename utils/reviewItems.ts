import type {Application,Material} from '../types/decoration'
/** 自检审核元数据仅展示服务端实际记录，旧申请不补造通过状态。 */
export function reviewItems(row:Application):Material[]{
  return [...(row.details.selfInspectionReview?[row.details.selfInspectionReview]:[]),...row.details.materials]
}
