import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Brain, RotateCcw, Play, Volume2 } from 'lucide-react';
import { sound } from '../utils/audio';
import { recordMemoryScore } from '../utils/storage';

interface MemoryViewProps {
  onBack: () => void;
  personalBest: number;
  onScoreUpdated: () => void;
}

type MemoryPhase = 'IDLE' | 'WATCHING' | 'PLAYING' | 'GAME_OVER';

const PADS = [
  {
    id: 0,
    name: 'Cyan',
    baseBg: 'bg-cyan-500/15',
    activeBg: 'bg-cyan-400',
    border: 'border-cyan-500/40',
    activeGlow: 'shadow-[0_0_30px_rgba(6,182,212,0.7)]',
    text: 'text-cyan-400',
    activeText: 'text-black',
    key: '1',
  },
  {
    id: 1,
    name: 'Purple',
    baseBg: 'bg-purple-500/15',
    activeBg: 'bg-purple-400',
    border: 'border-purple-500/40',
    activeGlow: 'shadow-[0_0_30px_rgba(168,85,247,0.7)]',
    text: 'text-purple-400',
    activeText: 'text-black',
    key: '2',
  },
  {
    id: 2,
    name: 'Emerald',
    baseBg: 'bg-emerald-500/15',
    activeBg: 'bg-emerald-400',
    border: 'border-emerald-500/40',
    activeGlow: 'shadow-[0_0_30px_rgba(16,185,129,0.7)]',
    text: 'text-emerald-400',
    activeText: 'text-black',
    key: '3',
  },
  {
    id: 3,
    name: 'Amber',
    baseBg: 'bg-amber-500/15',
    activeBg: 'bg-amber-400',
    border: 'border-amber-500/40',
    activeGlow: 'shadow-[0_0_30px_rgba(245,158,11,0.7)]',
    text: 'text-amber-400',
    activeText: 'text-black',
    key: '4',
  },
];

export const MemoryView: React.FC<MemoryViewProps> = ({ onBack, personalBest, onScoreUpdated }) => {
  const [phase, setPhase] = useState<MemoryPhase>('IDLE');
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerIndex, setPlayerIndex] = useState<number>(0);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [level, setLevel] = useState<number>(1);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);

  const playbackTimeoutRef = useRef<number[]>([]);

  const clearPlaybackTimeouts = () => {
    playbackTimeoutRef.current.forEach((t) => window.clearTimeout(t));
    playbackTimeoutRef.current = [];
  };

  useEffect(() => {
    return () => clearPlaybackTimeouts();
  }, []);

  const playSequence = useCallback((seq: number[]) => {
    setPhase('WATCHING');
    setPlayerIndex(0);
    clearPlaybackTimeouts();

    // Speed up gradually as level increases
    const stepDuration = Math.max(220, 500 - (seq.length - 1) * 25);
    const pauseDuration = Math.max(90, 180 - (seq.length - 1) * 10);

    seq.forEach((padIndex, i) => {
      const startTimer = window.setTimeout(() => {
        setActivePad(padIndex);
        sound.playSimonPad(padIndex);
      }, i * (stepDuration + pauseDuration) + 300);

      const stopTimer = window.setTimeout(() => {
        setActivePad(null);
      }, i * (stepDuration + pauseDuration) + 300 + stepDuration);

      playbackTimeoutRef.current.push(startTimer, stopTimer);
    });

    // When sequence playback finishes, give player turn
    const finishTimer = window.setTimeout(() => {
      setPhase('PLAYING');
    }, seq.length * (stepDuration + pauseDuration) + 350);

    playbackTimeoutRef.current.push(finishTimer);
  }, []);

  const startNewGame = useCallback(() => {
    clearPlaybackTimeouts();
    sound.playTap();
    setLevel(1);
    setIsNewRecord(false);
    const initial = [Math.floor(Math.random() * 4)];
    setSequence(initial);
    playSequence(initial);
  }, [playSequence]);

  const handlePadPress = useCallback((padId: number) => {
    if (phase !== 'PLAYING') return;

    // Flash the tapped pad
    setActivePad(padId);
    sound.playSimonPad(padId);
    window.setTimeout(() => setActivePad(null), 160);

    // Validate with sequence
    if (padId === sequence[playerIndex]) {
      const nextIndex = playerIndex + 1;
      setPlayerIndex(nextIndex);

      if (nextIndex === sequence.length) {
        // Level cleared!
        const newLevel = level + 1;
        setLevel(newLevel);
        const { isNewBest } = recordMemoryScore(level);
        if (isNewBest) setIsNewRecord(true);
        onScoreUpdated();

        sound.playLevelUp();
        setPhase('WATCHING');

        // Add next random item to sequence
        const nextSequence = [...sequence, Math.floor(Math.random() * 4)];
        setSequence(nextSequence);

        const timer = window.setTimeout(() => {
          playSequence(nextSequence);
        }, 900);
        playbackTimeoutRef.current.push(timer);
      }
    } else {
      // Wrong pad tapped!
      sound.playWrong();
      setShake(true);
      window.setTimeout(() => setShake(false), 500);

      const { isNewBest } = recordMemoryScore(level - 1);
      if (isNewBest) setIsNewRecord(true);
      onScoreUpdated();

      setPhase('GAME_OVER');
    }
  }, [phase, sequence, playerIndex, level, onScoreUpdated, playSequence]);

  // Keyboard shortcuts (1, 2, 3, 4 or Q, W, A, S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        onBack();
        return;
      }
      if (phase === 'IDLE' || phase === 'GAME_OVER') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          startNewGame();
        }
        return;
      }
      if (phase === 'PLAYING') {
        if (e.key === '1' || e.key.toLowerCase() === 'q') handlePadPress(0);
        else if (e.key === '2' || e.key.toLowerCase() === 'w') handlePadPress(1);
        else if (e.key === '3' || e.key.toLowerCase() === 'a') handlePadPress(2);
        else if (e.key === '4' || e.key.toLowerCase() === 's') handlePadPress(3);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handlePadPress, startNewGame, onBack]);

  return (
    <div className="w-full flex-1 flex flex-col justify-between max-w-md mx-auto py-2">
      {/* Top Bar Header */}
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={onBack}
          className="px-3.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>

        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider block">
            {phase === 'IDLE' && <span className="text-purple-400">Memory Match</span>}
            {phase === 'WATCHING' && <span className="text-amber-400 animate-pulse">Watch Pattern...</span>}
            {phase === 'PLAYING' && <span className="text-emerald-400">Your Turn! ({playerIndex + 1}/{sequence.length})</span>}
            {phase === 'GAME_OVER' && <span className="text-rose-400">Game Over</span>}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Best</span>
          <span className="text-xs font-mono font-bold text-purple-400 tabular-nums">
            Level {personalBest}
          </span>
        </div>
      </div>

      {/* Level Indicator Pill */}
      <div className="flex justify-between items-center bg-slate-900/70 border border-slate-800 rounded-xl px-4 py-2 my-1">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-slate-300">Sequence Pattern</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Level</span>
          <span className="text-sm font-mono font-bold text-white tabular-nums">{level}</span>
        </div>
      </div>

      {/* 2x2 Simon Pad Grid */}
      <div className={`w-full aspect-square my-auto p-3.5 bg-slate-900/80 border border-slate-800 rounded-3xl grid grid-cols-2 gap-3.5 shadow-2xl transition-transform ${shake ? 'translate-x-2' : ''}`}>
        {PADS.map((pad) => {
          const isLit = activePad === pad.id;
          return (
            <button
              key={pad.id}
              disabled={phase !== 'PLAYING'}
              onClick={() => handlePadPress(pad.id)}
              className={`rounded-2xl border-2 transition-all duration-100 flex flex-col items-center justify-center relative cursor-pointer active:scale-95 select-none ${
                isLit
                  ? `${pad.activeBg} ${pad.border} ${pad.activeGlow} scale-102`
                  : `${pad.baseBg} ${pad.border} hover:border-slate-600`
              } ${phase !== 'PLAYING' && !isLit ? 'opacity-70' : 'opacity-100'}`}
              style={{ minHeight: '120px' }}
            >
              <span className={`text-2xl font-mono font-black ${isLit ? pad.activeText : pad.text}`}>
                {pad.key}
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider mt-1 ${isLit ? pad.activeText : 'text-slate-400'}`}>
                {pad.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom CTA / Status Panel */}
      <div className="my-2">
        {phase === 'IDLE' && (
          <button
            onClick={startNewGame}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START PATTERN MATCH</span>
          </button>
        )}

        {phase === 'WATCHING' && (
          <div className="w-full py-3 bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-semibold rounded-2xl text-center">
            Memorize the flashing sequence order...
          </div>
        )}

        {phase === 'PLAYING' && (
          <div className="w-full py-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold rounded-2xl text-center flex items-center justify-center gap-2">
            <span>Repeat the {sequence.length} note sequence</span>
          </div>
        )}

        {phase === 'GAME_OVER' && (
          <div className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-4 text-center">
            <h4 className="text-base font-bold text-rose-400">Sequence Broken</h4>
            <p className="text-xs text-slate-300 mt-1">
              You reached <strong className="text-white font-mono">Level {level}</strong> ({sequence.length - 1} steps memorized).
            </p>
            {isNewRecord && (
              <p className="text-xs text-amber-400 font-bold mt-1">
                🏆 New Personal Memory Record!
              </p>
            )}
            <button
              onClick={startNewGame}
              className="mt-3 w-full py-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}
      </div>

      {/* Desktop Hint */}
      <div className="text-center text-[11px] text-slate-500">
        Keyboard: Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">1-4</kbd> or <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Q, W, A, S</kbd> to strike pads.
      </div>
    </div>
  );
};
