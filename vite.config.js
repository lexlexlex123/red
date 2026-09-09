import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;

function serveStaticDirs(dirs) {
  return {
    name: 'serve-static-dirs',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.url || '';
        // Let Vite handle module transforms (?import, ?url, etc.)
        if (raw.includes('?import') || raw.includes('&import') || raw.includes('?url') || raw.includes('&url')) {
          return next();
        }
        const url = raw.split('?')[0];
        const hit = dirs.find((d) => url === `/${d}` || url.startsWith(`/${d}/`));
        if (!hit) return next();
        const filePath = path.join(root, decodeURIComponent(url.slice(1)));
        if (!filePath.startsWith(path.join(root, hit))) return next();
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return next();
        const ext = path.extname(filePath).toLowerCase();
        // Never serve JSON as static here — Vite/JSON imports need JS module MIME
        if (ext === '.json' || ext === '.html' || ext === '.jsx' || ext === '.tsx' || ext === '.ts') {
          return next();
        }
        const types = {
          '.js': 'application/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.webp': 'image/webp',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.ttf': 'font/ttf',
          '.otf': 'font/otf',
          '.mp3': 'audio/mpeg',
        };
        res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: false,
  appType: 'spa',
  plugins: [
    react(),
    serveStaticDirs(['themes', 'fonts', 'images', 'libs', 'audio', 'css', 'icons', 'config']),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 8000,
    strictPort: false,
    fs: { allow: ['.'] },
    sourcemapIgnoreList: (sourcePath) => sourcePath.includes('/libs/'),
    hmr: {
      host: '127.0.0.1',
      port: 8000,
      clientPort: 8000,
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 8000,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        playback: path.resolve(__dirname, 'src/export/playback.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'react';
          }
          if (id.includes('node_modules/zustand')) return 'zustand';
          if (id.includes('/icons-data')) return 'icons-data';
          if (id.includes('/image-index')) return 'image-index';
          if (id.includes('periodic-elements') || id.includes('periodic-props')) return 'periodic';
          return undefined;
        },
      },
    },
  },
});
