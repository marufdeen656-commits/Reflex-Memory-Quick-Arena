/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, BarChart3, Zap, Brain, Flame, Trophy, ShieldAlert } from 'lucide-react';
import { sound } from './utils/audio';
import { loadArenaStats, ArenaStats } from './utils/storage';
import { ArenaHub, GameMode } from './components/ArenaHub';
import { ReflexView } from './components/ReflexView';
import { MemoryView } from './components/MemoryView';
import { MathView } from './components/MathView';
import { ChimpView } from './components/ChimpView';
import { StroopView } from './components/StroopView';
import { GauntletView } from './components/GauntletView';
import { StatsModal } from './components/StatsModal';

export default function App() {
  const [currentMode, setCurrentMode] = useState<GameMode>('hub');
  const [stats, setStats] = useState<ArenaStats>(loadArenaStats());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(sound.isEnabled());
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);

  const refreshStats = useCallback(() => {
    setStats(loadArenaStats());
  }, []);

  const handleToggleSound = () => {
    const newState = sound.toggle();
    setSoundEnabled(newState);
  };

  const handleSelectMode = (mode: GameMode) => {
    setCurrentMode(mode);
  };

  const handleBackToHub = () => {
    sound.playTap();
    setCurrentMode('hub');
    refreshStats();
  };

  return (
    <div className="min-h-full flex flex-col justify-between bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500 selection:text-black">
      {/* Top Bar adhering to Top Bar Contract */}
      <header className="w-full bg-slate-900/90 border-b border-slate-800/80 px-4 py-3 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          {/* Zone 1: Brand title */}
          <button
            onClick={handleBackToHub}
            className="flex items-center gap-2.5 cursor-pointer text-left focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center font-black text-black text-base shadow-md">
              ⚡
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
                ARENA MVP
              </h1>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">
                Reflex & Memory
              </span>
            </div>
          </button>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden sm:flex items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => handleSelectMode('hub')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentMode === 'hub' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hub
            </button>
            <button
              onClick={() => handleSelectMode('reflex')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentMode === 'reflex' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Reflex Speed
            </button>
            <button
              onClick={() => handleSelectMode('memory')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentMode === 'memory' ? 'bg-slate-800 text-purple-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Simon Memory
            </button>
            <button
              onClick={() => handleSelectMode('math')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentMode === 'math' ? 'bg-slate-800 text-rose-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Math Blitz
            </button>
            <button
              onClick={() => handleSelectMode('gauntlet')}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentMode === 'gauntlet' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              Triathlon
            </button>
          </nav>

          {/* Zone 3: Primary Actions (Sound Toggle & Stats) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsStatsOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Career Records & History"
            >
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xs:inline">Stats</span>
            </button>

            <button
              onClick={handleToggleSound}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Toggle Synthesizer Sound"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="tabular-nums">ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  <span className="tabular-nums text-slate-500">OFF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Arena */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-4 flex flex-col justify-center">
        {currentMode === 'hub' && (
          <ArenaHub
            stats={stats}
            onSelectMode={handleSelectMode}
            onOpenStats={() => setIsStatsOpen(true)}
          />
        )}

        {currentMode === 'reflex' && (
          <ReflexView
            onBack={handleBackToHub}
            personalBestByDiff={stats.reflexBestByDiff}
            levelPeak={stats.reflexLevelPeak || 1}
            onScoreUpdated={refreshStats}
          />
        )}

        {currentMode === 'memory' && (
          <MemoryView
            onBack={handleBackToHub}
            personalBest={stats.memoryBest}
            onScoreUpdated={refreshStats}
          />
        )}

        {currentMode === 'math' && (
          <MathView
            onBack={handleBackToHub}
            personalBestByDiff={stats.mathBestByDiff}
            personalBestStreak={stats.mathBestStreak}
            levelPeak={stats.mathLevelPeak || 1}
            onScoreUpdated={refreshStats}
          />
        )}

        {currentMode === 'chimp' && (
          <ChimpView
            onBack={handleBackToHub}
            personalBest={stats.chimpBest}
            onScoreUpdated={refreshStats}
          />
        )}

        {currentMode === 'stroop' && (
          <StroopView
            onBack={handleBackToHub}
            personalBest={stats.stroopBest}
            onScoreUpdated={refreshStats}
          />
        )}

        {currentMode === 'gauntlet' && (
          <GauntletView
            onBack={handleBackToHub}
            personalBest={stats.gauntletBest}
            onScoreUpdated={refreshStats}
          />
        )}
      </main>

      {/* Career Stats Modal */}
      <StatsModal
        stats={stats}
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        onReset={refreshStats}
      />

      {/* Quiet Footer */}
      <footer className="w-full border-t border-slate-900 py-3 px-4 text-center text-[11px] text-slate-500">
        <span>Reflex & Memory Quiz Arena</span>
        <span className="mx-2">·</span>
        <span>Low-latency audio synthesis enabled</span>
        <span className="mx-2">·</span>
        <span>Precision millisecond timing</span>
      </footer>
    </div>
  );
}
