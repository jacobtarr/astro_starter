// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

import alpinejs from '@astrojs/alpinejs';
import keystatic from '@keystatic/astro';
import ViteRestart from 'vite-plugin-restart';

import mdx from '@astrojs/mdx';

import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';

import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [
      tailwindcss(),
      ViteRestart({
        reload: ['src/**/*.css'],
      }),
    ],
    
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
        '@content': path.resolve('./src/content'),
        '@src': path.resolve('./src'),
      },
    },
  },

  integrations: [
    alpinejs({ entrypoint: '/src/scripts/alpine' }),
    mdx(),
    keystatic(),
    react(),
    markdoc(),
  ],

  adapter: netlify(),
});