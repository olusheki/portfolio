import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Pin, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MonoGlitch from "./MonoGlitch";
import TruncTooltip from "./TruncTooltip";

const markdownComponents = {
  p: ({ node: _node, ...props }: { node?: unknown } & React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-3 last:mb-0" {...props} />
  ),
  a: ({ node: _node, ...props }: { node?: unknown } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors"
      {...props}
    />
  ),
  strong: ({ node: _node, ...props }: { node?: unknown } & React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: ({ node: _node, ...props }: { node?: unknown } & React.HTMLAttributes<HTMLElement>) => (
    <em className="italic" {...props} />
  ),
  ul: ({ node: _node, ...props }: { node?: unknown } & React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-outside pl-5 mb-3 space-y-1" {...props} />
  ),
  ol: ({ node: _node, ...props }: { node?: unknown } & React.OlHTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal list-outside pl-5 mb-3 space-y-1" {...props} />
  ),
  blockquote: ({ node: _node, ...props }: { node?: unknown } & React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-2 border-border pl-3 italic text-muted-foreground/80 my-3" {...props} />
  ),
  code: ({ node: _node, ...props }: { node?: unknown } & React.HTMLAttributes<HTMLElement>) => (
    <code className="px-1 py-0.5 rounded-sm bg-accent text-foreground text-[10px]" {...props} />
  ),
  h1: ({ node: _node, ...props }: { node?: unknown } & React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-sm font-semibold text-foreground mt-4 mb-2" {...props} />
  ),
  h2: ({ node: _node, ...props }: { node?: unknown } & React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-sm font-semibold text-foreground mt-4 mb-2" {...props} />
  ),
  h3: ({ node: _node, ...props }: { node?: unknown } & React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-xs font-semibold text-foreground mt-3 mb-1" {...props} />
  ),
  img: ({ node: _node, ...props }: { node?: unknown } & React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img className="w-full h-auto rounded-sm border border-border my-3" {...props} />
  ),
  table: ({ node: _node, ...props }: { node?: unknown } & React.TableHTMLAttributes<HTMLTableElement>) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse border border-border text-[11px]" {...props} />
    </div>
  ),
  thead: ({ node: _node, ...props }: { node?: unknown } & React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-accent/40" {...props} />
  ),
  tbody: ({ node: _node, ...props }: { node?: unknown } & React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody {...props} />
  ),
  tr: ({ node: _node, ...props }: { node?: unknown } & React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="border-b border-border last:border-b-0" {...props} />
  ),
  th: ({ node: _node, ...props }: { node?: unknown } & React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-2 py-1.5 text-left font-semibold text-foreground border-r border-border last:border-r-0" {...props} />
  ),
  td: ({ node: _node, ...props }: { node?: unknown } & React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-2 py-1.5 align-top border-r border-border last:border-r-0" {...props} />
  ),
  hr: ({ node: _node, ...props }: { node?: unknown } & React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-4 border-border" {...props} />
  ),
};
export type BlogBlock =
  | { type: "text"; text: string }
  | { type: "image"; src: string; alt?: string; caption?: string };

export interface BlogPost {
  title: string;
  date: string;
  excerpt: string;
  /**
   * Either a single string (renders as one block of paragraphs split on blank
   * lines) or an array of blocks for mixing text and images.
   */
  content: string | BlogBlock[];
  links?: { text: string; url: string }[];
  pinned?: boolean;
}

interface BlogCardProps {
  posts: BlogPost[];
}

const VISITED_RED = "#f80800";

// Module-scoped, in-memory store: refresh = reset.
const visitedSet = new Set<string>();
const visitedListeners = new Set<() => void>();

const useBlogVisited = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const listener = () => force((n) => n + 1);
    visitedListeners.add(listener);
    return () => {
      visitedListeners.delete(listener);
    };
  }, []);
  const markVisited = (id: string) => {
    if (visitedSet.has(id)) return;
    visitedSet.add(id);
    visitedListeners.forEach((l) => l());
  };
  return { visited: visitedSet, markVisited };
};

const BlogCard = ({ posts }: BlogCardProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const { visited, markVisited } = useBlogVisited();
  const activeIndexRef = useRef<number | null>(null);
  activeIndexRef.current = activeIndex;

  const openModal = (i: number) => {
    setActiveIndex(i);
    setClosing(false);
    markVisited(posts[i].title);
  };

  const closeModal = () => {
    setClosing(true);
    setTimeout(() => {
      setActiveIndex(null);
      setClosing(false);
    }, 300);
  };

  const goTo = (i: number) => {
    if (i < 0 || i >= posts.length) return;
    setActiveIndex(i);
    markVisited(posts[i].title);
  };

  const goNext = () => {
    if (activeIndex !== null) goTo(activeIndex + 1);
  };

  const goPrev = () => {
    if (activeIndex !== null) goTo(activeIndex - 1);
  };

  const post = activeIndex !== null ? posts[activeIndex] : null;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (activeIndexRef.current === null) return;
      if (e.repeat) return;
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowRight") goTo(activeIndexRef.current + 1);
      if (e.key === "ArrowLeft") goTo(activeIndexRef.current - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Card with scrollable preview */}
      <div className="border border-border rounded-sm bg-card overflow-hidden max-h-64 2xl:max-h-[340px] 3xl:max-h-[400px] 4xl:max-h-[480px] flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <span className="text-sm font-medium text-foreground tracking-wide uppercase">
            BLOG
          </span>
        </div>
        <div className="max-h-[120px] 2xl:max-h-[180px] 3xl:max-h-[240px] 4xl:max-h-[320px] overflow-y-auto">
          {posts.map((p, i) => {
            const isVisited = visited.has(p.title);
            return (
              <button
                key={i}
                onClick={() => openModal(i)}
                className="group flex flex-col w-full px-4 py-2.5 hover:bg-accent transition-colors text-left border-b border-border last:border-b-0"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate flex items-center min-w-0">
                    {p.pinned && (
                      <Pin
                        aria-label="pinned"
                        className="w-3 h-3 mr-1.5 flex-shrink-0 rotate-45"
                      />
                    )}
                    <span className="truncate">{p.title}</span>
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-[10px] text-muted-foreground/70">{p.date}</span>
                    <ArrowRight
                      className={`w-3 h-3 transition-colors ${
                        isVisited ? "" : "text-muted-foreground/50 group-hover:text-foreground"
                      }`}
                      style={isVisited ? { color: VISITED_RED } : undefined}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/70 line-clamp-2">{p.excerpt}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail modal */}
      {post && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm ${closing ? "animate-modal-overlay-out" : "animate-modal-overlay-in"}`}
          onClick={closeModal}
        >
          <div
            onClick={e => e.stopPropagation()}
            className={`relative w-full max-w-2xl md:max-w-4xl mx-6 h-[70vh] flex flex-col md:flex-row border border-border bg-card rounded-sm overflow-hidden ${closing ? "animate-modal-content-out" : "animate-modal-content-in"}`}
          >
            {/* Left rail (md+) */}
            <aside className="hidden md:flex md:w-56 flex-col border-r border-border flex-shrink-0">
              <div className="px-4 py-3 border-b border-border flex-shrink-0">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  BLOG
                </span>
              </div>
              <ul className="flex-1 overflow-y-auto py-1">
                {posts.map((p, i) => {
                  const isActive = i === activeIndex;
                  const isVisited = visited.has(p.title);
                  return (
                    <li key={i} className="border-b border-border last:border-b-0">
                      <button
                        onClick={() => goTo(i)}
                        className={`group flex items-start justify-between w-full px-4 py-2 text-left text-xs transition-colors ${
                          isActive
                            ? "bg-accent text-foreground"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                        }`}
                      >
                        <span className="flex flex-col min-w-0 flex-1">
                          <span className="flex items-center min-w-0">
                            {p.pinned && (
                              <Pin
                                aria-label="pinned"
                                className="w-3 h-3 mr-1.5 flex-shrink-0 rotate-45"
                              />
                            )}
                            <TruncTooltip label={p.title} />
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 truncate">{p.date}</span>
                        </span>
                        <ArrowRight
                          className="w-3 h-3 flex-shrink-0 ml-2 mt-0.5 transition-colors"
                          style={isVisited ? { color: VISITED_RED } : undefined}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* Right pane */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-shrink-0 p-8 pb-0">
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide md:hidden">
                    BLOG
                  </span>
                  <span className="text-xs text-muted-foreground md:hidden">·</span>
                  <span className="text-xs text-muted-foreground">{post.date}</span>
                </div>

                <h2 className="text-lg font-semibold tracking-wide mb-4 text-foreground break-words pr-8">
                  <MonoGlitch text={post.title} skipFirstAnimation />
                </h2>
              </div>

              <div key={activeIndex} className="flex-1 overflow-y-auto px-8 pb-4 min-h-0 animate-fade-in">
                {typeof post.content === "string" ? (
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {post.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {post.content.map((block, idx) =>
                      block.type === "text" ? (
                        <div
                          key={idx}
                          className="text-xs text-muted-foreground leading-relaxed"
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {block.text}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <figure key={idx} className="my-2">
                          <img
                            src={block.src}
                            alt={block.alt ?? ""}
                            className="w-full h-auto rounded-sm border border-border mb-2"
                          />
                          {block.caption && (
                            <figcaption className="text-[10px] text-muted-foreground/70 mb-2 text-center italic">
                              {block.caption}
                            </figcaption>
                          )}
                        </figure>
                      ),
                    )}
                  </div>
                )}

                {post.links && post.links.length > 0 && (
                  <div className="mt-6 space-y-2">
                    {post.links.map((link, idx) => (
                      <div key={idx}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors"
                        >
                          {link.text}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile-only footer nav */}
              <div className="flex-shrink-0 flex md:hidden items-center justify-between px-8 py-4 border-t border-border">
                <button
                  onClick={goPrev}
                  disabled={activeIndex === 0}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <span className="text-xs text-muted-foreground">
                  {activeIndex! + 1} / {posts.length}
                </span>
                <button
                  onClick={goNext}
                  disabled={activeIndex === posts.length - 1}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BlogCard;
