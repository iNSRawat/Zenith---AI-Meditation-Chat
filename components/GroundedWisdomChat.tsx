import React, { useState, useRef, useEffect } from 'react';
import { Send, Globe, ExternalLink, Sparkles, BookOpen, Loader2 } from 'lucide-react';
import { askGroundedMindfulness } from '../services/geminiService';
import { ChatMessage, GroundedSource } from '../types';

export const GroundedWisdomChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        "Welcome to Zenith Wisdom. I'm your mindfulness and wellness science guide, grounded in real-time Google Search data. Ask me about evidence-based breathwork, neuroscience of stress reduction, meditation research, or sleep hygiene.",
      timestamp: Date.now(),
      sources: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const historyContext = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await askGroundedMindfulness(textToSend, historyContext);

      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: res.text,
        sources: res.sources,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: "I'm having a brief moment reconnecting to search wisdom. Take a mindful breath and please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    'What does recent science say about cyclic sighing for reducing stress?',
    'What are the evidence-based benefits of 10-minute daily meditation on the brain?',
    'How does box breathing affect heart rate variability (HRV)?',
    'What are the top scientifically backed mindfulness habits for deep sleep?',
  ];

  return (
    <div id="grounded-wisdom-chat" className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>Grounded in Google Search Data (gemini-3.5-flash)</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-light text-slate-100 tracking-tight">
          Mindfulness & Wellness Wisdom
        </h2>
        <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
          Ask questions about meditation neuroscience, clinical breathing studies, and wellness techniques with grounded real-world sources.
        </p>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-800 flex flex-col h-[520px] shadow-xl overflow-hidden">
        <div className="flex-grow p-4 sm:p-6 overflow-y-auto space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[11px] font-medium text-slate-400">
                  {msg.role === 'user' ? 'You' : 'Zenith Guide'}
                </span>
                {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <Globe className="w-2.5 h-2.5" />
                    {msg.sources.length} {msg.sources.length === 1 ? 'source' : 'sources'}
                  </span>
                )}
              </div>

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Sources Pill Grid */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-slate-700/60 space-y-1.5">
                    <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
                      <BookOpen className="w-3 h-3" />
                      <span>Grounded Search Sources:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-700 border border-slate-700 hover:border-emerald-400 text-[11px] text-emerald-300 transition-colors"
                        >
                          <span className="truncate max-w-[180px]">{src.title || src.url}</span>
                          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-70" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col items-start space-y-1">
              <span className="text-[11px] font-medium text-slate-400 px-1">Zenith Guide</span>
              <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-slate-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span className="text-xs text-slate-400">Searching verified wellness studies & formulating answer...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input & Suggested Inquiries */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <input
              id="wisdom-query-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a scientific mindfulness question (e.g., physiological sigh benefits)..."
              disabled={isLoading}
              className="flex-grow bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all disabled:opacity-50"
            />
            <button
              id="wisdom-send-button"
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex-shrink-0"
              title="Search and ask"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Search Questions */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium px-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Explore popular evidence-based topics:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={isLoading}
              className="text-left p-2.5 rounded-xl bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/30 text-xs text-slate-300 hover:text-slate-100 transition-all truncate"
            >
              "{q}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
