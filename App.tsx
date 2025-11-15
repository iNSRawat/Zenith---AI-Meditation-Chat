
import React, { useState } from 'react';
import MeditationGenerator from './components/MeditationGenerator';
import Chatbot from './components/Chatbot';

type Tab = 'meditation' | 'chat';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('meditation');

  const MeditationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );

  const TabButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
  }> = ({ label, icon, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 ${
        isActive ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-slate-100 flex flex-col">
      <header className="p-4 bg-slate-900/50 backdrop-blur-sm shadow-lg sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Zenith AI</h1>
          <nav className="flex items-center gap-2 p-1 bg-slate-800 rounded-lg">
            <TabButton
              label="Meditate"
              icon={<MeditationIcon />}
              isActive={activeTab === 'meditation'}
              onClick={() => setActiveTab('meditation')}
            />
            <TabButton
              label="Chat"
              icon={<ChatIcon />}
              isActive={activeTab === 'chat'}
              onClick={() => setActiveTab('chat')}
            />
          </nav>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'meditation' && <MeditationGenerator />}
          {activeTab === 'chat' && <Chatbot />}
        </div>
      </main>
      
      <footer className="text-center p-4 text-xs text-slate-500">
        <p>Powered by Gemini. For mindfulness and informational purposes only.</p>
      </footer>
    </div>
  );
};

export default App;
