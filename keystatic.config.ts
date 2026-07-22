import { config, collection, fields } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local',
  },
  collections: {
    categories: collection({
      label: 'Categories',
      slugField: 'name',
      path: 'src/content/categories/*',
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
      },
    }),
    blog: collection({
      label: 'Blog posts',
      slugField: 'title',
      path: 'src/content/blog/*/index',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        date: fields.date({ label: 'Date' }),
        excerpt: fields.text({ label: 'Excerpt', multiline: true }),
        category: fields.relationship({
          label: 'Category',
          collection: 'categories',
        }),
        readTime: fields.text({ label: 'Read time' }),
        thumbnail: fields.image({
          label: 'Thumbnail Image',
          directory: 'src/content/blog',
          publicPath: '../',
        }),
        thumbnailAlt: fields.text({ label: 'Thumbnail Image alt text' }),
        featured: fields.checkbox({ label: 'Featured post' }),
        draft: fields.checkbox({ label: 'Draft' }),
        content: fields.mdx({
          label: 'Content',
          options: {
            image: {
              directory: 'src/content/blog',
              publicPath: '../',
              schema: {
                title: fields.text({ 
                  label: 'Caption', 
                  description: 'The description displayed under the image' 
                }),
              }
            }
          }
        }),
      },
    }),
  },
});