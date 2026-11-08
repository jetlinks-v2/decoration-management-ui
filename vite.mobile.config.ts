import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
export default defineConfig({
 root:fileURLToPath(new URL('./mobile',import.meta.url)),base:'/decoration-h5/',cacheDir:fileURLToPath(new URL('./node_modules/.vite-decoration-mobile',import.meta.url)),plugins:[vue({template:{compilerOptions:{isCustomElement:tag=>tag==='altcha-widget'}}})],
 // 独立H5不加载PC宿主.env，显式沿用平台认证头，避免编译成undefined。
 define:{'import.meta.env.VITE_TOKEN_KEY':JSON.stringify('X-Access-Token')},
 resolve:{dedupe:['vue','vue-i18n']},
 server:{host:'127.0.0.1',port:9401,strictPort:true,fs:{allow:[fileURLToPath(new URL('.',import.meta.url))]},proxy:{'/api':{target:'http://127.0.0.1:9302',changeOrigin:true}}},
 build:{outDir:'../dist-mobile',emptyOutDir:true}
})
