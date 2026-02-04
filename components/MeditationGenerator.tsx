
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { generateMeditationScript, generateMeditationImages, generateMeditationAudio, generateDailyFocus } from '../services/geminiService';
import { createAudioUrlFromBase64 } from '../utils/audioUtils';
import { SessionHistoryItem, VoiceName, SessionConfig } from '../types';

const VOICES: { value: VoiceName; label: string; desc: string; recommendedFor: string }[] = [
    { value: 'Kore', label: 'Kore', desc: 'A gentle, soothing tone that feels like a warm embrace. Best for emotional healing and anxiety relief.', recommendedFor: 'Healing' },
    { value: 'Charon', label: 'Charon', desc: 'A deep, resonant voice with a slow pace. Perfect for drifting off to sleep or entering a trance state.', recommendedFor: 'Sleep' },
    { value: 'Zephyr', label: 'Zephyr', desc: 'A warm, balanced, and polished presence. The gold standard for daily mindfulness practice.', recommendedFor: 'Daily' },
    { value: 'Fenrir', label: 'Fenrir', desc: 'A steady, grounding, and strong voice. Ideal for building focus and finding stability.', recommendedFor: 'Focus' },
    { value: 'Puck', label: 'Puck', desc: 'A light, airy, and slightly playful tone. Great for morning energy and lifting the spirit.', recommendedFor: 'Energy' },
];

const LoadingIndicator: React.FC<{ stage: string }> = ({ stage }) => (
    <div className="flex flex-col items-center justify-center space-y-6 p-12 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-indigo-500/30 shadow-2xl">
        <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-500/20 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin absolute top-0"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-full animate-pulse"></div>
            </div>
        </div>
        <div className="text-center space-y-2">
            <p className="text-xl font-semibold text-white animate-pulse">Zenith is preparing...</p>
            <p className="text-indigo-300/80 text-sm font-medium">{stage}</p>
        </div>
    </div>
);

const DailyFocus: React.FC = () => {
    const [focus, setFocus] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const getNewFocus = async () => {
        setIsLoading(true);
        try {
            const newFocus = await generateDailyFocus();
            const today = new Date().toISOString().split('T')[0];
            localStorage.setItem('dailyFocus', JSON.stringify({ focus: newFocus, date: today }));
            setFocus(newFocus);
        } catch (error) {
            setFocus("Inhale peace, exhale tension.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const stored = localStorage.getItem('dailyFocus');
        const today = new Date().toISOString().split('T')[0];
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.date === today) { setFocus(parsed.focus); setIsLoading(false); return; }
        }
        getNewFocus();
    }, []);
    
    return (
        <div className="w-full bg-indigo-950/20 backdrop-blur-md p-5 rounded-2xl border border-indigo-500/20 shadow-xl flex items-center justify-between group">
            <div className="flex-grow">
                <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-1 block">Daily Intention</span>
                {isLoading ? (
                    <div className="h-6 w-48 bg-white/5 rounded animate-pulse"></div>
                ) : (
                    <p className="text-slate-100 text-lg font-light leading-relaxed italic">"{focus}"</p>
                )}
            </div>
            <button
                onClick={getNewFocus}
                disabled={isLoading}
                className="p-3 rounded-full hover:bg-white/10 text-indigo-400 hover:text-white transition-all disabled:opacity-30"
                title="Refresh intention"
            >
                <svg className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </button>
        </div>
    );
};

const BreathingGuide: React.FC<{ isActive: boolean }> = ({ isActive }) => {
    if (!isActive) return null;
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="relative flex items-center justify-center">
                {/* Outermost Ring */}
                <div className="w-48 h-48 rounded-full border border-white/10 animate-[ping_4s_infinite]"></div>
                {/* Scaling Circle */}
                <div className="absolute w-40 h-40 bg-indigo-500/20 backdrop-blur-sm rounded-full border-2 border-white/30 flex items-center justify-center transition-all duration-[4000ms] ease-in-out animate-[breath_8s_infinite]">
                    <span className="text-white/60 text-xs font-medium uppercase tracking-[0.2em] animate-[breathText_8s_infinite]"></span>
                </div>
            </div>
            <style>{`
                @keyframes breath {
                    0%, 100% { transform: scale(0.6); opacity: 0.3; }
                    40%, 60% { transform: scale(1.1); opacity: 0.7; }
                }
                @keyframes breathText {
                    0%, 10%, 90%, 100% { content: 'Hold'; opacity: 0; }
                    15%, 35% { content: 'Inhale'; opacity: 1; }
                    65%, 85% { content: 'Exhale'; opacity: 1; }
                }
                .animate-breathText::after {
                    animation: breathTextContent 8s infinite;
                    content: 'Inhale';
                }
                @keyframes breathTextContent {
                    0%, 10% { content: 'Hold'; }
                    15%, 35% { content: 'Inhale'; }
                    40%, 60% { content: 'Hold'; }
                    65%, 85% { content: 'Exhale'; }
                    90%, 100% { content: 'Hold'; }
                }
            `}</style>
        </div>
    );
};

const MeditationGenerator: React.FC = () => {
    const [config, setConfig] = useState<SessionConfig>({
        prompt: '',
        voice: 'Zephyr',
        atmosphere: 'Calm & Ethereal',
        duration: 'medium'
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingStage, setLoadingStage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<{ images: string[]; audioUrl: string } | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [history, setHistory] = useState<SessionHistoryItem[]>([]);
    const [showBreathingGuide, setShowBreathingGuide] = useState(true);
    const [isZenMode, setIsZenMode] = useState(false);
    
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);

    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const stored = localStorage.getItem('meditationHistory');
        if (stored) setHistory(JSON.parse(stored));
    }, []);

    useEffect(() => {
        localStorage.setItem('meditationHistory', JSON.stringify(history));
    }, [history]);

    // Slideshow Effect
    useEffect(() => {
        if (sessionData && isPlaying) {
            const interval = setInterval(() => {
                setCurrentImageIndex(prev => (prev + 1) % sessionData.images.length);
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [sessionData, isPlaying]);

    const handleGenerate = async () => {
        if (!config.prompt.trim()) { setError('Describe your sanctuary first.'); return; }
        setIsLoading(true);
        setError(null);
        setSessionData(null);
        setIsZenMode(false);
        
        try {
            setLoadingStage('Visualizing your sanctuary...');
            const images = await generateMeditationImages(config.prompt);
            setSessionData({ images, audioUrl: '' }); // Preview visuals
            
            setLoadingStage('Channeling serenity into words...');
            const script = await generateMeditationScript(config);
            
            setLoadingStage(`Capturing the voice of ${config.voice}...`);
            const audioBase64 = await generateMeditationAudio(script, config.voice);
            const audioUrl = await createAudioUrlFromBase64(audioBase64);

            setSessionData({ images, audioUrl });

            const newItem: SessionHistoryItem = {
                id: Date.now().toString(),
                prompt: config.prompt,
                imagesBase64: images,
                audioBase64,
                timestamp: Date.now(),
                voice: config.voice
            };
            setHistory(prev => [newItem, ...prev.filter(i => i.prompt !== config.prompt)].slice(0, 10));

        } catch (err: any) {
            setError(err.message || 'The cosmic energy is misaligned. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadHistory = async (item: SessionHistoryItem) => {
        setIsLoading(true);
        try {
            const audioUrl = await createAudioUrlFromBase64(item.audioBase64);
            setSessionData({ images: item.imagesBase64, audioUrl });
            setConfig(prev => ({ ...prev, prompt: item.prompt, voice: item.voice }));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
            setError("Could not retrieve session.");
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            {!isZenMode && <DailyFocus />}

            {/* Config & Input Area */}
            {!sessionData && !isLoading && (
                <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-2xl space-y-8">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">Design Your Session</h2>
                        <p className="text-slate-400 text-sm">Every detail crafted by AI for your peace of mind.</p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase tracking-widest text-indigo-400 px-1">Theme & Intent</label>
                            <textarea
                                value={config.prompt}
                                onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                                placeholder="e.g., A celestial journey through the stars or Sitting under a cherry blossom tree..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-lg text-white placeholder-white/20 focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none min-h-[100px] resize-none"
                            />
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-widest text-indigo-400 px-1">Choose Your Guide</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {VOICES.map(v => (
                                        <button
                                            key={v.value}
                                            onClick={() => setConfig({ ...config, voice: v.value })}
                                            className={`flex flex-col text-left p-4 rounded-xl border transition-all group ${
                                                config.voice === v.value 
                                                ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-600/20' 
                                                : 'bg-white/5 border-white/5 hover:bg-white/10'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center w-full mb-2">
                                                <span className="font-semibold">{v.label}</span>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                                                    config.voice === v.value ? 'bg-indigo-500 text-white' : 'bg-white/10 text-indigo-300'
                                                }`}>
                                                    {v.recommendedFor}
                                                </span>
                                            </div>
                                            <p className={`text-xs leading-relaxed ${config.voice === v.value ? 'text-indigo-100' : 'text-slate-400 group-hover:text-slate-300'}`}>
                                                {v.desc}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold uppercase tracking-widest text-indigo-400 px-1">Duration</label>
                                    <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                                        {(['short', 'medium', 'long'] as const).map(d => (
                                            <button
                                                key={d}
                                                onClick={() => setConfig({ ...config, duration: d })}
                                                className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${config.duration === d ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold uppercase tracking-widest text-indigo-400 px-1">Atmosphere</label>
                                    <select
                                        value={config.atmosphere}
                                        onChange={(e) => setConfig({ ...config, atmosphere: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                    >
                                        <option>Calm & Ethereal</option>
                                        <option>Deeply Grounding</option>
                                        <option>Celestial & Cosmic</option>
                                        <option>Nature-Infused</option>
                                        <option>Vitality & Energy</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                        >
                            Generate Session
                        </button>
                    </div>
                </div>
            )}

            {isLoading && <LoadingIndicator stage={loadingStage} />}

            {/* Immersive Player */}
            {sessionData && !isLoading && (
                <div className={`relative transition-all duration-700 ${isZenMode ? 'fixed inset-0 z-50 bg-black' : 'w-full aspect-[16/9] rounded-3xl overflow-hidden border border-white/10 shadow-2xl'}`}>
                    {/* Slideshow Images */}
                    {sessionData.images.map((img, idx) => (
                        <div
                            key={idx}
                            className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${idx === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <img
                                src={`data:image/jpeg;base64,${img}`}
                                alt=""
                                className="w-full h-full object-cover animate-[kenburns_40s_linear_infinite]"
                            />
                        </div>
                    ))}
                    
                    {/* Subtle Overlay Particles (CSS only) */}
                    <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen bg-[radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:50px_50px] animate-[floating_100s_linear_infinite]"></div>

                    <BreathingGuide isActive={showBreathingGuide && isPlaying} />

                    {/* Player Controls */}
                    <div className={`absolute inset-0 flex flex-col justify-end p-8 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-500 ${isZenMode && isPlaying && currentTime > 5 ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                        <div className="space-y-4">
                            {!isZenMode && (
                                <div>
                                    <h3 className="text-xl font-medium text-white/90">{config.prompt}</h3>
                                    <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Guided by {config.voice}</p>
                                </div>
                            )}

                            <div className="flex items-center gap-6">
                                <button
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    className="w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all border border-white/20"
                                >
                                    {isPlaying ? (
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"/></svg>
                                    ) : (
                                        <svg className="w-6 h-6 text-white translate-x-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>
                                    )}
                                </button>

                                <div className="flex-grow space-y-2">
                                    <div className="flex justify-between text-[10px] text-white/50 font-mono">
                                        <span>{formatTime(currentTime)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max={duration || 0}
                                        value={currentTime}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (audioRef.current) audioRef.current.currentTime = val;
                                        }}
                                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setShowBreathingGuide(!showBreathingGuide)}
                                        className={`p-2 rounded-lg border transition-all ${showBreathingGuide ? 'bg-indigo-600/50 border-indigo-400' : 'bg-white/5 border-white/10'}`}
                                        title="Toggle Breathing Guide"
                                    >
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                                    </button>
                                    <button
                                        onClick={() => setIsZenMode(!isZenMode)}
                                        className={`p-2 rounded-lg border transition-all ${isZenMode ? 'bg-indigo-600/50 border-indigo-400' : 'bg-white/5 border-white/10'}`}
                                        title="Zen Mode"
                                    >
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
                                    </button>
                                    {isZenMode && (
                                        <button onClick={() => setSessionData(null)} className="p-2 bg-white/10 rounded-lg text-white">Exit</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <audio
                        ref={audioRef}
                        src={sessionData.audioUrl}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                        autoPlay
                    />
                </div>
            )}

            {/* History Grid */}
            {!sessionData && !isLoading && history.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <h3 className="text-lg font-bold text-white/80">Previous Sanctuaries</h3>
                        <button onClick={() => setHistory([])} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Clear History</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {history.map(item => (
                            <button
                                key={item.id}
                                onClick={() => loadHistory(item)}
                                className="group relative aspect-video rounded-2xl overflow-hidden border border-white/5 hover:border-indigo-500/50 transition-all text-left"
                            >
                                <img src={`data:image/jpeg;base64,${item.imagesBase64[0]}`} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-black/40 p-3 flex flex-col justify-end">
                                    <p className="text-[10px] text-white/50 truncate mb-1">{item.prompt}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[8px] uppercase tracking-tighter text-indigo-400 font-bold">{item.voice}</span>
                                        <span className="text-[8px] text-white/30">{new Date(item.timestamp).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes kenburns {
                    0% { transform: scale(1) translate(0,0); }
                    50% { transform: scale(1.1) translate(-2%, -1%); }
                    100% { transform: scale(1) translate(0,0); }
                }
                @keyframes floating {
                    from { background-position: 0 0; }
                    to { background-position: 1000px 1000px; }
                }
            `}</style>
        </div>
    );
};

export default MeditationGenerator;
