<script setup lang="ts">
import {ref,computed,watch} from 'vue'
import type {DecorationApi} from '../../services/decorationApi'
import {useImageAnnotation} from '../../hooks/decoration/useImageAnnotation'
import {rectangle,type ImageMark} from '../../utils/imageAnnotations'
const props=defineProps<{api:DecorationApi;projectId:string;decorationId:string;fileIds:string[];sourceId?:string;marks?:ImageMark[];disabled?:boolean}>()
const emit=defineEmits<{saved:[string,string,ImageMark[]];dirty:[boolean]}>()
const source=ref(props.sourceId||props.fileIds[0]),stage=ref<HTMLElement>(),start=ref<{x:number;y:number}>(),end=ref<{x:number;y:number}>()
const vm=useImageAnnotation(props.api,()=>({projectId:props.projectId,decorationId:props.decorationId,sourceId:source.value,marks:source.value===props.sourceId?props.marks:[]}),(...args)=>emit('saved',...args))
watch(vm.dirty,value=>emit('dirty',value),{immediate:true})
const preview=computed(()=>start.value&&end.value?rectangle(start.value,end.value):undefined)
const locked=computed(()=>props.disabled||vm.loading.value||vm.saving.value)
watch(()=>props.fileIds,()=>{source.value=props.sourceId||props.fileIds[0]})
function point(e:PointerEvent){const r=stage.value!.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}}
function down(e:PointerEvent){if(locked.value||vm.marks.value.length>=50)return;start.value=point(e);end.value=start.value;stage.value?.setPointerCapture(e.pointerId)}
function move(e:PointerEvent){if(start.value)end.value=point(e)}
function up(){if(preview.value)vm.marks.value.push(preview.value);start.value=undefined;end.value=undefined}
function style(m:ImageMark){return {left:`${m.x*100}%`,top:`${m.y*100}%`,width:`${m.width*100}%`,height:`${m.height*100}%`}}
</script>
<template>
 <div class="annotation-editor">
  <a-select v-model:value="source" :disabled="locked" placeholder="选择待批注图片" :options="fileIds.map((id,i)=>({value:id,label:`原始附件 ${i+1}`}))" />
  <a-alert v-if="vm.error.value" type="error" :message="vm.error.value" show-icon />
  <a-spin :spinning="vm.loading.value">
   <div v-if="vm.imageUrl.value" ref="stage" class="annotation-stage" @pointerdown.prevent="down" @pointermove="move" @pointerup="up" @pointercancel="start=undefined;end=undefined">
    <img :src="vm.imageUrl.value" draggable="false" alt="待审核图片，拖动框选批注区域" />
    <span v-for="(mark,i) in vm.marks.value" :key="i" class="annotation-box" :style="style(mark)">{{i+1}}</span>
    <span v-if="preview" class="annotation-box" :style="style(preview)" />
   </div>
  </a-spin>
  <p>在图片上拖动框选；可编辑或删除标记，最多50处。保存图片后再提交审核。</p>
  <div v-for="(mark,i) in vm.marks.value" :key="i" class="annotation-row"><span>{{i+1}}.</span><a-input v-model:value="mark.text" :maxlength="200" :disabled="locked" placeholder="填写批注" /><a-button danger :disabled="locked" @click="vm.marks.value.splice(i,1)">删除</a-button></div>
  <a-button :loading="vm.saving.value" :disabled="locked||!vm.imageUrl.value" @click="vm.save">保存批注图片</a-button>
 </div>
</template>
<style scoped>
.annotation-editor{display:grid;gap:12px}.annotation-stage{position:relative;touch-action:none;cursor:crosshair;user-select:none;line-height:0}.annotation-stage img{width:100%;display:block;pointer-events:none}.annotation-box{position:absolute;border:2px solid #d32029;color:#a8071a;font-size:14px;line-height:20px;pointer-events:none;background:#ff00000d}.annotation-row{display:flex;gap:8px;align-items:center}
</style>
