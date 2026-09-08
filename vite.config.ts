import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Base path: '/' khi dev; trên GitHub Pages là '/<tên repo>/' (workflow deploy.yml
// truyền VITE_BASE từ tên repo, nên cùng code chạy được ở bất kỳ repo nào).
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Một Việc',
        short_name: 'Một Việc',
        description: 'Một việc chính mỗi ngày. Đóng ngày đúng giờ. Quay lại khi trượt.',
        lang: 'vi',
        theme_color: '#1c1917',
        background_color: '#fafaf9',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
  },
})
