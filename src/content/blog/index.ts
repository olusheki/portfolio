import type { BlogPost } from "@/components/BlogCard";

type Frontmatter = {
  title?: string;
  date?: string;
  excerpt?: string;
  links?: { text: string; url: string }[];
};

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

const parseScalar = (raw: string): string => {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const parseFrontmatter = (raw: string): { data: Frontmatter; content: string } => {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { data: {}, content: raw };

  const [, yaml, content] = match;
  const data: Frontmatter = {};
  const lines = yaml.split(/\r?\n/);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) {
      i++;
      continue;
    }

    const topMatch = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!topMatch) {
      i++;
      continue;
    }

    const [, key, rest] = topMatch;

    if (rest.trim() === "") {
      // List value follows on subsequent indented lines.
      const items: { text: string; url: string }[] = [];
      i++;
      while (i < lines.length && /^\s+-\s/.test(lines[i])) {
        const item: { text?: string; url?: string } = {};
        const firstField = lines[i].match(/^\s+-\s+([A-Za-z_][\w-]*):\s*(.*)$/);
        if (firstField) {
          item[firstField[1] as "text" | "url"] = parseScalar(firstField[2]);
        }
        i++;
        while (i < lines.length && /^\s{4,}[A-Za-z_][\w-]*:\s/.test(lines[i])) {
          const field = lines[i].match(/^\s+([A-Za-z_][\w-]*):\s*(.*)$/);
          if (field) item[field[1] as "text" | "url"] = parseScalar(field[2]);
          i++;
        }
        if (item.text && item.url) items.push({ text: item.text, url: item.url });
      }
      if (key === "links") data.links = items;
    } else {
      const value = parseScalar(rest);
      if (key === "title" || key === "date" || key === "excerpt") {
        data[key] = value;
      }
      i++;
    }
  }

  return { data, content };
};

const files = import.meta.glob("./*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const formatDisplayDate = (iso: string): string => {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const blogPosts: BlogPost[] = Object.entries(files)
  .map(([path, raw]) => {
    const { data, content } = parseFrontmatter(raw);
    const isoDate = data.date ?? "";
    return {
      sortKey: isoDate || path,
      post: {
        title: data.title ?? "Untitled",
        date: formatDisplayDate(isoDate),
        excerpt: data.excerpt ?? "",
        content: content.trim(),
        links: data.links,
      } satisfies BlogPost,
    };
  })
  .sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1))
  .map(({ post }) => post);
