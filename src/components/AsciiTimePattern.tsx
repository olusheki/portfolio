import { useCallback, useEffect, useRef } from "react";

const ROWS = 9;
const COLS = 24;
const HALF = COLS >> 1;
const HAS_CENTER = COLS % 2 === 1;
const RED = "#F80800";

const TRANSITION_MS = 700;
const STAGGER_MAX = 220;

const NBSP = " ";

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

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generate(seed: number, density: number): boolean[][] {
  const rng = mulberry32(seed);
  const grid: boolean[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row = new Array<boolean>(COLS).fill(false);
    // Seed the left half. Mirror axis sits at index HALF - for odd COLS the
    // center column sits ON the axis (and is seeded at half density); for even
    // COLS the axis is between cols HALF-1 and HALF, no center column.
    for (let c = 0; c < HALF; c++) row[c] = rng() < density;
    if (HAS_CENTER) row[HALF] = rng() < density * 0.5;
    // Mirror the left half (and center if present) into the right half.
    for (let c = HAS_CENTER ? HALF + 1 : HALF; c < COLS; c++) {
      row[c] = row[COLS - 1 - c];
    }
    grid.push(row);
  }
  return grid;
}

interface AsciiTimePatternProps {
  density?: number;
}

const randomSeed = () => (Math.random() * 0xffffffff) >>> 0;

const AsciiTimePattern = ({ density = 0.3 }: AsciiTimePatternProps) => {
  const cellsRef = useRef<(HTMLSpanElement | null)[][]>([]);
  const gridRef = useRef<boolean[][] | null>(null);
  const tokenRef = useRef<number>(0);
  const timeoutsRef = useRef<number[]>([]);

  const applyCell = useCallback((r: number, c: number, glyph: string) => {
    const cell = cellsRef.current[r]?.[c];
    if (!cell) return;
    cell.textContent = glyph === " " ? NBSP : glyph;
    cell.style.opacity = String(OPACITY_FOR_GLYPH[glyph] ?? 0);
  }, []);

  const renderImmediate = useCallback(
    (grid: boolean[][]) => {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          applyCell(r, c, grid[r][c] ? "*" : " ");
        }
      }
      gridRef.current = grid;
    },
    [applyCell],
  );

  const transitionTo = useCallback(
    (target: boolean[][]) => {
      const myToken = ++tokenRef.current;
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutsRef.current = [];

      const stages = GROW.length;
      const prev = gridRef.current;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const wasFilled = prev ? prev[r][c] : false;
          const willFill = target[r][c];

          let ramp: ReadonlyArray<string>;
          if (!wasFilled && willFill) ramp = GROW;
          else if (wasFilled && !willFill) ramp = DECAY;
          else if (willFill) ramp = FILLED_FLICKER;
          else ramp = EMPTY_FLICKER;

          const stagger = Math.random() * STAGGER_MAX;
          const stepDur = (TRANSITION_MS - stagger) / stages;

          ramp.forEach((g, i) => {
            const id = window.setTimeout(() => {
              if (myToken !== tokenRef.current) return;
              applyCell(r, c, g);
            }, stagger + i * stepDur);
            timeoutsRef.current.push(id);
          });
        }
      }
      gridRef.current = target;
    },
    [applyCell],
  );

  useEffect(() => {
    renderImmediate(generate(randomSeed(), density));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advance = useCallback(() => {
    transitionTo(generate(randomSeed(), density));
  }, [transitionTo, density]);

  useEffect(() => {
    let timeoutId: number;
    const schedule = () => {
      const now = new Date();
      const ms = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      timeoutId = window.setTimeout(() => {
        transitionTo(generate(randomSeed(), density));
        schedule();
      }, ms);
    };
    schedule();
    return () => window.clearTimeout(timeoutId);
  }, [transitionTo, density]);

  useEffect(
    () => () => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  return (
    <div
      onClick={advance}
      aria-label="Time-coded ASCII pattern. Click to advance."
      className="font-mono cursor-pointer select-none"
      style={{ color: RED, fontSize: "13px", lineHeight: 1.15 }}
    >
      {Array.from({ length: ROWS }, (_, r) => (
        <div
          key={r}
          style={{ display: "block", letterSpacing: "3px", whiteSpace: "pre" }}
        >
          {Array.from({ length: COLS }, (_, c) => (
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
              {NBSP}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

export default AsciiTimePattern;
