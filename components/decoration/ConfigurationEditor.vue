<script setup lang="ts">
import type {Configuration} from '../../types/decoration'
import {useI18n} from 'vue-i18n'
import type {DecorationApi} from '../../services/decorationApi'
import {useDictionaries} from '../../hooks/useDecorationDictionaries'
import {requestId} from '../../utils/decoration'
import FilePicker from './FilePicker.vue'
import ChargeItemSelect from './ChargeItemSelect.vue'
import MaterialConfigurationItems from './MaterialConfigurationItems.vue'
const props=defineProps<{value:Configuration;api:DecorationApi;busy:boolean}>()
const emit=defineEmits<{save:[];cancel:[]}>()
const dictionary=useDictionaries()
const {t}=useI18n()
function addFee(){const name=window.prompt('费用名称');if(name&&props.value.content.agreement)props.value.content.agreement.fees[name]=0}
</script>
<template>
 <a-form layout="vertical" class="configuration-editor" :class="{'configuration-editor-dialog':['materials','checks'].includes(value.kind)}" :model="value" @finish="emit('save')">
  <a-alert v-if="dictionary.failed.value" type="error" message="基础字典加载失败"><template #action><a-button @click="dictionary.reload">重试</a-button></template></a-alert>
  <h3 v-if="['materials','checks'].includes(value.kind)" class="configuration-section-title">基本信息</h3>
  <div class="configuration-basics" :class="{'configuration-basics-grid':['materials','checks'].includes(value.kind),'configuration-basics-checks':value.kind==='checks'}">
  <slot name="project" />
  <a-form-item v-if="value.kind!=='materials'" label="配置名称" required><a-input v-model:value="value.name" :disabled="busy" :maxlength="128" /></a-form-item>
  <a-form-item v-if="['agreement','materials','checks'].includes(value.kind)" label="房屋类型" required><a-select v-model:value="value.houseType" :disabled="!!value.id||busy" :options="dictionary.options('house-type',value.houseType)" /></a-form-item>
  <a-form-item v-if="['materials','checks'].includes(value.kind)" label="装修类型" required><a-select v-model:value="value.decorationType" :disabled="!!value.id||busy" :options="[{value:'first',label:'首次装修'},{value:'second',label:'二次装修'}]" /></a-form-item>
  <a-form-item v-if="value.kind==='checks'" label="检查场景" required><a-select v-model:value="value.scene" :disabled="!!value.id||busy" :options="[{value:'daily',label:'日常巡检'},{value:'firstAcceptance',label:'首次验收'},{value:'secondAcceptance',label:'二次验收'}]" /></a-form-item>
  <a-form-item label="启用"><a-switch v-model:checked="value.enabled" :disabled="busy" /></a-form-item>
  </div>
  <template v-if="value.kind==='agreement'&&value.content.agreement">
   <a-form-item label="协议标题" required><a-input v-model:value="value.content.agreement.title" :disabled="busy" /></a-form-item>
   <a-form-item label="协议与装修须知" required><a-textarea v-model:value="value.content.agreement.content" :rows="6" :disabled="busy" /></a-form-item>
   <a-form-item label="收费科目" required><ChargeItemSelect :api="api" :project-id="value.projectId" :value="value.content.agreement.chargeItemId" :name="value.content.agreement.chargeItemName" :disabled="busy" @change="(id,name)=>{if(value.content.agreement){value.content.agreement.chargeItemId=id;value.content.agreement.chargeItemName=name}}" /></a-form-item>
   <a-form-item label="保证金（元）" required><a-input-number v-model:value="value.content.agreement.deposit" :min="0.01" :precision="2" :disabled="busy" /></a-form-item>
   <a-form-item label="二验后一次性退款金额（元）" extra="未填写时退还实收保证金；退款成功后结束装修。"><a-input-number v-model:value="value.content.agreement.refundAmount" :min="0" :max="value.content.agreement.deposit" :precision="2" :disabled="busy" /></a-form-item>
   <div v-for="(item,index) in value.content.agreement.supplements" :key="index" class="decoration-card"><a-input v-model:value="item.name" placeholder="补充协议标题" :disabled="busy" /><a-textarea v-model:value="item.content" placeholder="补充协议内容" :disabled="busy" /><a-button danger :disabled="busy" @click="value.content.agreement.supplements.splice(index,1)">移除补充协议</a-button></div>
   <a-button :disabled="busy" @click="value.content.agreement.supplements.push({name:'',content:''})">新增补充协议</a-button>
   <h4>其他费用</h4><div v-for="(amount,name) in value.content.agreement.fees" :key="name" class="decoration-actions"><span>{{name}}</span><a-input-number :value="amount" :disabled="busy" :min="0" :precision="2" @update:value="v=>{if(value.content.agreement)value.content.agreement.fees[name]=Number(v||0)}" /><a-button danger :disabled="busy" @click="delete value.content.agreement.fees[name]">移除费用</a-button></div>
   <a-button :disabled="busy" @click="addFee">添加费用</a-button>
  </template>
  <MaterialConfigurationItems v-if="value.kind==='materials'" :items="value.content.materials" :api="api" :project-id="value.projectId" :busy="busy" />
  <section v-if="value.kind==='checks'" class="configuration-checks">
   <div class="configuration-section-heading">
    <h3 class="configuration-section-title">检查项 <span class="configuration-item-count">{{value.content.checks.length}} 项</span></h3>
    <a-button type="primary" ghost :disabled="busy" @click="value.content.checks.push({id:requestId(),category:'',name:'',inputType:'text',required:true,enabled:true,options:[],sort:value.content.checks.length})">+ 新增检查项</a-button>
   </div>
   <a-empty v-if="!value.content.checks.length" description="暂无检查项，请添加检查内容" class="configuration-checks-empty" />
   <section v-for="(item,index) in value.content.checks" :key="item.id" class="configuration-check-item" :aria-label="`检查项 ${index+1}`">
    <div class="configuration-check-heading">
     <div class="configuration-check-title"><span class="configuration-check-number">{{String(index+1).padStart(2,'0')}}</span><strong>{{item.name||'未命名检查项'}}</strong><span v-if="item.category" class="configuration-check-category">{{item.category}}</span></div>
     <a-button type="text" danger :disabled="busy" @click="value.content.checks.splice(index,1)">删除</a-button>
    </div>
    <div class="configuration-check-body">
     <div class="configuration-check-grid">
      <a-form-item label="检查分类" required><a-input v-model:value="item.category" placeholder="请输入检查分类" :disabled="busy" /></a-form-item>
      <a-form-item label="检查项名称" required><a-input v-model:value="item.name" placeholder="请输入检查项名称" :disabled="busy" /></a-form-item>
      <a-form-item label="填写方式" required><a-select v-model:value="item.inputType" :disabled="busy" :options="[{value:'text',label:'文本'},{value:'number',label:'数值'},{value:'option',label:'选项'},{value:'image',label:'图片'}]" /></a-form-item>
     </div>
     <a-form-item label="合格标准"><a-input v-model:value="item.standard" placeholder="请输入合格判断标准" :disabled="busy" /></a-form-item>
     <a-form-item v-if="item.inputType==='option'" label="可选内容"><a-select v-model:value="item.options" mode="tags" placeholder="输入选项后按回车添加" :disabled="busy" /></a-form-item>
     <div v-if="item.inputType==='number'" class="configuration-check-range">
      <a-form-item label="数值下限"><a-input-number v-model:value="item.min" placeholder="请输入下限" :disabled="busy" /></a-form-item>
      <a-form-item label="数值上限"><a-input-number v-model:value="item.max" placeholder="请输入上限" :disabled="busy" /></a-form-item>
     </div>
     <div class="configuration-check-details">
      <a-form-item label="检查说明"><a-textarea v-model:value="item.example" placeholder="请输入检查方法或注意事项" :rows="2" :disabled="busy" /></a-form-item>
      <a-form-item label="参考附件"><FilePicker :api="api" :project-id="value.projectId" purpose="template" :value="item.exampleFileId?[item.exampleFileId]:[]" :readonly="busy" :multiple="false" @update:value="ids=>item.exampleFileId=ids.at(-1)" /></a-form-item>
     </div>
    </div>
    <div class="configuration-check-options">
     <a-space :size="24"><a-checkbox v-model:checked="item.required" :disabled="busy">必填</a-checkbox><a-switch v-model:checked="item.enabled" :disabled="busy" size="small" :aria-label="`检查项${index+1}启用`" /><span>启用</span></a-space>
     <div class="configuration-check-order"><label :for="`category-sort-${item.id}`">{{t('Decoration.import.categorySort')}}</label><a-input-number :id="`category-sort-${item.id}`" v-model:value="item.categorySort" :min="1" :precision="0" :disabled="busy" /><label :for="`item-sort-${item.id}`">{{t('Decoration.import.itemSort')}}</label><a-input-number :id="`item-sort-${item.id}`" v-model:value="item.sort" :disabled="busy" /></div>
    </div>
   </section>
  </section>
  <a-form-item v-if="value.kind==='validity'" label="备案有效月数" required><a-input-number v-model:value="value.content.validityMonths" :min="1" :max="120" :disabled="busy" /></a-form-item>
  <div class="decoration-actions configuration-editor-actions"><a-button v-if="['materials','checks'].includes(value.kind)" :disabled="busy" @click="emit('cancel')">取消</a-button><a-button type="primary" html-type="submit" :loading="busy" :disabled="busy">保存配置</a-button></div>
 </a-form>
</template>

<style scoped>
.configuration-section-title{margin:0 0 20px;font-size:15px;font-weight:600;color:var(--ant-color-text,#262626)}
.configuration-basics-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px}
.configuration-basics-checks{grid-template-columns:repeat(3,minmax(0,1fr))}
.configuration-basics :deep(.ant-form-item){min-width:0;margin-bottom:20px}
.configuration-basics :deep(.ant-select),.configuration-check-body :deep(.ant-select),.configuration-check-body :deep(.ant-input-number){width:100%}
.configuration-section-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:4px 0 16px}
.configuration-section-heading .configuration-section-title{margin:0}
.configuration-item-count{margin-left:8px;font-size:12px;font-weight:400;color:var(--ant-color-text-tertiary,#8c8c8c)}
.configuration-checks{border-top:1px solid var(--ant-color-border-secondary,#f0f0f0);padding-top:20px}
.configuration-checks-empty{padding:20px 0}
.configuration-check-item{margin-bottom:16px;border:1px solid var(--ant-color-border-secondary,#e8e8e8);border-radius:8px;overflow:hidden}
.configuration-check-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:var(--ant-color-fill-alter,#fafafa);border-bottom:1px solid var(--ant-color-border-secondary,#f0f0f0)}
.configuration-check-title{display:flex;align-items:center;gap:10px;min-width:0}
.configuration-check-title strong{font-weight:500;overflow-wrap:anywhere}
.configuration-check-number{color:var(--ant-color-primary,#1677ff);background:var(--ant-color-primary-bg,#e6f4ff);border-radius:4px;padding:2px 7px;font-size:12px;font-variant-numeric:tabular-nums}
.configuration-check-category{color:var(--ant-color-text-tertiary,#8c8c8c);font-size:12px;overflow-wrap:anywhere}
.configuration-check-body{padding:16px 20px 0}
.configuration-check-body :deep(.ant-form-item){min-width:0;margin-bottom:16px}
.configuration-check-grid{display:grid;grid-template-columns:1fr 1.5fr 1fr;gap:20px}
.configuration-check-details{display:grid;grid-template-columns:1.5fr 1fr;gap:20px}
.configuration-check-range{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.configuration-check-options{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:12px 20px;border-top:1px solid var(--ant-color-border-secondary,#f0f0f0)}
.configuration-check-order{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ant-color-text-secondary,#595959)}
.configuration-check-order :deep(.ant-input-number){width:76px}
.configuration-editor-dialog .configuration-editor-actions{position:sticky;bottom:-24px;z-index:2;justify-content:flex-end;margin:24px -24px -24px;padding:16px 24px;border-top:1px solid var(--ant-color-border-secondary,#f0f0f0);background:var(--ant-color-bg-container,#fff)}
@media(max-width:700px){.configuration-basics-grid,.configuration-check-grid,.configuration-check-details,.configuration-check-range{grid-template-columns:1fr}.configuration-check-order{flex-wrap:wrap}.configuration-check-body{padding:16px 12px 0}.configuration-check-options{padding:12px}}
</style>
