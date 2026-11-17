import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router.js'
import '../css/solidarity.css'
import '../css/design-system.css'
import '../css/pages/login.css'

createApp(App).use(createPinia()).use(router).mount('#app')

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch(error => {
      console.error('PWA service worker registration failed:', error)
    })
  })
}
