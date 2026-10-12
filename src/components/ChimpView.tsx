import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Grid, RotateCcw, Play, Award, Sparkles } from 'lucide-react';
import { sound } from '../utils/audio';
import { recordChimpScore } from '../utils/storage';

interface ChimpViewProps {
  onBack: () => void;
  personalBest: number;
  onScoreUpdated: () => void;
}

interface Tile {
  id: number;
  number: number | null; // null if empty cell
  isRevealed: boolean;   // true if showing number, false if covered
  isCompleted: boolean;  // true if already tapped correctly
  isFailed: boolean;     // true if incorrectly tapped
}

export const ChimpView: React.FC<ChimpViewProps> = ({ onBack, personalBest, onScoreUpdated }) => {
  const [level, setLevel] = useState<number>(4); // Number of tiles to remember (starts at 4)
  const [grid, setGrid] = useState<Tile[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasStartedTapping, setHasStartedTapping] = useState<boolean>(false);
  const [nextExpectedNumber, setNextExpectedNumber] = useState<number>(1);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  const gridSize = 16; // 4x4 grid = 16 positions

  const generateBoard = useCallback((tileCount: number) => {
    // Generate empty 16 cells
    const cells: Tile[] = Array.from({ length: gridSize }, (_, i) => ({
      id: i,
      number: null,
      isRevealed: true,
      isCompleted: false,
      isFailed: false,
    }));

    // Choose random positions
    const positions = Array.from({ length: gridSize }, (_, i) => i)
      .sort(() => Math.random() - 0.5)
      .slice(0, tileCount);

    positions.forEach((pos, idx) => {
      cells[pos].number = idx + 1;
    });

    setGrid(cells);
    setNextExpectedNumber(1);
    setHasStartedTapping(false);
  }, []);

  const startGame = useCallback(() => {
    sound.playTap();
    setIsPlaying(true);
    setGameOver(false);
    setIsNewRecord(false);
    setLevel(4);
    generateBoard(4);
  }, [generateBoard]);

  const handleTileTap = useCallback((tile: Tile) => {
    if (!isPlaying || tile.number === null || tile.isCompleted || gameOver) return;

    if (tile.number === nextExpectedNumber) {
      // Correct tile tapped!
      sound.playChimpTile(tile.number);

      const updatedGrid = grid.map((t) => {
        if (t.id === tile.id) {
          return { ...t, isCompleted: true, isRevealed: true };
        }
        // If this was the first tap (number 1), conceal all other tiles into blanks!
        if (nextExpectedNumber === 1 && t.number !== null) {
          return { ...t, isRevealed: false };
        }
        return t;
      });

      setGrid(updatedGrid);
      setHasStartedTapping(true);

      if (nextExpectedNumber === level) {
        // Round cleared!
        sound.playLevelUp();
        const nextLevel = level + 1;
        setLevel(nextLevel);

        const { isNewBest } = recordChimpScore(level);
        if (isNewBest) setIsNewRecord(true);
        onScoreUpdated();

        // Brief delay before next board
        window.setTimeout(() => {
          generateBoard(nextLevel);
        }, 600);
      } else {
        setNextExpectedNumber(nextExpectedNumber + 1);
      }
    } else {
      // Wrong tile tapped!
      sound.playWrong();
      setGameOver(true);
      setIsPlaying(false);

      // Reveal all tiles to show mistake
      const revealedGrid = grid.map((t) => {
        if (t.id === tile.id) {
          return { ...t, isRevealed: true, isFailed: true };
        }
        return { ...t, isRevealed: true };
      });
      setGrid(revealedGrid);

      const { isNewBest } = recordChimpScore(level - 1);
      if (isNewBest) setIsNewRecord(true);
      onScoreUpdated();
    }
  }, [isPlaying, gameOver, nextExpectedNumber, grid, level, onScoreUpdated, generateBoard]);

  return (
    <div className="w-full flex-1 flex flex-col justify-between max-w-md mx-auto py-2">
      {/* Top Header */}
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={onBack}
          className="px-3.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>

        <div className="text-center">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
            {isPlaying
              ? hasStartedTapping
                ? `Next: ${nextExpectedNumber}`
                : 'Memorize positions, tap 1 to start'
              : 'Working Memory'}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Best</span>
          <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
            {personalBest} Tiles
          </span>
        </div>
      </div>

      {/* Info strip */}
      <div className="flex justify-between items-center bg-slate-900/70 border border-slate-800 rounded-xl px-4 py-2 my-1">
        <div className="flex items-center gap-2">
          <Grid className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-300">Chimp Memory Grid</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Target</span>
          <span className="text-sm font-mono font-bold text-white tabular-nums">{level} Tiles</span>
        </div>
      </div>

      {/* 4x4 Grid Matrix */}
      <div className="w-full aspect-square my-auto p-3 bg-slate-900/80 border border-slate-800 rounded-3xl grid grid-cols-4 gap-2.5 shadow-2xl">
        {grid.length === 0
          ? Array.from({ length: 16 }, (_, i) => (
              <div key={i} className="rounded-xl border border-slate-800/60 bg-slate-900/40 flex items-center justify-center text-slate-700 text-xs font-mono">
                ·
              </div>
            ))
          : grid.map((tile) => {
              const hasNum = tile.number !== null;
              return (
                <button
                  key={tile.id}
                  disabled={!isPlaying || !hasNum || tile.isCompleted}
                  onClick={() => handleTileTap(tile)}
                  className={`rounded-2xl border-2 font-mono text-xl font-bold transition-all flex items-center justify-center select-none ${
                    !hasNum
                      ? 'border-transparent bg-slate-900/20 cursor-default'
                      : tile.isCompleted
                      ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400/40 cursor-default opacity-40'
                      : tile.isFailed
                      ? 'border-rose-500 bg-rose-950/60 text-white animate-bounce'
                      : tile.isRevealed
                      ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 hover:border-amber-400 active:scale-95 shadow-md cursor-pointer'
                      : 'border-slate-600 bg-slate-800 hover:bg-slate-700 hover:border-slate-500 text-transparent active:scale-95 shadow-md cursor-pointer'
                  }`}
                >
                  {hasNum && tile.isRevealed ? tile.number : hasNum ? '?' : ''}
                </button>
              );
            })}
      </div>

      {/* Status / Call to Action */}
      <div className="my-2">
        {!isPlaying && !gameOver && (
          <button
            onClick={startGame}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl shadow-lg shadow-amber-500/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START CHIMP TEST</span>
          </button>
        )}

        {isPlaying && (
          <div className="w-full py-3 bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-semibold rounded-2xl text-center">
            {!hasStartedTapping
              ? 'Study the positions, then click tile 1'
              : `Tap the hidden tiles in ascending order (${nextExpectedNumber} to ${level})`}
          </div>
        )}

        {gameOver && (
          <div className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-4 text-center">
            <h4 className="text-base font-bold text-rose-400">Memory Limit Reached</h4>
            <p className="text-xs text-slate-300 mt-1">
              You cleared <strong className="text-white font-mono">{level - 1} tiles</strong> from working memory.
            </p>
            {isNewRecord && (
              <p className="text-xs text-amber-400 font-bold mt-1">
                🏆 New Chimp Test Record!
              </p>
            )}
            <button
              onClick={startGame}
              className="mt-3 w-full py-3 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Info footer */}
      <p className="text-center text-[11px] text-slate-500">
        Based on the Kyoto University spatial working memory benchmark.
      </p>
    </div>
  );
};
