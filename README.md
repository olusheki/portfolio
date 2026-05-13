# Daniel Olusheki — Personal Portfolio

A minimal, dark-themed personal portfolio site built with React, Vite, Tailwind CSS, and TypeScript. Features a bento-grid layout, animated text effects, a live LeetCode stats widget, a markdown-powered blog, and a light/dark mode toggle.

Live at [olusheki.com](https://olusheki.com/).

---

## Using This as a Template

To adapt this site for your own portfolio, update the following areas. Sections are listed in roughly the order most people will want to touch them.

### 1. Portfolio content (`src/pages/Index.tsx`)

Section content lives in typed data arrays near the top of [src/pages/Index.tsx](src/pages/Index.tsx):

- **`HELLO_PHRASES`** — Rotating greeting text in the hero.
- **`experienceItems`** — Work, research, and awards.
- **`projectItems`** — Featured projects (images, carousels, videos, PDFs, links).
- **`skillItems`** — Skills grouped by category.
- **`courseItems`** — Relevant coursework.

Update the bio paragraph and the footer (email, LinkedIn, GitHub, resume link, location) directly in the JSX below the data arrays.

#### `SectionItem` keys

Every entry in `experienceItems` / `projectItems` / `skillItems` / `courseItems` is a `SectionItem` (defined in [src/components/SectionCard.tsx](src/components/SectionCard.tsx)). All keys except `title` are optional and can be combined freely.

| Key | Type | Description |
|-----|------|-------------|
| `title` | `string` | **Required.** Heading shown on the card and modal. |
| `modalTitle` | `string` | Overrides the modal header (e.g. "My Story" instead of the card title). |
| `subtitle` | `string` | Secondary text (e.g. company, date range). |
| `description` | `string` | A paragraph of body text. |
| `bullets` | `string[]` | Bulleted list (responsibilities, achievements). |
| `tags` | `string[]` | Inline tag chips (used for skills, courses, etc.). |
| `link` | `{ text: string; url: string }` | External link rendered below the description. |
| `image` | `string` | Single image (imported asset or URL). Click to expand in a lightbox. |
| `images` | `string[]` | Array of images for a carousel (Embla). Overrides single `image`. |
| `video` | `string` | YouTube or Vimeo URL, embedded as an iframe. |
| `pdf` | `string` | Path to a PDF in `public/`, embedded as an iframe. |
| `current` | `boolean` | Marks the item as "current" (shows a small indicator on the card). |

### 2. Blog posts (`src/content/blog/*.md`)

Posts are individual markdown files in [src/content/blog/](src/content/blog/). They are loaded at build time via Vite's `import.meta.glob` from [src/content/blog/index.ts](src/content/blog/index.ts) — to add a post, just drop in a new `.md` file. No registration step.

Each file uses YAML frontmatter followed by markdown. Example:

```markdown
---
title: About Me
date: 2026-04-01
pinned: true
excerpt: A short blurb shown on the card hover.
links:
  - text: GitHub
    url: https://github.com/yourname
  - text: Personal site
    url: https://example.com
---

First paragraph of the post.

![Optional image](/me.jpeg)

Second paragraph. Markdown features supported: **bold**, *italic*, [links](https://example.com), lists, tables, code, blockquotes, images, and horizontal rules (GFM via `remark-gfm`).
```

#### Frontmatter fields

| Field | Type | Notes |
|-------|------|-------|
| `title` | `string` | Required. |
| `date` | `string` | Required. ISO format `YYYY-MM-DD`; rendered as `Apr 1, 2026`. Also used for sort order (newest first). |
| `excerpt` | `string` | Short preview text. |
| `pinned` | `boolean` | When `true`, the post sticks to the top of the list and shows a pin icon. |
| `links` | list | Optional list of `{ text, url }` shown inside the modal. |

#### Markdown content

The body is rendered with `react-markdown` + `remark-gfm`. Element styling is defined by `markdownComponents` in [src/components/BlogCard.tsx](src/components/BlogCard.tsx) — tweak there to restyle headings, code blocks, tables, images, etc.

Image paths starting with `/` resolve against `public/` (e.g. `![me](/me.jpeg)` → `public/me.jpeg`). For assets that should be hashed/optimized, import them in TS and reference them from `Index.tsx` instead.

The frontmatter parser is intentionally minimal (no YAML dependency) — it supports the fields above, scalars, and the `links` list. If you add new frontmatter fields, extend `parseFrontmatter` in [src/content/blog/index.ts](src/content/blog/index.ts).

### 3. Resume

Replace [public/Daniel_Olusheki_Resume.pdf](public/Daniel_Olusheki_Resume.pdf) with your own and update the link in the footer of `Index.tsx` if you change the filename.

### 4. Images and other static assets

- Bundled assets (project screenshots, carousel slides): put them in [src/assets/](src/assets/) and import them at the top of `Index.tsx`. Carousels use Vite glob imports — e.g. files matching `src/assets/distortion/slide-*.jpg` are auto-collected.
- Public assets (served as-is): put them in [public/](public/) — referenced by absolute path (`/file.jpeg`). Used for the resume PDF, blog images, the OG preview image, and `robots.txt`.

### 5. LeetCode widget

[src/hooks/useLeetCodeStats.ts](src/hooks/useLeetCodeStats.ts) fetches stats from a public LeetCode API. Update the username there, or remove the `<LeetCodeCard />` element in `Index.tsx` if you don't need it.

### 6. Theme and styling

- Design tokens (colors, fonts) live in [src/index.css](src/index.css) as CSS variables for light and dark mode.
- Tailwind config is [tailwind.config.ts](tailwind.config.ts).
- Theme switching is handled by `next-themes` via [src/components/ThemeToggle.tsx](src/components/ThemeToggle.tsx).

### 7. Metadata and deploy target

- Update `<title>` and meta/OG tags in [index.html](index.html).
- Update `homepage` in [package.json](package.json) and the basename in [src/App.tsx](src/App.tsx) if you deploy to a sub-path (e.g. `username.github.io/portfolio`). For a custom domain at the root, keep the basename as `/`.
- Replace [public/preview.png](public/preview.png) with your own OG/social preview image.

---

## Development

```sh
npm i           # install
npm run dev     # vite dev server
npm run build   # production build
npm run lint    # eslint
npm run test    # vitest (one-shot)
```

Requires Node 18+.
