import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Zap, Brain, Flame, Award, RotateCcw, Play, CheckCircle2, Copy } from 'lucide-react';
import { sound } from '../utils/audio';
import { recordGauntletScore } from '../utils/storage';

interface GauntletViewProps {
  onBack: () => void;
  personalBest: number;
  onScoreUpdated: () => void;
}

type Stage = 'INTRO' | 'REFLEX' | 'MEMORY' | 'MATH' | 'SUMMARY';

export const GauntletView: React.FC<GauntletViewProps> = ({ onBack, personalBest, onScoreUpdated }) => {
  const [stage, setStage] = useState<Stage>('INTRO');

  // Reflex Stage State (3 trials)
  const [reflexTrial, setReflexTrial] = useState<number>(1);
  const [reflexTimes, setReflexTimes] = useState<number[]>([]);
  const [reflexStatus, setReflexStatus] = useState<'IDLE' | 'WAITING' | 'EARLY' | 'READY'>('IDLE');
  const reflexStartRef = useRef<number>(0);
  const reflexTimerRef = useRef<number | null>(null);

  // Memory Stage State
  const [memLevel, setMemLevel] = useState<number>(1);
  const [memSequence, setMemSequence] = useState<number[]>([]);
  const [memPlayerIdx, setMemPlayerIdx] = useState<number>(0);
  const [memActivePad, setMemActivePad] = useState<number | null>(null);
  const [memPhase, setMemPhase] = useState<'WATCH' | 'PLAY'>('WATCH');

  // Math Stage State (15s blitz)
  const [mathTime, setMathTime] = useState<number>(15);
  const [mathScore, setMathScore] = useState<number>(0);
  const [mathQuestion, setMathQuestion] = useState<{ prompt: string; answer: number; options: number[] } | null>(null);
  const mathTimerRef = useRef<number | null>(null);

  // Copy feedback
  const [copied, setCopied] = useState<boolean>(false);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (reflexTimerRef.current) window.clearTimeout(reflexTimerRef.current);
      if (mathTimerRef.current) window.clearInterval(mathTimerRef.current);
    };
  }, []);

  /* ------------------- STAGE 1: REFLEX ------------------- */
  const startReflexTrial = useCallback(() => {
    setReflexStatus('WAITING');
    sound.playTap();
    const delay = Math.floor(Math.random() * 2000) + 1500;
    if (reflexTimerRef.current) window.clearTimeout(reflexTimerRef.current);
    reflexTimerRef.current = window.setTimeout(() => {
      setReflexStatus('READY');
      reflexStartRef.current = performance.now();
      sound.playReadyPing();
    }, delay);
  }, []);

  const handleReflexTap = useCallback(() => {
    if (reflexStatus === 'IDLE' || reflexStatus === 'EARLY') {
      startReflexTrial();
    } else if (reflexStatus === 'WAITING') {
      if (reflexTimerRef.current) window.clearTimeout(reflexTimerRef.current);
      sound.playWrong();
      setReflexStatus('EARLY');
    } else if (reflexStatus === 'READY') {
      const elapsed = Math.round(performance.now() - reflexStartRef.current);
      sound.playCorrect();
      const updated = [...reflexTimes, elapsed];
      setReflexTimes(updated);

      if (updated.length >= 3) {
        // Reflex stage complete! Transition to Memory
        sound.playLevelUp();
        window.setTimeout(() => {
          initMemoryStage();
        }, 800);
      } else {
        setReflexTrial(updated.length + 1);
        setReflexStatus('IDLE');
      }
    }
  }, [reflexStatus, reflexTimes, startReflexTrial]);

  /* ------------------- STAGE 2: MEMORY ------------------- */
  const initMemoryStage = () => {
    setStage('MEMORY');
    const firstSeq = [Math.floor(Math.random() * 4)];
    setMemSequence(firstSeq);
    setMemLevel(1);
    playMemorySequence(firstSeq);
  };

  const playMemorySequence = (seq: number[]) => {
    setMemPhase('WATCH');
    setMemPlayerIdx(0);
    seq.forEach((pad, i) => {
      window.setTimeout(() => {
        setMemActivePad(pad);
        sound.playSimonPad(pad);
      }, i * 500 + 400);
      window.setTimeout(() => {
        setMemActivePad(null);
      }, i * 500 + 750);
    });
    window.setTimeout(() => {
      setMemPhase('PLAY');
    }, seq.length * 500 + 500);
  };

  const handleMemoryPadTap = (pad: number) => {
    if (memPhase !== 'PLAY') return;
    setMemActivePad(pad);
    sound.playSimonPad(pad);
    window.setTimeout(() => setMemActivePad(null), 150);

    if (pad === memSequence[memPlayerIdx]) {
      const nextIdx = memPlayerIdx + 1;
      setMemPlayerIdx(nextIdx);
      if (nextIdx === memSequence.length) {
        // Level cleared
        const nextLvl = memLevel + 1;
        setMemLevel(nextLvl);
        sound.playLevelUp();

        if (nextLvl > 6) {
          // Cap at level 6 in Gauntlet to keep pace fast
          initMathStage();
          return;
        }

        const nextSeq = [...memSequence, Math.floor(Math.random() * 4)];
        setMemSequence(nextSeq);
        window.setTimeout(() => playMemorySequence(nextSeq), 800);
      }
    } else {
      // Memory mistake -> move to Math stage
      sound.playWrong();
      window.setTimeout(() => {
        initMathStage();
      }, 700);
    }
  };

  /* ------------------- STAGE 3: MATH ------------------- */
  const generateMathQ = () => {
    const a = Math.floor(Math.random() * 25) + 5;
    const b = Math.floor(Math.random() * 25) + 5;
    const isMult = Math.random() < 0.4;
    let ans = 0;
    let text = '';
    if (isMult) {
      const m1 = Math.floor(Math.random() * 9) + 2;
      const m2 = Math.floor(Math.random() * 9) + 2;
      ans = m1 * m2;
      text = `${m1} × ${m2}`;
    } else {
      ans = a + b;
      text = `${a} + ${b}`;
    }
    const set = new Set<number>([ans]);
    while (set.size < 4) {
      set.add(ans + Math.floor(Math.random() * 9) - 4);
    }
    return { prompt: text, answer: ans, options: Array.from(set).sort(() => Math.random() - 0.5) };
  };

  const initMathStage = () => {
    setStage('MATH');
    setMathScore(0);
    setMathTime(15);
    setMathQuestion(generateMathQ());

    const start = Date.now();
    mathTimerRef.current = window.setInterval(() => {
      const remaining = Math.max(0, 15 - (Date.now() - start) / 1000);
      setMathTime(remaining);
      if (remaining <= 0) {
        if (mathTimerRef.current) window.clearInterval(mathTimerRef.current);
        finishGauntlet();
      }
    }, 100);
  };

  const handleMathAnswer = (choice: number) => {
    if (!mathQuestion) return;
    if (choice === mathQuestion.answer) {
      sound.playCorrect();
      setMathScore((s) => s + 120);
    } else {
      sound.playWrong();
      setMathScore((s) => Math.max(0, s - 40));
    }
    setMathQuestion(generateMathQ());
  };

  /* ------------------- STAGE 4: SUMMARY ------------------- */
  const avgReflex = reflexTimes.length > 0
    ? Math.round(reflexTimes.reduce((a, b) => a + b, 0) / reflexTimes.length)
    : 300;

  const reflexPts = Math.max(0, Math.round((450 - avgReflex) * 1.5));
  const memoryPts = (memLevel - 1) * 75;
  const totalGauntletScore = reflexPts + memoryPts + mathScore;

  const getRank = (score: number) => {
    if (score >= 900) return { title: 'S-TIER APEX', color: 'text-cyan-400' };
    if (score >= 700) return { title: 'A-TIER DIAMOND', color: 'text-purple-400' };
    if (score >= 500) return { title: 'B-TIER GOLD', color: 'text-amber-400' };
    if (score >= 350) return { title: 'C-TIER SILVER', color: 'text-emerald-400' };
    return { title: 'BRONZE CONTENDER', color: 'text-slate-400' };
  };

  const finishGauntlet = () => {
    sound.playVictory();
    setStage('SUMMARY');
    recordGauntletScore(totalGauntletScore);
    onScoreUpdated();
  };

  const handleShare = () => {
    const text = `⚡ Arena Triathlon Score: ${totalGauntletScore} Pts (${getRank(totalGauntletScore).title})!\n⏱️ Reflex: ${avgReflex}ms\n🧠 Memory: Lvl ${memLevel}\n🔥 Math: ${mathScore} Pts`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

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
            {stage === 'INTRO' && 'Arena Triathlon'}
            {stage === 'REFLEX' && `Stage 1: Reflex (${reflexTrial}/3)`}
            {stage === 'MEMORY' && `Stage 2: Memory (Level ${memLevel})`}
            {stage === 'MATH' && `Stage 3: Math (${mathTime.toFixed(0)}s)`}
            {stage === 'SUMMARY' && 'Triathlon Results'}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Best</span>
          <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
            {personalBest} Pts
          </span>
        </div>
      </div>

      {/* Stage: INTRO */}
      {stage === 'INTRO' && (
        <div className="my-auto p-6 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col items-center text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center mb-3">
            <Award className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">ARENA TRIATHLON</h3>
          <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
            The ultimate composite test of cognitive prowess. 3 consecutive stages evaluated under strict competition rules:
          </p>

          <div className="w-full my-4 space-y-2 text-left">
            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center gap-3">
              <Zap className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white">1. Reflex Speed</h4>
                <p className="text-[11px] text-slate-400">3 reaction trials, scored on ms velocity.</p>
              </div>
            </div>
            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center gap-3">
              <Brain className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white">2. Spatial Memory</h4>
                <p className="text-[11px] text-slate-400">Simon pattern match until first error.</p>
              </div>
            </div>
            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center gap-3">
              <Flame className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white">3. Speed Math Blitz</h4>
                <p className="text-[11px] text-slate-400">15 seconds rapid arithmetic accuracy.</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setStage('REFLEX');
              setReflexTrial(1);
              setReflexTimes([]);
              setReflexStatus('IDLE');
            }}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-bold rounded-2xl shadow-lg shadow-cyan-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START TRIATHLON</span>
          </button>
        </div>
      )}

      {/* Stage: REFLEX */}
      {stage === 'REFLEX' && (
        <div className="my-auto flex flex-col justify-center">
          <div
            onClick={handleReflexTap}
            className={`w-full py-20 rounded-3xl border-2 flex flex-col items-center justify-center text-center cursor-pointer select-none transition-all shadow-2xl ${
              reflexStatus === 'IDLE'
                ? 'bg-slate-900 border-slate-700'
                : reflexStatus === 'WAITING'
                ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                : reflexStatus === 'EARLY'
                ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                : 'bg-emerald-500 border-emerald-400 text-black animate-pulse'
            }`}
          >
            {reflexStatus === 'IDLE' && (
              <>
                <Zap className="w-12 h-12 text-cyan-400 mb-2" />
                <h3 className="text-xl font-bold text-white">Trial {reflexTrial} of 3</h3>
                <p className="text-xs text-slate-400 mt-1">Tap anywhere to ready</p>
              </>
            )}
            {reflexStatus === 'WAITING' && (
              <>
                <h3 className="text-2xl font-black">WAIT FOR GREEN...</h3>
              </>
            )}
            {reflexStatus === 'EARLY' && (
              <>
                <h3 className="text-xl font-black">Too Early! Tap to Retry Trial</h3>
              </>
            )}
            {reflexStatus === 'READY' && (
              <>
                <h3 className="text-4xl font-black">TAP NOW!</h3>
              </>
            )}
          </div>
          <div className="flex justify-center gap-2 mt-3">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`px-3 py-1 rounded text-xs font-mono font-bold border ${
                  reflexTimes[num - 1]
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
              >
                R{num}: {reflexTimes[num - 1] ? `${reflexTimes[num - 1]}ms` : '--'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage: MEMORY */}
      {stage === 'MEMORY' && (
        <div className="my-auto flex flex-col items-center">
          <div className="w-full aspect-square max-w-[280px] p-3 bg-slate-900/80 border border-slate-800 rounded-3xl grid grid-cols-2 gap-3 shadow-2xl">
            {[0, 1, 2, 3].map((padId) => (
              <button
                key={padId}
                disabled={memPhase !== 'PLAY'}
                onClick={() => handleMemoryPadTap(padId)}
                className={`rounded-2xl border-2 transition-all flex items-center justify-center font-bold text-xl select-none ${
                  memActivePad === padId
                    ? 'bg-white border-white scale-102 shadow-lg text-black'
                    : padId === 0
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : padId === 1
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : padId === 2
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                }`}
              >
                {padId + 1}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400 mt-3">
            {memPhase === 'WATCH' ? 'Memorize sequence...' : `Repeat pattern (${memPlayerIdx + 1}/${memSequence.length})`}
          </span>
        </div>
      )}

      {/* Stage: MATH */}
      {stage === 'MATH' && mathQuestion && (
        <div className="my-auto flex flex-col justify-center">
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800 mb-3">
            <div
              className="bg-rose-500 h-full transition-all duration-100 ease-linear"
              style={{ width: `${(mathTime / 15) * 100}%` }}
            />
          </div>
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center shadow-xl">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Speed Math</span>
            <div className="text-4xl font-mono font-black text-white my-2">{mathQuestion.prompt} = ?</div>
            <span className="text-xs font-mono text-rose-400 font-bold">Score: {mathScore}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {mathQuestion.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleMathAnswer(opt)}
                className="py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold text-lg rounded-xl border border-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stage: SUMMARY */}
      {stage === 'SUMMARY' && (
        <div className="my-auto p-6 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col items-center text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-2">
            <Award className="w-8 h-8" />
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Triathlon Assessment</span>
          <h3 className={`text-2xl font-black mt-1 ${getRank(totalGauntletScore).color}`}>
            {getRank(totalGauntletScore).title}
          </h3>
          <div className="text-5xl font-mono font-black text-white my-3 tabular-nums">
            {totalGauntletScore} <span className="text-lg font-medium text-slate-400">Pts</span>
          </div>

          <div className="w-full space-y-2 my-2 text-left">
            <div className="p-2 bg-slate-800/80 rounded-xl flex justify-between items-center text-xs">
              <span className="text-slate-400">⏱️ Reflex Speed</span>
              <span className="font-mono font-bold text-cyan-400">{avgReflex} ms (+{reflexPts} pts)</span>
            </div>
            <div className="p-2 bg-slate-800/80 rounded-xl flex justify-between items-center text-xs">
              <span className="text-slate-400">🧠 Pattern Memory</span>
              <span className="font-mono font-bold text-purple-400">Level {memLevel} (+{memoryPts} pts)</span>
            </div>
            <div className="p-2 bg-slate-800/80 rounded-xl flex justify-between items-center text-xs">
              <span className="text-slate-400">🔥 Speed Math</span>
              <span className="font-mono font-bold text-rose-400">{mathScore} pts</span>
            </div>
          </div>

          <div className="flex gap-2 w-full mt-2">
            <button
              onClick={handleShare}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Share Result'}</span>
            </button>
            <button
              onClick={() => {
                setStage('INTRO');
              }}
              className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
