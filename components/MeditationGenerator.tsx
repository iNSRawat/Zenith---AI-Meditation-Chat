import React, { useState, useRef, useEffect } from 'react';
import { generateMeditationScript, generateMeditationImage, generateMeditationAudio, generateDailyFocus } from '../services/geminiService';
import { createAudioUrlFromBase64 } from '../utils/audioUtils';
import { SessionHistoryItem } from '../types';

const LoadingIndicator: React.FC<{ stage: string }> = ({ stage }) => (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-slate-800 rounded-lg">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>
        <p className="text-slate-300 font-medium text-center">
            Generating your session...
            <span className="block text-sm text-slate-400 mt-1">{stage}</span>
        </p>
    </div>
);

const backgroundTracks = [
  { value: 'none', label: 'None' },
  { value: 'https://storage.googleapis.com/maker-suite-gallery/sounds/soft-piano.mp3', label: 'Soft Piano' },
  { value: 'https://storage.googleapis.com/maker-suite-gallery/sounds/ambient-pad.mp3', label: 'Ambient Pad' },
  { value: 'https://storage.googleapis.com/maker-suite-gallery/sounds/ocean-waves.mp3', label: 'Ocean Waves' },
  { value: 'upload', label: 'Upload Custom...' },
];

const DailyFocus: React.FC = () => {
    const [focus, setFocus] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const getNewFocus = async () => {
        setIsLoading(true);
        try {
            const newFocus = await generateDailyFocus();
            const today = new Date().toISOString().split('T')[0];
            const focusData = { focus: newFocus, date: today };
            localStorage.setItem('dailyFocus', JSON.stringify(focusData));
            setFocus(newFocus);
        } catch (error) {
            console.error(error);
            setFocus("Breathe deeply and be present.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const storedData = localStorage.getItem('dailyFocus');
        const today = new Date().toISOString().split('T')[0];

        if (storedData) {
            try {
                const { focus, date } = JSON.parse(storedData);
                if (date === today) {
                    setFocus(focus);
                    setIsLoading(false);
                } else {
                    getNewFocus();
                }
            } catch {
                getNewFocus();
            }
        } else {
            getNewFocus();
        }
    }, []);
    
    return (
        <div className="w-full bg-slate-800/50 p-4 rounded-xl shadow-lg border border-slate-700 flex items-center justify-between gap-4">
            <div className="flex-grow">
                <p className="text-sm text-indigo-300 font-semibold mb-1">Today's Focus</p>
                {isLoading ? (
                    <div className="h-6 w-3/4 bg-slate-700 rounded animate-pulse"></div>
                ) : (
                    <p className="text-slate-100 text-lg italic">"{focus}"</p>
                )}
            </div>
            <button
                onClick={getNewFocus}
                disabled={isLoading}
                aria-label="Get new focus"
                className="flex-shrink-0 p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    );
};


const MeditationGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingStage, setLoadingStage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<{ imageUrl: string; audioUrl: string } | null>(null);
    const [selectedTrack, setSelectedTrack] = useState<string>('none');
    const [backgroundMusicUrl, setBackgroundMusicUrl] = useState<string>('');
    const [backgroundMusicVolume, setBackgroundMusicVolume] = useState<number>(0.3);
    const [history, setHistory] = useState<SessionHistoryItem[]>([]);
    
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);

    const audioRef = useRef<HTMLAudioElement>(null);
    const backgroundAudioRef = useRef<HTMLAudioElement>(null);

    // Load history from localStorage on initial mount
    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('meditationHistory');
            if (storedHistory) {
                setHistory(JSON.parse(storedHistory));
            }
        } catch (error) {
            console.error("Failed to load meditation history from localStorage", error);
            localStorage.removeItem('meditationHistory'); // Clear corrupted data
        }
    }, []);

    // Save history to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('meditationHistory', JSON.stringify(history));
    }, [history]);

    // Effect to handle cleanup of blob URLs
    useEffect(() => {
        return () => {
            if (backgroundMusicUrl && backgroundMusicUrl.startsWith('blob:')) {
                URL.revokeObjectURL(backgroundMusicUrl);
            }
        };
    }, [backgroundMusicUrl]);

    // Effect to control background audio playback when source changes
     useEffect(() => {
        if (backgroundMusicUrl && backgroundAudioRef.current) {
            if (audioRef.current && !audioRef.current.paused) {
                backgroundAudioRef.current.volume = backgroundMusicVolume;
                backgroundAudioRef.current.play().catch(console.error);
            }
        }
    }, [backgroundMusicUrl]);


    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a theme for your meditation.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSessionData(null);
        setSelectedTrack('none');
        setBackgroundMusicUrl('');
        if (backgroundAudioRef.current) backgroundAudioRef.current.pause();
        
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);

        try {
            setLoadingStage('Crafting meditation script & visuals...');
            const scriptPromise = generateMeditationScript(prompt);
            const imagePromise = generateMeditationImage(prompt);
            const [script, imageBase64] = await Promise.all([scriptPromise, imagePromise]);
            
            const imageUrl = `data:image/jpeg;base64,${imageBase64}`;
            setSessionData({ imageUrl, audioUrl: '' }); // Show image while audio loads

            setLoadingStage('Synthesizing soothing voiceover...');
            const audioBase64 = await generateMeditationAudio(script);
            
            setLoadingStage('Preparing your audio...');
            const audioUrl = await createAudioUrlFromBase64(audioBase64);

            setSessionData({ imageUrl, audioUrl });

            // Add to history
            const newHistoryItem: SessionHistoryItem = {
                id: new Date().toISOString(),
                prompt,
                imageBase64,
                audioBase64,
                timestamp: Date.now(),
            };

            setHistory(prevHistory => {
                const filteredHistory = prevHistory.filter(item => item.prompt.toLowerCase() !== prompt.toLowerCase().trim());
                const updatedHistory = [newHistoryItem, ...filteredHistory];
                return updatedHistory.slice(0, 10); // Keep latest 10 sessions
            });

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
            setLoadingStage('');
        }
    };

    const handleLoadFromHistory = async (item: SessionHistoryItem) => {
        setIsLoading(true);
        setError(null);
        setLoadingStage('Loading session from history...');
        
        if (audioRef.current) audioRef.current.pause();
        if (backgroundAudioRef.current) backgroundAudioRef.current.pause();

        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);

        try {
            const imageUrl = `data:image/jpeg;base64,${item.imageBase64}`;
            const audioUrl = await createAudioUrlFromBase64(item.audioBase64);

            setPrompt(item.prompt);
            setSessionData({ imageUrl, audioUrl });
            
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err: any) {
            setError("Failed to load the session. The data might be corrupted.");
        } finally {
            setIsLoading(false);
            setLoadingStage('');
        }
    };

    const handleClearHistory = () => {
        if (window.confirm("Are you sure you want to clear your entire meditation history?")) {
            setHistory([]);
        }
    };

    const syncPlay = () => {
        if (backgroundAudioRef.current && backgroundMusicUrl) {
            backgroundAudioRef.current.volume = backgroundMusicVolume;
            backgroundAudioRef.current.play().catch(console.error);
        }
    };

    const syncPause = () => {
        backgroundAudioRef.current?.pause();
    };
    
    const handleMusicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setSelectedTrack(value);
        if (value === 'none' || value === 'upload') {
            setBackgroundMusicUrl('');
             if (backgroundAudioRef.current) {
                backgroundAudioRef.current.pause();
            }
        } else {
            setBackgroundMusicUrl(value);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setBackgroundMusicUrl(url);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setBackgroundMusicVolume(newVolume);
        if (backgroundAudioRef.current) {
            backgroundAudioRef.current.volume = newVolume;
        }
    };
    
    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(console.error);
            }
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            const newTime = parseFloat(e.target.value);
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const formatTime = (timeInSeconds: number): string => {
        if (isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00';
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const SparklesIcon = () => (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm6 2a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1V5a1 1 0 011-1zm6 6a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1zM6 14a1 1 0 011 1v1h1a1 1 0 110 2H7v1a1 1 0 11-2 0v-1H4a1 1 0 110-2h1v-1a1 1 0 011-1z" clipRule="evenodd" />
      </svg>
    );
    
    const VolumeIcon = () => (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      </svg>
    );

    const PlayIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
        </svg>
    );
    
    const PauseIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
        </svg>
    );

    return (
        <div className="flex flex-col items-center space-y-6">
            <DailyFocus />
            <div className="w-full bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700">
                <h2 className="text-2xl font-bold text-center mb-1 text-slate-100">Create Your Sanctuary</h2>
                <p className="text-center text-slate-400 mb-6">Describe the theme for your personalized meditation session.</p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., A calm forest by a gentle stream"
                        disabled={isLoading}
                        className="flex-grow bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-50"
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-indigo-700 transition-all duration-300 disabled:bg-indigo-500 disabled:cursor-not-allowed transform hover:scale-105"
                    >
                      <SparklesIcon />
                      {isLoading ? 'Generating...' : 'Generate'}
                    </button>
                </div>
                {error && <p className="text-red-400 text-center mt-4">{error}</p>}
            </div>

            {isLoading && <LoadingIndicator stage={loadingStage} />}

            {sessionData && !isLoading && (
                <div className="w-full aspect-video bg-black rounded-xl shadow-2xl overflow-hidden relative border-2 border-slate-700">
                    <img src={sessionData.imageUrl} alt={prompt} className="w-full h-full object-cover" />
                    {sessionData.audioUrl && (
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/60 backdrop-blur-sm">
                            <audio
                                ref={audioRef}
                                src={sessionData.audioUrl}
                                onPlay={() => { setIsPlaying(true); syncPlay(); }}
                                onPause={() => { setIsPlaying(false); syncPause(); }}
                                onEnded={() => {
                                    setIsPlaying(false);
                                    syncPause();
                                    setCurrentTime(0);
                                }}
                                onTimeUpdate={() => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); }}
                                onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
                                hidden
                            >
                                Your browser does not support the audio element.
                            </audio>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <button onClick={togglePlayPause} aria-label={isPlaying ? 'Pause meditation' : 'Play meditation'} className="flex-shrink-0 text-white p-3 rounded-full bg-slate-700/80 hover:bg-slate-600/80 transition focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                                    </button>
                                    <div className="flex items-center gap-2 flex-grow">
                                        <span className="text-xs font-mono text-slate-300 w-12 text-center">{formatTime(currentTime)}</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max={duration || 0}
                                            value={currentTime}
                                            onChange={handleSeek}
                                            aria-label="Seek audio track"
                                            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                        <span className="text-xs font-mono text-slate-300 w-12 text-center">{formatTime(duration)}</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <label htmlFor="music-select" className="text-sm font-medium text-slate-300">Background Music:</label>
                                    <select 
                                        id="music-select" 
                                        value={selectedTrack} 
                                        onChange={handleMusicChange}
                                        className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {backgroundTracks.map(track => (
                                            <option key={track.value} value={track.value}>{track.label}</option>
                                        ))}
                                    </select>
                                    
                                    {selectedTrack === 'upload' && (
                                        <input 
                                            type="file" 
                                            accept="audio/*" 
                                            onChange={handleFileUpload}
                                            className="text-sm text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-500 file:text-white hover:file:bg-indigo-600"
                                        />
                                    )}
                                    
                                    {backgroundMusicUrl && (
                                        <div className="flex items-center gap-2 flex-grow min-w-[150px]">
                                            <VolumeIcon />
                                            <input 
                                                type="range" 
                                                min="0" 
                                                max="1" 
                                                step="0.05" 
                                                value={backgroundMusicVolume}
                                                onChange={handleVolumeChange}
                                                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                                aria-label="Background music volume"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <audio ref={backgroundAudioRef} src={backgroundMusicUrl} loop hidden />
                </div>
            )}

            {history.length > 0 && !sessionData && !isLoading && (
                <div className="w-full mt-8 bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-slate-200">Session History</h3>
                        <button
                            onClick={handleClearHistory}
                            className="text-sm text-slate-400 hover:text-red-400 transition-colors"
                            aria-label="Clear session history"
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {history.map((item) => (
                             <div 
                                key={item.id}
                                className="group bg-slate-700 rounded-lg overflow-hidden shadow-md cursor-pointer transition-transform transform hover:-translate-y-1 border border-slate-600 hover:border-indigo-500"
                                onClick={() => handleLoadFromHistory(item)}
                                role="button"
                                tabIndex={0}
                                aria-label={`Load session: ${item.prompt}`}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleLoadFromHistory(item)}
                            >
                                <div className="relative">
                                    <img
                                        src={`data:image/jpeg;base64,${item.imageBase64}`}
                                        alt={item.prompt}
                                        className="w-full h-24 object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="bg-indigo-600 text-white rounded-full p-3 shadow-lg">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <p className="text-slate-200 text-sm font-medium truncate group-hover:text-indigo-300">{item.prompt}</p>
                                    <p className="text-slate-400 text-xs mt-1">{new Date(item.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MeditationGenerator;