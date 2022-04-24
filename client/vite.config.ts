import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    webSocketHost: JSON.stringify(process.env.SETZEN_WEBSOCKET_HOST)
  }
})
