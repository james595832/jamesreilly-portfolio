// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [mdx()],
  legacy: {
    collections: true,
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['embla-carousel', 'gsap'],
      esbuildOptions: {
        define: {
          'process.env.NODE_ENV': '"development"',
        },
      },
    },
    ssr: {
      noExternal: ['gsap'],
    },
  },
  prefetch: true,
});
