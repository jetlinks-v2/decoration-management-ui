import type {CreateApplication} from '../types/decoration'
// 与原系统相同：联系电话允许大陆手机号、8位固话及带区号固话；证件支持15/18位身份证格式。
export const contactPhonePattern = /^(?:1[3-9]\d{9}|\d{8}|0\d{2,3}-?\d{7,8})$/
export const identityCardPattern = /^(?:\d{15}|\d{17}[\dXx])$/
export function applicationContactError(value: Pick<CreateApplication,'contactPhone'|'managerPhone'|'ownerCertificate'|'managerCertificate'>): string {
  if (!contactPhonePattern.test(value.contactPhone)) return '请输入正确的业主联系电话'
  if (!contactPhonePattern.test(value.managerPhone)) return '请输入正确的施工负责人联系电话'
  if (!value.ownerCertificate || !identityCardPattern.test(value.ownerCertificate)) return '请输入正确的业主身份证号码（15或18位）'
  if (!value.managerCertificate || !identityCardPattern.test(value.managerCertificate)) return '请输入正确的施工负责人身份证号码（15或18位）'
  return ''
}
