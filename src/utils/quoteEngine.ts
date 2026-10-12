import { ALL_QUOTES, Quote } from '../data/quotes';

// Tone.js declarations for browser
declare const Tone: any;

const BAG_KEY = 'cyber_arena_quote_bag_v1';
const BAG_INDEX_KEY = 'cyber_arena_quote_index_v1';
const LAST_SHOWN_KEY = 'cyber_arena_last_quote_v1';
const SAVED_QUOTES_KEY = 'cyber_arena_saved_quotes_v1';
const ROUNDS_COUNT_KEY = 'cyber_arena_rounds_count_v1';

export class QuoteEngine {
  private bag: number[] = [];
  private pointer: number = 0;
  private lastQuoteIndex: number = -1;
  private currentPlayingSynths: any[] = [];
  private musicTimeout: number | null = null;

  constructor() {
    this.loadBag();
  }

  // Round counter tracking
  public getRoundCount(): number {
    try {
      const val = localStorage.getItem(ROUNDS_COUNT_KEY);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  public incrementRoundCount(): { count: number; shouldShowQuote: boolean } {
    const nextCount = this.getRoundCount() + 1;
    try {
      localStorage.setItem(ROUNDS_COUNT_KEY, nextCount.toString());
    } catch {}
    // Show only after every 3rd round (3, 6, 9, 12...)
    const shouldShowQuote = nextCount % 3 === 0;
    return { count: nextCount, shouldShowQuote };
  }

  // Shuffle bag implementation
  private loadBag() {
    try {
      const rawBag = localStorage.getItem(BAG_KEY);
      const rawIdx = localStorage.getItem(BAG_INDEX_KEY);
      const rawLast = localStorage.getItem(LAST_SHOWN_KEY);

      if (rawBag && rawIdx !== null) {
        this.bag = JSON.parse(rawBag);
        this.pointer = parseInt(rawIdx, 10);
        this.lastQuoteIndex = rawLast !== null ? parseInt(rawLast, 10) : -1;
      }
    } catch {
      this.bag = [];
      this.pointer = 0;
    }

    if (!this.bag || this.bag.length !== ALL_QUOTES.length || this.pointer >= this.bag.length) {
      this.createNewBag();
    }
  }

  private createNewBag() {
    // Array of indices 0 to ALL_QUOTES.length - 1
    const indices = Array.from({ length: ALL_QUOTES.length }, (_, i) => i);

    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Never show the exact same quote twice across reshuffle
    if (indices[0] === this.lastQuoteIndex && indices.length > 1) {
      [indices[0], indices[1]] = [indices[1], indices[0]];
    }

    this.bag = indices;
    this.pointer = 0;
    this.saveBagState();
  }

  private saveBagState() {
    try {
      localStorage.setItem(BAG_KEY, JSON.stringify(this.bag));
      localStorage.setItem(BAG_INDEX_KEY, this.pointer.toString());
      localStorage.setItem(LAST_SHOWN_KEY, this.lastQuoteIndex.toString());
    } catch {}
  }

  // Mood-aware quote retrieval
  public getNextQuote(isGoodResult: boolean): Quote {
    if (this.pointer >= this.bag.length) {
      this.createNewBag();
    }

    const preferredMood: 'win' | 'perseverance' = isGoodResult ? 'win' : 'perseverance';

    // Scan ahead up to 12 quotes in the bag for preferred mood
    let chosenIdxInBag = this.pointer;
    const lookaheadLimit = Math.min(this.bag.length, this.pointer + 12);

    for (let i = this.pointer; i < lookaheadLimit; i++) {
      const quoteCandidate = ALL_QUOTES[this.bag[i]];
      if (quoteCandidate && quoteCandidate.mood === preferredMood) {
        // Swap into current position to preserve bag integrity
        [this.bag[this.pointer], this.bag[i]] = [this.bag[i], this.bag[this.pointer]];
        chosenIdxInBag = this.pointer;
        break;
      }
    }

    const selectedIndex = this.bag[chosenIdxInBag];
    this.lastQuoteIndex = selectedIndex;
    this.pointer++;
    this.saveBagState();

    return ALL_QUOTES[selectedIndex];
  }

  // Saved quotes (Favorites)
  public getSavedQuotes(): Quote[] {
    try {
      const raw = localStorage.getItem(SAVED_QUOTES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public isQuoteSaved(text: string): boolean {
    const list = this.getSavedQuotes();
    return list.some((q) => q.text === text);
  }

  public toggleSaveQuote(quote: Quote): boolean {
    let list = this.getSavedQuotes();
    const exists = list.some((q) => q.text === quote.text);
    if (exists) {
      list = list.filter((q) => q.text !== quote.text);
    } else {
      list.unshift(quote);
    }
    try {
      localStorage.setItem(SAVED_QUOTES_KEY, JSON.stringify(list));
    } catch {}
    return !exists;
  }

  // Tone.js Cinematic Theme Music (6-8 seconds)
  public async playCinematicTheme(soundEnabled: boolean, onAuthorTime?: () => void) {
    if (!soundEnabled || typeof Tone === 'undefined') return;

    this.stopCinematicMusic();

    try {
      await Tone.start();
      const now = Tone.now();

      // Master gain for smooth fade-out
      const masterGain = new Tone.Gain(0.7).toDestination();
      this.currentPlayingSynths.push(masterGain);

      // 1. Soft Warm Synth Pad Chord (D major 9 / Ambient celestial pad)
      const padSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 1.4, decay: 3.5, sustain: 0.3, release: 2.0 },
      }).connect(masterGain);
      padSynth.volume.value = -12;
      this.currentPlayingSynths.push(padSynth);

      // Trigger chord: D3, A3, F#4, C#5
      padSynth.triggerAttackRelease(['D3', 'A3', 'F#4', 'C#5'], '5s', now);

      // 2. Slow Rising Arpeggio (ambient bell-like notes)
      const arpSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.08, decay: 1.2, sustain: 0.05, release: 1.0 },
      }).connect(masterGain);
      arpSynth.volume.value = -14;
      this.currentPlayingSynths.push(arpSynth);

      const arpNotes = ['D4', 'F#4', 'A4', 'C#5', 'E5', 'F#5'];
      arpNotes.forEach((note, i) => {
        arpSynth.triggerAttackRelease(note, '8n', now + 1.2 + i * 0.55);
      });

      // 3. Deep Low Bass Note when author appears (~4.2s in)
      const bassSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.3, decay: 2.5, sustain: 0.2, release: 1.8 },
      }).connect(masterGain);
      bassSynth.volume.value = -8;
      this.currentPlayingSynths.push(bassSynth);

      // Trigger low D2/D1 note
      bassSynth.triggerAttackRelease('D2', '3s', now + 4.2);

      if (onAuthorTime) {
        this.musicTimeout = window.setTimeout(onAuthorTime, 4200);
      }
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  public stopCinematicMusic() {
    if (this.musicTimeout !== null) {
      window.clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }

    try {
      this.currentPlayingSynths.forEach((synth) => {
        if (synth && synth.dispose) {
          try {
            if (synth.volume && synth.volume.rampTo) {
              synth.volume.rampTo(-60, 0.35);
              setTimeout(() => synth.dispose(), 400);
            } else {
              synth.dispose();
            }
          } catch {
            synth.dispose();
          }
        }
      });
      this.currentPlayingSynths = [];
    } catch {}
  }
}

export const quoteEngine = new QuoteEngine();
