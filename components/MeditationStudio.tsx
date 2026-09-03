import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Maximize2,
  Minimize2,
  Sliders,
  Volume2,
  Clock,
  BookOpen,
  CheckCircle2,
  Loader2,
  Trash2,
  Layers,
  Wind
} from 'lucide-react';
import {
  generateMeditationScript,
  generateMeditationAudio,
  generateMeditationVisual,
  fetchDailyFocus,
  cleanClientErrorMessage,
} from '../services/geminiService';
import { createAudioUrlFromBase64, AmbientSoundEngine } from '../utils/audioUtils';
import { ProceduralSanctuary } from './ProceduralSanctuary';
import { SessionConfig, SessionHistoryItem, VoiceName } from '../types';

const VOICES: Array<{ value: VoiceName; label: string; desc: string; vibe: string }> = [
  { value: 'Zephyr', label: 'Zephyr', desc: 'Balanced, serene, and warm presence', vibe: 'Daily Mindfulness' },
  { value: 'Kore', label: 'Kore', desc: 'Gentle, soothing, and emotionally comforting', vibe: 'Healing & Stress' },
  { value: 'Charon', label: 'Charon', desc: 'Deep, slow-paced, and profoundly resonant', vibe: 'Deep Rest & Sleep' },
  { value: 'Fenrir', label: 'Fenrir', desc: 'Steady, grounding, and anchoring tone', vibe: 'Focus & Stability' },
  { value: 'Puck', label: 'Puck', desc: 'Light, uplifting, and rejuvenating energy', vibe: 'Morning Awakening' },
];

const ATMOSPHERES = [
  'Mountain Mist & Serenity',
  'Starlit Cosmic Canopy',
  'Oceanic Drift & Tide',
  'Peaceful Zen Garden',
  'Golden Sunlit Meadow',
];

const AMBIENT_OPTIONS: Array<{
  value: SessionConfig['ambientSound'];
  label: string;
  desc: string;
}> = [
  { value: 'lyria-ambient', label: 'Lyria Ambient Soundscape', desc: 'Lush 432Hz atmospheric chords' },
  { value: 'binaural-drone', label: '432Hz Binaural Drone', desc: 'Theta frequency for deep relaxation' },
  { value: 'singing-bowl', label: 'Tibetan Singing Bowls', desc: 'Harmonic acoustic resonance' },
  { value: 'ocean-drift', label: 'Oceanic Drift', desc: 'Gentle rhythmic wave swells' },
  { value: 'gentle-rain', label: 'Soft Rainfall', desc: 'Warm natural white noise' },
  { value: 'none', label: 'Silence (Voice Only)', desc: 'Pure vocal guidance' },
];

const INSPIRATIONS = [
  'Deep Sleep & Releasing Anxiety',
  'Walking in a Moonlit Pine Forest',
  'Letting Go of Overwhelm & Resetting',
  'Loving-Kindness & Heart Opening',
  'Morning Stillness & Fresh Clarity',
];

export const MeditationStudio: React.FC = () => {
  const [config, setConfig] = useState<SessionConfig>({
    prompt: '',
    voice: 'Zephyr',
    atmosphere: 'Mountain Mist & Serenity',
    duration: 'medium',
    ambientSound: 'binaural-drone',
  });

  const [dailyFocus, setDailyFocus] = useState<string>('Inhale calm, exhale tension, and be here in this sacred now.');
  const [isRefreshingFocus, setIsRefreshingFocus] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Session state
  const [activeSession, setActiveSession] = useState<{
    prompt: string;
    atmosphere: string;
    voice: VoiceName;
    audioUrl: string;
    imageBase64: string | null;
    script: string;
    ambientSound: SessionConfig['ambientSound'];
  } | null>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isZenMode, setIsZenMode] = useState(false);
  const [showBreathingPacer, setShowBreathingPacer] = useState(true);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(1);
  const [ambientVolume, setAmbientVolume] = useState(0.25);

  // History state
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientEngineRef = useRef<AmbientSoundEngine | null>(null);

  // Load history & focus on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('zenith_sessions');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.warn(e);
    }

    refreshDailyFocus();

    ambientEngineRef.current = new AmbientSoundEngine();
    return () => {
      ambientEngineRef.current?.stop();
    };
  }, []);

  const refreshDailyFocus = async () => {
    setIsRefreshingFocus(true);
    try {
      const quote = await fetchDailyFocus();
      setDailyFocus(quote);
    } catch (e) {
      // fallback
    } finally {
      setIsRefreshingFocus(false);
    }
  };

  // Synchronize audio playback, speech narration & ambient sound
  useEffect(() => {
    if (!ambientEngineRef.current) return;

    if (activeSession && isPlaying) {
      if (activeSession.ambientSound !== 'none') {
        ambientEngineRef.current.start(activeSession.ambientSound, ambientVolume);
      }
      if (activeSession.audioUrl) {
        audioRef.current?.play().catch(() => {});
      } else if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(activeSession.script.replace(/\.\.\./g, ', '));
        utterance.rate = 0.85;
        utterance.pitch = 0.95;
        utterance.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
      }
    } else {
      ambientEngineRef.current.stop();
      if (activeSession?.audioUrl) {
        audioRef.current?.pause();
      } else if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isPlaying, activeSession?.ambientSound, activeSession?.audioUrl]);

  useEffect(() => {
    ambientEngineRef.current?.setVolume(ambientVolume);
  }, [ambientVolume]);

  const handleGenerate = async () => {
    const promptText = config.prompt.trim() || 'A peaceful journey into deep presence and quiet stillness';
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      // Step 1: Generate Meditation Script
      setGenerationStep('Crafting personalized meditation script...');
      const script = await generateMeditationScript({ ...config, prompt: promptText });

      // Step 2: Generate TTS Voiceover Audio
      setGenerationStep(`Synthesizing voiceover with ${config.voice}...`);
      const audioResult = await generateMeditationAudio(script, config.voice);
      const audioBase64 = audioResult.audioBase64;
      let audioUrl = '';
      if (audioBase64) {
        audioUrl = await createAudioUrlFromBase64(audioBase64);
      }

      // Step 3: Generate visual sanctuary (or fallback gracefully)
      setGenerationStep('Designing visual sanctuary atmosphere...');
      const visualRes = await generateMeditationVisual(promptText, config.atmosphere);

      const sessionObj = {
        prompt: promptText,
        atmosphere: config.atmosphere,
        voice: config.voice,
        audioUrl,
        imageBase64: visualRes.imageBase64,
        script,
        ambientSound: config.ambientSound,
      };

      setActiveSession(sessionObj);
      setIsPlaying(true);

      // Save to history
      const historyEntry: SessionHistoryItem = {
        id: `sess-${Date.now()}`,
        prompt: promptText,
        atmosphere: config.atmosphere,
        voice: config.voice,
        script,
        imageBase64: visualRes.imageBase64,
        audioBase64,
        timestamp: Date.now(),
      };

      const newHistory = [historyEntry, ...history.filter((h) => h.prompt !== promptText)].slice(0, 8);
      setHistory(newHistory);
      localStorage.setItem('zenith_sessions', JSON.stringify(newHistory));
    } catch (err: any) {
      console.error('Generation error:', err);
      setErrorMessage(cleanClientErrorMessage(err.message || err));
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const loadPreviousSession = async (item: SessionHistoryItem) => {
    try {
      setIsGenerating(true);
      setGenerationStep('Re-opening sanctuary...');
      const audioUrl = item.audioBase64 ? await createAudioUrlFromBase64(item.audioBase64) : '';
      setActiveSession({
        prompt: item.prompt,
        atmosphere: item.atmosphere,
        voice: item.voice,
        audioUrl,
        imageBase64: item.imageBase64 || null,
        script: item.script || '',
        ambientSound: 'binaural-drone',
      });
      setIsPlaying(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      setErrorMessage(cleanClientErrorMessage(e.message || 'Could not load past session'));
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    localStorage.setItem('zenith_sessions', JSON.stringify(updated));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div id="meditation-studio" className="max-w-4xl mx-auto space-y-8">
      {/* Daily Mindfulness Intention */}
      {!activeSession && (
        <div className="rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-indigo-500/20 p-4 sm:p-5 shadow-lg flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] uppercase font-semibold tracking-wider text-indigo-400">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Daily Intention</span>
            </div>
            <p className="text-slate-100 text-sm sm:text-base font-light italic leading-relaxed">
              "{dailyFocus}"
            </p>
          </div>
          <button
            onClick={refreshDailyFocus}
            disabled={isRefreshingFocus}
            className="p-2.5 rounded-full hover:bg-slate-700/60 text-indigo-300 hover:text-white transition-all disabled:opacity-40 flex-shrink-0"
            title="Refresh intention"
          >
            <RotateCcw className={`w-4 h-4 ${isRefreshingFocus ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Generation Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              Try Again
            </button>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 hover:underline px-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Active Meditation Player */}
      {activeSession && (
        <div
          className={`relative rounded-3xl overflow-hidden border border-slate-700/60 shadow-2xl transition-all duration-700 ${
            isZenMode
              ? 'fixed inset-0 z-50 rounded-none border-none bg-black flex flex-col justify-between'
              : 'w-full min-h-[460px] flex flex-col justify-between'
          }`}
        >
          {/* Sanctuary Visual Backdrop */}
          <div className="absolute inset-0 z-0">
            {activeSession.imageBase64 ? (
              <img
                src={`data:image/jpeg;base64,${activeSession.imageBase64}`}
                alt="Sanctuary"
                className="w-full h-full object-cover animate-pulse duration-[12000ms]"
              />
            ) : (
              <ProceduralSanctuary atmosphere={activeSession.atmosphere} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/60 pointer-events-none" />
          </div>

          {/* Top Bar inside Player */}
          <div className="relative z-10 p-5 sm:p-7 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 bg-indigo-950/70 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                {activeSession.atmosphere}
              </span>
              <h3 className="text-lg sm:text-xl font-light text-white tracking-tight drop-shadow-md">
                {activeSession.prompt}
              </h3>
              <p className="text-xs text-slate-300">Guided by {activeSession.voice}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBreathingPacer(!showBreathingPacer)}
                className={`p-2 rounded-xl text-xs flex items-center gap-1.5 backdrop-blur-md transition-all border ${
                  showBreathingPacer
                    ? 'bg-indigo-600/60 border-indigo-400/80 text-white'
                    : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Toggle Breathing Pacer"
              >
                <Wind className="w-4 h-4" />
                <span className="hidden sm:inline">Breath Pacer</span>
              </button>

              <button
                onClick={() => setShowScriptModal(true)}
                className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5 backdrop-blur-md transition-all"
                title="Read script"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Script</span>
              </button>

              <button
                onClick={() => setIsZenMode(!isZenMode)}
                className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5 backdrop-blur-md transition-all"
                title={isZenMode ? 'Exit Zen mode' : 'Zen Fullscreen'}
              >
                {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  setActiveSession(null);
                  setIsPlaying(false);
                  setIsZenMode(false);
                }}
                className="p-2 rounded-xl bg-slate-900/60 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 text-xs backdrop-blur-md transition-all"
              >
                Exit Session
              </button>
            </div>
          </div>

          {/* Central Animated Breathing Pacer Ring */}
          <div className="relative z-10 flex-grow flex items-center justify-center pointer-events-none my-6 sm:my-10">
            {showBreathingPacer && isPlaying && (
              <div className="relative flex items-center justify-center">
                {/* Outer halo */}
                <div className="w-56 h-56 rounded-full border border-indigo-400/20 animate-ping opacity-30" />
                {/* Breathing Expansion Ring */}
                <div
                  className="absolute w-44 h-44 rounded-full bg-indigo-500/15 border-2 border-indigo-300/40 backdrop-blur-sm flex flex-col items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.25)]"
                  style={{
                    animation: 'zenBreath 12s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                  }}
                >
                  <span className="text-[11px] uppercase tracking-[0.25em] text-indigo-100 font-semibold drop-shadow">
                    Breathe
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Player Bottom Control Deck */}
          <div className="relative z-10 p-5 sm:p-8 bg-gradient-to-t from-black/95 via-black/80 to-transparent space-y-4">
            {/* Timeline Progress Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (audioRef.current) audioRef.current.currentTime = val;
                  setCurrentTime(val);
                }}
                className="w-full h-1.5 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Play/Pause & Volume Deck */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-13 h-13 p-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center transition-all shadow-xl shadow-indigo-600/30 active:scale-95"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 translate-x-0.5" />}
                </button>

                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-100">{activeSession.voice} Guide</p>
                  <p className="text-xs text-indigo-300">Ambient: {activeSession.ambientSound}</p>
                </div>
              </div>

              {/* Volume Mixer Controls */}
              <div className="flex items-center gap-5 bg-slate-900/70 border border-slate-800 rounded-2xl px-4 py-2.5 backdrop-blur-md">
                {/* Voice Volume */}
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] text-slate-400 font-medium">Voice</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={voiceVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVoiceVolume(val);
                      if (audioRef.current) audioRef.current.volume = val;
                    }}
                    className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                  />
                </div>

                <div className="w-[1px] h-4 bg-slate-700" />

                {/* Ambient Volume */}
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] text-slate-400 font-medium">Ambient</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={ambientVolume}
                    onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                    className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                  />
                </div>
              </div>
            </div>
          </div>

          <audio
            ref={audioRef}
            src={activeSession.audioUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
            onLoadedMetadata={() => {
              if (audioRef.current) {
                setDuration(audioRef.current.duration);
                audioRef.current.volume = voiceVolume;
              }
            }}
            onEnded={() => setIsPlaying(false)}
            autoPlay
          />
        </div>
      )}

      {/* Script Viewing Modal */}
      {showScriptModal && activeSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-lg font-light text-slate-100">Guided Meditation Script</h4>
              <button
                onClick={() => setShowScriptModal(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                Close
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-serif px-1">
              {activeSession.script}
            </div>
          </div>
        </div>
      )}

      {/* Creator Form - Simple, Minimal, User-Friendly */}
      {!activeSession && (
        <div className="rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 sm:p-8 space-y-7 shadow-xl">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-light text-slate-100 tracking-tight">
              Design Your Guided Meditation
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Custom scripted, voiced, and visual meditation tailored to your personal sanctuary.
            </p>
          </div>

          {/* Theme & Intent */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <span>Meditation Focus / Sanctuary Theme</span>
            </label>
            <textarea
              value={config.prompt}
              onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
              placeholder="e.g., Sitting beside a quiet forest stream, releasing physical tension and welcoming calm..."
              rows={3}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none"
            />
            {/* Quick Inspiration Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {INSPIRATIONS.map((insp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setConfig({ ...config, prompt: insp })}
                  className="text-[11px] px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-slate-100 transition-colors"
                >
                  {insp}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Picker Grid */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center justify-between">
              <span>Select Guide Voice</span>
              <span className="text-[11px] font-normal text-slate-400 lowercase">5 serene voices</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {VOICES.map((v) => {
                const isSelected = config.voice === v.value;
                return (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setConfig({ ...config, voice: v.value })}
                    className={`text-left p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-100">{v.label}</span>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {v.vibe}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{v.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings Rows: Atmosphere, Duration, Ambient Sound */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Atmosphere */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Atmosphere</span>
              </label>
              <select
                value={config.atmosphere}
                onChange={(e) => setConfig({ ...config, atmosphere: e.target.value })}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {ATMOSPHERES.map((atm) => (
                  <option key={atm} value={atm}>
                    {atm}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Duration</span>
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                {(['short', 'medium', 'long'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setConfig({ ...config, duration: d })}
                    className={`py-1.5 text-xs rounded-lg font-medium transition-all ${
                      config.duration === d
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {d === 'short' ? '3m' : d === 'medium' ? '7m' : '15m'}
                  </button>
                ))}
              </div>
            </div>

            {/* Background Sound */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Ambient Audio</span>
              </label>
              <select
                value={config.ambientSound}
                onChange={(e) => setConfig({ ...config, ambientSound: e.target.value as any })}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {AMBIENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            id="generate-session-button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-base shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.99]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{generationStep || 'Manifesting Sanctuary...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Custom Guided Meditation</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* History Grid */}
      {!activeSession && history.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Saved Sanctuaries ({history.length})
            </h3>
            <button
              onClick={() => {
                setHistory([]);
                localStorage.removeItem('zenith_sessions');
              }}
              className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => loadPreviousSession(item)}
                className="group relative rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 p-4 transition-all cursor-pointer space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    {item.voice}
                  </span>
                  <button
                    onClick={(e) => deleteSession(item.id, e)}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-sm font-light text-slate-200 line-clamp-2 leading-snug">
                  {item.prompt}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  <span>{item.atmosphere}</span>
                  <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-medium">
                    Play <Play className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes zenBreath {
          0%, 100% {
            transform: scale(0.7);
            opacity: 0.4;
          }
          40%, 60% {
            transform: scale(1.15);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
};
