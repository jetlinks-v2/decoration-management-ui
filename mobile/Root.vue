<script setup lang="ts">
import { reactive } from 'vue'
import { Alert, Button, Spin } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import App from './App.vue'
import LoginPage from './auth/LoginPage.vue'
import { authState } from './auth/session'
import { useMobileAuth } from './auth/useMobileAuth'
const { t, te } = useI18n()
const vm = reactive(useMobileAuth())
</script>
<template>
  <div v-if="!vm.ready" class="auth-loading"><Spin :tip="t('Mobile.loading')"><div style="height: 80px" /></Spin></div>
  <section v-else-if="vm.configError" class="auth-error mobile-surface"><Alert type="error" show-icon :message="te(vm.configError) ? t(vm.configError) : vm.configError" /><Button block @click="vm.start">{{ t('Mobile.retry') }}</Button></section>
  <App v-else-if="vm.hosted || authState.session && authState.authorization" :key="vm.appKey" :standalone="!vm.hosted" :logging-out="vm.loggingOut" @logout="vm.signOut" />
  <LoginPage v-else :notice="vm.notice" />
</template>
<style scoped>
.auth-loading, .auth-error { max-width: 420px; margin: 80px auto; padding: 24px; }
.auth-error .ant-btn { margin-top: 16px; }
</style>
