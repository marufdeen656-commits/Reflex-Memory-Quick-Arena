import React from 'react';
import { Zap, Brain, Flame, Grid, Eye, Trophy, Play, ChevronRight, BarChart3 } from 'lucide-react';
import { ArenaStats } from '../utils/storage';
import { sound } from '../utils/audio';

export type GameMode = 'hub' | 'reflex' | 'memory' | 'math' | 'chimp' | 'stroop' | 'gauntlet';

interface ArenaHubProps {
  stats: ArenaStats;
  onSelectMode: (mode: GameMode) => void;
  onOpenStats: () => void;
}

export const ArenaHub: React.FC<ArenaHubProps> = ({ stats, onSelectMode, onOpenStats }) => {
  const handleLaunch = (mode: GameMode) => {
    sound.playTap();
    onSelectMode(mode);
  };

  return (
    <div className="w-full flex-1 flex flex-col gap-4 py-2 max-w-xl mx-auto">
      {/* Hero Intro Banner */}
      <div className="text-center py-2">
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Reflex & Memory Quiz Arena
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
          Test your neural reaction velocity, working spatial memory, and mental arithmetic precision.
        </p>
      </div>

      {/* FEATURED: Arena Triathlon Hero Card */}
      <div
        onClick={() => handleLaunch('gauntlet')}
        className="rounded-3xl p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-500/30 hover:border-cyan-500/60 shadow-xl transition-all cursor-pointer group active:scale-[0.99] relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Composite Benchmark
            </span>
            <span className="text-[11px] text-slate-400">· 3 Stages</span>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 tabular-nums">
            Best: {stats.gauntletBest > 0 ? `${stats.gauntletBest} Pts` : '-- Pts'}
          </span>
        </div>

        <div className="flex items-start justify-between relative z-10">
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
              <span>Arena Triathlon</span>
              <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-sm">
              Complete Reflex Trials, Simon Pattern, and Math Blitz back-to-back to receive an official Arena Cyber-Rank.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:bg-cyan-500 group-hover:text-black transition-all">
            <Trophy className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* CORE 3 SPECIALIZED MODES (From User Brief) */}
      <div className="space-y-3">
        {/* MODE 1: REFLEX SPEED */}
        <div
          onClick={() => handleLaunch('reflex')}
          className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-4 flex items-center gap-3.5 cursor-pointer active:scale-[0.99] transition-all group shadow-md"
        >
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-all shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors truncate">
                Reflex Speed Test
              </h3>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/30 tabular-nums">
                  Lvl {stats.reflexLevelPeak || 1}
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/80 tabular-nums">
                  {stats.reflexBest !== null ? `${stats.reflexBest} ms` : '-- ms'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              Level-by-level progressive difficulty ladder, practice, or 5-round benchmark.
            </p>
          </div>
        </div>

        {/* MODE 2: SIMON MEMORY */}
        <div
          onClick={() => handleLaunch('memory')}
          className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-4 flex items-center gap-3.5 cursor-pointer active:scale-[0.99] transition-all group shadow-md"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-black transition-all shrink-0">
            <Brain className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-white group-hover:text-purple-400 transition-colors truncate">
                Memory Pattern Match
              </h3>
              <span className="text-[11px] font-mono font-bold text-purple-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/80 tabular-nums shrink-0">
                Level {stats.memoryBest}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              Repeat the sequence of flashing colors and audio chimes.
            </p>
          </div>
        </div>

        {/* MODE 3: SPEED MATH BLITZ */}
        <div
          onClick={() => handleLaunch('math')}
          className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/40 rounded-2xl p-4 flex items-center gap-3.5 cursor-pointer active:scale-[0.99] transition-all group shadow-md"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:bg-rose-500 group-hover:text-black transition-all shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-white group-hover:text-rose-400 transition-colors truncate">
                Speed Math Blitz
              </h3>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30 tabular-nums">
                  Lvl {stats.mathLevelPeak || 1}
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/80 tabular-nums">
                  {stats.mathBest} Pts
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              Level-by-level progressive difficulty ladder or 15-second rapid blitz round.
            </p>
          </div>
        </div>
      </div>

      {/* ADDITIONAL COGNITIVE TRAINING LAB MODES */}
      <div className="grid grid-cols-2 gap-3">
        {/* MODE 4: CHIMP TEST */}
        <div
          onClick={() => handleLaunch('chimp')}
          className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] transition-all group shadow-md min-h-[110px]"
        >
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-all">
              <Grid className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-400 tabular-nums">
              {stats.chimpBest > 0 ? `${stats.chimpBest} Tiles` : '--'}
            </span>
          </div>
          <div className="mt-2">
            <h4 className="font-bold text-xs text-white group-hover:text-amber-400 transition-colors">
              Chimp Memory
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Recall hidden spatial tiles in numeric order.
            </p>
          </div>
        </div>

        {/* MODE 5: STROOP FOCUS */}
        <div
          onClick={() => handleLaunch('stroop')}
          className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer active:scale-[0.99] transition-all group shadow-md min-h-[110px]"
        >
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-all">
              <Eye className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono font-bold text-cyan-400 tabular-nums">
              {stats.stroopBest > 0 ? `${stats.stroopBest} Pts` : '--'}
            </span>
          </div>
          <div className="mt-2">
            <h4 className="font-bold text-xs text-white group-hover:text-cyan-400 transition-colors">
              Stroop Clash
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Fight cognitive interference between font & ink.
            </p>
          </div>
        </div>
      </div>

      {/* Career Stats Footer Button */}
      <button
        onClick={onOpenStats}
        className="w-full py-2.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <BarChart3 className="w-4 h-4 text-slate-400" />
        <span>View Personal Records & History ({stats.totalGamesPlayed} rounds completed)</span>
      </button>
    </div>
  );
};
