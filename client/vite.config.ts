import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    webAppHost: JSON.stringify(process.env.SETZEN_WEBAPP_HOST),
    webSocketUrl: JSON.stringify(process.env.SETZEN_WEBSOCKET_URL),
    contactEmail: JSON.stringify(process.env.SETZEN_CONTACT_EMAIL),
    contactUrl: JSON.stringify(process.env.SETZEN_CONTACT_URL),
    contactIssuesUrl: JSON.stringify(process.env.SETZEN_CONTACT_ISSUES_URL),
    contactProjectUrl: JSON.stringify(process.env.SETZEN_CONTACT_PROJECT_URL),
  }
})
