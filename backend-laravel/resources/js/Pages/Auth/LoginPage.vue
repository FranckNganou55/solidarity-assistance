<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { messageOf } from '../../Services/api'
import { useAppStore } from '../../Store/index.js'
import { useT } from '../../Services/i18n'
import AuthLayout from '../../Layouts/AuthLayout.vue'
import { useAuth } from '../../Composables/useAuth.js'
import FormField from '../../Components/forms/FormField.vue'
import ActionButton from '../../Components/ui/ActionButton.vue'

const app = useAppStore()
const auth = useAuth()
const router = useRouter()
const t = useT()
const identifier = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
const showPassword = ref(false)
const groupLogo = '/logo-fm-mak.jpeg'

async function login() {
    error.value = ''
    busy.value = true

    try {
        const result = await auth.login(identifier.value, password.value)

        if (result.mustChangePassword) {
            await router.push('/profile?changePassword=1')
            return
        }

        await router.replace('/')
    } catch (exception) {
        error.value = messageOf(exception)
    } finally {
        busy.value = false
    }
}

function toggleLanguage() {
    app.setLang(app.lang === 'fr' ? 'en' : 'fr')
}

function toggleTheme() {
    app.setTheme(app.theme === 'light' ? 'dark' : 'light')
}
</script>

<template>
    <AuthLayout>
        <main class="login-page">
            <div class="login-toolbar" :aria-label="t('displayPreferences')">
                <button class="login-tool-button" type="button" @click="toggleLanguage">
                    <span aria-hidden="true">文</span>{{ app.lang === 'fr' ? 'EN' : 'FR' }}
                </button>
                <button class="login-tool-button" type="button" :title="t('theme')" @click="toggleTheme">
                    <span aria-hidden="true">{{ app.theme === 'light' ? '☾' : '☼' }}</span>
                    {{ app.theme === 'light' ? t('dark') : t('light') }}
                </button>
            </div>

            <div class="login-layout">
                <section class="login-story" aria-labelledby="login-story-title">
                    <div class="login-story-brand">
                        <span class="login-logo-frame"><img :src="groupLogo" alt="Logo Makénéné Solidarité"></span>
                        <span>{{ t('workspace') }}</span>
                    </div>
                    <p class="login-story-eyebrow">{{ t('welcome') }}</p>
                    <h1 id="login-story-title">{{ t('loginHeadline') }}</h1>
                    <p class="login-story-copy">{{ t('loginSupport') }}</p>
                    <div class="login-story-note">
                        <span class="login-story-check" aria-hidden="true">✓</span>
                        <span>{{ t('loginFootnote') }}</span>
                    </div>
                    <div class="login-decor login-decor-one" aria-hidden="true"></div>
                    <div class="login-decor login-decor-two" aria-hidden="true"></div>
                </section>

                <section class="login-card" aria-labelledby="login-title">
                    <div class="login-card-brand">
                        <img :src="groupLogo" alt="">
                        <div>
                            <strong>Makénéné Solidarité</strong>
                            <small>{{ t('slogan') }}</small>
                        </div>
                    </div>
                    <p class="login-eyebrow">{{ t('login') }}</p>
                    <h2 id="login-title">{{ t('signIn') }}</h2>
                    <p class="login-hint">{{ t('loginHint') }}</p>

                    <form class="login-form" @submit.prevent="login">
                        <FormField>
                            <span>{{ t('identifier') }}</span>
                            <input
                                v-model.trim="identifier"
                                autocomplete="username"
                                inputmode="tel"
                                name="identifier"
                                placeholder="6XX XXX XXX"
                                required
                                @input="error = ''"
                            >
                        </FormField>

                        <FormField>
                            <span>{{ t('password') }}</span>
                            <span class="password-input">
                                <input
                                    v-model="password"
                                    :type="showPassword ? 'text' : 'password'"
                                    autocomplete="current-password"
                                    name="password"
                                    placeholder="••••••••"
                                    required
                                    @input="error = ''"
                                >
                                <button
                                    class="password-toggle"
                                    type="button"
                                    :aria-label="showPassword ? t('hide') : t('show')"
                                    @click="showPassword = !showPassword"
                                >
                                    {{ showPassword ? t('hide') : t('show') }}
                                </button>
                            </span>
                        </FormField>

                        <p v-if="error" class="login-error" role="alert">
                            <span aria-hidden="true">!</span>{{ error }}
                        </p>

                        <ActionButton class="login-submit" type="submit" :disabled="busy" :aria-busy="busy">
                            <span v-if="busy" class="spinner login-spinner" aria-hidden="true"></span>
                            {{ busy ? t('loading') : t('signIn') }}
                        </ActionButton>
                    </form>

                    <footer class="login-footer">{{ t('loginFootnote') }}</footer>
                </section>
            </div>
        </main>
    </AuthLayout>
</template>
