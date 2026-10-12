import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Zap,
  ArrowLeft,
  Trophy,
  AlertTriangle,
  Clock,
  Flame,
  ChevronRight,
  ShieldAlert,
  Layers,
  Sparkles,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { sound } from '../utils/audio';
import {
  recordReflexScore,
  recordReflexLevel,
  GameDifficulty,
} from '../utils/storage';
import { DifficultySelector } from './DifficultySelector';

interface ReflexViewProps {
  onBack: () => void;
  personalBestByDiff: Record<GameDifficulty, number | null>;
  levelPeak: number;
  onScoreUpdated: () => void;
}

type ReflexMode = 'ladder' | 'practice' | 'benchmark';
type ReflexState = 'IDLE' | 'WAITING' | 'EARLY' | 'READY' | 'DECOY' | 'TIMEOUT' | 'RESULT';

interface TrialResult {
  round: number;
  ms: number;
}

// Ladder Level Definitions with cumulative stacked modifiers
interface LadderLevelConfig {
  level: number;
  name: string;
  timeoutMs: number;
  minDelay: number;
  maxDelay: number;
  hasBait: boolean;
  hasDecoys: boolean;
  isCompactPad: boolean;
  newModifier: string;
  allModifiers: string[];
}

const LADDER_LEVELS: LadderLevelConfig[] = [
  {
    level: 1,
    name: 'Base Velocity',
    timeoutMs: 1500,
    minDelay: 1500,
    maxDelay: 3000,
    hasBait: false,
    hasDecoys: false,
    isCompactPad: false,
    newModifier: 'Standard reaction cue (1500ms cutoff)',
    allModifiers: ['1500ms Cutoff Window', 'Standard Green Cue'],
  },
  {
    level: 2,
    name: 'Window Compression',
    timeoutMs: 1250,
    minDelay: 1400,
    maxDelay: 3200,
    hasBait: false,
    hasDecoys: false,
    isCompactPad: false,
    newModifier: 'Cutoff compressed to 1250ms (-250ms limit)',
    allModifiers: ['1250ms Cutoff Window', 'Standard Green Cue'],
  },
  {
    level: 3,
    name: 'Suspense Jitter',
    timeoutMs: 1050,
    minDelay: 1000,
    maxDelay: 5000,
    hasBait: false,
    hasDecoys: false,
    isCompactPad: false,
    newModifier: 'Wait delay varies widely (1.0s–5.0s suspense)',
    allModifiers: ['1050ms Cutoff Window', 'Wide 1.0s–5.0s Suspense Jitter'],
  },
  {
    level: 4,
    name: 'Amber Bait Traps',
    timeoutMs: 900,
    minDelay: 1200,
    maxDelay: 5200,
    hasBait: true,
    hasDecoys: false,
    isCompactPad: false,
    newModifier: 'False amber blinks to test impulse restraint',
    allModifiers: [
      '900ms Cutoff Window',
      'Wide Suspense Jitter',
      'False Amber Bait Traps',
    ],
  },
  {
    level: 5,
    name: 'Chromatic Decoys',
    timeoutMs: 780,
    minDelay: 1200,
    maxDelay: 5200,
    hasBait: true,
    hasDecoys: true,
    isCompactPad: false,
    newModifier: 'Screen may flash Blue or Purple (Tap GREEN ONLY!)',
    allModifiers: [
      '780ms Cutoff Window',
      'Wide Suspense Jitter',
      'False Amber Bait Traps',
      'Chromatic Decoys (Tap GREEN Only!)',
    ],
  },
  {
    level: 6,
    name: 'Tactile Compression',
    timeoutMs: 650,
    minDelay: 1000,
    maxDelay: 5500,
    hasBait: true,
    hasDecoys: true,
    isCompactPad: true,
    newModifier: 'Reaction hitpad shrinks to a compact target',
    allModifiers: [
      '650ms Cutoff Window',
      'Wide Suspense Jitter',
      'False Amber Bait Traps',
      'Chromatic Decoys',
      'Compact Target Hitbox',
    ],
  },
  {
    level: 7,
    name: 'Double Deception',
    timeoutMs: 540,
    minDelay: 900,
    maxDelay: 6000,
    hasBait: true,
    hasDecoys: true,
    isCompactPad: true,
    newModifier: 'Cutoff compressed to 540ms + double bait flickers',
    allModifiers: [
      '540ms Cutoff Window',
      'Double Bait Flickers',
      'Chromatic Decoys',
      'Compact Hitbox',
    ],
  },
  {
    level: 8,
    name: 'Esports Threshold',
    timeoutMs: 440,
    minDelay: 800,
    maxDelay: 6500,
    hasBait: true,
    hasDecoys: true,
    isCompactPad: true,
    newModifier: 'Sub-440ms esports reflex required!',
    allModifiers: [
      '440ms Esports Cutoff',
      'Double Bait Flickers',
      'Chromatic Decoys',
      'Compact Hitbox',
    ],
  },
  {
    level: 9,
    name: 'Neural Overload',
    timeoutMs: 360,
    minDelay: 800,
    maxDelay: 7000,
    hasBait: true,
    hasDecoys: true,
    isCompactPad: true,
    newModifier: '360ms cutoff + high-frequency deception',
    allModifiers: [
      '360ms Cutoff Limit',
      'High Suspense (0.8s–7.0s)',
      'Aggressive Baits & Decoys',
      'Compact Hitbox',
    ],
  },
  {
    level: 10,
    name: 'Apex Cyber Grandmaster',
    timeoutMs: 290,
    minDelay: 700,
    maxDelay: 7500,
    hasBait: true,
    hasDecoys: true,
    isCompactPad: true,
    newModifier: 'Maximum difficulty: 290ms limit + all stacked hazards',
    allModifiers: [
      '290ms Apex Cutoff Limit',
      'Maximum Deception & Baits',
      'Chromatic Decoys',
      'Compact Hitbox',
      'Cyber Grandmaster Crown',
    ],
  },
];

const REFLEX_DIFF_CONFIG: Record<
  GameDifficulty,
  {
    minDelay: number;
    maxDelay: number;
    timeoutMs: number;
    baitFlashes: boolean;
    description: string;
  }
> = {
  easy: {
    minDelay: 1200,
    maxDelay: 2500,
    timeoutMs: 2200,
    baitFlashes: false,
    description: '1.2s–2.5s relaxed wait window · 2200ms timeout · No bait flickers',
  },
  medium: {
    minDelay: 1800,
    maxDelay: 4200,
    timeoutMs: 1400,
    baitFlashes: false,
    description: '1.8s–4.2s standard arcade delay · 1400ms timeout',
  },
  hard: {
    minDelay: 1200,
    maxDelay: 5500,
    timeoutMs: 650,
    baitFlashes: true,
    description: '1.2s–5.5s wide suspense · 650ms timeout · Beware deceptive bait flashes',
  },
  insane: {
    minDelay: 800,
    maxDelay: 7000,
    timeoutMs: 420,
    baitFlashes: true,
    description: '0.8s–7.0s extreme tension · Strict 420ms timeout · Rapid bait traps',
  },
};

export const ReflexView: React.FC<ReflexViewProps> = ({
  onBack,
  personalBestByDiff,
  levelPeak,
  onScoreUpdated,
}) => {
  const [subMode, setSubMode] = useState<ReflexMode>('ladder');
  const [difficulty, setDifficulty] = useState<GameDifficulty>('medium');

  // Ladder state
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [levelCleared, setLevelCleared] = useState<boolean>(false);

  // Pad & Stimulus state
  const [state, setState] = useState<ReflexState>('IDLE');
  const [decoyColor, setDecoyColor] = useState<'blue' | 'purple'>('blue');
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [rating, setRating] = useState<string>('');
  const [failReason, setFailReason] = useState<string>('');

  // Benchmark trials
  const [trials, setTrials] = useState<TrialResult[]>([]);
  const [benchmarkDone, setBenchmarkDone] = useState<boolean>(false);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [isBaitActive, setIsBaitActive] = useState<boolean>(false);

  const startTimeRef = useRef<number>(0);
  const waitTimerRef = useRef<number | null>(null);
  const timeoutTimerRef = useRef<number | null>(null);
  const baitTimerRef = useRef<number | null>(null);
  const decoyTimerRef = useRef<number | null>(null);

  const currentLevelConfig =
    LADDER_LEVELS[Math.min(currentLevel - 1, LADDER_LEVELS.length - 1)];

  const clearAllTimers = useCallback(() => {
    if (waitTimerRef.current !== null) {
      window.clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }
    if (timeoutTimerRef.current !== null) {
      window.clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (baitTimerRef.current !== null) {
      window.clearTimeout(baitTimerRef.current);
      baitTimerRef.current = null;
    }
    if (decoyTimerRef.current !== null) {
      window.clearTimeout(decoyTimerRef.current);
      decoyTimerRef.current = null;
    }
    setIsBaitActive(false);
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const getRating = (ms: number, diff: GameDifficulty) => {
    if (diff === 'insane') {
      if (ms < 160) return { label: 'Apex Cyber Reflex ⚡', color: 'text-cyan-400' };
      if (ms < 200) return { label: 'Grandmaster Reflex 🏆', color: 'text-purple-400' };
      if (ms < 250) return { label: 'Pro Esports Grade 🎯', color: 'text-emerald-400' };
      if (ms < 320) return { label: 'Agile Contender', color: 'text-amber-400' };
      return { label: 'Barely Survived', color: 'text-rose-400' };
    }
    if (diff === 'hard') {
      if (ms < 175) return { label: 'Godlike Reflexes ⚡', color: 'text-cyan-400' };
      if (ms < 215) return { label: 'Esports Tier 🏆', color: 'text-purple-400' };
      if (ms < 265) return { label: 'Lightning Fast 🎯', color: 'text-emerald-400' };
      if (ms < 330) return { label: 'Swift & Sharp', color: 'text-amber-400' };
      return { label: 'Average Reaction', color: 'text-slate-300' };
    }
    if (diff === 'easy') {
      if (ms < 220) return { label: 'Flawless ⚡', color: 'text-cyan-400' };
      if (ms < 270) return { label: 'Great Speed 🎯', color: 'text-emerald-400' };
      if (ms < 340) return { label: 'Swift', color: 'text-purple-400' };
      return { label: 'Standard Pace', color: 'text-slate-300' };
    }
    // medium default
    if (ms < 180) return { label: 'Godlike Reflexes', color: 'text-cyan-400' };
    if (ms < 220) return { label: 'Esports Grade', color: 'text-emerald-400' };
    if (ms < 260) return { label: 'Lightning Fast', color: 'text-purple-400' };
    if (ms < 310) return { label: 'Swift & Agile', color: 'text-amber-400' };
    if (ms < 380) return { label: 'Average Reaction', color: 'text-slate-300' };
    return { label: 'Sluggish (Try Again)', color: 'text-rose-400' };
  };

  const startWaiting = useCallback(() => {
    clearAllTimers();
    setState('WAITING');
    sound.playTap();

    let minDelay = 1800;
    let maxDelay = 4200;
    let timeoutCutoff = 1400;
    let allowBait = false;
    let allowDecoy = false;

    if (subMode === 'ladder') {
      minDelay = currentLevelConfig.minDelay;
      maxDelay = currentLevelConfig.maxDelay;
      timeoutCutoff = currentLevelConfig.timeoutMs;
      allowBait = currentLevelConfig.hasBait;
      allowDecoy = currentLevelConfig.hasDecoys;
    } else {
      const cfg = REFLEX_DIFF_CONFIG[difficulty];
      minDelay = cfg.minDelay;
      maxDelay = cfg.maxDelay;
      timeoutCutoff = cfg.timeoutMs;
      allowBait = cfg.baitFlashes;
    }

    const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;

    // Bait flicker
    if (allowBait && delay > 1800 && Math.random() < 0.65) {
      const baitTime = Math.floor(delay * 0.45);
      baitTimerRef.current = window.setTimeout(() => {
        setIsBaitActive(true);
        window.setTimeout(() => {
          setIsBaitActive(false);
        }, 110);
      }, baitTime);
    }

    // Schedule green or decoy stimulus
    waitTimerRef.current = window.setTimeout(() => {
      // If decoys allowed, 35% chance a decoy appears first!
      if (allowDecoy && Math.random() < 0.4) {
        const decoy = Math.random() < 0.5 ? 'blue' : 'purple';
        setDecoyColor(decoy);
        setState('DECOY');
        sound.playTick();

        // If player successfully ignores the decoy, return to waiting then pop true green
        decoyTimerRef.current = window.setTimeout(() => {
          setState('WAITING');
          const finalGreenDelay = Math.floor(Math.random() * 1200) + 700;
          waitTimerRef.current = window.setTimeout(() => {
            setState('READY');
            startTimeRef.current = performance.now();
            sound.playReadyPing();

            timeoutTimerRef.current = window.setTimeout(() => {
              sound.playWrong();
              setFailReason(`Exceeded ${timeoutCutoff}ms limit!`);
              setState('TIMEOUT');
            }, timeoutCutoff);
          }, finalGreenDelay);
        }, 550);
      } else {
        // True GREEN stimulus
        setState('READY');
        startTimeRef.current = performance.now();
        sound.playReadyPing();

        timeoutTimerRef.current = window.setTimeout(() => {
          sound.playWrong();
          setFailReason(`Reaction exceeded ${timeoutCutoff}ms limit!`);
          setState('TIMEOUT');
        }, timeoutCutoff);
      }
    }, delay);
  }, [clearAllTimers, subMode, currentLevelConfig, difficulty]);

  const handlePadTap = useCallback(() => {
    if (state === 'IDLE') {
      setLevelCleared(false);
      startWaiting();
    } else if (state === 'WAITING') {
      // Early tap false start
      clearAllTimers();
      sound.playWrong();
      setFailReason('Tapped before stimulus! Wait for GREEN.');
      setState('EARLY');
    } else if (state === 'DECOY') {
      // Tapped on decoy! (Failed the decoy filter)
      clearAllTimers();
      sound.playWrong();
      setFailReason(`Trap! Tapped on ${decoyColor.toUpperCase()} decoy. Only tap GREEN!`);
      setState('EARLY');
    } else if (state === 'READY') {
      clearAllTimers();
      const elapsed = Math.round(performance.now() - startTimeRef.current);
      sound.playCorrect();
      setLastMs(elapsed);

      const evalRating = getRating(elapsed, difficulty);
      setRating(evalRating.label);

      if (subMode === 'ladder') {
        // Ladder Level Cleared!
        setLevelCleared(true);
        sound.playLevelUp();
        const nextLvl = currentLevel + 1;
        setCurrentLevel(nextLvl);
        recordReflexLevel(nextLvl);
        onScoreUpdated();
      } else {
        const { isNewBest } = recordReflexScore(elapsed, evalRating.label, difficulty);
        setIsNewRecord(isNewBest);
        onScoreUpdated();

        if (subMode === 'benchmark') {
          const nextTrials = [...trials, { round: trials.length + 1, ms: elapsed }];
          setTrials(nextTrials);
          if (nextTrials.length >= 5) {
            setBenchmarkDone(true);
            sound.playVictory();
          }
        }
      }

      setState('RESULT');
    } else if (state === 'EARLY' || state === 'TIMEOUT' || state === 'RESULT') {
      if (benchmarkDone) {
        setTrials([]);
        setBenchmarkDone(false);
      }
      setLevelCleared(false);
      startWaiting();
    }
  }, [
    state,
    clearAllTimers,
    decoyColor,
    difficulty,
    subMode,
    currentLevel,
    onScoreUpdated,
    trials,
    benchmarkDone,
    startWaiting,
  ]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handlePadTap();
      } else if (e.code === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePadTap, onBack]);

  const benchmarkAverage =
    trials.length > 0 ? Math.round(trials.reduce((sum, t) => sum + t.ms, 0) / trials.length) : 0;

  const currentDiffPb = personalBestByDiff[difficulty];

  const descriptionsMap: Record<GameDifficulty, string> = {
    easy: REFLEX_DIFF_CONFIG.easy.description,
    medium: REFLEX_DIFF_CONFIG.medium.description,
    hard: REFLEX_DIFF_CONFIG.hard.description,
    insane: REFLEX_DIFF_CONFIG.insane.description,
  };

  const handleDifficultyChange = (newDiff: GameDifficulty) => {
    clearAllTimers();
    setDifficulty(newDiff);
    setState('IDLE');
    setTrials([]);
    setBenchmarkDone(false);
    setLastMs(null);
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between max-w-xl mx-auto py-2">
      {/* Top Bar Navigation & Personal Best */}
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={onBack}
          className="px-3.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>

        {/* 3 Sub-Modes: Ladder / Practice / Benchmark */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => {
              clearAllTimers();
              setSubMode('ladder');
              setState('IDLE');
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1 ${
              subMode === 'ladder'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>Level Ladder</span>
          </button>
          <button
            onClick={() => {
              clearAllTimers();
              setSubMode('practice');
              setState('IDLE');
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
              subMode === 'practice'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Practice
          </button>
          <button
            onClick={() => {
              clearAllTimers();
              setSubMode('benchmark');
              setTrials([]);
              setBenchmarkDone(false);
              setState('IDLE');
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
              subMode === 'benchmark'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Benchmark
          </button>
        </div>

        <div className="text-right">
          {subMode === 'ladder' ? (
            <>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                Peak Level
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400 tabular-nums">
                Level {Math.max(levelPeak, currentLevel)}
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                {difficulty.toUpperCase()} PB
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400 tabular-nums">
                {currentDiffPb !== null ? `${currentDiffPb} ms` : '-- ms'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* LADDER LEVEL PROGRESSION BANNER */}
      {subMode === 'ladder' && (
        <div className="mb-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-3 shadow-md">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                LEVEL {currentLevel}: {currentLevelConfig.name}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Cutoff: {currentLevelConfig.timeoutMs}ms
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span>Layer {currentLevel} of 10</span>
            </div>
          </div>

          {/* Cumulative Stacked Modifiers View */}
          <div className="mt-2 pt-2 border-t border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              Active Stacked Difficulties (Every layer persists):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {currentLevelConfig.allModifiers.map((mod, idx) => (
                <span
                  key={idx}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                    idx === currentLevelConfig.allModifiers.length - 1
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-300 border border-slate-700/80'
                  }`}
                >
                  <span className="text-cyan-400">✓</span>
                  <span>{mod}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PRACTICE / BENCHMARK DIFFICULTY SELECTOR */}
      {subMode !== 'ladder' && (
        <DifficultySelector
          difficulty={difficulty}
          onChange={handleDifficultyChange}
          disabled={state === 'WAITING' || state === 'READY' || state === 'DECOY'}
          descriptions={descriptionsMap}
        />
      )}

      {/* Benchmark Progress Indicator */}
      {subMode === 'benchmark' && (
        <div className="mb-2 bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Round</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((roundNum) => {
                const recorded = trials[roundNum - 1];
                return (
                  <div
                    key={roundNum}
                    className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold transition-all ${
                      recorded
                        ? 'bg-cyan-500 text-black'
                        : roundNum === trials.length + 1 && !benchmarkDone
                        ? 'border border-cyan-500/60 text-cyan-400 animate-pulse'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {roundNum}
                  </div>
                );
              })}
            </div>
          </div>
          {trials.length > 0 && (
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">Running Avg</span>
              <span className="text-xs font-mono font-bold text-white tabular-nums">
                {benchmarkAverage} ms
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Reflex Interactive Pad */}
      <div
        onClick={handlePadTap}
        className={`flex-1 my-2 rounded-3xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-150 select-none border-2 shadow-2xl relative overflow-hidden ${
          state === 'IDLE'
            ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
            : state === 'WAITING'
            ? isBaitActive
              ? 'bg-amber-500/80 border-amber-400 text-black'
              : 'bg-rose-950/40 border-rose-600/50 hover:bg-rose-950/50'
            : state === 'DECOY'
            ? decoyColor === 'blue'
              ? 'bg-blue-600 border-blue-400 text-white shadow-blue-500/50'
              : 'bg-purple-600 border-purple-400 text-white shadow-purple-500/50'
            : state === 'EARLY'
            ? 'bg-amber-950/60 border-amber-500'
            : state === 'TIMEOUT'
            ? 'bg-rose-950/80 border-rose-500'
            : state === 'READY'
            ? 'bg-emerald-500 border-emerald-400 text-black shadow-emerald-500/40 animate-pulse'
            : 'bg-slate-900/90 border-cyan-500/40'
        }`}
        style={{
          minHeight: '300px',
          maxWidth:
            subMode === 'ladder' && currentLevelConfig.isCompactPad ? '380px' : '100%',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {state === 'READY' && (
          <div className="absolute inset-0 bg-white/20 animate-ping pointer-events-none rounded-3xl" />
        )}

        {state === 'IDLE' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">
              {subMode === 'ladder' ? `START LEVEL ${currentLevel}` : 'TAP TO START'}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              When the screen turns <strong className="text-emerald-400">BRIGHT GREEN</strong>, tap
              as fast as possible.
            </p>
            {subMode === 'ladder' && (
              <div className="mt-1 p-2 bg-slate-800/80 rounded-xl border border-slate-700 max-w-xs text-left">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  New Layer this level:
                </span>
                <span className="text-xs text-slate-200">
                  {currentLevelConfig.newModifier}
                </span>
              </div>
            )}
          </div>
        )}

        {state === 'WAITING' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full border-4 border-rose-500/30 border-t-rose-500 animate-spin flex items-center justify-center" />
            <h3 className="text-2xl font-black text-rose-300 tracking-tight">
              {isBaitActive ? '⚠️ BAIT TRAP!' : 'WAIT FOR GREEN...'}
            </h3>
            <p className="text-xs text-rose-400/80">
              {isBaitActive
                ? 'Do not tap on amber bait!'
                : subMode === 'ladder' && currentLevel >= 5
                ? 'Wait for GREEN only. Ignore chromatic decoys!'
                : 'Do not anticipate or tap early.'}
            </p>
          </div>
        )}

        {state === 'DECOY' && (
          <div className="flex flex-col items-center gap-2">
            <ShieldAlert className="w-14 h-14 text-white animate-bounce" />
            <h3 className="text-3xl font-black text-white tracking-tight">
              {decoyColor.toUpperCase()} DECOY!
            </h3>
            <p className="text-xs text-white/90 font-bold max-w-xs">
              HOLD BACK! Tap ONLY on GREEN!
            </p>
          </div>
        )}

        {state === 'EARLY' && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-amber-400 tracking-tight">
              MISTAKE / EARLY TAP!
            </h3>
            <p className="text-xs text-slate-300 max-w-xs">{failReason}</p>
            <span className="text-xs text-slate-400 mt-2">Tap to retry level</span>
          </div>
        )}

        {state === 'TIMEOUT' && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-rose-400 tracking-tight">
              TOO SLOW! TIMEOUT
            </h3>
            <p className="text-xs text-slate-300 max-w-xs">{failReason}</p>
            <span className="text-xs text-slate-400 mt-2">Tap to try level again</span>
          </div>
        )}

        {state === 'READY' && (
          <div className="flex flex-col items-center gap-2">
            <Zap className="w-16 h-16 text-black fill-black" />
            <h3 className="text-4xl font-black text-black tracking-tight">TAP NOW!</h3>
          </div>
        )}

        {state === 'RESULT' && !benchmarkDone && (
          <div className="flex flex-col items-center gap-2">
            {levelCleared ? (
              <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-black mb-1">
                <CheckCircle2 className="w-5 h-5" />
                <span>LEVEL {currentLevel - 1} CLEARED!</span>
              </div>
            ) : (
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Reaction Time
              </span>
            )}

            <div className="text-5xl font-mono font-black text-white tabular-nums tracking-tight">
              {lastMs} <span className="text-2xl font-medium text-slate-400">ms</span>
            </div>

            <div className="mt-1 px-3 py-1 bg-slate-800/90 rounded-full border border-slate-700">
              <span className={`text-xs font-bold ${getRating(lastMs || 0, difficulty).color}`}>
                {rating}
              </span>
            </div>

            {subMode === 'ladder' ? (
              <div className="mt-3 p-3 bg-slate-800/90 rounded-2xl border border-cyan-500/40 text-center max-w-xs">
                <span className="text-xs font-bold text-cyan-300 flex items-center justify-center gap-1">
                  <span>Up Next: Level {currentLevel}</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Adds: {currentLevelConfig.newModifier}
                </span>
                <span className="text-xs text-white font-semibold block mt-2">
                  Tap anywhere to begin Level {currentLevel}!
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-4">Tap anywhere to run next trial</p>
            )}
          </div>
        )}

        {state === 'RESULT' && benchmarkDone && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Trophy className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white">
              Benchmark Complete!
            </h3>
            <div className="text-4xl font-mono font-black text-cyan-400 tabular-nums">
              {benchmarkAverage} <span className="text-lg text-slate-400">ms avg</span>
            </div>
            <div className="flex gap-2 my-1">
              {trials.map((t) => (
                <div
                  key={t.round}
                  className="px-2 py-1 bg-slate-800 rounded border border-slate-700 text-center"
                >
                  <span className="text-[9px] text-slate-400 block font-semibold">R{t.round}</span>
                  <span className="text-xs font-mono font-bold text-white tabular-nums">{t.ms}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">Tap anywhere to restart benchmark</p>
          </div>
        )}
      </div>

      {/* Bottom Summary Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex justify-between items-center text-center">
        <div className="flex-1">
          <span className="text-slate-500 text-[10px] block font-semibold uppercase tracking-wider">
            Last Attempt
          </span>
          <span className="font-mono font-bold text-white text-sm tabular-nums">
            {lastMs !== null ? `${lastMs} ms` : '--'}
          </span>
        </div>
        <div className="h-7 w-px bg-slate-800" />
        <div className="flex-1">
          <span className="text-slate-500 text-[10px] block font-semibold uppercase tracking-wider">
            Active Mode
          </span>
          <span className="font-bold text-sm text-cyan-400 uppercase">
            {subMode === 'ladder' ? `Level ${currentLevel}` : difficulty}
          </span>
        </div>
        <div className="h-7 w-px bg-slate-800" />
        <div className="flex-1">
          <span className="text-slate-500 text-[10px] block font-semibold uppercase tracking-wider">
            Cutoff Window
          </span>
          <span className="font-mono font-bold text-slate-300 text-sm tabular-nums">
            {subMode === 'ladder'
              ? `${currentLevelConfig.timeoutMs}ms`
              : `${REFLEX_DIFF_CONFIG[difficulty].timeoutMs}ms`}
          </span>
        </div>
      </div>
    </div>
  );
};
