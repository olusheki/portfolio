import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

type Wave = [number, number, number];

type State = {
  seed: number;
  ws: Wave[];
  thresh: number;
  R: number;
  C: number;
  warp: number;
  ramp: boolean;
};

const ROWS_DEFAULT = 9;
const COLS_DEFAULT = 41;
const ROWS_MAX = 11;
const COLS_MAX = 61;
const WAVE_COUNT = 3;
const HISTORY_MAX = 40;

const RAMP = " .:-=+*#%@";

// Ramp-transition glyphs (same vocabulary as AsciiTimePattern). Used only on
// discrete jumps (Randomize / Prev / Next) — sliders stay live.
const TRANSITION_MS = 700;
const STAGGER_MAX = 220;
const GROW           = [" ", ".", ":", "+", "*"] as const;
const DECAY          = ["*", "+", ":", ".", " "] as const;
const FILLED_FLICKER = ["*", "+", ":", "+", "*"] as const;
const EMPTY_FLICKER  = [" ", ".", ":", ".", " "] as const;
const OPACITY_FOR_GLYPH: Record<string, number> = {
  " ": 0,
  ".": 0.32,
  ":": 0.55,
  "+": 0.78,
  "*": 1,
};

const generate = (
  ws: Wave[],
  thresh: number,
  R: number,
  C: number,
  warp: number,
  ramp: boolean,
): string[][] => {
  const cr = (R - 1) / 2;
  const cc = (C - 1) / 2;
  return Array.from({ length: R }, (_, r) =>
    Array.from({ length: C }, (_, c) => {
      const dr = Math.abs(r - cr);
      const dc = Math.abs(c - cc);

      let v = 0;
      for (const [fa, fb, ph] of ws) {
        // Domain warping using (cos - 1) on each axis. Two important properties:
        //   1. (cos(0) - 1) = 0, so the center cell sees zero offset — stays put.
        //   2. (cos(x) - 1) ≤ 0 for all x, so the offset is bounded and contractive,
        //      meaning the pattern can't drift outward as warp grows. Combined with
        //      both dr and dc being absolute distances (already symmetric), this keeps
        //      the entire field stationary regardless of warp magnitude.
        const drW = warp > 0 ? dr + warp * (Math.cos(fb * dc) - 1) : dr;
        const dcW = warp > 0 ? dc + warp * (Math.cos(fa * dr) - 1) : dc;
        v += Math.sin(fa * drW + fb * dcW + ph);
      }
      v /= ws.length;

      const av = Math.abs(v);
      if (av >= thresh) return " ";

      if (ramp) {
        // Within the density window, map closeness to zero-crossing onto the glyph ramp.
        const t = av / thresh;
        const idx = Math.floor((1 - t) * (RAMP.length - 1));
        return RAMP[idx];
      }
      return "*";
    }),
  );
};

const randomFromSeed = (seed: number): { ws: Wave[]; thresh: number; warp: number } => {
  let s = seed;
  const rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const ws = Array.from({ length: WAVE_COUNT }, () => [
    0.3 + rng() * 1.5,
    0.1 + rng() * 1.2,
    rng() * Math.PI * 2,
  ]) as Wave[];
  const thresh = 0.1 + rng() * 0.3; // 0.10..0.40
  const warp = rng() * 2.5; // 0..2.5
  return { ws, thresh, warp };
};

const randSeed = () => (Math.random() * 0xffffff) | 0;

// Ping-pong sweep a numeric state between [min, max] at `speed` units/sec while `active`.
const usePingPong = (
  active: boolean,
  setter: (updater: (n: number) => number) => void,
  min: number,
  max: number,
  speed: number,
) => {
  useEffect(() => {
    if (!active) return;
    let dir = 1;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setter((t) => {
        let next = t + dir * speed * dt;
        if (next >= max) {
          next = max;
          dir = -1;
        } else if (next <= min) {
          next = min;
          dir = 1;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
};

const WAVE_PARAMS: Array<{ key: 0 | 1 | 2; min: number; max: number; step: number; label: string }> = [
  { key: 0, min: 0.3, max: 1.8, step: 0.01, label: "freq A" },
  { key: 1, min: 0.1, max: 1.3, step: 0.01, label: "freq B" },
  { key: 2, min: 0, max: 6.28, step: 0.01, label: "phase" },
];

const AsciiPlayground = () => {
  const initialSeed = useRef(randSeed());
  const initialRand = useRef(randomFromSeed(initialSeed.current));
  const [waves, setWaves] = useState<Wave[]>(() => initialRand.current.ws);
  const [threshold, setThreshold] = useState(initialRand.current.thresh);
  const [rows, setRows] = useState(ROWS_DEFAULT);
  const [cols, setCols] = useState(COLS_DEFAULT);
  const [warp, setWarp] = useState(initialRand.current.warp);
  const [ramp, setRamp] = useState(false);
  const [playingDensity, setPlayingDensity] = useState(false);
  const [playingWarp, setPlayingWarp] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "error">("idle");

  const historyRef = useRef<State[]>([
    {
      seed: initialSeed.current,
      ws: initialRand.current.ws,
      thresh: initialRand.current.thresh,
      R: ROWS_DEFAULT,
      C: COLS_DEFAULT,
      warp: initialRand.current.warp,
      ramp: false,
    },
  ]);
  const historyIdxRef = useRef(0);

  // Cell-level DOM refs — we mutate textContent + opacity imperatively so the
  // ramp transition doesn't trigger ROWS_MAX*COLS_MAX React re-renders per step.
  const cellsRef = useRef<(HTMLSpanElement | null)[][]>([]);
  // Last grid we painted. Used as the "previous" grid for ramp transitions.
  const lastGridRef = useRef<string[][] | null>(null);
  // Generation counter — in-flight ramp steps bail if a newer transition starts.
  const tokenRef = useRef(0);
  const timeoutsRef = useRef<number[]>([]);

  const ascii = generate(waves, threshold, rows, cols, warp, ramp);

  // Paint a cell. r/c are absolute coords in the ROWS_MAX × COLS_MAX cell grid.
  const paintCell = useCallback((r: number, c: number, glyph: string) => {
    const cell = cellsRef.current[r]?.[c];
    if (!cell) return;
    cell.textContent = glyph === " " ? " " : glyph;
    cell.style.opacity = glyph === " " ? "0" : "1";
  }, []);

  // Paint a cell to a transition-ramp glyph (uses ramp opacity table).
  const paintTransitionCell = useCallback((r: number, c: number, glyph: string) => {
    const cell = cellsRef.current[r]?.[c];
    if (!cell) return;
    cell.textContent = glyph === " " ? " " : glyph;
    cell.style.opacity = String(OPACITY_FOR_GLYPH[glyph] ?? 0);
  }, []);

  // Paint the full ROWS_MAX × COLS_MAX field from a logical (R × C) grid,
  // centering it in the larger grid and filling the surround with blanks.
  // Bumps tokenRef + cancels pending step timeouts so a slider change during
  // an in-flight ramp transition wins immediately.
  const paintField = useCallback(
    (grid: string[][]) => {
      tokenRef.current += 1;
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutsRef.current = [];
      const R = grid.length;
      const C = R > 0 ? grid[0].length : 0;
      const rOffset = Math.floor((ROWS_MAX - R) / 2);
      const cOffset = Math.floor((COLS_MAX - C) / 2);
      for (let r = 0; r < ROWS_MAX; r++) {
        for (let c = 0; c < COLS_MAX; c++) {
          const lr = r - rOffset;
          const lc = c - cOffset;
          const inside = lr >= 0 && lr < R && lc >= 0 && lc < C;
          paintCell(r, c, inside ? grid[lr][lc] : " ");
        }
      }
      lastGridRef.current = grid;
    },
    [paintCell],
  );

  // Run the ramp transition between the previously painted field and `target`.
  const transitionToField = useCallback(
    (target: string[][]) => {
      const myToken = ++tokenRef.current;
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutsRef.current = [];

      const R = target.length;
      const C = R > 0 ? target[0].length : 0;
      const rOffset = Math.floor((ROWS_MAX - R) / 2);
      const cOffset = Math.floor((COLS_MAX - C) / 2);

      const prev = lastGridRef.current;
      const prevR = prev ? prev.length : 0;
      const prevC = prevR > 0 ? prev![0].length : 0;
      const prevROff = Math.floor((ROWS_MAX - prevR) / 2);
      const prevCOff = Math.floor((COLS_MAX - prevC) / 2);

      const stages = GROW.length;

      for (let r = 0; r < ROWS_MAX; r++) {
        for (let c = 0; c < COLS_MAX; c++) {
          const lr = r - rOffset;
          const lc = c - cOffset;
          const targetGlyph =
            lr >= 0 && lr < R && lc >= 0 && lc < C ? target[lr][lc] : " ";

          const plr = r - prevROff;
          const plc = c - prevCOff;
          const prevGlyph =
            prev && plr >= 0 && plr < prevR && plc >= 0 && plc < prevC
              ? prev[plr][plc]
              : " ";

          const wasFilled = prevGlyph !== " ";
          const willFill = targetGlyph !== " ";

          let rampSeq: ReadonlyArray<string>;
          if (!wasFilled && willFill) rampSeq = GROW;
          else if (wasFilled && !willFill) rampSeq = DECAY;
          else if (willFill) rampSeq = FILLED_FLICKER;
          else rampSeq = EMPTY_FLICKER;

          const stagger = Math.random() * STAGGER_MAX;
          const stepDur = (TRANSITION_MS - stagger) / stages;

          // Step through transition glyphs, then snap to the actual target glyph
          // (which may be a ramp glyph like '%' that isn't in the transition vocab).
          rampSeq.forEach((g, i) => {
            const id = window.setTimeout(() => {
              if (myToken !== tokenRef.current) return;
              paintTransitionCell(r, c, g);
            }, stagger + i * stepDur);
            timeoutsRef.current.push(id);
          });
          const finalId = window.setTimeout(() => {
            if (myToken !== tokenRef.current) return;
            paintCell(r, c, targetGlyph);
          }, stagger + stages * stepDur);
          timeoutsRef.current.push(finalId);
        }
      }

      lastGridRef.current = target;
    },
    [paintCell, paintTransitionCell],
  );

  // When set, the next paintField call (driven by the React re-render that
  // results from a Randomize/Prev/Next state update) is suppressed — the ramp
  // transition is already painting the same target.
  const suppressNextPaintRef = useRef(false);

  const applyState = useCallback((s: State) => {
    setWaves(s.ws.map((w) => [...w] as Wave));
    setThreshold(s.thresh);
    setRows(s.R);
    setCols(s.C);
    setWarp(s.warp);
    setRamp(s.ramp);
  }, []);

  // Kick off a ramp transition to the given state. We start the imperative
  // ramp now and queue the React state update so sliders end up reflecting the
  // new values. The next slider-driven paint is suppressed because the ramp is
  // about to paint the same target.
  const transitionToState = useCallback(
    (s: State) => {
      const target = generate(s.ws, s.thresh, s.R, s.C, s.warp, s.ramp);
      transitionToField(target);
      suppressNextPaintRef.current = true;
      applyState(s);
    },
    [applyState, transitionToField],
  );

  const pushHistory = useCallback((s: State) => {
    const trimmed = historyRef.current.slice(0, historyIdxRef.current + 1);
    trimmed.push({ ...s, ws: s.ws.map((w) => [...w] as Wave) });
    if (trimmed.length > HISTORY_MAX) trimmed.shift();
    historyRef.current = trimmed;
    historyIdxRef.current = trimmed.length - 1;
  }, []);

  const randomize = () => {
    const newSeed = randSeed();
    const r = randomFromSeed(newSeed);
    const next: State = {
      seed: newSeed,
      ws: r.ws,
      thresh: r.thresh,
      R: rows,
      C: cols,
      warp: r.warp,
      ramp,
    };
    pushHistory(next);
    transitionToState(next);
  };

  const goPrev = () => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current -= 1;
    transitionToState(historyRef.current[historyIdxRef.current]);
  };

  const goNext = () => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current += 1;
    transitionToState(historyRef.current[historyIdxRef.current]);
  };

  // Slider effect: paint the field instantly whenever `ascii` changes, EXCEPT
  // when the change came from transitionToState — in that case, the ramp is
  // running and will paint the final frame itself.
  useEffect(() => {
    if (suppressNextPaintRef.current) {
      suppressNextPaintRef.current = false;
      return;
    }
    paintField(ascii);
  }, [ascii, paintField]);

  // Cleanup pending step timeouts on unmount.
  useEffect(
    () => () => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  const handleWaveChange = (waveIdx: number, paramIdx: 0 | 1 | 2, value: number) => {
    setWaves((prev) => {
      const next = prev.map((w) => [...w] as Wave);
      next[waveIdx][paramIdx] = value;
      return next;
    });
  };

  const copy = () => {
    const text = ascii.map((row) => row.join("").trimEnd()).join("\n");
    const finish = (ok: boolean) => {
      setCopyState(ok ? "ok" : "error");
      window.setTimeout(() => setCopyState("idle"), 1800);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => finish(true)).catch(() => fallback());
    } else {
      fallback();
    }
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:-9999px;opacity:0;";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        finish(document.execCommand("copy"));
      } catch {
        finish(false);
      }
      document.body.removeChild(ta);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  usePingPong(playingDensity, setThreshold, 0.05, 0.4, 0.18);
  usePingPong(playingWarp, setWarp, 0, 3, 0.6);

  const copyLabel = copyState === "ok" ? "Copied ✓" : copyState === "error" ? "Error" : "Copy";

  return (
    <div className="ascii-pg flex h-full min-h-0 flex-col font-mono text-foreground">
      <div className="flex items-center border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold tracking-wide text-foreground">ASCII Playground</h2>
      </div>

      <div className="flex flex-1 min-h-0 items-center justify-center overflow-hidden px-4 pt-6">
        <div
          className="text-left font-mono text-xs leading-[1.3] tracking-[0.12em] text-[#F80800] sm:text-sm"
          style={{ whiteSpace: "pre" }}
        >
          {/* Fixed ROWS_MAX × COLS_MAX cell grid. Field is centered into it; the
              surround stays blank. Fixed dimensions keep the layout from
              reflowing when the user adjusts rows/cols. */}
          {Array.from({ length: ROWS_MAX }, (_, r) => (
            <div key={r} style={{ display: "block" }}>
              {Array.from({ length: COLS_MAX }, (_, c) => (
                <span
                  key={c}
                  ref={(el) => {
                    if (!cellsRef.current[r]) cellsRef.current[r] = [];
                    cellsRef.current[r][c] = el;
                  }}
                  style={{
                    display: "inline-block",
                    width: "1ch",
                    textAlign: "center",
                    opacity: 0,
                    transition: "opacity 0.18s ease",
                  }}
                >
                  {" "}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {waves.map((w, i) => (
            <div key={i} className="rounded-sm border border-border bg-card/60 px-2.5 py-2">
              <div className="mb-2 text-[9px] uppercase tracking-[0.06em] text-muted-foreground">Wave {i + 1}</div>
              {WAVE_PARAMS.map((p) => (
                <div key={p.label} className="mb-1.5 flex items-center gap-2 last:mb-0">
                  <span className="w-[46px] flex-shrink-0 text-[9px] uppercase tracking-[0.06em] text-muted-foreground">
                    {p.label}
                  </span>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={w[p.key]}
                    onChange={(e) => handleWaveChange(i, p.key, parseFloat(e.target.value))}
                    className="ascii-pg-range flex-1"
                  />
                  <span className="w-[30px] flex-shrink-0 text-right text-[9px] text-muted-foreground">
                    {w[p.key].toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="w-14 flex-shrink-0 text-[9px] uppercase tracking-[0.06em] text-muted-foreground">density</span>
          <button
            onClick={() => setPlayingDensity((v) => !v)}
            aria-label={playingDensity ? "Pause density animation" : "Play density animation"}
            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm border transition-colors ${
              playingDensity
                ? "border-[#F80800] text-[#F80800]"
                : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
            }`}
          >
            {playingDensity ? <Pause size={9} fill="currentColor" /> : <Play size={9} fill="currentColor" />}
          </button>
          <input
            type="range"
            min={5}
            max={45}
            step={1}
            value={Math.round(threshold * 100)}
            onChange={(e) => setThreshold(parseInt(e.target.value, 10) / 100)}
            className="ascii-pg-range flex-1"
          />
          <span className="w-[30px] flex-shrink-0 text-right text-[9px] text-muted-foreground">
            {threshold.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-14 flex-shrink-0 text-[9px] uppercase tracking-[0.06em] text-muted-foreground">warp</span>
          <button
            onClick={() => setPlayingWarp((v) => !v)}
            aria-label={playingWarp ? "Pause warp animation" : "Play warp animation"}
            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-sm border transition-colors ${
              playingWarp
                ? "border-[#F80800] text-[#F80800]"
                : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
            }`}
          >
            {playingWarp ? <Pause size={9} fill="currentColor" /> : <Play size={9} fill="currentColor" />}
          </button>
          <input
            type="range"
            min={0}
            max={3}
            step={0.05}
            value={warp}
            onChange={(e) => setWarp(parseFloat(e.target.value))}
            className="ascii-pg-range flex-1"
          />
          <span className="w-[30px] flex-shrink-0 text-right text-[9px] text-muted-foreground">
            {warp.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-14 flex-shrink-0 text-[9px] uppercase tracking-[0.06em] text-muted-foreground">rows</span>
          <input
            type="range"
            min={7}
            max={ROWS_MAX}
            step={2}
            value={rows}
            onChange={(e) => setRows(parseInt(e.target.value, 10))}
            className="ascii-pg-range flex-1"
          />
          <span className="w-[30px] flex-shrink-0 text-right text-[9px] text-muted-foreground">{rows}</span>
          <span className="w-14 flex-shrink-0 text-right text-[9px] uppercase tracking-[0.06em] text-muted-foreground">
            cols
          </span>
          <input
            type="range"
            min={21}
            max={61}
            step={2}
            value={cols}
            onChange={(e) => setCols(parseInt(e.target.value, 10))}
            className="ascii-pg-range flex-1"
          />
          <span className="w-[30px] flex-shrink-0 text-right text-[9px] text-muted-foreground">{cols}</span>
          <button
            onClick={() => setRamp((v) => !v)}
            className={`ml-2 rounded-sm border px-2 py-0.5 text-[9px] uppercase tracking-[0.06em] transition-colors ${
              ramp
                ? "border-[#F80800] text-[#F80800]"
                : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
            }`}
          >
            Ramp
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-4">
        <div className="justify-self-start">
          <button
            onClick={goPrev}
            className="rounded-sm border border-border bg-transparent px-3.5 py-1.5 text-[10px] uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
          >
            ← Prev
          </button>
        </div>
        <div className="flex items-center gap-2 justify-self-center">
          <button
            onClick={randomize}
            className="rounded-sm border border-[#F80800] bg-transparent px-3.5 py-1.5 text-[10px] uppercase tracking-[0.06em] text-[#F80800] transition-colors hover:bg-[#F80800] hover:text-background"
          >
            Randomize
          </button>
          <button
            onClick={copy}
            className={`rounded-sm border px-3.5 py-1.5 text-[10px] uppercase tracking-[0.06em] transition-colors ${
              copyState === "ok"
                ? "border-[#F80800] text-[#F80800]"
                : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
            }`}
          >
            {copyLabel}
          </button>
        </div>
        <div className="justify-self-end">
          <button
            onClick={goNext}
            className="rounded-sm border border-border bg-transparent px-3.5 py-1.5 text-[10px] uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
          >
            Next →
          </button>
        </div>
      </div>

      <style>{`
        .ascii-pg-range {
          -webkit-appearance: none;
          appearance: none;
          height: 1px;
          background: hsl(var(--border));
          outline: none;
          cursor: pointer;
        }
        .ascii-pg-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: hsl(var(--foreground));
          cursor: pointer;
          transition: background 0.12s;
        }
        .ascii-pg-range::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border: none;
          border-radius: 50%;
          background: hsl(var(--foreground));
          cursor: pointer;
          transition: background 0.12s;
        }
        .ascii-pg-range:hover::-webkit-slider-thumb { background: #F80800; }
        .ascii-pg-range:hover::-moz-range-thumb { background: #F80800; }
      `}</style>
    </div>
  );
};

export default AsciiPlayground;
