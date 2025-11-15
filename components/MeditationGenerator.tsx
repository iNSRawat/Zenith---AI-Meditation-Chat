
import React, { useState, useRef, useEffect } from 'react';
import { generateMeditationScript, generateMeditationImage, generateMeditationAudio } from '../services/geminiService';
import { createAudioUrlFromBase64 } from '../utils/audioUtils';

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

const MeditationGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingStage, setLoadingStage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<{ imageUrl: string; audioUrl: string } | null>(null);
    const [selectedTrack, setSelectedTrack] = useState<string>('none');
    const [backgroundMusicUrl, setBackgroundMusicUrl] = useState<string>('');
    const [backgroundMusicVolume, setBackgroundMusicVolume] = useState<number>(0.3);

    const audioRef = useRef<HTMLAudioElement>(null);
    const backgroundAudioRef = useRef<HTMLAudioElement>(null);

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

        // Reset previous session and music state
        setIsLoading(true);
        setError(null);
        setSessionData(null);
        setSelectedTrack('none');
        setBackgroundMusicUrl('');
        if (backgroundAudioRef.current) {
            backgroundAudioRef.current.pause();
        }


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
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
            setLoadingStage('');
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

    return (
        <div className="flex flex-col items-center space-y-6">
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
                                controls 
                                src={sessionData.audioUrl} 
                                className="w-full mb-3"
                                onPlay={syncPlay}
                                onPause={syncPause}
                                onEnded={syncPause}
                            >
                                Your browser does not support the audio element.
                            </audio>
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
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <audio ref={backgroundAudioRef} src={backgroundMusicUrl} loop hidden />
                </div>
            )}
        </div>
    );
};

export default MeditationGenerator;
