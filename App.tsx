import React, { useState } from 'react';
import { Sparkles, Mic, Globe, Heart } from 'lucide-react';
import { MeditationStudio } from './components/MeditationStudio';
import { LiveVoiceGuide } from './components/LiveVoiceGuide';
import { GroundedWisdomChat } from './components/GroundedWisdomChat';

type Tab = 'studio' | 'live' | 'wisdom';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('studio');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Ambient Light Halo */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[250px] bg-indigo-600/10 blur-[130px] pointer-events-none -z-10" />

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-medium text-white tracking-tight">Zenith</h1>
              <p className="text-[10px] text-indigo-300/80 -mt-0.5 tracking-wide uppercase">AI Guided Meditation</p>
            </div>
          </div>

          {/* Clean Modern Navigation Tabs */}
          <nav id="app-navigation-tabs" className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 shadow-inner">
            <button
              id="tab-meditation-studio"
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'studio'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Studio</span>
            </button>

            <button
              id="tab-live-voice-guide"
              onClick={() => setActiveTab('live')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'live'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Live Guide</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              id="tab-mindfulness-wisdom"
              onClick={() => setActiveTab('wisdom')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'wisdom'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Wisdom & Search</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Primary Application Workspace */}
      <main className="flex-grow max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {activeTab === 'studio' && <MeditationStudio />}
        {activeTab === 'live' && <LiveVoiceGuide />}
        {activeTab === 'wisdom' && <GroundedWisdomChat />}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-900 py-5 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center justify-center gap-1">
            <span>Crafted for presence & peaceful minds</span>
            <Heart className="w-3 h-3 text-indigo-400 fill-indigo-400/30 inline" />
          </p>
          <p className="text-[11px] text-slate-400">
            Powered by Gemini Live API & Google Search Grounding
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
