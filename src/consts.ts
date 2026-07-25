// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

const siteUrl = (
  import.meta.env.SITE ||
  'https://jaketarrdev-astro-starter.netlify.app'
).replace(/\/$/, '');
export const siteTitle = 'Starter Site';
export const siteDescription = 'Welcome to my site!';

export const SITE = {
  name: siteTitle,
  description: siteDescription,
  url: siteUrl,
  locale: 'en-US',
  language: 'en',
};

export const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

export const socialLinks = [
  { name: 'instagram', url: 'https://www.instagram.com/jacobtarr/', label: 'Follow on Instagram' },
  { name: 'facebook', url: 'https://facebook.com', label: 'Follow on Facebook' },
];