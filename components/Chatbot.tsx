import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { streamChatResponse } from '../services/geminiService';

const Chatbot: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', content: "Hello! How can I help you on your mindfulness journey today?" }
    ]);
    const [input, setInput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Add a placeholder for the model's response
        setMessages(prev => [...prev, { role: 'model', content: '' }]);

        try {
            // Fix: Updated streamChatResponse call to remove the redundant `messages` history,
            // as the service now manages chat history internally.
             await streamChatResponse(input, (chunk) => {
                setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage && lastMessage.role === 'model') {
                        const updatedMessages = [...prev.slice(0, -1)];
                        updatedMessages.push({ ...lastMessage, content: lastMessage.content + chunk });
                        return updatedMessages;
                    }
                    return prev; 
                });
            });
        } catch (error) {
            console.error(error);
             setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage && lastMessage.role === 'model') {
                        const updatedMessages = [...prev.slice(0, -1)];
                        updatedMessages.push({ ...lastMessage, content: "Sorry, I couldn't get a response. Please try again." });
                        return updatedMessages;
                    }
                    return prev; 
                });
        } finally {
            setIsLoading(false);
        }
    };
    
    const UserIcon = () => (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    );

    const ModelIcon = () => (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM5 9a1 1 0 00-2 0v2a1 1 0 102 0V9zm11-1a1 1 0 10-2 0v2a1 1 0 102 0V8zM8 9a1 1 0 10-2 0v2a1 1 0 102 0V9zm5-1a1 1 0 10-2 0v2a1 1 0 102 0V8z" clipRule="evenodd" />
      </svg>
    );
    
    const SendIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)] bg-slate-800/50 rounded-xl shadow-lg border border-slate-700">
            <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && <div className="flex-shrink-0"><ModelIcon /></div>}
                        <div className={`max-w-md lg:max-w-lg p-3 rounded-xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                         {msg.role === 'user' && <div className="flex-shrink-0"><UserIcon /></div>}
                    </div>
                ))}
                {isLoading && messages[messages.length - 1].role === 'user' && (
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0"><ModelIcon /></div>
                        <div className="bg-slate-700 p-3 rounded-xl rounded-bl-none">
                            <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-75"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-150"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-300"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-slate-700">
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                        placeholder="Ask a question..."
                        disabled={isLoading}
                        className="flex-grow bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition-all duration-300 disabled:bg-indigo-500 disabled:cursor-not-allowed transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
                    >
                        <SendIcon />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;
