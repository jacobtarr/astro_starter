import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { siteTitle, siteDescription } from '@src/consts';

export async function GET(context) {
  const posts = await getCollection('blog', ({ data }) => data.draft !== true);

  return rss({
    title: siteTitle,
    description: siteDescription,
    site: context.site,
    items: posts.map(post => ({
      title: post.data.title,
      pubDate: new Date(post.data.date),
      description: post.data.excerpt,
      link: `/blog/${post.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}