# Daniel Olusheki — Personal Portfolio

A minimal, dark-themed personal portfolio website built with React, Vite, Tailwind CSS, and TypeScript. Features a bento-grid layout, animated text effects, a live LeetCode stats widget, and light/dark mode toggle.

---

## Using This as a Template

To adapt this site for your own portfolio, update the following:

### 1. Content (`src/pages/Index.tsx`)

All portfolio content lives in data arrays at the top of this file:

- **`HELLO_PHRASES`** — Rotating greeting text
- **`experienceItems`** — Work experience and awards
- **`projectItems`** — Featured projects (supports images, links, descriptions)
- **`skillItems`** — Skills grouped by category
- **`courseItems`** — Relevant coursework
- **`blogPosts`** — Blog entries for the new BlogCard

Update the bio paragraph and footer links (email, LinkedIn, GitHub) in the JSX below the data arrays.

#### SectionItem Keys

Each item in the data arrays is a `SectionItem` object. Here are all available keys:

| Key | Type | Description |
|-----|------|-------------|
| `title` | `string` | **Required.** The item's heading displayed in the modal. |
| `modalTitle` | `string` | Optional override for the modal header (e.g., "My Story" instead of the card title). |
| `subtitle` | `string` | Secondary text shown below the title (e.g., company, date range). |
| `description` | `string` | A paragraph of body text. |
| `bullets` | `string[]` | Bulleted list of details (e.g., responsibilities, achievements). |
| `tags` | `string[]` | Inline tag chips (used for skills, courses, etc.). |
| `link` | `{ text: string; url: string }` | An external link rendered below the description. |
| `image` | `string` | A single image (imported asset or URL). Clickable to expand in a lightbox. |
| `images` | `string[]` | Array of images for a carousel (uses Embla). Overrides single `image`. |
| `video` | `string` | A YouTube or Vimeo URL embedded as an iframe. |
| `pdf` | `string` | Path to a PDF file (in `public/`). Embedded in an iframe with clickable links. |

All keys except `title` are optional and can be combined freely.

#### BlogPost Keys

Each item in the `blogPosts` array is a `BlogPost` object.

| Key | Type | Description |
|-----|------|-------------|
| `title` | `string` | **Required.** Title of the post. |
| `date` | `string` | **Required.** Displayed date (e.g., "Mar 2026"). |
| `excerpt` | `string` | **Required.** Short description appearing on the card hover card. |
| `content` | `string` | **Required.** The full content of the blog post shown in the modal. |
| `link` | `{ text: string; url: string }` | Optional external link for the post. |

### 2. Resume

Replace `public/Daniel_Olusheki_Resume.pdf` with your own resume file and update the link in the footer if the filename changes.

### 3. Images

Add project images to `src/assets/` and import them at the top of `Index.tsx`. Reference them via the `image` field in `projectItems`.

### 4. LeetCode Widget

Update the username in `src/hooks/useLeetCodeStats.ts` to your own LeetCode profile, or remove the `<LeetCodeCard />` component if not needed.

### 5. Theme & Styling

- Colors and design tokens are defined in `src/index.css`
- Tailwind config is in `tailwind.config.ts`
- The site supports light and dark modes via `<ThemeToggle />`

### 6. Metadata

Update the `<title>` and meta tags in `index.html`.

---

## Development

```sh
npm i
npm run dev
```

