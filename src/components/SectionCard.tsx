import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import MonoGlitch from "./MonoGlitch";
import TruncTooltip from "./TruncTooltip";

export interface SectionItem {
  title: string;
  modalTitle?: string;
  subtitle?: string;
  description?: string;
  bullets?: string[];
  tags?: string[];
  link?: { text: string; url: string };
  image?: string;
  images?: string[];
  video?: string;
  pdf?: string;
  current?: boolean;
}

interface SectionCardProps {
  title: string;
  items: SectionItem[];
  disableGlitch?: boolean;
  badge?: string;
}

const ImageCarousel = ({ images, title }: { images: string[]; title: string }) => {
  const [current, setCurrent] = useState(0);
  return (
    <div className="mb-4">
      <div className="relative rounded-sm border border-border overflow-hidden">
        <img
          src={images[current]}
          alt={`${title} - slide ${current + 1}`}
          className="w-full h-auto"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm border border-border rounded-full p-1.5 text-foreground hover:bg-background transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrent((c) => Math.min(images.length - 1, c + 1))}
              disabled={current === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm border border-border rounded-full p-1.5 text-foreground hover:bg-background transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? "bg-foreground" : "bg-muted-foreground/30"
                }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const VISITED_RED = "#f80800";

// Module-scoped store: visited state lives only for the lifetime of the page.
// A refresh discards the module instance, so visited resets exactly as desired.
const visitedStore: Record<string, Set<string>> = {};
const visitedListeners = new Set<() => void>();

const useVisited = (key: string) => {
  if (!visitedStore[key]) visitedStore[key] = new Set();
  const [, force] = useState(0);

  useEffect(() => {
    const listener = () => force((n) => n + 1);
    visitedListeners.add(listener);
    return () => {
      visitedListeners.delete(listener);
    };
  }, []);

  const markVisited = (id: string) => {
    const set = visitedStore[key];
    if (set.has(id)) return;
    set.add(id);
    visitedListeners.forEach((l) => l());
  };

  return { visited: visitedStore[key], markVisited };
};

const SectionCard = ({ title, items, disableGlitch, badge }: SectionCardProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const { visited, markVisited } = useVisited(`mg-visited:${title}`);
  const activeIndexRef = useRef<number | null>(null);
  activeIndexRef.current = activeIndex;

  const openModal = (i: number) => {
    setActiveIndex(i);
    setClosing(false);
    markVisited(items[i].title);
  };

  const closeModal = () => {
    setClosing(true);
    setTimeout(() => {
      setActiveIndex(null);
      setClosing(false);
    }, 300);
  };

  const goTo = (i: number) => {
    if (i < 0 || i >= items.length) return;
    setActiveIndex(i);
    markVisited(items[i].title);
  };

  const goNext = () => {
    if (activeIndex !== null) goTo(activeIndex + 1);
  };

  const goPrev = () => {
    if (activeIndex !== null) goTo(activeIndex - 1);
  };

  const item = activeIndex !== null ? items[activeIndex] : null;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (activeIndexRef.current === null) return;
      if (e.repeat) return; // ignore key-repeat to prevent mid-glitch retriggers
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
      <div className="border border-border rounded-sm bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <span className="text-sm font-medium text-foreground tracking-wide uppercase">
            {title}
          </span>
          {badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium border border-border rounded-sm bg-accent/50 text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        <div className="max-h-[120px] 2xl:max-h-[180px] 3xl:max-h-[240px] 4xl:max-h-[320px] overflow-y-auto">
          {items.map((item, i) => {
            const isVisited = visited.has(item.title);
            return (
              <button
                key={i}
                onClick={() => openModal(i)}
                className="group flex items-center justify-between w-full px-4 py-2.5 hover:bg-accent transition-colors text-left border-b border-border last:border-b-0"
              >
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors min-w-0 flex items-start">
                  {item.current && (
                    <sup
                      aria-label="current"
                      className="mr-1 mt-0.5 flex-shrink-0 text-[9px] leading-none font-bold"
                      style={{ color: VISITED_RED }}
                    >
                      *
                    </sup>
                  )}
                  <span className="truncate">{item.title}</span>
                </span>
                <ArrowRight
                  className={`w-3 h-3 flex-shrink-0 ml-2 transition-colors ${
                    isVisited ? "" : "text-muted-foreground/50 group-hover:text-foreground"
                  }`}
                  style={isVisited ? { color: VISITED_RED } : undefined}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail modal */}
      {item && (
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
                  {title}
                </span>
              </div>
              <ul className="flex-1 overflow-y-auto py-1">
                {items.map((it, i) => {
                  const isActive = i === activeIndex;
                  const isVisited = visited.has(it.title);
                  return (
                    <li key={i} className="border-b border-border last:border-b-0">
                      <button
                        onClick={() => goTo(i)}
                        className={`group flex items-center justify-between w-full px-4 py-2 text-left text-xs transition-colors ${
                          isActive
                            ? "bg-accent text-foreground"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                        }`}
                      >
                        <span className="flex-1 min-w-0 flex items-start">
                          {it.current && (
                            <sup
                              aria-label="current"
                              className="mr-1 mt-0.5 flex-shrink-0 text-[10px] leading-none font-bold"
                              style={{ color: VISITED_RED }}
                            >
                              *
                            </sup>
                          )}
                          <TruncTooltip label={it.title} />
                        </span>
                        <ArrowRight
                          className="w-3 h-3 flex-shrink-0 ml-2 transition-colors"
                          style={isVisited ? { color: VISITED_RED } : undefined}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* Right pane: header + scrollable content + (mobile-only) footer nav */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Fixed header */}
              <div className="flex-shrink-0 p-8 pb-0">
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Mobile-only super-label (rail provides it on md+) */}
                <div className="mb-1 md:hidden">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    {title}
                  </span>
                </div>

                <h2 className="text-lg font-semibold tracking-wide mb-4 text-foreground break-words pr-8">
                  {disableGlitch ? (
                    item.modalTitle || item.title
                  ) : (
                    <MonoGlitch
                      text={item.modalTitle || item.title}
                      skipFirstAnimation
                    />
                  )}
                </h2>
              </div>

              {/* Scrollable content area */}
              <div key={activeIndex} className="flex-1 overflow-y-auto px-8 pb-4 min-h-0 animate-fade-in">
                {item.video && (
                  <div className="relative w-full aspect-video mb-4 rounded-sm overflow-hidden border border-border">
                    <iframe
                      src={item.video.replace("youtu.be/", "youtube.com/embed/").replace("watch?v=", "embed/")}
                      title={item.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                )}

                {item.image && (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-auto rounded-sm border border-border mb-4"
                  />
                )}

                {item.images && item.images.length > 0 && (
                  <ImageCarousel images={item.images} title={item.title} />
                )}

                {item.pdf && (
                  <div className="mb-4 rounded-sm border border-border overflow-hidden" style={{ height: "60vh" }}>
                    <iframe
                      src={`${item.pdf}#toolbar=1&navpanes=0`}
                      title={item.title}
                      className="w-full h-full"
                    />
                  </div>
                )}
                {item.subtitle && (
                  <p className="text-xs text-muted-foreground mb-4 break-words">
                    {item.subtitle}
                  </p>
                )}

                {item.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 break-words whitespace-pre-wrap">
                    {item.description}
                  </p>
                )}

                {item.bullets && item.bullets.length > 0 && (
                  <ul className="list-disc list-inside space-y-2 text-xs text-muted-foreground mb-4">
                    {item.bullets.map((bullet, i) => (
                      <li key={i} className="break-words">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 text-xs border border-border rounded-sm bg-accent/50 whitespace-nowrap">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {item.link && (
                  <a
                    href={item.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors inline-block"
                  >
                    {item.link.text}
                  </a>
                )}
              </div>

              {/* Mobile-only footer nav (rail replaces this on md+) */}
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
                  {activeIndex! + 1} / {items.length}
                </span>
                <button
                  onClick={goNext}
                  disabled={activeIndex === items.length - 1}
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

export default SectionCard;
