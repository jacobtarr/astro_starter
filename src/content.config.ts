import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
  }),
});

const blog = defineCollection({
  loader: glob({
    pattern: '**/index.{md,mdx,mdoc}',
    base: './src/content/blog',
    generateId: ({ entry }) =>
      entry.replace(/[\\/]index\.(md|mdx|mdoc)$/, '').replace(/\\/g, '/'),
  }),
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.string(),
    excerpt: z.string().optional(),
    readTime: z.string().optional(),
    thumbnail: image().optional(),
    thumbnailAlt: z.string().default(''),
    category: z.string().optional(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
  }),
});

const categories = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx,mdoc,yaml}', base: './src/content/categories' }),
  schema: z.object({
    name: z.string(),
  }),
});

export const collections = { pages, blog, categories };