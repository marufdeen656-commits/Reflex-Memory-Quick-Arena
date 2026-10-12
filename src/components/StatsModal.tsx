import React from 'react';
import { X, Trophy, Zap, Brain, Flame, Grid, Eye, RotateCcw } from 'lucide-react';
import { ArenaStats, resetAllStats } from '../utils/storage';
import { sound } from '../utils/audio';

interface StatsModalProps {
  stats: ArenaStats;
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ stats, isOpen, onClose, onReset }) => {
  if (!isOpen) return null;

  const handleReset = () => {
    if (window.confirm('Reset all personal bests and history records?')) {
      resetAllStats();
      sound.playTap();
      onReset();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Career Performance</h3>
            <span className="text-xs text-slate-400">Personal records & arena history</span>
          </div>
        </div>

        {/* Global Summary */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Games Played</span>
            <span className="text-2xl font-mono font-bold text-white tabular-nums">{stats.totalGamesPlayed}</span>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Triathlon PB</span>
            <span className="text-2xl font-mono font-bold text-cyan-400 tabular-nums">
              {stats.gauntletBest > 0 ? `${stats.gauntletBest} Pts` : '--'}
            </span>
          </div>
        </div>

        {/* Individual Modes Records */}
        <div className="space-y-2 mb-5">
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Reflex Speed Record</span>
                <span className="text-[10px] text-cyan-400 font-mono">Ladder Peak: Level {stats.reflexLevelPeak || 1}</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 tabular-nums">
              {stats.reflexBest !== null ? `${stats.reflexBest} ms` : '--'}
            </span>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-slate-200">Pattern Memory Peak</span>
            </div>
            <span className="text-xs font-mono font-bold text-purple-400 tabular-nums">
              {stats.memoryBest > 0 ? `Level ${stats.memoryBest}` : '--'}
            </span>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-rose-400" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Speed Math Blitz</span>
                <span className="text-[10px] text-rose-400 font-mono">Ladder Peak: Level {stats.mathLevelPeak || 1}</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-rose-400 tabular-nums">
              {stats.mathBest > 0 ? `${stats.mathBest} Pts (${stats.mathBestStreak}x streak)` : '--'}
            </span>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Grid className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-slate-200">Chimp Working Memory</span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
              {stats.chimpBest > 0 ? `${stats.chimpBest} Tiles` : '--'}
            </span>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-200">Stroop Focus Clash</span>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 tabular-nums">
              {stats.stroopBest > 0 ? `${stats.stroopBest} Pts` : '--'}
            </span>
          </div>
        </div>

        {/* Reflex Last 5 History */}
        {stats.reflexHistory.length > 0 && (
          <div className="mb-5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Recent Reaction Trials
            </span>
            <div className="space-y-1.5">
              {stats.reflexHistory.slice(0, 5).map((attempt, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-800/30 rounded-lg">
                  <span className="text-slate-400 text-[11px]">#{idx + 1} {attempt.rating}</span>
                  <span className="font-mono font-bold text-white tabular-nums">{attempt.ms} ms</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
          <button
            onClick={handleReset}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Stats</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
