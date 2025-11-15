import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  base: './', // ensure built assets resolve when served from GitHub Pages/docs
  build: {
    outDir: 'doc',
    emptyOutDir: true,
  },
  plugins: [react()],
})
