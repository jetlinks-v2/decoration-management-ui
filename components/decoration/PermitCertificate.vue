<script setup lang="ts">
import type {PermitDocument} from '../../types/decoration'
import {permitDate,permitNotices} from '../../utils/permitCertificate'
defineProps<{document:PermitDocument}>()
</script>
<template>
 <article class="decoration-certificate">
  <aside class="decoration-certificate-facts">
   <div><span>房号</span><strong>{{document.application.spaceName}}</strong></div>
   <div><span>装修负责人</span><strong>{{document.application.ownerName}}</strong></div>
   <div><span>联系电话</span><strong>{{document.application.contactPhone}}</strong></div>
   <div><span>许可编号</span><strong>{{document.application.permit?.number}}</strong></div>
   <div><span>有效时间</span><strong>{{permitDate(document.application.permit?.startTime)}} 至<br />{{permitDate(document.application.permit?.endTime)}}</strong></div>
   <div><span>装修施工时间</span><strong>上午 8:00 — 12:00<br />下午 14:00 — 18:00</strong><b>其余时间及法定节假日须静音作业</b></div>
  </aside>
  <section class="decoration-certificate-notices">
   <h1>装修开工证</h1><h2>注意事项</h2>
   <p v-for="(notice,index) in permitNotices" :key="notice">{{index+1}}、{{notice}}</p>
   <div class="decoration-certificate-seal"><img :src="document.sealDataUrl" alt="项目章" /></div>
  </section>
 </article>
</template>
<style>
.decoration-certificate{box-sizing:border-box;width:1120px;min-height:740px;display:flex;gap:28px;background:#fff;color:#222;padding:28px;border:12px double #d32f2f;font-family:Arial,"Microsoft YaHei",sans-serif;line-height:1.45}
.decoration-certificate-facts{flex:0 0 245px;display:flex;flex-direction:column;gap:22px;padding-top:20px;overflow-wrap:anywhere}
.decoration-certificate-facts span,.decoration-certificate-facts strong,.decoration-certificate-facts b{display:block}
.decoration-certificate-facts span{font-size:14px;color:#666;margin-bottom:4px}.decoration-certificate-facts strong,.decoration-certificate-facts b{font-size:16px}.decoration-certificate-facts b{margin-top:8px}
.decoration-certificate-notices{flex:1;min-width:0;border-left:2px solid #eee;padding-left:28px;display:flex;flex-direction:column}
.decoration-certificate-notices h1{font-size:30px;font-weight:bold;letter-spacing:2px;color:#d32f2f;text-align:center;margin:0 0 12px}
.decoration-certificate-notices h2{font-size:20px;font-weight:bold;margin:0 0 8px}.decoration-certificate-notices p{font-size:12px;line-height:1.4;text-align:justify;margin:0 0 5px}
.decoration-certificate-seal{align-self:flex-end;margin-top:12px;width:120px;height:120px}.decoration-certificate-seal img{width:100%;height:100%;object-fit:contain}
</style>
