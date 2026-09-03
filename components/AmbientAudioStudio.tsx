import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  Download,
  Sliders,
  Layers,
  Clock,
  Radio,
  Waves,
  CheckCircle2,
  AlertCircle,
  Key,
  Info,
  Trash2,
} from 'lucide-react';
import {
  generateAmbientMusic,
  createMusicBlobUrlFromBase64,
  cleanClientErrorMessage,
} from '../services/geminiService';
import { AmbientSoundEngine } from '../utils/audioUtils';
import { AmbientTrack } from '../types';

const PRESET_ATMOSPHERES = [
  {
    title: '432Hz Theta Solfeggio',
    desc: 'Deep warm analog pads with subtle 6Hz theta frequency for profound stillness',
    prompt: 'Warm ethereal 432Hz solfeggio drone with harmonic theta pulse, soft analog synthesizer pads, and peaceful resonant warmth for deep meditation.',
  },
  {
    title: 'Tibetan Mountain Sanctuary',
    desc: 'Pure resonant bronze singing bowls with gentle wind chimes and airy space',
    prompt: 'Acoustic Tibetan singing bowls striking slowly in a vast temple courtyard, soft mountain breeze, tranquil harmonics, and meditative stillness.',
  },
  {
    title: 'Celestial Starlit Drift',
    desc: 'Zero-gravity ambient space music with slow swelling cosmic textures',
    prompt: 'Deep space ambient music, slow evolving lush celestial synthesizer drones, stardust shimmering echoes, calming and expansive.',
  },
  {
    title: 'Forest Rain & Stream',
    desc: 'Organic nature soundscape woven with gentle acoustic bamboo flute',
    prompt: 'Delicate rainfall through misty pine trees, distant soft stream water, accompanied by a quiet meditative bamboo flute and ambient strings.',
  },
  {
    title: 'Oceanic Horizon Nocturne',
    desc: 'Rhythmic rolling swells and deep ocean undertones for deep restorative rest',
    prompt: 'Gentle oceanic wave rhythms rolling in the dusk, deep warm bass undertones, distant nocturnal ambient pads for deep restful sleep.',
  },
];

export const AmbientAudioStudio: React.FC = () => {
  // Generation configuration
  const [model, setModel] = useState<'lyria-3-clip-preview' | 'lyria-3-pro-preview'>('lyria-3-clip-preview');
  const [prompt, setPrompt] = useState<string>(PRESET_ATMOSPHERES[0].prompt);
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_ATMOSPHERES[0].title);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [notice, setNotice] = useState<{ type: 'info' | 'warning'; text: string } | null>(null);

  // Active track state
  const [currentTrack, setCurrentTrack] = useState<AmbientTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLooping, setIsLooping] = useState(true);

  // Saved library
  const [savedTracks, setSavedTracks] = useState<AmbientTrack[]>(() => {
    try {
      const saved = localStorage.getItem('zenith_ambient_tracks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Layered Web Audio procedural texture
  const [textureType, setTextureType] = useState<'binaural-drone' | 'singing-bowl' | 'gentle-rain' | 'ocean-drift' | 'none'>('none');
  const [textureVolume, setTextureVolume] = useState(0.3);
  const textureEngineRef = useRef<AmbientSoundEngine | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Synchronize audio element
  useEffect(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.addEventListener('timeupdate', () => setCurrentTime(el.currentTime));
      el.addEventListener('loadedmetadata', () => setDuration(el.duration));
      el.addEventListener('ended', () => {
        if (!el.loop) setIsPlaying(false);
      });
      audioRef.current = el;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Update volume and loop on active audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.loop = isLooping;
    }
  }, [volume, isLooping]);

  // Manage layered procedural texture
  useEffect(() => {
    if (!textureEngineRef.current) {
      textureEngineRef.current = new AmbientSoundEngine();
    }

    if (textureType !== 'none') {
      textureEngineRef.current.start(textureType, textureVolume);
    } else {
      textureEngineRef.current.stop();
    }

    return () => {
      if (textureEngineRef.current) {
        textureEngineRef.current.stop();
      }
    };
  }, [textureType]);

  useEffect(() => {
    if (textureEngineRef.current) {
      textureEngineRef.current.setVolume(textureVolume);
    }
  }, [textureVolume]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setNotice(null);
    setStatusMessage(
      model === 'lyria-3-clip-preview'
        ? 'Composing 30s ambient soundscape with Lyria Clip...'
        : 'Generating full-length ambient track with Lyria Pro...'
    );

    try {
      const result = await generateAmbientMusic({
        prompt,
        model,
      });

      if (result.audioBase64) {
        const audioUrl = createMusicBlobUrlFromBase64(result.audioBase64, result.mimeType);
        const newTrack: AmbientTrack = {
          id: 'track_' + Date.now(),
          title: selectedPreset !== 'Custom' ? selectedPreset : 'Custom Ambient Drift',
          prompt,
          model: result.modelUsed,
          durationMode: model === 'lyria-3-clip-preview' ? 'clip' : 'full',
          audioUrl,
          lyrics: result.lyrics,
          createdAt: Date.now(),
        };

        setCurrentTrack(newTrack);
        playTrack(newTrack);

        // Update library
        const updated = [newTrack, ...savedTracks.slice(0, 7)];
        setSavedTracks(updated);
        try {
          // Store minimal representation
          localStorage.setItem('zenith_ambient_tracks', JSON.stringify(updated.map(t => ({ ...t, audioUrl: '' }))));
        } catch {
          // ignore
        }

        setStatusMessage('Generation complete. Enjoy your sanctuary soundscape.');
      } else {
        // Handle message or billing requirement
        if (result.requiresPaidKey) {
          setNotice({
            type: 'warning',
            text: 'Lyria music generation models require a billing-enabled Gemini API key. You can select your API key in Settings > Secrets.',
          });
        }
        setStatusMessage(result.message || 'Starting procedural ambient engine...');

        // Provide seamless immediate procedural soundscape so the user still has beautiful music
        const synthType = selectedPreset.includes('Bowl') ? 'singing-bowl' : selectedPreset.includes('Ocean') ? 'ocean-drift' : selectedPreset.includes('Rain') ? 'gentle-rain' : 'binaural-drone';
        setTextureType(synthType);
      }
    } catch (err: any) {
      const cleanErr = cleanClientErrorMessage(err);
      setNotice({
        type: 'warning',
        text: cleanErr.includes('429') || cleanErr.includes('quota')
          ? 'Lyria models require a paid Gemini API key. Procedural ambient synthesis is ready below.'
          : cleanErr,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const playTrack = (track: AmbientTrack) => {
    if (!audioRef.current || !track.audioUrl) return;
    audioRef.current.src = track.audioUrl;
    audioRef.current.currentTime = 0;
    audioRef.current.play().then(() => {
      setIsPlaying(true);
    }).catch((e) => {
      console.warn('Audio autoplay prevented:', e);
    });
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => console.warn(e));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner / Hero Title */}
      <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900/80 rounded-3xl p-6 sm:p-8 border border-indigo-900/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/20 text-indigo-300 text-xs font-medium mb-3">
            <Music className="w-3.5 h-3.5 text-indigo-400" />
            <span>Lyria Music & Soundscapes</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
            Ambient Audio & Soundscapes
          </h2>
          <p className="text-sm text-slate-300/85 mt-2 leading-relaxed font-light">
            Compose bespoke meditation music using Google Lyria models or layer real-time procedural binaural drones and singing bowls for continuous tranquil focus.
          </p>
        </div>
      </div>

      {/* Notice / Paid Key Guidance banner */}
      {notice && (
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-200/90 leading-relaxed">
            <p className="font-medium text-white mb-0.5">Model Notice</p>
            <p>{notice.text}</p>
          </div>
        </div>
      )}

      {/* Generator Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Prompting & Presets */}
        <div className="lg:col-span-2 bg-slate-900/80 rounded-3xl p-6 border border-slate-800 space-y-6">
          {/* Model Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2 uppercase tracking-wider">
              Music Generation Model
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                id="model-lyria-clip"
                onClick={() => setModel('lyria-3-clip-preview')}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                  model === 'lyria-3-clip-preview'
                    ? 'bg-indigo-950/60 border-indigo-500/60 text-white shadow-lg shadow-indigo-950/40'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${model === 'lyria-3-clip-preview' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <span>Lyria Clip</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded-md">30s Clip</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    lyria-3-clip-preview. Rapid audio loop generation for meditation & breathwork intervals.
                  </p>
                </div>
              </button>

              <button
                type="button"
                id="model-lyria-pro"
                onClick={() => setModel('lyria-3-pro-preview')}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                  model === 'lyria-3-pro-preview'
                    ? 'bg-indigo-950/60 border-indigo-500/60 text-white shadow-lg shadow-indigo-950/40'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${model === 'lyria-3-pro-preview' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <span>Lyria Pro</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded-md">Full Track</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    lyria-3-pro-preview. Extended high-fidelity soundscape for deep immersion.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Atmospheric Presets */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2 uppercase tracking-wider">
              Atmospheric Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_ATMOSPHERES.map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset.title);
                    setPrompt(preset.prompt);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedPreset === preset.title
                      ? 'bg-indigo-600/15 border-indigo-500/40 text-white'
                      : 'bg-slate-950/30 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                  }`}
                >
                  <p className="text-xs font-medium text-slate-200">{preset.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{preset.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300 uppercase tracking-wider">
                Soundscape & Instruments Prompt
              </label>
              <button
                type="button"
                onClick={() => {
                  setSelectedPreset('Custom');
                  setPrompt('Warm 528Hz frequency ambient drone with delicate temple chimes, gentle water ripples, and calm analog synth pads');
                }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300"
              >
                Reset to default
              </button>
            </div>
            <textarea
              id="ambient-audio-prompt"
              rows={3}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setSelectedPreset('Custom');
              }}
              placeholder="Describe instruments, tempo, mood, or sonic atmosphere..."
              className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 resize-none transition-all"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-400">
              {isGenerating ? statusMessage : 'Ready to synthesize your peaceful soundtrack.'}
            </p>

            <button
              id="btn-generate-music"
              type="button"
              disabled={isGenerating || !prompt.trim()}
              onClick={handleGenerate}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-medium transition-all ${
                isGenerating
                  ? 'bg-indigo-900/60 text-indigo-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 active:scale-95'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Synthesizing Audio...' : 'Generate Ambient Audio'}</span>
            </button>
          </div>
        </div>

        {/* Right Col: Procedural Web Audio Layering (Instant Synthesizers) */}
        <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-medium text-white">Continuous Sound Engine</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Layer continuous real-time synthesizers alongside your generated music or during meditation.
            </p>

            <div className="space-y-2 mt-4">
              {[
                { id: 'binaural-drone', label: '432Hz Binaural Drone', note: 'Theta wave deep relaxation' },
                { id: 'singing-bowl', label: 'Tibetan Singing Bowls', note: 'Multi-harmonic resonance' },
                { id: 'ocean-drift', label: 'Oceanic Wave Drift', note: 'Rolling 8-sec tidal swells' },
                { id: 'gentle-rain', label: 'Gentle Soft Rain', note: 'Filtered warm natural pink noise' },
                { id: 'none', label: 'Muted / Off', note: 'Play generated music only' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTextureType(opt.id as any)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                    textureType === opt.id
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-white font-medium'
                      : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
                  }`}
                >
                  <div className="text-left">
                    <p>{opt.label}</p>
                    <p className="text-[10px] text-slate-500 font-normal">{opt.note}</p>
                  </div>
                  {textureType === opt.id && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Texture Volume Slider */}
          {textureType !== 'none' && (
            <div className="pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Texture Volume</span>
                </span>
                <span>{Math.round(textureVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={textureVolume}
                onChange={(e) => setTextureVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Active Music Player Component */}
      {currentTrack && currentTrack.audioUrl && (
        <div className="bg-slate-900 rounded-3xl p-6 border border-indigo-900/50 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Track Info */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white shrink-0">
                <Music className="w-6 h-6 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-medium text-white">{currentTrack.title}</h4>
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full font-mono">
                    {currentTrack.model === 'lyria-3-clip-preview' ? 'Lyria Clip' : 'Lyria Pro'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-1 max-w-md">
                  {currentTrack.prompt}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-3 w-full md:w-96">
              {/* Main Play / Seek Bar */}
              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  id="btn-play-pause-ambient"
                  onClick={togglePlayPause}
                  className="w-11 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all shrink-0 active:scale-95"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>

                <div className="flex-grow flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400 w-9 text-right">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={duration || 1}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <span className="text-[11px] font-mono text-slate-400 w-9">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Loop Toggle */}
                <button
                  type="button"
                  onClick={() => setIsLooping(!isLooping)}
                  className={`p-2 rounded-xl border text-xs transition-all ${
                    isLooping
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                      : 'border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                  title="Loop Playback"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Download Audio */}
                <a
                  href={currentTrack.audioUrl}
                  download={`zenith_ambient_${currentTrack.title.toLowerCase().replace(/\s+/g, '_')}.wav`}
                  className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
                  title="Download WAV"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-2 w-full max-w-xs justify-end">
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-28 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Tracks / History */}
      {savedTracks.length > 0 && (
        <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-medium text-slate-300 uppercase tracking-wider">
              Recent Ambient Creations
            </h3>
            <button
              type="button"
              onClick={() => {
                setSavedTracks([]);
                localStorage.removeItem('zenith_ambient_tracks');
              }}
              className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedTracks.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-mono text-[10px] text-indigo-400 uppercase">
                      {item.model === 'lyria-3-clip-preview' ? 'Lyria Clip' : 'Lyria Pro'}
                    </span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-sm font-medium text-slate-200">{item.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{item.prompt}</p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt(item.prompt);
                      setSelectedPreset(item.title);
                      if (item.audioUrl) {
                        setCurrentTrack(item);
                        playTrack(item);
                      } else {
                        handleGenerate();
                      }
                    }}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-indigo-400" />
                    <span>{item.audioUrl ? 'Play Track' : 'Regenerate'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
