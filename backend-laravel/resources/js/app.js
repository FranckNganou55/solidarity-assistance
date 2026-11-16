import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router.js'
import '../css/solidarity.css'
import '../css/design-system.css'
import '../css/pages/login.css'

createApp(App).use(createPinia()).use(router).mount('#app')
