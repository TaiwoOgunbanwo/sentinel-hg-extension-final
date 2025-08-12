import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Plugin to copy models directory
function copyModelsPlugin() {
  return {
    name: 'copy-models',
    writeBundle() {
      const modelsDir = resolve(__dirname, 'models')
      const distModelsDir = resolve(__dirname, 'dist/models')
      
      if (statSync(modelsDir).isDirectory()) {
        mkdirSync(distModelsDir, { recursive: true })
        
        function copyDir(src: string, dest: string) {
          const entries = readdirSync(src, { withFileTypes: true })
          
          for (const entry of entries) {
            const srcPath = join(src, entry.name)
            const destPath = join(dest, entry.name)
            
            if (entry.isDirectory()) {
              mkdirSync(destPath, { recursive: true })
              copyDir(srcPath, destPath)
            } else {
              copyFileSync(srcPath, destPath)
            }
          }
        }
        
        copyDir(modelsDir, distModelsDir)
        console.log('Models directory copied to dist/')
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyModelsPlugin()],
  build: {
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
        popup: resolve(__dirname, 'src/popup.tsx'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true
  },
  publicDir: 'public',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
}) 