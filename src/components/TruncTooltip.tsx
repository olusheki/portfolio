import { useRef, useState, useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Wraps a single-line truncated label and shows an instant tooltip on hover —
 * but only when the label is actually being clipped.
 *
 * The tooltip is portalled to <body> so it escapes ancestor `overflow`
 * clipping and sibling stacking contexts (e.g. when a sibling pane in a
 * flex row would otherwise paint on top of the tooltip).
 */
const TruncTooltip = ({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children?: ReactNode;
}) => {
  const labelRef = useRef<HTMLSpanElement>(null);
  const [show, setShow] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = labelRef.current;
    if (!el) return;
    const check = () => setTruncated(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [label]);

  const handleEnter = () => {
    if (!truncated) return;
    const el = labelRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ left: r.left, top: r.top - 4 });
    setShow(true);
  };

  const handleLeave = () => setShow(false);

  return (
    <span
      className={`relative inline-block min-w-0 ${className}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <span ref={labelRef} className="block truncate">
        {children ?? label}
      </span>
      {show && coords &&
        createPortal(
          <span
            role="tooltip"
            style={{
              position: "fixed",
              left: coords.left,
              top: coords.top,
              transform: "translateY(-100%)",
            }}
            className="pointer-events-none z-[100] whitespace-nowrap rounded-sm border border-border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md"
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
};

export default TruncTooltip;
