import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Eye, RotateCcw, Play, Award, Zap } from 'lucide-react';
import { sound } from '../utils/audio';
import { recordStroopScore } from '../utils/storage';

interface StroopViewProps {
  onBack: () => void;
  personalBest: number;
  onScoreUpdated: () => void;
}

const COLORS = [
  { name: 'RED', hex: 'text-rose-500', bg: 'bg-rose-500/20', border: 'border-rose-500/50' },
  { name: 'BLUE', hex: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/50' },
  { name: 'GREEN', hex: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/50' },
  { name: 'YELLOW', hex: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/50' },
];

export const StroopView: React.FC<StroopViewProps> = ({ onBack, personalBest, onScoreUpdated }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  // Question parameters
  const [targetType, setTargetType] = useState<'INK' | 'WORD'>('INK'); // 'INK' = match visual font color, 'WORD' = match semantic word
  const [wordText, setWordText] = useState<string>('RED');
  const [inkColor, setInkColor] = useState<typeof COLORS[0]>(COLORS[0]);

  const timerRef = useRef<number | null>(null);

  const generateCard = useCallback(() => {
    // 60% of the time, test INK COLOR (the classic Stroop interference)
    const mode: 'INK' | 'WORD' = Math.random() < 0.65 ? 'INK' : 'WORD';
    setTargetType(mode);

    // Pick random word and different random ink color to force cognitive conflict
    const wordIdx = Math.floor(Math.random() * COLORS.length);
    let inkIdx = Math.floor(Math.random() * COLORS.length);
    if (inkIdx === wordIdx && Math.random() < 0.8) {
      // 80% chance of conflicting ink to maximize cognitive inhibition test
      inkIdx = (inkIdx + 1 + Math.floor(Math.random() * 3)) % COLORS.length;
    }

    setWordText(COLORS[wordIdx].name);
    setInkColor(COLORS[inkIdx]);
  }, []);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleEndGame = useCallback(() => {
    stopTimer();
    setIsPlaying(false);
    setGameOver(true);
    sound.playGameOver();

    const { isNewBest } = recordStroopScore(score);
    if (isNewBest) setIsNewRecord(true);
    onScoreUpdated();
  }, [score, onScoreUpdated]);

  const startGame = useCallback(() => {
    stopTimer();
    sound.playTap();
    setScore(0);
    setStreak(0);
    setCorrectCount(0);
    setTotalAttempts(0);
    setTimeLeft(20);
    setGameOver(false);
    setIsNewRecord(false);
    setIsPlaying(true);

    generateCard();

    const startTime = Date.now();
    const durationMs = 20000;

    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingSec = Math.max(0, (durationMs - elapsed) / 1000);
      setTimeLeft(remainingSec);

      if (remainingSec <= 0) {
        handleEndGame();
      }
    }, 100);
  }, [generateCard, handleEndGame]);

  const handleSelectColor = useCallback((selectedName: string) => {
    if (!isPlaying) return;

    setTotalAttempts((prev) => prev + 1);

    const correctName = targetType === 'INK' ? inkColor.name : wordText;

    if (selectedName === correctName) {
      sound.playCorrect();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setCorrectCount((prev) => prev + 1);

      const multiplier = nextStreak >= 6 ? 2.0 : nextStreak >= 3 ? 1.5 : 1.0;
      setScore((prev) => prev + Math.round(100 * multiplier));
      generateCard();
    } else {
      sound.playWrong();
      setStreak(0);
      setScore((prev) => Math.max(0, prev - 40));
      generateCard();
    }
  }, [isPlaying, targetType, inkColor, wordText, streak, generateCard]);

  useEffect(() => {
    return () => stopTimer();
  }, []);

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
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
            Stroop Clash
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Best</span>
          <span className="text-xs font-mono font-bold text-cyan-400 tabular-nums">
            {personalBest} Pts
          </span>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800 mb-2">
        <div
          className={`h-full transition-all duration-100 ease-linear rounded-full ${
            timeLeft < 5 ? 'bg-rose-500 animate-pulse' : 'bg-gradient-to-r from-cyan-500 to-purple-500'
          }`}
          style={{ width: `${(timeLeft / 20) * 100}%` }}
        />
      </div>

      {/* Main Card */}
      {!isPlaying && !gameOver && (
        <div className="my-auto p-6 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col items-center text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-3">
            <Eye className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">STROOP COLOR CLASH</h3>
          <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
            Overcome cognitive interference! Pay strict attention to the instruction rule: match the <strong className="text-cyan-400">INK COLOR</strong> or the <strong className="text-purple-400">WORD TEXT</strong>.
          </p>
        </div>
      )}

      {isPlaying && (
        <div className="my-auto p-6 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col items-center text-center shadow-2xl min-h-[170px] justify-center">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              ⏱️ {timeLeft.toFixed(1)}s
            </span>
            <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
              {streak}x Streak
            </span>
          </div>

          {/* Rule banner */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border mb-3 ${
              targetType === 'INK'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
            }`}
          >
            Match: {targetType === 'INK' ? '🎨 FONT / INK COLOR' : '📝 WRITTEN WORD'}
          </div>

          {/* The Stroop Stimulus */}
          <div className={`text-5xl font-black tracking-widest my-2 select-none ${inkColor.hex}`}>
            {wordText}
          </div>

          <span className="text-xs font-mono text-slate-400 mt-1">Score: {score}</span>
        </div>
      )}

      {gameOver && (
        <div className="my-auto p-6 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col items-center text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-2">
            <Award className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-white">Stroop Round Over!</h3>
          <div className="text-4xl font-mono font-black text-cyan-400 my-2 tabular-nums">
            {score} <span className="text-lg text-slate-400">Pts</span>
          </div>
          <p className="text-xs text-slate-300">
            {correctCount} correct answers ({totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0}% accuracy)
          </p>
          {isNewRecord && (
            <p className="text-xs text-amber-400 font-bold mt-2">
              🏆 New Personal Stroop Record!
            </p>
          )}
        </div>
      )}

      {/* 4 Color Buttons */}
      <div className="grid grid-cols-2 gap-2.5 my-2">
        {COLORS.map((col) => (
          <button
            key={col.name}
            disabled={!isPlaying}
            onClick={() => handleSelectColor(col.name)}
            className={`py-4 rounded-2xl font-bold tracking-wider text-sm transition-all border-2 flex items-center justify-center cursor-pointer active:scale-95 select-none ${
              isPlaying
                ? `${col.bg} ${col.border} ${col.hex} hover:brightness-125 shadow-lg`
                : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
            }`}
            style={{ minHeight: '56px' }}
          >
            {col.name}
          </button>
        ))}
      </div>

      {/* CTA */}
      <div>
        {!isPlaying && (
          <button
            onClick={startGame}
            className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-2xl shadow-lg shadow-cyan-500/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {gameOver ? <RotateCcw className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            <span>{gameOver ? 'PLAY AGAIN' : 'START STROOP CLASH (20s)'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
