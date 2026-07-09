// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

import alpinejs from '@astrojs/alpinejs';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@styles': path.resolve('./src/styles'),
        '@blocks': path.resolve('./src/blocks'),
        '@components': path.resolve('./src/components'),
        '@patterns': path.resolve('./src/patterns'),
        '@globals': path.resolve('./src/globals'),
        '@layouts': path.resolve('./src/layouts'),
        '@pages': path.resolve('./src/pages'),
        '@assets': path.resolve('./src/assets'),
        '@src': path.resolve('./src'),
      },
    },
  },

  integrations: [alpinejs({ entrypoint: '/src/scripts/alpine' })],
});