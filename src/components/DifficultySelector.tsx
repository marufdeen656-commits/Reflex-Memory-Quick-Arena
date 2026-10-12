import React from 'react';
import { GameDifficulty } from '../utils/storage';
import { sound } from '../utils/audio';

interface DifficultySelectorProps {
  difficulty: GameDifficulty;
  onChange: (diff: GameDifficulty) => void;
  disabled?: boolean;
  descriptions?: Record<GameDifficulty, string>;
}

const DIFFICULTIES: Array<{
  id: GameDifficulty;
  label: string;
  badge: string;
  activeClass: string;
  borderClass: string;
}> = [
  {
    id: 'easy',
    label: 'Easy',
    badge: 'Relaxed',
    activeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    borderClass: 'hover:border-emerald-500/30',
  },
  {
    id: 'medium',
    label: 'Medium',
    badge: 'Standard',
    activeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    borderClass: 'hover:border-cyan-500/30',
  },
  {
    id: 'hard',
    label: 'Hard',
    badge: 'Intense',
    activeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    borderClass: 'hover:border-amber-500/30',
  },
  {
    id: 'insane',
    label: 'Insane',
    badge: 'Extreme',
    activeClass: 'bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.25)]',
    borderClass: 'hover:border-rose-500/30',
  },
];

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  difficulty,
  onChange,
  disabled = false,
  descriptions,
}) => {
  const handleSelect = (diff: GameDifficulty) => {
    if (disabled || diff === difficulty) return;
    sound.playTap();
    onChange(diff);
  };

  return (
    <div className="w-full mb-3">
      {/* Segmented Control Bar */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
        {DIFFICULTIES.map((d) => {
          const isActive = difficulty === d.id;
          return (
            <button
              key={d.id}
              disabled={disabled}
              onClick={() => handleSelect(d.id)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all border whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
                isActive
                  ? `${d.activeClass} shadow-sm`
                  : `border-transparent text-slate-400 hover:text-slate-200 ${d.borderClass}`
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>{d.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1-Line Dynamic Parameter Explanation */}
      {descriptions && descriptions[difficulty] && (
        <p className="text-[11px] text-slate-400 text-center mt-1.5 font-medium">
          {descriptions[difficulty]}
        </p>
      )}
    </div>
  );
};
