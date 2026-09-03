import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, PhoneOff, Sparkles, MessageCircle, AlertCircle } from 'lucide-react';
import { pcmFloat32ToBase64, LiveAudioPlayer } from '../utils/audioUtils';
import { cleanClientErrorMessage } from '../services/geminiService';

export const LiveVoiceGuide: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening'>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('Press start to begin an interactive voice session with your mindfulness companion.');

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const isMutedRef = useRef(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  const startSession = async () => {
    setErrorMessage(null);
    setStatus('connecting');
    setLiveTranscript('Connecting to Zenith Live Guide...');

    try {
      // 1. Request microphone access (16kHz standard for Live API input)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      mediaStreamRef.current = stream;

      // 2. Setup Audio Player for 24kHz model output
      playerRef.current = new LiveAudioPlayer();

      // 3. Connect WebSocket to server
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live-ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection established');
        setStatus('listening');
        setIsActive(true);
        setLiveTranscript("Zenith is listening. Say 'Hello' or ask for a calming breath exercise...");

        // Setup microphone capture at 16kHz
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const inputCtx = new AudioCtx({ sampleRate: 16000 });
        audioContextRef.current = inputCtx;

        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (isMutedRef.current) return;
          if (ws.readyState !== WebSocket.OPEN) return;

          const inputData = e.inputBuffer.getChannelData(0);
          // Check if there is some sound
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += Math.abs(inputData[i]);
          }
          const avg = sum / inputData.length;

          const base64Audio = pcmFloat32ToBase64(inputData);
          ws.send(JSON.stringify({ audio: base64Audio }));

          if (avg > 0.02 && status !== 'speaking') {
            setStatus('listening');
          }
        };

        source.connect(processor);
        processor.connect(inputCtx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            setErrorMessage(cleanClientErrorMessage(data.error));
            setStatus('connected');
            return;
          }

          if (data.interrupted) {
            playerRef.current?.stopAll();
            setStatus('listening');
            return;
          }

          if (data.audio) {
            setStatus('speaking');
            playerRef.current?.enqueueChunk(data.audio);
          }

          if (data.turnComplete) {
            setTimeout(() => {
              if (playerRef.current?.isPlaying) {
                setStatus('speaking');
              } else {
                setStatus('listening');
              }
            }, 600);
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('Live Voice WebSocket error:', err);
        setErrorMessage('Unable to connect to Live Voice service. Please verify your microphone and settings.');
        endSession();
      };

      ws.onclose = () => {
        console.log('Live Voice WebSocket closed');
        if (isActive) {
          endSession();
        }
      };
    } catch (err: any) {
      console.error('Failed to start Live Voice session:', err);
      setErrorMessage(cleanClientErrorMessage(err.message || 'Microphone access denied or audio initialization failed.'));
      endSession();
    }
  };

  const endSession = () => {
    setIsActive(false);
    setStatus('disconnected');
    setLiveTranscript('Voice session completed. Take a peaceful breath.');

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {
        // ignore
      }
      processorRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // ignore
      }
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (playerRef.current) {
      playerRef.current.close();
      playerRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // ignore
      }
      wsRef.current = null;
    }
  };

  const sendQuickPrompt = (text: string) => {
    if (!isActive || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      startSession().then(() => {
        setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ text }));
            setLiveTranscript(`Requested: "${text}"`);
          }
        }, 1200);
      });
      return;
    }

    wsRef.current.send(JSON.stringify({ text }));
    setLiveTranscript(`Requested: "${text}"`);
  };

  const promptSuggestions = [
    'Guide me through 2 minutes of relaxing box breathing',
    'I feel overwhelmed by stress today, help me ground myself',
    'Talk me through a soothing bedtime sleep relaxation',
    'Lead a quick 3-step mindful body scan right now',
  ];

  return (
    <div id="live-voice-guide" className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Real-Time Voice Companion (Gemini Live API)</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-light text-slate-100 tracking-tight">
          Zenith Live Voice Guide
        </h2>
        <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
          Speak naturally and converse in real-time with your live mindfulness guide. Get immediate, unhurried voice guidance to calm your mind.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-3 text-rose-200 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">Connection Notice</p>
            <p className="text-rose-300/80 text-xs">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Central Visual & State Orb */}
      <div className="relative rounded-3xl bg-slate-900/60 border border-slate-800 p-8 sm:p-12 overflow-hidden shadow-2xl flex flex-col items-center justify-center min-h-[380px]">
        {/* Subtle Background Glow Rings */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className={`w-72 h-72 rounded-full transition-all duration-1000 ${
              status === 'speaking'
                ? 'bg-indigo-500/20 scale-125 blur-3xl'
                : status === 'listening'
                ? 'bg-emerald-500/15 scale-110 blur-2xl'
                : 'bg-indigo-600/5 scale-90 blur-xl'
            }`}
          />
        </div>

        {/* Dynamic Glowing Presence Orb */}
        <div className="relative z-10 flex flex-col items-center space-y-6">
          <div className="relative flex items-center justify-center">
            {/* Ripple rings */}
            {isActive && (
              <>
                <div
                  className={`absolute rounded-full border transition-all duration-700 ${
                    status === 'speaking'
                      ? 'w-48 h-48 border-indigo-400/40 animate-ping'
                      : status === 'listening'
                      ? 'w-44 h-44 border-emerald-400/30 animate-pulse'
                      : 'w-40 h-40 border-slate-700'
                  }`}
                />
                <div
                  className={`absolute rounded-full border transition-all duration-1000 ${
                    status === 'speaking'
                      ? 'w-40 h-40 border-purple-400/30'
                      : 'w-36 h-36 border-slate-800'
                  }`}
                />
              </>
            )}

            {/* Core Interactive Button / Orb */}
            <button
              id="live-voice-main-toggle"
              onClick={isActive ? endSession : startSession}
              className={`relative w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/40 ${
                !isActive
                  ? 'bg-gradient-to-b from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white hover:scale-105'
                  : status === 'speaking'
                  ? 'bg-gradient-to-b from-purple-500 to-indigo-600 text-white animate-pulse'
                  : status === 'listening'
                  ? 'bg-gradient-to-b from-emerald-600 to-teal-700 text-white'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {!isActive ? (
                <>
                  <Mic className="w-9 h-9 mb-1" />
                  <span className="text-[11px] font-medium tracking-wide uppercase">Start</span>
                </>
              ) : status === 'speaking' ? (
                <>
                  <Volume2 className="w-9 h-9 mb-1 animate-bounce" />
                  <span className="text-[10px] font-medium tracking-wider uppercase">Speaking</span>
                </>
              ) : (
                <>
                  <Mic className="w-9 h-9 mb-1 animate-pulse" />
                  <span className="text-[10px] font-medium tracking-wider uppercase">Listening</span>
                </>
              )}
            </button>
          </div>

          {/* Status Label & Waveform Indicator */}
          <div className="text-center space-y-2 max-w-md px-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  status === 'speaking'
                    ? 'bg-indigo-400 animate-ping'
                    : status === 'listening'
                    ? 'bg-emerald-400 animate-pulse'
                    : status === 'connecting'
                    ? 'bg-amber-400 animate-spin'
                    : 'bg-slate-500'
                }`}
              />
              <span className="text-slate-300 font-medium capitalize">
                {status === 'disconnected'
                  ? 'Ready to connect'
                  : status === 'connecting'
                  ? 'Opening Live channel...'
                  : status === 'speaking'
                  ? 'Zenith is speaking'
                  : isMuted
                  ? 'Microphone muted'
                  : 'Listening to your voice'}
              </span>
            </div>

            <p className="text-slate-300 text-sm italic min-h-[40px] flex items-center justify-center">
              "{liveTranscript}"
            </p>
          </div>

          {/* Active Call Controls */}
          {isActive && (
            <div className="flex items-center gap-4 pt-2">
              <button
                id="live-voice-mute-toggle"
                onClick={() => setIsMuted(!isMuted)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium border transition-all ${
                  isMuted
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4 text-amber-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
              </button>

              <button
                id="live-voice-end-button"
                onClick={endSession}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500/40 transition-all shadow-lg"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Conversation</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Suggested Spoken Phrases */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 font-medium px-1">
          <MessageCircle className="w-3.5 h-3.5 text-indigo-400" />
          <span>Quick spoken conversation starters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {promptSuggestions.map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => sendQuickPrompt(promptText)}
              className="text-left p-3 rounded-xl bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 transition-all text-xs text-slate-300 hover:text-slate-100 flex items-start gap-2.5 group"
            >
              <span className="text-indigo-400/80 group-hover:text-indigo-300 mt-0.5">•</span>
              <span className="leading-relaxed">{promptText}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
