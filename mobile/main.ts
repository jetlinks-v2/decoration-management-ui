import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import { createI18n } from 'vue-i18n'
import messages from '../locales/lang/zh.json'
import App from './App.vue'
import 'ant-design-vue/dist/reset.css'
import '../components/decoration/decoration.css'
import './style.css'
createApp(App).use(Antd).use(createI18n({legacy:false,locale:'zh',messages:{zh:messages}})).mount('#app')
