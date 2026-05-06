import { useEffect, useRef, useCallback } from "react";

const MASTER_STRING =
  " 0123456789.,·-•─~+:;=*π'\"\"┐┌┘└┼├┤┴┬│╗╔╝╚╬╠╣╩╦║░▒▓█▄▀▌▐■!?&#$@aàbcdefghijklmnoòpqrstuüvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%()";

const DECAY_STRING =
  ".,·-•─~+:;=*π'\"\"┐┌┘└┼├┤┴┬│╗╔╝╚╬╠╣╩╦║░▒▓█▄▀▌▐■!?&# ";
const DECAY_TARGET_INDEX = DECAY_STRING.length - 1;

const GLITCH_COLORS = [
  "#00ffff",
  "#ff00ff",
  "#ffff00",
  "#00ff00",
  "#ff0000",
  "#0000ff",
  "#ffffff",
];

const NBSP = " ";

// Total transition (decay + build) is at most this many ms.
const TRANSITION_BUDGET_MS = 1500;
const PER_CHAR_STEP = 2;

interface ChromaticGlitchProps {
  phrases: string[];
  /** Time the settled phrase is shown before the next transition begins. */
  interval?: number;
  className?: string;
}

const randomColor = () =>
  GLITCH_COLORS[Math.floor(Math.random() * GLITCH_COLORS.length)];

const ChromaticGlitch = ({
  phrases,
  interval = 4000,
  className = "",
}: ChromaticGlitchProps) => {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const currentTextRef = useRef("");
  const phraseIndexRef = useRef(0);

  type CharState = {
    el: HTMLSpanElement;
    hadOld: boolean;
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
  const transitionLengthRef = useRef(0);

  const animate = useCallback(() => {
    const states = stateRef.current;
    const now = performance.now() - startTimeRef.current;
    let allDone = true;

    for (const s of states) {
      // Phase 1
      if (now < s.buildStartMs) {
        if (!s.hadOld) {
          s.el.textContent = NBSP;
          s.el.style.color = "";
          allDone = false;
          continue;
        }
        if (now < s.decayStartMs) {
          // Wait turn — keep showing the old char in foreground.
          s.el.textContent = DECAY_STRING[s.decayFromIdx] || NBSP;
          s.el.style.color = "";
          allDone = false;
          continue;
        }
        const t = Math.min(
          1,
          (now - s.decayStartMs) / Math.max(1, s.decayDoneAtMs - s.decayStartMs),
        );
        const idx = Math.round(
          s.decayFromIdx + (DECAY_TARGET_INDEX - s.decayFromIdx) * t,
        );
        const ch = DECAY_STRING[idx] || NBSP;
        s.el.textContent = ch;
        s.el.style.color = ch === NBSP ? "" : randomColor();
        allDone = false;
        continue;
      }

      // Phase 2
      if (now < s.buildDoneAtMs) {
        if (!s.hasNew) {
          s.el.textContent = NBSP;
          s.el.style.color = "";
          allDone = false;
          continue;
        }
        if (now < s.buildStartMs) {
          s.el.textContent = NBSP;
          s.el.style.color = "";
          allDone = false;
          continue;
        }
        const t = Math.min(
          1,
          (now - s.buildStartMs) / Math.max(1, s.buildDoneAtMs - s.buildStartMs),
        );
        const idx = Math.round(s.toMasterIdx * t);
        const ch = MASTER_STRING[idx] || s.finalChar;
        s.el.textContent = ch;
        s.el.style.color = ch === s.finalChar || ch === NBSP ? "" : randomColor();
        allDone = false;
        continue;
      }

      // Settled.
      s.el.textContent = s.hasNew ? s.finalChar : NBSP;
      s.el.style.color = "";
      s.el.style.fontWeight = "";
    }

    if (!allDone) {
      frameRef.current = requestAnimationFrame(animate);
    } else {
      frameRef.current = null;
      // Collapse the pool down to the new text's length so the inline width
      // matches the settled phrase (and any sibling like the comma snaps in).
      const wrap = wrapRef.current;
      if (wrap) {
        const targetLen = currentTextRef.current.length;
        while (wrap.childNodes.length > targetLen) {
          wrap.removeChild(wrap.lastChild!);
        }
      }
    }
  }, []);

  const transitionTo = useCallback(
    (newText: string) => {
      const wrap = wrapRef.current;
      if (!wrap) return;

      const oldText = currentTextRef.current;
      const length = Math.max(oldText.length, newText.length);
      transitionLengthRef.current = length;

      while (wrap.childNodes.length < length) {
        const s = document.createElement("span");
        // Defeat the global `* { transition: color 0.4s }` rule — without this,
        // rapid per-frame color changes interpolate continuously and the chars
        // average out to pastel midpoints instead of hitting saturated values.
        s.style.transition = "none";
        wrap.appendChild(s);
      }
      while (wrap.childNodes.length > length) {
        wrap.removeChild(wrap.lastChild!);
      }

      // If there's no previous text (first paint), skip the empty decay
      // phase so the build starts immediately instead of waiting 750ms.
      const isFirstPaint = oldText === "";
      const phaseBudget = TRANSITION_BUDGET_MS / 2;
      const decayPhaseLen = isFirstPaint ? 0 : phaseBudget;
      const decayWalkMs = Math.min(
        phaseBudget * 0.6,
        DECAY_TARGET_INDEX * PER_CHAR_STEP * 16,
      );
      const buildWalkMs = Math.min(
        phaseBudget * 0.6,
        100 * PER_CHAR_STEP * 16,
      );
      const decayStride =
        length > 1 ? Math.max(0, phaseBudget - decayWalkMs) / (length - 1) : 0;
      const buildStride =
        length > 1 ? Math.max(0, phaseBudget - buildWalkMs) / (length - 1) : 0;

      const states: CharState[] = Array.from({ length }, (_, i) => {
        const el = wrap.childNodes[i] as HTMLSpanElement;
        const oldChar = i < oldText.length ? oldText[i] : "";
        const newChar = i < newText.length ? newText[i] : "";
        const hadOld = oldChar !== "";
        const hasNew = newChar !== "";

        if (hadOld) {
          el.textContent = oldChar === " " ? NBSP : oldChar;
        } else {
          el.textContent = NBSP;
        }
        el.style.color = "";

        const decayStartMs = (length - 1 - i) * decayStride;
        const buildStartMs = decayPhaseLen + i * buildStride;
        const decayFromIdx = hadOld
          ? oldChar === " "
            ? DECAY_TARGET_INDEX
            : DECAY_STRING.indexOf(oldChar) !== -1
              ? DECAY_STRING.indexOf(oldChar)
              : Math.floor(DECAY_TARGET_INDEX / 2)
          : DECAY_TARGET_INDEX;
        const toMasterIdx = hasNew
          ? Math.max(0, MASTER_STRING.indexOf(newChar))
          : 0;

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
      currentTextRef.current = newText;

      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      animate();
    },
    [animate],
  );

  useEffect(() => {
    if (phrases.length === 0) return;

    const wrap = wrapRef.current;
    if (!wrap) return;

    // Build empty per-char span pool so the first phrase animates in.
    wrap.textContent = "";
    currentTextRef.current = "";
    phraseIndexRef.current = 0;

    const tick = () => {
      transitionTo(phrases[phraseIndexRef.current]);
      phraseIndexRef.current = (phraseIndexRef.current + 1) % phrases.length;
      timeoutRef.current = window.setTimeout(
        tick,
        TRANSITION_BUDGET_MS + interval,
      );
    };

    // Animate the first phrase in immediately.
    tick();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [phrases, interval, transitionTo]);

  return <span ref={wrapRef} className={className} />;
};

export default ChromaticGlitch;
