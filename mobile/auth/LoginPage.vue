<script setup lang="ts">
import { defineAsyncComponent, reactive } from 'vue'
import { Alert, Button, Form, Input } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { mobileSide } from '../../utils/mobileEntry'
import { authState } from './session'
import { useLogin } from './useLogin'
const LoginVerification = defineAsyncComponent(() => import('./LoginVerification.vue'))
const props = defineProps<{ notice?: string }>()
const { t, te } = useI18n()
const vm = reactive(useLogin())
const side = mobileSide(location.search)
</script>

<template>
  <section class="decoration-login">
    <div class="login-content">
      <div class="login-brand">{{ authState.config.title || t('Mobile.title') }}<span>{{ side === 'staff' ? '员工端' : '业主端' }}</span></div>
      <div class="panel">
        <h1>{{ t('Mobile.applicationLogin') }}</h1>
        <p class="muted">{{ t('Mobile.loginHint') }}</p>
        <Alert v-if="vm.error || props.notice" type="error" show-icon :message="te(vm.error || props.notice || '') ? t(vm.error || props.notice || '') : vm.error || props.notice" />
        <Form layout="vertical" :model="vm.form" @finish="vm.login">
          <Form.Item :label="t('Mobile.loginDomain')" name="tenantDomain" :rules="[{ required: true, whitespace: true, message: t('Mobile.loginRequired') }]">
            <Input v-model:value="vm.form.tenantDomain" :placeholder="t('Mobile.loginDomainPlaceholder')" autocomplete="off" :maxlength="128" :disabled="vm.loading" size="large" />
          </Form.Item>
          <Form.Item :label="t('Mobile.loginAccount')" name="username" :rules="[{ required: true, whitespace: true, message: t('Mobile.loginRequired') }]">
            <Input v-model:value="vm.form.username" :placeholder="t('Mobile.loginAccountPlaceholder')" autocomplete="username" :maxlength="128" :disabled="vm.loading" size="large" />
          </Form.Item>
          <Form.Item :label="t('Mobile.loginPassword')" name="password" :rules="[{ required: true, message: t('Mobile.loginRequired') }]">
            <Input.Password v-model:value="vm.form.password" autocomplete="current-password" :disabled="vm.loading" size="large" />
          </Form.Item>
          <Button type="primary" html-type="submit" block size="large" :loading="vm.loading">{{ t('Mobile.login') }}</Button>
        </Form>
      </div>
      <p class="login-footnote">{{ t('Mobile.loginFootnote') }}</p>
    </div>
    <LoginVerification v-if="vm.verification" :requirement="vm.verification" @success="vm.completeVerification" @cancel="vm.cancelVerification" />
  </section>
</template>

<style scoped>
.decoration-login { min-height: 100vh; min-height: 100dvh; padding: max(64px, env(safe-area-inset-top)) 24px max(32px, env(safe-area-inset-bottom)); background: linear-gradient(160deg, #eaf1ff, #f8faff 55%); }
.login-content { width: min(100%, 412px); margin: auto; }
.login-brand { color: #3c7cff; font-size: 28px; font-weight: 650; margin: 0 0 38px 4px; }
.login-brand span { display: block; color: #7587a3; font-size: 12px; font-weight: 400; letter-spacing: 4px; margin-top: 9px; }
.panel { background: white; border-radius: 12px; box-shadow: 0 4px 12px #0f224d0d; padding: 28px 24px; }
h1 { text-align: left; font-size: 22px; margin: 0 0 10px; }
.muted { line-height: 1.7; margin: 0 0 26px; }
.ant-alert { margin-bottom: 18px; }
:deep(.ant-form-item-label > label) { color: #647187; font-size: 13px; }
.ant-btn-primary { height: 46px; }
.login-footnote { color: #8c93a3; font-size: 11px; letter-spacing: 2px; line-height: 1.8; text-align: center; margin: 30px 0 0; }
@media (max-width: 359px) { .decoration-login { padding-inline: 16px; padding-top: max(40px, env(safe-area-inset-top)); } .panel { background: white; border-radius: 12px; box-shadow: 0 4px 12px #0f224d0d; padding: 24px 20px; } }
</style>
