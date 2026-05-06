import { useEffect, useRef, useCallback, useMemo } from "react";

const MASTER_STRING =
  " 0123456789.,·-•─~+:;=*π'\"\"┐┌┘└┼├┤┴┬│╗╔╝╚╬╠╣╩╦║░▒▓█▄▀▌▐■!?&#$@aàbcdefghijklmnoòpqrstuüvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%()";

// Phase-1 (degenerate) walks a shorter, alphanumeric-free string back to NBSP.
// Trailing NBSP is the "invisible" target so the cell stays width-stable.
const DECAY_STRING =
  ".,·-•─~+:;=*π'\"\"┐┌┘└┼├┤┴┬│╗╔╝╚╬╠╣╩╦║░▒▓█▄▀▌▐■!?&# ";
const DECAY_TARGET_INDEX = DECAY_STRING.length - 1;

// Total budget for prop-mode transitions (degenerate + build).
const PROP_TOTAL_BUDGET_MS = 1500;
const PROP_PER_CHAR_STEP = 2; // frames per master-string index step

type Trigger = "prop" | "hover";

interface MonoGlitchProps {
  text: string;
  className?: string;
  /**
   * "prop"  – animate whenever `text` changes (default).
   * "hover" – text is static; each character runs its own master-string cycle
   *           from index 0 → target when the cursor glides across it.
   *           On first paint, characters reveal sequentially top-left → bottom-right.
   */
  trigger?: Trigger;
  /** Hover mode: ms between each character's intro start. */
  introStrideMs?: number;
  /** Hover mode: skip the LTR/TTB intro reveal — paint final text on mount. */
  skipIntro?: boolean;
  /** Hover mode: master-string indices walked per frame (higher = snappier). */
  walkStep?: number;
  /**
   * Prop mode: paint the initial text without animating. Subsequent text
   * changes still animate. Use this when the component is mounted with the
   * "current" text already showing (e.g. a modal title that opens on item N
   * but should only glitch on prev/next).
   */
  skipFirstAnimation?: boolean;
}

// ────────────────────────────────────────────────────────────────────
// HOVER MODE — unchanged
// ────────────────────────────────────────────────────────────────────
const HoverChar = ({
  char,
  introDelayMs,
  skipIntro,
  walkStep,
}: {
  char: string;
  introDelayMs: number;
  skipIntro: boolean;
  walkStep: number;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const introDoneRef = useRef(skipIntro);

  const targetIndex = useMemo(() => MASTER_STRING.indexOf(char), [char]);
  const isStatic = char === " " || char === " " || targetIndex === -1;

  const start = useCallback(() => {
    const el = ref.current;
    if (!el || isStatic) return;

    let current = 0;

    const tick = () => {
      if (current === targetIndex) {
        el.textContent = char;
        frameRef.current = null;
        introDoneRef.current = true;
        return;
      }
      current = current < targetIndex
        ? Math.min(current + walkStep, targetIndex)
        : Math.max(current - walkStep, targetIndex);
      el.textContent = MASTER_STRING[current] || char;
      frameRef.current = requestAnimationFrame(tick);
    };

    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    tick();
  }, [char, targetIndex, isStatic, walkStep]);

  useEffect(() => {
    if (isStatic) return;
    if (skipIntro) {
      // Paint the final char immediately; future hovers still animate.
      if (ref.current) ref.current.textContent = char;
      return;
    }
    const el = ref.current;
    if (el) el.textContent = " ";
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      start();
    }, introDelayMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [start, introDelayMs, isStatic, skipIntro, char]);

  const handleEnter = () => {
    if (!introDoneRef.current) return;
    start();
  };

  if (isStatic) {
    return <>{char}</>;
  }

  return (
    <span ref={ref} onMouseEnter={handleEnter}>
      {char}
    </span>
  );
};

// ────────────────────────────────────────────────────────────────────
// PROP MODE — two-phase per-char glitch
// Phase 1 (degenerate): each char walks from its current MASTER index
//   back through DECAY_STRING into NBSP. Stagger is RTL/BTT.
// Phase 2 (build):      each char walks from MASTER index 0 forward
//   to its new target. Stagger is LTR/TTB (matches the bio intro).
// Total ≤ PROP_TOTAL_BUDGET_MS, scaled tighter for longer strings.
// ────────────────────────────────────────────────────────────────────

const NBSP = " ";

const PropGlitch = ({
  text,
  className,
  skipFirstAnimation,
}: {
  text: string;
  className: string;
  skipFirstAnimation?: boolean;
}) => {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const currentTextRef = useRef("");
  const isFirstRunRef = useRef(true);

  // Per-character runtime state for the in-flight transition.
  type CharState = {
    el: HTMLSpanElement;
    // hadOld: did this position carry a real old char? If false, the position
    //   is "newOnly" — invisible during phase 1, builds during phase 2.
    hadOld: boolean;
    // hasNew: does this position carry a real new char? If false, the position
    //   is "oldOnly" — visible during phase 1, decays into nothing.
    hasNew: boolean;
    decayFromIdx: number;
    toMasterIdx: number;
    decayStartMs: number;
    decayDoneAtMs: number;
    buildStartMs: number;
    buildDoneAtMs: number;
    finalChar: string;
  };

  const stateRef = useRef<CharState[]>([]);

  const animate = useCallback(() => {
    const states = stateRef.current;
    const now = performance.now() - startTimeRef.current;
    let allDone = true;

    for (const s of states) {
      // Phase 1 window
      if (now < s.buildStartMs) {
        if (!s.hadOld) {
          // Position only exists in the new string — hold invisible until build.
          s.el.textContent = NBSP;
          allDone = false;
          continue;
        }
        if (now < s.decayStartMs) {
          // Wait our turn with the old char visible.
          s.el.textContent = DECAY_STRING[s.decayFromIdx] || NBSP;
          allDone = false;
          continue;
        }
        const t = Math.min(1, (now - s.decayStartMs) / Math.max(1, s.decayDoneAtMs - s.decayStartMs));
        const idx = Math.round(s.decayFromIdx + (DECAY_TARGET_INDEX - s.decayFromIdx) * t);
        s.el.textContent = DECAY_STRING[idx] || NBSP;
        allDone = false;
        continue;
      }

      // Phase 2 window
      if (now < s.buildDoneAtMs) {
        if (!s.hasNew) {
          // Position only existed in the old string — stay invisible.
          s.el.textContent = NBSP;
          allDone = false;
          continue;
        }
        if (now < s.buildStartMs) {
          s.el.textContent = NBSP;
          allDone = false;
          continue;
        }
        const t = Math.min(1, (now - s.buildStartMs) / Math.max(1, s.buildDoneAtMs - s.buildStartMs));
        const idx = Math.round(s.toMasterIdx * t);
        s.el.textContent = MASTER_STRING[idx] || s.finalChar;
        allDone = false;
        continue;
      }

      s.el.textContent = s.hasNew ? s.finalChar : NBSP;
    }

    if (!allDone) {
      frameRef.current = requestAnimationFrame(animate);
    } else {
      frameRef.current = null;
      // Animation done: shrink the pool to the new text length so the
      // wrapper measures the natural new height with no lingering placeholders.
      const wrap = wrapRef.current;
      if (wrap) {
        while (wrap.childNodes.length > text.length) {
          wrap.removeChild(wrap.lastChild!);
        }
      }
    }
  }, [text]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    // First mount: optionally just paint the text and bail (no animation).
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      currentTextRef.current = text;
      if (skipFirstAnimation) {
        wrap.textContent = text;
        return;
      }
    }

    const oldText = currentTextRef.current;
    const length = Math.max(oldText.length, text.length);

    // Maintain a per-char span pool inside the wrap (stable across transitions).
    while (wrap.childNodes.length < length) {
      wrap.appendChild(document.createElement("span"));
    }
    while (wrap.childNodes.length > length) {
      wrap.removeChild(wrap.lastChild!);
    }

    const phaseBudget = PROP_TOTAL_BUDGET_MS / 2;
    const decayWalkMs = Math.min(phaseBudget * 0.6, DECAY_TARGET_INDEX * PROP_PER_CHAR_STEP * 16);
    const buildWalkMs = Math.min(phaseBudget * 0.6, 100 * PROP_PER_CHAR_STEP * 16);
    const decayStride = length > 1 ? Math.max(0, phaseBudget - decayWalkMs) / (length - 1) : 0;
    const buildStride = length > 1 ? Math.max(0, phaseBudget - buildWalkMs) / (length - 1) : 0;

    const states: CharState[] = Array.from({ length }, (_, i) => {
      const el = wrap.childNodes[i] as HTMLSpanElement;
      const oldChar = i < oldText.length ? oldText[i] : "";
      const newChar = i < text.length ? text[i] : "";
      const hadOld = oldChar !== "";
      const hasNew = newChar !== "";

      // Pre-paint so the very first frame doesn't flash NBSP for old positions.
      if (hadOld) {
        el.textContent = oldChar === " " ? NBSP : oldChar;
      } else {
        el.textContent = NBSP;
      }

      const decayStartMs = (length - 1 - i) * decayStride;
      const buildStartMs = phaseBudget + i * buildStride;
      const decayFromIdx = hadOld
        ? oldChar === " "
          ? DECAY_TARGET_INDEX // already invisible
          : DECAY_STRING.indexOf(oldChar) !== -1
            ? DECAY_STRING.indexOf(oldChar)
            : Math.floor(DECAY_TARGET_INDEX / 2)
        : DECAY_TARGET_INDEX;
      const toMasterIdx = hasNew ? Math.max(0, MASTER_STRING.indexOf(newChar)) : 0;

      return {
        el,
        hadOld,
        hasNew,
        decayFromIdx,
        toMasterIdx,
        decayStartMs,
        decayDoneAtMs: decayStartMs + decayWalkMs,
        buildStartMs,
        buildDoneAtMs: buildStartMs + buildWalkMs,
        finalChar: newChar === " " ? NBSP : newChar,
      };
    });

    stateRef.current = states;
    startTimeRef.current = performance.now();
    currentTextRef.current = text;

    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    animate();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [text, animate, skipFirstAnimation]);

  return <span ref={wrapRef} className={className} />;
};

const MonoGlitch = ({
  text,
  className = "",
  trigger = "prop",
  introStrideMs = 8,
  skipIntro = false,
  walkStep = 1,
  skipFirstAnimation,
}: MonoGlitchProps) => {
  if (trigger === "hover") {
    return (
      <span className={className}>
        {text.split("").map((c, i) => (
          <HoverChar
            key={i}
            char={c}
            introDelayMs={i * introStrideMs}
            skipIntro={skipIntro}
            walkStep={walkStep}
          />
        ))}
      </span>
    );
  }
  return (
    <PropGlitch
      text={text}
      className={className}
      skipFirstAnimation={skipFirstAnimation}
    />
  );
};

export default MonoGlitch;
