import { useState, useCallback, useEffect } from "react";
import { Bomb, Flag, Smile, Frown, PartyPopper } from "lucide-react";

type Difficulty = "small" | "medium" | "hard";

const CONFIGS: Record<Difficulty, { rows: number; cols: number; mines: number }> = {
  small: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
};

type CellState = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
};

type GameStatus = "playing" | "won" | "lost";

const createBoard = (rows: number, cols: number, mines: number, firstR?: number, firstC?: number): CellState[][] => {
  const board: CellState[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
  );

  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (board[r][c].mine) continue;
    if (firstR !== undefined && Math.abs(r - firstR) <= 1 && Math.abs(c - (firstC ?? 0)) <= 1) continue;
    board[r][c].mine = true;
    placed++;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count++;
        }
      board[r][c].adjacent = count;
    }
  }
  return board;
};

const ADJACENT_COLORS: Record<number, string> = {
  1: "text-blue-500",
  2: "text-green-600",
  3: "text-red-500",
  4: "text-purple-600",
  5: "text-orange-600",
  6: "text-teal-500",
  7: "text-gray-700",
  8: "text-gray-500",
};

const Minesweeper = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>("small");
  const { rows, cols, mines } = CONFIGS[difficulty];
  const [board, setBoard] = useState<CellState[][] | null>(null);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [flagCount, setFlagCount] = useState(0);

  const reset = useCallback(() => {
    setBoard(null);
    setStatus("playing");
    setFlagCount(0);
  }, []);

  useEffect(() => {
    reset();
  }, [difficulty, reset]);

  const reveal = (b: CellState[][], r: number, c: number) => {
    if (r < 0 || r >= b.length || c < 0 || c >= b[0].length) return;
    if (b[r][c].revealed || b[r][c].flagged) return;
    b[r][c].revealed = true;
    if (b[r][c].adjacent === 0 && !b[r][c].mine) {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) reveal(b, r + dr, c + dc);
    }
  };

  const checkWin = (b: CellState[][]): boolean => {
    for (const row of b)
      for (const cell of row)
        if (!cell.mine && !cell.revealed) return false;
    return true;
  };

  const handleClick = (r: number, c: number) => {
    if (status !== "playing") return;
    let b = board;
    if (!b) {
      b = createBoard(rows, cols, mines, r, c);
    } else {
      b = b.map((row) => row.map((cell) => ({ ...cell })));
    }
    const cell = b[r][c];
    if (cell.flagged) return;

    // Chording: click on revealed numbered cell
    if (cell.revealed) {
      if (cell.adjacent === 0) return;
      let surroundingFlags = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < b.length && nc >= 0 && nc < b[0].length && b[nr][nc].flagged) surroundingFlags++;
        }
      if (surroundingFlags !== cell.adjacent) return;
      let hitMine = false;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < b.length && nc >= 0 && nc < b[0].length && !b[nr][nc].flagged && !b[nr][nc].revealed) {
            if (b[nr][nc].mine) hitMine = true;
            reveal(b, nr, nc);
          }
        }
      if (hitMine) {
        for (const row of b) for (const c of row) if (c.mine) c.revealed = true;
        setBoard(b);
        setStatus("lost");
        return;
      }
      setBoard(b);
      if (checkWin(b)) setStatus("won");
      return;
    }
    
    if (cell.mine) {
      for (const row of b) for (const c of row) if (c.mine) c.revealed = true;
      setBoard(b);
      setStatus("lost");
      return;
    }

    reveal(b, r, c);
    setBoard(b);
    if (checkWin(b)) setStatus("won");
  };

  const handleRightClick = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (status !== "playing") return;
    if (!board) return;
    const cell = board[r][c];
    if (cell.revealed) return;
    const b = board.map((row) => row.map((cell) => ({ ...cell })));
    b[r][c].flagged = !b[r][c].flagged;
    setBoard(b);
    setFlagCount((prev) => prev + (b[r][c].flagged ? 1 : -1));
  };

  const displayBoard = board ?? Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): CellState => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
  );

  const isHard = difficulty === "hard";
  const cellSize = isHard ? "w-5 h-5 text-[10px]" : "w-6 h-6 text-xs";
  const iconSize = isHard ? 10 : 12;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Difficulty selector */}
      <div className="flex gap-1">
        {(["small", "medium", "hard"] as Difficulty[]).map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`px-3 py-1 text-xs rounded-sm border transition-colors capitalize ${
              difficulty === d
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-between w-full text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1">
          <Bomb size={12} /> {mines - flagCount}
        </span>
        <button onClick={reset} className="flex items-center gap-1 hover:text-foreground transition-colors">
          {status === "lost" ? <Frown size={14} /> : status === "won" ? <PartyPopper size={14} /> : <Smile size={14} />}
          New Game
        </button>
      </div>

      {/* Board */}
      <div
        className="inline-grid border border-border select-none"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {displayBoard.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              className={`${cellSize} border border-border/40 flex items-center justify-center font-bold leading-none transition-colors ${
                cell.revealed
                  ? cell.mine
                    ? "bg-destructive/15"
                    : "bg-background/60"
                  : "bg-muted-foreground/10 hover:bg-muted-foreground/18 cursor-pointer"
              }`}
              onClick={() => handleClick(r, c)}
              onContextMenu={(e) => handleRightClick(e, r, c)}
            >
              {cell.revealed
                ? cell.mine
                  ? <Bomb size={iconSize} className="text-destructive" />
                  : cell.adjacent > 0
                    ? <span className={ADJACENT_COLORS[cell.adjacent]}>{cell.adjacent}</span>
                    : ""
                : cell.flagged
                  ? <Flag size={iconSize} className="text-foreground" />
                  : ""}
            </button>
          ))
        )}
      </div>

    </div>
  );
};

export default Minesweeper;
