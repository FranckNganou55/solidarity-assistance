<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { messageOf } from '../../Services/api'
import { useAppStore } from '../../Stores/app'
import { useT } from '../../Services/i18n'
import AuthLayout from '../../Layouts/AuthLayout.vue'
import groupLogo from '../../Assets/images/logo-fm-mak.jpeg'

const app=useAppStore(),router=useRouter(),t=useT(),identifier=ref(''),password=ref(''),busy=ref(false),error=ref(''),show=ref(false)
async function login(){error.value='';busy.value=true;try{const result=await app.login(identifier.value,password.value);if(result.mustChangePassword){await router.push('/profile?changePassword=1');return}await router.replace('/')}catch(e){error.value=messageOf(e)}finally{busy.value=false}}
</script>
<template><AuthLayout><main class="login-page"><div class="language-corner"><button class="icon-button" @click="app.setLang(app.lang==='fr'?'en':'fr')">{{app.lang==='fr'?'EN':'FR'}}</button></div><section class="login-card"><div class="login-brand"><img :src="groupLogo" alt="Logo Makénéné Solidarité"><div><strong>Makénéné Solidarité</strong><small>{{t('slogan')}}</small></div></div><p class="eyebrow">{{t('welcome')}}</p><h1>{{t('login')}}</h1><p class="login-hint">{{t('loginHint')}}</p><form @submit.prevent="login"><label>{{t('identifier')}}<input v-model.trim="identifier" autocomplete="username" inputmode="tel" required placeholder="6XX XXX XXX"></label><label>{{t('password')}}<span class="password-input"><input v-model="password" :type="show?'text':'password'" autocomplete="current-password" required placeholder="••••••••"><button type="button" @click="show=!show">{{show?t('hide'):t('show')}}</button></span></label><p v-if="error" class="form-error">{{error}}</p><button class="primary-button login-submit" :disabled="busy">{{busy?t('loading'):t('signIn')}}</button></form><footer>{{t('slogan')}}</footer></section></main></AuthLayout></template>
