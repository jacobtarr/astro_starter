# Architecture

## Contents
- [Introduction](#introduction)
- [Component Hierarchy](#component-hierarchy)
- [Colocated CSS](#colocated-css)
- [Content](#content)
- [Images](#images)
- [Alpine.js for Lightweight Interactivity](#alpinejs-for-lightweight-interactivity)
- [Keystatic Integration](#keystatic-integration)
- [Documenting Everything](#documenting-everything)

## Introduction
I've been on many projects throughout my career as a web developer. Many were retainer projects, and many of those included decisions a previous developer had already made about how the codebase was structured.

The recurring problem isn't bad code exactly, it's findability. CSS you need to update is sometimes buried three levels deep within a monolithic stylesheet. I'm of the mindset that things that work together should stay together. Like two peas in a pod, if you will, not two peas on the opposite ends of a very long, very messy pod. This starter is an attempt to put that philosophy into practice.

## Component Hierarchy
### Components, Patterns and Blocks
This architectural decision comes from years of thinking in systems and being on real client-facing projects — setting up CMSs like Wordpress or Craft CMS. That mental model splits into three layers:
- **Components:** the smallest building blocks. An example of these include a button, a badge, or an icon. These can live independently anywhere on the site.
- **Patterns:** a group of components that are reusable across different contexts, like a card or a nav list.
- **Blocks:** a full-width page section that is meant to be dropped into content and driven by frontmatter (in the case of Astro) or CMS data -- think a reusable section like a split media block. Blocks typically span the full width of the viewport, but this isn't a rule; the base `<Block>` component accepts a `useBlockContainer` prop for cases where a section needs to be constrained rather than full-bleed.

The test where something belongs is simple. If it does one thing and has zero business logic, it's a component. If it's built from components and reused as a unit, it's a pattern. If it's meant to be composed directly into a page's content as its own section, it's a block. See below for how this maps to the actual folder structure:

```
src/
├── components/
│   └── button/
│       ├── Button.astro
│       └── button.css
├── patterns/
│   └── blog-card/
│       ├── BlogCard.astro
│       └── blog-card.css
└── blocks/
    └── hero/
        ├── Hero.astro
        └── hero.css
```

Notice every component, pattern, and block follows the same shape: an `.astro` file paired with its own `.css` file, colocated in a folder named after the component. This is the same colocation philosophy from the introduction, applied consistently at every level of the hierarchy.

### Layouts & Globals
Two folders sit outside this hierarchy which we haven't talked about yet: layouts and globals. Layouts hold `Base.astro` and `Page.astro`, the actual HTML document shell and the page wrapper every route renders inside. Globals hold one-off pieces: `<Header>`, `<Footer>` and `<Head>`. There's only ever one header, so it doesn't need to be a reusable pattern the way a card does.

## Colocated CSS
Every component, pattern, block and sometimes even a global pairs its `.astro` file with its own stylesheet, imported directly at the top of the frontmatter. Open `Button.astro`, its styles are one line away in `button.css`. Delete a component, its styles go with it. This solves the exact problem from the introduction. It eliminates hunting through a global stylesheet and keeps the system organized as it grows.

The tradeoff: production output includes many small CSS files instead of one bundle. It looked concerning the first time I checked the Network tab. But Astro code-splits CSS per component automatically, so a page never downloads styles it doesn't use — a bundled stylesheet does the opposite, shipping every component's CSS to every page regardless.

## Content
### Composing Content with MDX
One of the core advantages of using a framework like Astro is that you can use Markdown (`.md`) files to give you clean, file-based content management without relying on a CMS. However, plain Markdown only gets you so far as there is no way to drop a real component into the middle of your content. With `.mdx`, you can have your cake and eat it too.

Pages in this starter are built entirely in MDX. This is where the blocks from our component hierarchy system shine the most. A page is really just a sequence of them, composed directly in content. Import a block, drop it in and you're good to go.

```
// src/pages/about.mdx

---
title: About
---

import Hero from '@blocks/hero/Hero.astro';
import heroImage from '@assets/images/the-wave.avif';

<Hero
  eyebrow="About Me"
  heading="I'm a photographer and web developer"
  image={heroImage}
  imageAlt="About photo"
  primaryButtonText="View Portfolio"
  primaryButtonUrl="/"
/>
```

This isn't limited to Astro components either. MDX can render React, Vue, Svelte, or any framework component Astro supports. A genuinely interactive widget, like a chart or a filterable gallery, can be dropped directly into a page or blog post without leaving the content file or building a separate template for it.

### Collections & Routing
The `about.mdx` file above doesn't do anything on its own. Something still has to fetch it and turn it into an actual page. That's what routing does. Each route in `src/pages/` fetches its matching content entry and renders it. Static pages fetch a single named entry from the `pages` collection. Blog posts use `getStaticPaths()` to loop over the `blog` collection and generate one route per post. Either way, the pattern collapses to the same three steps: fetch the entry, `render()` it, drop `<Content />` into a layout.

```
// src/pages/index.astro

const home = await getEntry('pages', 'home');
const { Content } = await render(home);
---
<Page title={home.data.title}>
  <Content />
</Page>
```

Blog posts live in `src/content/blog/<slug>/index.mdx` rather than flat `<slug>.mdx` files, so per-post assets like the thumbnail image can be colocated in the same folder. This requires a custom `generateId` in the collection loader to strip the `/index.mdx` suffix from the generated slug, so `/blog/my-post/index.mdx` still resolves to the route `/blog/my-post` rather than `/blog/my-post/index`.

## Images
Blog thumbnails are managed through Keystatic's `fields.image()`, which by default creates a folder matching the entry slug and stores the image inside it. That's exactly the colocation this starter wants, but getting there wasn't as simple as the defaults suggested.

The blog collection's file path uses a `*/index` pattern so each post can live in its own folder alongside its content (`src/content/blog/my-post/index.mdx`). Keystatic's image field inherited that same pattern when generating its storage directory, which meant every thumbnail landed inside a duplicate nested `index/` subfolder instead of the post's own folder directly. The fix was setting `directory` and `publicPath` explicitly on the field rather than relying on Keystatic's default slug-based behavior:

```
thumbnail: fields.image({
  label: 'Thumbnail Image',
  directory: 'src/content/blog',
  publicPath: '../',
}),
```

For this particular setup, images that aren't tied to a specific post, like the homepage hero or the site logo, live in `src/assets/` instead and get imported directly in MDX.

### Performance
The `Image` component wraps Astro's built-in image handling with a few additions, all found by reading actual Lighthouse reports and fixing what they flagged.

`fetchpriority="high"` is applied automatically whenever `loading="eager"` is set, so above-the-fold images like a hero or a featured post are correctly prioritized as the page's Largest Contentful Paint (LCP) candidate.

`sizes` and `widths` are set explicitly per component rather than relying on Astro's generic defaults. A card sitting in a four-column grid only needs roughly a quarter of the viewport width on desktop, not the 50vw a generic default assumes. Getting this wrong meant the browser was downloading images two to three times larger than what was actually displayed, something that only became obvious once Lighthouse flagged it directly.

`quality` defaults to `75` instead of Astro's higher default, trading a visually negligible amount of compression for a real reduction in file size across every image on the site.

## Alpine.js for lightweight interactivity
All client-side interactivity in this starter (the mobile nav, blog post table of contents), is handled with Alpine.js rather than React, Preact, or Vue. Reaching for a UI framework here would mean shipping a runtime and a hydration step for interactions Alpine already handles in a few kilobytes, real overhead for no real gain.

## Keystatic integration
Keystatic is a Git-based CMS that lets content be edited through a GUI and synced straight to GitHub. It's great for non-technical users, but just as useful for anyone who wants a more elegant way to edit content without touching raw markdown by hand.

Using it requires the Astro project to run in server output mode with an adapter installed, since the admin UI needs server-side code to read and write files. That's a real cost for a starter that would otherwise be static. It's a deliberate tradeoff: the starter ships with the Netlify adapter so Keystatic works out of the box, and removing it entirely (a few file deletions and an uninstall, documented in the [README](./README.md#optional-removing-keystatic)) lets the project fall back to a simpler static build.

## Documenting everything
The starter includes an optional script that checks every component, pattern, block, and global to make sure its documented props actually match what the interface declares. For example, let's take a look at `src/components/button/Button.astro`:

```
---
{/*
  Button Component

  Props:
    text?: string                          # Button text
    variant?: 'primary' | 'secondary'      # Button style (default: 'primary')
    icon?: string                          # Icon name (optional)
    [...]

  Examples:
    <Button text="Donate" url="/donate" variant="primary" />
*/}

import './button.css';
import Icon from '@components/icon/Icon.astro';

interface Props {
  text?: string;
  variant?: 'primary' | 'secondary';
  icon?: string;
  [...]
}
---
```

Nothing ties the comment to the interface. They're two separate places describing the same thing, with no mechanism keeping them in sync. During the build, I kept finding components and patterns with stale or missing docblocks, which is what led me to write the check-docs script.

This script, found in `scripts/check-docs.mjs` parses every component's `interface Props` using the TypeScript compiler API, compares it against the documented `Props:` section shown above, and reports what's missing, what's stale, and what's misaligned. The result is documentation that scales with the codebase instead of drifting further out of date with every new component.

```
npm run check-docs
```

Additionally, running this command with `--fix` rebuilds the prop list in the exact order declared in the interface, adds any missing props with a placeholder description, and realigns every comment column, all while preserving any description already written.

```
npm run check-docs -- --fix
```