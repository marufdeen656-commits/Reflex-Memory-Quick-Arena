import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Flame,
  RotateCcw,
  Play,
  Award,
  Layers,
  ChevronRight,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { sound } from '../utils/audio';
import {
  recordMathScore,
  recordMathLevel,
  GameDifficulty,
} from '../utils/storage';
import { DifficultySelector } from './DifficultySelector';

interface MathViewProps {
  onBack: () => void;
  personalBestByDiff: Record<GameDifficulty, number>;
  personalBestStreak: number;
  levelPeak: number;
  onScoreUpdated: () => void;
}

type MathMode = 'ladder' | 'blitz';

interface MathQuestion {
  prompt: string;
  correctAnswer: number;
  options: number[];
}

interface MathLadderLevelConfig {
  level: number;
  name: string;
  targetCount: number; // Questions to solve to advance
  secondsPerQuestion: number;
  newModifier: string;
  allModifiers: string[];
}

const MATH_LADDER_LEVELS: MathLadderLevelConfig[] = [
  {
    level: 1,
    name: 'Single-Digit Addition',
    targetCount: 3,
    secondsPerQuestion: 8.0,
    newModifier: 'Single-digit addition (8.0s per problem)',
    allModifiers: ['Single-Digit Addition', '8.0s per question', 'Broad distractors'],
  },
  {
    level: 2,
    name: 'Subtraction Unlocked',
    targetCount: 3,
    secondsPerQuestion: 7.2,
    newModifier: 'Subtraction unlocked alongside addition (7.2s clock)',
    allModifiers: ['Addition', 'Subtraction (−)', '7.2s per question'],
  },
  {
    level: 3,
    name: 'Multiplication Tables',
    targetCount: 3,
    secondsPerQuestion: 6.5,
    newModifier: 'Multiplication (×) unlocked alongside sums & subtractions',
    allModifiers: ['Addition', 'Subtraction', 'Multiplication (×)', '6.5s per question'],
  },
  {
    level: 4,
    name: 'Division Arithmetic',
    targetCount: 3,
    secondsPerQuestion: 5.8,
    newModifier: 'Clean division (÷) unlocked across all 4 operations',
    allModifiers: [
      'Addition',
      'Subtraction',
      'Multiplication',
      'Clean Division (÷)',
      '5.8s per question',
    ],
  },
  {
    level: 5,
    name: '2-Step Expressions',
    targetCount: 4,
    secondsPerQuestion: 5.2,
    newModifier: '2-step compound expressions: (a × b) ± c',
    allModifiers: [
      'All 4 Operations',
      '2-Step Expressions (a × b) ± c',
      '5.2s per question',
    ],
  },
  {
    level: 6,
    name: 'Razor Distractor Traps',
    targetCount: 4,
    secondsPerQuestion: 4.8,
    newModifier: 'Deceptive razor options (±1 traps) alongside 2-step expressions',
    allModifiers: [
      'All 4 Operations',
      '2-Step Expressions',
      'Razor ±1 Traps',
      '4.8s per question',
    ],
  },
  {
    level: 7,
    name: '3-Term Order of Operations',
    targetCount: 4,
    secondsPerQuestion: 4.5,
    newModifier: '3-term mental algebra: (a × b) − (c × d)',
    allModifiers: [
      'All 4 Operations',
      '2-Step & 3-Term Algebra',
      'Razor ±1 Traps',
      '4.5s per question',
    ],
  },
  {
    level: 8,
    name: 'Negative Integers',
    targetCount: 5,
    secondsPerQuestion: 4.2,
    newModifier: 'Negative integer answers possible alongside 3-term algebra',
    allModifiers: [
      '3-Term Algebra',
      'Razor ±1 Traps',
      'Negative Numbers Possible',
      '4.2s per question',
    ],
  },
  {
    level: 9,
    name: 'Rapid Pressure Clock',
    targetCount: 5,
    secondsPerQuestion: 3.8,
    newModifier: 'Sub-4s rapid pressure clock across all operations',
    allModifiers: [
      'Sub-4s Rapid Pressure',
      'Complex Algebra',
      'Negative Integers',
      'Razor Traps',
    ],
  },
  {
    level: 10,
    name: 'Apex Mental Grandmaster',
    targetCount: 5,
    secondsPerQuestion: 3.4,
    newModifier: '3.4s clock with maximum order of operations & razor distractors',
    allModifiers: [
      '3.4s Apex Speed Clock',
      'Full Algebraic Order of Operations',
      'Negative Integers',
      'Razor Distractors',
      'Mental Grandmaster Crown',
    ],
  },
];

const MATH_DIFF_CONFIG: Record<
  GameDifficulty,
  {
    duration: number;
    basePts: number;
    penaltyPts: number;
    bonusTimeSec: number;
    description: string;
  }
> = {
  easy: {
    duration: 25,
    basePts: 80,
    penaltyPts: 25,
    bonusTimeSec: 1.0,
    description: '25s clock · Addition & subtraction · +1.0s bonus time per hit',
  },
  medium: {
    duration: 15,
    basePts: 100,
    penaltyPts: 50,
    bonusTimeSec: 0.5,
    description: '15s clock · Standard operations (+, −, ×, ÷) · +0.5s bonus',
  },
  hard: {
    duration: 12,
    basePts: 160,
    penaltyPts: 65,
    bonusTimeSec: 0.3,
    description: '12s clock · 2-digit operations & 2-step expressions · High score yield',
  },
  insane: {
    duration: 9,
    basePts: 250,
    penaltyPts: 90,
    bonusTimeSec: 0.2,
    description: '9s ultra-blitz · Complex 3-term mental algebra · 4.0x combo potential!',
  },
};

export const MathView: React.FC<MathViewProps> = ({
  onBack,
  personalBestByDiff,
  personalBestStreak,
  levelPeak,
  onScoreUpdated,
}) => {
  const [subMode, setSubMode] = useState<MathMode>('ladder');
  const [difficulty, setDifficulty] = useState<GameDifficulty>('medium');

  // Ladder state
  const [ladderLevel, setLadderLevel] = useState<number>(1);
  const [ladderQuestionIdx, setLadderQuestionIdx] = useState<number>(0);
  const [ladderLevelCleared, setLadderLevelCleared] = useState<boolean>(false);

  // Common game state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [maxQuestionTime, setMaxQuestionTime] = useState<number>(15);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [peakStreak, setPeakStreak] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [question, setQuestion] = useState<MathQuestion | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [failReason, setFailReason] = useState<string>('');
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const timerIntervalRef = useRef<number | null>(null);
  const remainingTimeRef = useRef<number>(15);

  const currentLevelConfig =
    MATH_LADDER_LEVELS[Math.min(ladderLevel - 1, MATH_LADDER_LEVELS.length - 1)];

  // Generator for Ladder Levels (incorporating all accumulated rules)
  const generateLadderQuestion = useCallback((lvl: number): MathQuestion => {
    let promptText = '';
    let answer = 0;
    const isRazor = lvl >= 6;

    if (lvl === 1) {
      // Clean 1-digit addition
      const a = Math.floor(Math.random() * 9) + 2;
      const b = Math.floor(Math.random() * 9) + 2;
      answer = a + b;
      promptText = `${a} + ${b}`;
    } else if (lvl === 2) {
      // Addition or Subtraction
      if (Math.random() < 0.5) {
        const a = Math.floor(Math.random() * 20) + 5;
        const b = Math.floor(Math.random() * 20) + 5;
        answer = a + b;
        promptText = `${a} + ${b}`;
      } else {
        const a = Math.floor(Math.random() * 30) + 12;
        const b = Math.floor(Math.random() * (a - 4)) + 3;
        answer = a - b;
        promptText = `${a} − ${b}`;
      }
    } else if (lvl === 3) {
      // Add, Sub, or Multiplication
      const pick = Math.random();
      if (pick < 0.4) {
        const a = Math.floor(Math.random() * 9) + 3;
        const b = Math.floor(Math.random() * 9) + 2;
        answer = a * b;
        promptText = `${a} × ${b}`;
      } else if (pick < 0.7) {
        const a = Math.floor(Math.random() * 35) + 10;
        const b = Math.floor(Math.random() * 25) + 5;
        answer = a + b;
        promptText = `${a} + ${b}`;
      } else {
        const a = Math.floor(Math.random() * 45) + 15;
        const b = Math.floor(Math.random() * (a - 6)) + 5;
        answer = a - b;
        promptText = `${a} − ${b}`;
      }
    } else if (lvl === 4) {
      // All 4 operations including clean division
      const pick = Math.random();
      if (pick < 0.35) {
        const b = Math.floor(Math.random() * 8) + 2;
        const quotient = Math.floor(Math.random() * 10) + 2;
        const a = b * quotient;
        answer = quotient;
        promptText = `${a} ÷ ${b}`;
      } else if (pick < 0.65) {
        const a = Math.floor(Math.random() * 11) + 2;
        const b = Math.floor(Math.random() * 10) + 2;
        answer = a * b;
        promptText = `${a} × ${b}`;
      } else {
        const a = Math.floor(Math.random() * 45) + 10;
        const b = Math.floor(Math.random() * 35) + 8;
        answer = a + b;
        promptText = `${a} + ${b}`;
      }
    } else if (lvl === 5 || lvl === 6) {
      // 2-step expressions: (a * b) +/- c or clean division + c
      if (Math.random() < 0.65) {
        const a = Math.floor(Math.random() * 8) + 3;
        const b = Math.floor(Math.random() * 8) + 2;
        const c = Math.floor(Math.random() * 20) + 4;
        const isAdd = Math.random() < 0.5;
        if (isAdd) {
          answer = a * b + c;
          promptText = `(${a} × ${b}) + ${c}`;
        } else {
          answer = a * b - c;
          promptText = `(${a} × ${b}) − ${c}`;
        }
      } else {
        // Division + c
        const b = Math.floor(Math.random() * 7) + 2;
        const q = Math.floor(Math.random() * 8) + 3;
        const a = b * q;
        const c = Math.floor(Math.random() * 15) + 3;
        answer = q + c;
        promptText = `(${a} ÷ ${b}) + ${c}`;
      }
    } else {
      // Level 7+: 3-term expressions or order of operations
      const pick = Math.random();
      if (pick < 0.45) {
        // (a * b) - (c * d)
        const a = Math.floor(Math.random() * 8) + 4;
        const b = Math.floor(Math.random() * 7) + 3;
        const c = Math.floor(Math.random() * 6) + 2;
        const d = Math.floor(Math.random() * 6) + 2;
        answer = a * b - c * d;
        promptText = `(${a} × ${b}) − (${c} × ${d})`;
      } else if (pick < 0.8) {
        // c - (a * b) [can be negative on lvl >= 8!]
        const a = Math.floor(Math.random() * 8) + 5;
        const b = Math.floor(Math.random() * 8) + 4;
        const prod = a * b;
        let c = 0;
        if (lvl >= 8 && Math.random() < 0.4) {
          // Negative result
          c = prod - Math.floor(Math.random() * 20) - 5;
        } else {
          c = prod + Math.floor(Math.random() * 30) + 10;
        }
        answer = c - prod;
        promptText = `${c} − (${a} × ${b})`;
      } else {
        // (a * b) + c - d
        const a = Math.floor(Math.random() * 9) + 4;
        const b = Math.floor(Math.random() * 7) + 3;
        const c = Math.floor(Math.random() * 25) + 5;
        const d = Math.floor(Math.random() * 15) + 2;
        answer = a * b + c - d;
        promptText = `(${a} × ${b}) + ${c} − ${d}`;
      }
    }

    // Distractor generation
    const optionsSet = new Set<number>();
    optionsSet.add(answer);

    const offsets = isRazor
      ? [-1, 1, -2, 2, -10, 10]
      : lvl >= 3
      ? [-1, 1, -2, 2, -5, 5, -10, 10]
      : [-2, 2, -3, 3, -5, 5, -10, 10];

    while (optionsSet.size < 4) {
      const offset = offsets[Math.floor(Math.random() * offsets.length)];
      const candidate = answer + offset;
      if (candidate !== answer) {
        optionsSet.add(candidate);
      } else {
        optionsSet.add(answer + Math.floor(Math.random() * 15) - 7);
      }
    }

    const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);
    return { prompt: promptText, correctAnswer: answer, options };
  }, []);

  // Generator for Blitz mode
  const generateBlitzQuestion = useCallback((diff: GameDifficulty): MathQuestion => {
    let promptText = '';
    let answer = 0;

    if (diff === 'easy') {
      const isAdd = Math.random() < 0.55;
      if (isAdd) {
        const a = Math.floor(Math.random() * 25) + 3;
        const b = Math.floor(Math.random() * 25) + 3;
        answer = a + b;
        promptText = `${a} + ${b}`;
      } else {
        const a = Math.floor(Math.random() * 40) + 10;
        const b = Math.floor(Math.random() * (a - 4)) + 2;
        answer = a - b;
        promptText = `${a} − ${b}`;
      }
    } else if (diff === 'medium') {
      const ops = ['+', '-', '*', '/'];
      const op = ops[Math.floor(Math.random() * ops.length)];
      if (op === '+') {
        const a = Math.floor(Math.random() * 45) + 6;
        const b = Math.floor(Math.random() * 45) + 6;
        answer = a + b;
        promptText = `${a} + ${b}`;
      } else if (op === '-') {
        const a = Math.floor(Math.random() * 60) + 15;
        const b = Math.floor(Math.random() * (a - 5)) + 4;
        answer = a - b;
        promptText = `${a} − ${b}`;
      } else if (op === '*') {
        const a = Math.floor(Math.random() * 11) + 2;
        const b = Math.floor(Math.random() * 11) + 2;
        answer = a * b;
        promptText = `${a} × ${b}`;
      } else {
        const b = Math.floor(Math.random() * 9) + 2;
        const quotient = Math.floor(Math.random() * 11) + 2;
        const a = b * quotient;
        answer = quotient;
        promptText = `${a} ÷ ${b}`;
      }
    } else if (diff === 'hard') {
      const a = Math.floor(Math.random() * 18) + 12;
      const b = Math.floor(Math.random() * 7) + 3;
      answer = a * b;
      promptText = `${a} × ${b}`;
    } else {
      const a = Math.floor(Math.random() * 12) + 11;
      const b = Math.floor(Math.random() * 8) + 5;
      const c = Math.floor(Math.random() * 35) + 10;
      answer = a * b - c;
      promptText = `(${a} × ${b}) − ${c}`;
    }

    const optionsSet = new Set<number>();
    optionsSet.add(answer);
    const offsets = [-1, 1, -2, 2, -10, 10];
    while (optionsSet.size < 4) {
      const offset = offsets[Math.floor(Math.random() * offsets.length)];
      const candidate = answer + offset;
      if (candidate !== answer) optionsSet.add(candidate);
      else optionsSet.add(answer + Math.floor(Math.random() * 12) - 6);
    }
    return { prompt: promptText, correctAnswer: answer, options: Array.from(optionsSet).sort(() => Math.random() - 0.5) };
  }, []);

  const stopTimer = () => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const handleEndGame = useCallback(
    (reason = 'Time Expired') => {
      stopTimer();
      setIsPlaying(false);
      setGameOver(true);
      setFailReason(reason);
      sound.playGameOver();

      if (subMode === 'blitz') {
        const { isNewBest } = recordMathScore(score, peakStreak, difficulty);
        if (isNewBest) setIsNewRecord(true);
      }
      onScoreUpdated();
    },
    [subMode, score, peakStreak, difficulty, onScoreUpdated]
  );

  // Start Level or Blitz Round
  const startRound = useCallback(() => {
    stopTimer();
    sound.playTap();
    setGameOver(false);
    setIsNewRecord(false);
    setIsPlaying(true);
    setFeedback(null);
    setFailReason('');

    if (subMode === 'ladder') {
      const qTime = currentLevelConfig.secondsPerQuestion;
      setMaxQuestionTime(qTime);
      setTimeLeft(qTime);
      remainingTimeRef.current = qTime;
      setLadderQuestionIdx(0);
      setLadderLevelCleared(false);

      const firstQ = generateLadderQuestion(ladderLevel);
      setQuestion(firstQ);

      const stepMs = 100;
      timerIntervalRef.current = window.setInterval(() => {
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - stepMs / 1000);
        setTimeLeft(remainingTimeRef.current);

        if (remainingTimeRef.current <= 0) {
          handleEndGame(`Ran out of time on Level ${ladderLevel}!`);
        }
      }, stepMs);
    } else {
      const config = MATH_DIFF_CONFIG[difficulty];
      const initialDuration = config.duration;
      setMaxQuestionTime(initialDuration);
      setTimeLeft(initialDuration);
      remainingTimeRef.current = initialDuration;
      setScore(0);
      setStreak(0);
      setPeakStreak(0);
      setCorrectCount(0);
      setTotalAttempts(0);

      const firstQ = generateBlitzQuestion(difficulty);
      setQuestion(firstQ);

      const stepMs = 100;
      timerIntervalRef.current = window.setInterval(() => {
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - stepMs / 1000);
        setTimeLeft(remainingTimeRef.current);

        if (remainingTimeRef.current <= 0) {
          handleEndGame('15s Blitz Clock Expired!');
        }
      }, stepMs);
    }
  }, [
    subMode,
    currentLevelConfig,
    ladderLevel,
    difficulty,
    generateLadderQuestion,
    generateBlitzQuestion,
    handleEndGame,
  ]);

  const handleOptionSelect = useCallback(
    (selected: number) => {
      if (!isPlaying || !question) return;

      setTotalAttempts((prev) => prev + 1);

      if (selected === question.correctAnswer) {
        sound.playCorrect();
        setFeedback('correct');
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        if (nextStreak > peakStreak) setPeakStreak(nextStreak);
        setCorrectCount((prev) => prev + 1);

        if (subMode === 'ladder') {
          const nextQIdx = ladderQuestionIdx + 1;
          setLadderQuestionIdx(nextQIdx);

          if (nextQIdx >= currentLevelConfig.targetCount) {
            // Level cleared!
            sound.playLevelUp();
            stopTimer();
            setIsPlaying(false);
            setLadderLevelCleared(true);
            const nextLvl = ladderLevel + 1;
            setLadderLevel(nextLvl);
            recordMathLevel(nextLvl);
            onScoreUpdated();
            return;
          }

          // Reset timer for next question in level
          const qTime = currentLevelConfig.secondsPerQuestion;
          remainingTimeRef.current = qTime;
          setTimeLeft(qTime);
          setQuestion(generateLadderQuestion(ladderLevel));
        } else {
          // Blitz mode
          const config = MATH_DIFF_CONFIG[difficulty];
          remainingTimeRef.current = Math.min(
            maxQuestionTime + 5,
            remainingTimeRef.current + config.bonusTimeSec
          );
          setTimeLeft(remainingTimeRef.current);

          let mult = 1.0;
          if (nextStreak >= 6) mult = 2.5;
          else if (nextStreak >= 3) mult = 1.5;

          setScore((s) => s + Math.round(config.basePts * mult));
          setQuestion(generateBlitzQuestion(difficulty));
        }
      } else {
        sound.playWrong();
        setFeedback('wrong');
        setStreak(0);

        if (subMode === 'ladder') {
          // Mistake in ladder fails the round
          handleEndGame(`Mistake on ${question.prompt} = ${question.correctAnswer} (selected ${selected})`);
        } else {
          const config = MATH_DIFF_CONFIG[difficulty];
          setScore((s) => Math.max(0, s - config.penaltyPts));
          setQuestion(generateBlitzQuestion(difficulty));
        }
      }

      window.setTimeout(() => setFeedback(null), 200);
    },
    [
      isPlaying,
      question,
      streak,
      peakStreak,
      subMode,
      ladderQuestionIdx,
      currentLevelConfig,
      ladderLevel,
      difficulty,
      maxQuestionTime,
      onScoreUpdated,
      generateLadderQuestion,
      generateBlitzQuestion,
      handleEndGame,
    ]
  );

  // Keyboard shortcut listener (1-4, Space, Enter, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        onBack();
        return;
      }
      if (!isPlaying) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          startRound();
        }
        return;
      }
      if (isPlaying && question) {
        const keyMap: Record<string, number> = {
          '1': 0,
          '2': 1,
          '3': 2,
          '4': 3,
        };
        if (e.key in keyMap) {
          const idx = keyMap[e.key];
          if (question.options[idx] !== undefined) {
            handleOptionSelect(question.options[idx]);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, question, handleOptionSelect, startRound, onBack]);

  useEffect(() => {
    return () => stopTimer();
  }, []);

  const progressPercent = Math.min(100, (timeLeft / maxQuestionTime) * 100);
  const currentDiffPb = personalBestByDiff[difficulty] || 0;

  const descriptionsMap: Record<GameDifficulty, string> = {
    easy: MATH_DIFF_CONFIG.easy.description,
    medium: MATH_DIFF_CONFIG.medium.description,
    hard: MATH_DIFF_CONFIG.hard.description,
    insane: MATH_DIFF_CONFIG.insane.description,
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

        {/* Sub-Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => {
              stopTimer();
              setSubMode('ladder');
              setIsPlaying(false);
              setGameOver(false);
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1 ${
              subMode === 'ladder'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3 text-rose-400" />
            <span>Math Ladder</span>
          </button>
          <button
            onClick={() => {
              stopTimer();
              setSubMode('blitz');
              setIsPlaying(false);
              setGameOver(false);
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
              subMode === 'blitz'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Timed Blitz
          </button>
        </div>

        <div className="text-right">
          {subMode === 'ladder' ? (
            <>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                Peak Level
              </span>
              <span className="text-xs font-mono font-bold text-rose-400 tabular-nums">
                Level {Math.max(levelPeak, ladderLevel)}
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                {difficulty.toUpperCase()} PB
              </span>
              <span className="text-xs font-mono font-bold text-rose-400 tabular-nums">
                {currentDiffPb} Pts
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
              <span className="text-xs font-black px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                LEVEL {ladderLevel}: {currentLevelConfig.name}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-amber-400">
                {ladderQuestionIdx}/{currentLevelConfig.targetCount} Solved
              </span>
            </div>
          </div>

          {/* Active Stacked Modifiers */}
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
                  <span className="text-rose-400">✓</span>
                  <span>{mod}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BLITZ DIFFICULTY SELECTOR */}
      {subMode === 'blitz' && (
        <DifficultySelector
          difficulty={difficulty}
          onChange={(newDiff) => {
            stopTimer();
            setDifficulty(newDiff);
            setIsPlaying(false);
            setGameOver(false);
          }}
          disabled={isPlaying}
          descriptions={descriptionsMap}
        />
      )}

      {/* Fluid Timer Bar */}
      <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800 mb-2 relative">
        <div
          className={`h-full transition-all duration-100 ease-linear rounded-full ${
            timeLeft < 2.5
              ? 'bg-rose-500 animate-pulse'
              : 'bg-gradient-to-r from-rose-500 to-amber-400'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Game Screen */}
      {!isPlaying && !gameOver && !ladderLevelCleared && (
        <div className="my-auto p-6 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col items-center text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-3">
            <Flame className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">
            {subMode === 'ladder'
              ? `START LEVEL ${ladderLevel}`
              : `SPEED MATH: ${difficulty.toUpperCase()}`}
          </h3>
          <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
            {subMode === 'ladder'
              ? currentLevelConfig.newModifier
              : MATH_DIFF_CONFIG[difficulty].description}
          </p>

          <div className="flex items-center gap-3 mt-4 text-xs text-slate-300 font-mono">
            <span>
              ⏱️{' '}
              {subMode === 'ladder'
                ? `${currentLevelConfig.secondsPerQuestion}s / problem`
                : `${MATH_DIFF_CONFIG[difficulty].duration}s Base`}
            </span>
            <span>·</span>
            <span>
              {subMode === 'ladder'
                ? `🎯 ${currentLevelConfig.targetCount} Solved to Advance`
                : '🔥 Combo Multipliers'}
            </span>
          </div>
        </div>
      )}

      {/* LEVEL CLEARED INTERSTITIAL */}
      {ladderLevelCleared && (
        <div className="my-auto p-6 bg-slate-900/90 border border-emerald-500/40 rounded-3xl flex flex-col items-center text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
            Level Complete!
          </span>
          <h3 className="text-2xl font-black text-white mt-1">
            LEVEL {ladderLevel - 1} CLEARED
          </h3>
          <p className="text-xs text-slate-300 mt-2 max-w-xs">
            Solved all {MATH_LADDER_LEVELS[ladderLevel - 2]?.targetCount} problems without a
            mistake!
          </p>

          <div className="mt-4 p-3 bg-slate-800/80 rounded-2xl border border-slate-700 w-full text-left">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
              Up Next · Level {ladderLevel}:
            </span>
            <span className="text-xs text-white font-medium block mt-0.5">
              {currentLevelConfig.newModifier}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              Time limit: {currentLevelConfig.secondsPerQuestion}s · Target:{' '}
              {currentLevelConfig.targetCount} problems
            </span>
          </div>

          <button
            onClick={startRound}
            className="mt-4 w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>BEGIN LEVEL {ladderLevel}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {isPlaying && question && (
        <div
          className={`my-auto p-6 rounded-3xl border flex flex-col items-center justify-center text-center min-h-[160px] shadow-2xl transition-all ${
            feedback === 'correct'
              ? 'bg-emerald-950/40 border-emerald-500/60 scale-[1.01]'
              : feedback === 'wrong'
              ? 'bg-rose-950/40 border-rose-500/60'
              : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Clock className="w-3 h-3 text-rose-400" />
              <span>{timeLeft.toFixed(1)}s</span>
            </span>
            <span className="text-xs font-mono font-bold text-rose-400 tabular-nums">
              {subMode === 'ladder'
                ? `Problem ${ladderQuestionIdx + 1} of ${currentLevelConfig.targetCount}`
                : `Score: ${score}`}
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-mono font-black text-white tracking-wider my-3 select-none">
            {question.prompt} = ?
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            {subMode === 'ladder'
              ? `Level ${ladderLevel} · ${currentLevelConfig.name}`
              : streak >= 6
              ? '🔥 2.5x Multiplier!'
              : 'Select the correct answer'}
          </div>
        </div>
      )}

      {gameOver && (
        <div className="my-auto p-6 bg-slate-900/90 border border-slate-800 rounded-3xl flex flex-col items-center text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-2">
            <Award className="w-8 h-8" />
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            {subMode === 'ladder' ? `Level ${ladderLevel} Stopped` : 'Round Finished'}
          </span>
          <h3 className="text-xl font-bold text-white mt-1">
            {subMode === 'ladder' ? 'Level Incomplete' : `${score} Pts`}
          </h3>
          <p className="text-xs text-rose-400 mt-1 max-w-xs">{failReason}</p>

          <button
            onClick={startRound}
            className="mt-4 w-full py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>
              {subMode === 'ladder' ? `RETRY LEVEL ${ladderLevel}` : 'PLAY AGAIN'}
            </span>
          </button>
        </div>
      )}

      {/* 4 Answer Options Grid */}
      <div className="grid grid-cols-2 gap-3 my-2">
        {(question ? question.options : [0, 1, 2, 3]).map((opt, idx) => (
          <button
            key={idx}
            disabled={!isPlaying}
            onClick={() => handleOptionSelect(opt)}
            className={`py-4 rounded-2xl font-mono text-xl font-bold transition-all border-2 flex items-center justify-center gap-2 cursor-pointer active:scale-95 select-none relative ${
              isPlaying
                ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 hover:border-cyan-500/50 text-white shadow-lg'
                : 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed opacity-50'
            }`}
            style={{ minHeight: '64px' }}
          >
            <span className="text-[11px] text-slate-500 font-sans font-normal absolute top-2 left-3">
              [{idx + 1}]
            </span>
            <span className="tabular-nums">{question ? opt : '--'}</span>
          </button>
        ))}
      </div>

      {/* Start Button */}
      {!isPlaying && !gameOver && !ladderLevelCleared && (
        <div>
          <button
            onClick={startRound}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-rose-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>
              {subMode === 'ladder'
                ? `BEGIN LEVEL ${ladderLevel}`
                : `START ${difficulty.toUpperCase()} MATH BLITZ`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
