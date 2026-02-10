// Test Application/Client/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Plugin to copy office-addin files after build
const copyOfficeAddinPlugin = () => ({
  name: 'copy-office-addin',
  closeBundle() {
    const source = join(__dirname, '../Shore-Server/excel-integration-service/public/office-addin');
    const dest = join(__dirname, 'dist/office-addin');
    
    if (existsSync(dest)) {
      rmSync(dest, { recursive: true, force: true });
    }
    
    if (existsSync(source)) {
      cpSync(source, dest, { recursive: true });
      console.log('✅ Copied office-addin files to dist');
    } else {
      console.warn('⚠️  office-addin source folder not found');
    }
  }
});

export default defineConfig({
  plugins: [react(), copyOfficeAddinPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:7000', // IMPORTANT: Point to your API Gateway
        changeOrigin: true,
      },
    },
  },
});