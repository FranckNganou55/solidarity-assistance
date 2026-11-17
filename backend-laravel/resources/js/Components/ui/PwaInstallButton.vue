<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useT } from '../../Services/i18n'

defineProps({ compact: { type: Boolean, default: false } })

const t = useT()
const installPrompt = ref(null)
const installed = ref(false)
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true

function captureInstallPrompt(event) {
  event.preventDefault()
  installPrompt.value = event
}

function markInstalled() {
  installed.value = true
  installPrompt.value = null
}

onMounted(() => {
  installed.value = isStandalone()
  window.addEventListener('beforeinstallprompt', captureInstallPrompt)
  window.addEventListener('appinstalled', markInstalled)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
  window.removeEventListener('appinstalled', markInstalled)
})

async function installApp() {
  if (!installPrompt.value) {
    window.alert(t(isIOS ? 'pwaInstallIOSHelp' : 'pwaInstallBrowserHelp'))
    return
  }

  await installPrompt.value.prompt()
  const choice = await installPrompt.value.userChoice
  if (choice?.outcome === 'accepted') installed.value = true
  installPrompt.value = null
}
</script>

<template>
  <button
    v-if="!installed"
    type="button"
    class="pwa-install-button"
    :class="{ 'pwa-install-button--compact': compact }"
    :aria-label="t('installApp')"
    :title="t('installApp')"
    @click="installApp"
  >
    <span aria-hidden="true">⇩</span>
    <span v-if="!compact">{{ t('installApp') }}</span>
  </button>
</template>

<style scoped>
.pwa-install-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 16px;border:1px solid #cbd8d2;border-radius:12px;background:#fff;color:#1e6f5c;font:inherit;font-weight:700;white-space:nowrap;cursor:pointer;transition:background .18s ease,transform .18s ease,border-color .18s ease}.pwa-install-button:hover{background:#e9f5f1;border-color:#1e6f5c;transform:translateY(-1px)}.pwa-install-button>span:first-child{font-size:19px}.pwa-install-button--compact{width:44px;padding:0;font-size:18px}@media(prefers-reduced-motion:reduce){.pwa-install-button{transition:none}}
@media(max-width:640px){.pwa-install-button{width:42px;padding:0;font-size:0}.pwa-install-button>span:first-child{font-size:19px}}
</style>
