import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

function routeTitle(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : 'plashki'
}

router.afterEach((to) => {
  document.title = routeTitle(to.meta.title)
})

useAuthStore().hydrateFromStorage()
app.mount('#app')
