import React, { useState, useEffect, useRef } from 'react';
import { Heart, FastForward, ChevronRight, Sparkles } from 'lucide-react';
import { Quote } from '../data/quotes';
import { quoteEngine } from '../utils/quoteEngine';

interface CinematicQuoteModalProps {
  quote: Quote | null;
  isOpen: boolean;
  soundEnabled: boolean;
  onClose: () => void;
  onSavedChange?: () => void;
}

export const CinematicQuoteModal: React.FC<CinematicQuoteModalProps> = ({
  quote,
  isOpen,
  soundEnabled,
  onClose,
  onSavedChange,
}) => {
  const [showSkip, setShowSkip] = useState<boolean>(false);
  const [showAuthor, setShowAuthor] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [visibleLines, setVisibleLines] = useState<string[]>([]);

  const timersRef = useRef<number[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => {
    if (!isOpen || !quote) {
      clearAllTimers();
      quoteEngine.stopCinematicMusic();
      return;
    }

    setShowSkip(false);
    setShowAuthor(false);
    setIsSaved(quoteEngine.isQuoteSaved(quote.text));

    // Split quote into 2-3 natural lines for staggered fade-in
    const words = quote.text.split(' ');
    const lineCount = words.length > 10 ? 3 : words.length > 5 ? 2 : 1;
    const wordsPerLine = Math.ceil(words.length / lineCount);
    const lines: string[] = [];
    for (let i = 0; i < words.length; i += wordsPerLine) {
      lines.push(words.slice(i, i + wordsPerLine).join(' '));
    }
    setVisibleLines(lines);

    // 1. Play 6-8s Tone.js Theme music
    quoteEngine.playCinematicTheme(soundEnabled, () => {
      setShowAuthor(true);
    });

    // 2. Skip button appears after 2 seconds
    const skipTimer = window.setTimeout(() => {
      setShowSkip(true);
    }, 2000);
    timersRef.current.push(skipTimer);

    // 3. Author appears at 3.8 seconds if not already shown
    const authorTimer = window.setTimeout(() => {
      setShowAuthor(true);
    }, 3800);
    timersRef.current.push(authorTimer);

    return () => {
      clearAllTimers();
      quoteEngine.stopCinematicMusic();
    };
  }, [isOpen, quote, soundEnabled]);

  if (!isOpen || !quote) return null;

  const handleToggleHeart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newSaved = quoteEngine.toggleSaveQuote(quote);
    setIsSaved(newSaved);
    if (onSavedChange) onSavedChange();
  };

  const handleDismiss = () => {
    quoteEngine.stopCinematicMusic();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-between items-center p-6 text-center select-none animate-fadeIn">
      {/* Top Bar: Saved Heart & Skip Button */}
      <div className="w-full max-w-lg flex items-center justify-between pt-2">
        {/* Heart Favorite Button */}
        <button
          onClick={handleToggleHeart}
          className={`p-2.5 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
            isSaved
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
          }`}
          title={isSaved ? 'Saved to Collection' : 'Save Quote'}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
          <span className="text-[10px] font-mono font-bold uppercase">
            {isSaved ? 'Saved' : 'Save'}
          </span>
        </button>

        {/* Skip Button (Reveals after 2 seconds) */}
        {showSkip && (
          <button
            onClick={handleDismiss}
            className="px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-mono font-semibold border border-slate-800 flex items-center gap-1.5 transition-all cursor-pointer animate-fadeIn"
          >
            <span>Skip</span>
            <FastForward className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Quote Text: Staggered Line Fade-in */}
      <div className="my-auto max-w-lg px-4 flex flex-col items-center">
        {/* Ambient Mood Badge */}
        <div className="mb-6 flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono uppercase tracking-widest">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Reflection · Round Milestone</span>
        </div>

        {/* Quote Body */}
        <div className="space-y-3 font-serif text-2xl sm:text-3xl md:text-4xl text-slate-100 font-medium leading-relaxed tracking-wide italic">
          <span className="text-cyan-400 font-sans text-4xl leading-none">“</span>
          {visibleLines.map((line, idx) => (
            <p
              key={idx}
              className="transition-all duration-700 ease-out transform translate-y-0 opacity-100"
              style={{
                animation: `fadeInUp 0.8s ease-out ${idx * 0.4}s forwards`,
              }}
            >
              {line}
            </p>
          ))}
          <span className="text-cyan-400 font-sans text-4xl leading-none">”</span>
        </div>

        {/* Author Name: Appears Last */}
        <div
          className={`mt-8 transition-all duration-1000 ease-out transform ${
            showAuthor ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto mb-3" />
          <h4 className="text-base sm:text-lg font-sans font-bold tracking-widest text-cyan-300 uppercase">
            — {quote.author}
          </h4>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1 block">
            {quote.mood}
          </span>
        </div>
      </div>

      {/* Bottom CTA Continue Button */}
      <div className="w-full max-w-xs pb-4">
        <button
          onClick={handleDismiss}
          className={`w-full py-3.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-black text-xs tracking-wider uppercase rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 ${
            showAuthor ? 'opacity-100' : 'opacity-80'
          }`}
        >
          <span>Continue</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <style>{`
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
