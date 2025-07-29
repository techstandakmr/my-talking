// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     // proxy: {
//     //   '/uploads': {
//     //     target: 'http://localhost:3030',
//     //     changeOrigin: true,
//     //     secure: false,
//     //   },
//     // },
//   },
// })

// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vitejs.dev/config/
// export default defineConfig({
//   base: '/',
//   plugins: [react()],
//   server: {
//     // dev server config (not needed for build)
//   },
// })


import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // ✅ Add path module

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, 'src/components'), // ✅ Path alias added
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@context': path.resolve(__dirname, 'src/context'),
    },
  },
})