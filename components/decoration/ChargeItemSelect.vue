<script setup lang="ts">
import {computed} from 'vue'
import type {DecorationApi} from '../../services/decorationApi'
import {useChargeItems} from '../../hooks/decoration/useChargeItems'
const props=defineProps<{api:DecorationApi;projectId:string;value?:string;name?:string;disabled?:boolean}>()
const emit=defineEmits<{change:[string,string]}>()
const vm=useChargeItems(props.api,()=>props.projectId)
const options=computed(()=>{const rows=vm.items.value.map(row=>({label:row.name,value:row.id}));if(props.value&&!rows.some(row=>row.value===props.value))rows.unshift({value:props.value,label:props.name||props.value});return rows})
function select(id:unknown){if(typeof id!=='string')return;const item=vm.items.value.find(row=>row.id===id);if(item)emit('change',item.id,item.name)}
</script>
<template>
 <a-select :value="value" :options="options" show-search :filter-option="false" :loading="vm.loading.value" :disabled="disabled||!projectId||!!vm.error.value" placeholder="请选择收费科目" @search="vm.search" @change="select" />
 <a-alert v-if="vm.error.value" type="warning" :message="vm.error.value" show-icon><template #action><a-button :disabled="disabled" @click="vm.search()">重试</a-button></template></a-alert>
</template>
