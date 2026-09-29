import { defineConfig } from 'vite';
export default defineConfig({
  build: { rollupOptions: { output: { manualChunks: {
    'supabase-client': ['@supabase/supabase-js'],
    'react-vendor': ['react', 'react-dom'],
  } } } },
});
