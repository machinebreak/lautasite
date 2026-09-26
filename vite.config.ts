import { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vitest/config'

// GitHub Pages no tiene rewrites: al abrir /writing/post o /space directamente
// el server devuelve 404. Copiamos index.html a 404.html para que ese 404
// arranque la SPA y React Router resuelva la ruta.
function ghPagesSpaFallback(): Plugin {
  let outDir = 'dist'
  return {
    name: 'gh-pages-spa-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      await copyFile(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
    },
  }
}

export default defineConfig({
  // El sitio se sirve en la raiz (lauta.site), no en un subdirectorio de repo.
  base: '/',
  plugins: [react(), ghPagesSpaFallback()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/bio', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        // three.js en un chunk propio: se cachea aparte de la app y baja en
        // paralelo con el chunk de la escena (solo se usa en /space).
        advancedChunks: {
          groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
