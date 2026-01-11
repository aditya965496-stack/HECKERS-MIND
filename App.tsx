
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, Role, ChatSession, GroundingSource } from './types';
import { geminiService } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import Sidebar from './components/Sidebar';
import { LiveVoice } from './components/LiveVoice';

const STORAGE_KEY = 'gemini_chat_sessions_v2';

const SUGGESTIONS = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
    ),
    title: "Search & Research",
    description: "Latest trends in artificial intelligence",
    prompt: "What are the biggest breakthroughs in AI this week?"
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
    ),
    title: "Creative Writing",
    description: "Write a short sci-fi story about Mars",
    prompt: "Write a compelling 200-word sci-fi story about the first settlement on Mars."
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
    ),
    title: "Image Editing",
    description: "Add a retro filter to my photo",
    prompt: "Please add a vintage 70s retro filter to this image."
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
    ),
    title: "Video Animation",
    description: "Animate a static landscape image",
    prompt: "Animate this landscape to make the clouds move realistically."
  }
];

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
        }));
      } catch (e) { return []; }
    }
    return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed[0]?.id || null;
      } catch { return null; }
    }
    return null;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isFastMode, setIsFastMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [statusText, setStatusText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const activeSession = sessions.find(s => s.id === currentSessionId);
  const messages = activeSession?.messages || [];

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    geminiService.resetChat();
  }, []);

  useEffect(() => { if (sessions.length === 0) createNewSession(); }, [sessions.length, createNewSession]);

  const handleSendMessage = async (text: string, media?: { data: string; type: string; mimeType: string }) => {
    if (!currentSessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: text,
      timestamp: new Date(),
      mediaUrl: media ? `data:${media.mimeType};base64,${media.data}` : undefined,
      mediaType: media?.type as any
    };

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const isFirst = s.messages.length === 0;
        return {
          ...s,
          title: isFirst ? (text.length > 25 ? text.substring(0, 25) + '...' : text || 'Untitled Chat') : s.title,
          messages: [...s.messages, userMessage]
        };
      }
      return s;
    }));

    setIsTyping(true);
    const botMsgId = (Date.now() + 1).toString();
    const botMessage: Message = { id: botMsgId, role: Role.MODEL, content: '', timestamp: new Date(), isStreaming: true };
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, botMessage] } : s));

    try {
      if (media && text.toLowerCase().includes('animate')) {
        setStatusText('Directing scene with Veo...');
        const videoUrl = await geminiService.generateVideo(text, media.data, media.mimeType);
        setSessions(prev => prev.map(s => s.id === currentSessionId ? {
          ...s,
          messages: s.messages.map(m => m.id === botMsgId ? { ...m, content: 'Your video is ready!', mediaUrl: videoUrl, mediaType: 'video', isStreaming: false } : m)
        } : s));
      } else if (media) {
        setStatusText('Editing image with Nano Banana...');
        const editedImg = await geminiService.editImage(text, media.data, media.mimeType);
        setSessions(prev => prev.map(s => s.id === currentSessionId ? {
          ...s,
          messages: s.messages.map(m => m.id === botMsgId ? { ...m, content: 'Here is your edited image.', mediaUrl: editedImg || undefined, mediaType: 'image', isStreaming: false } : m)
        } : s));
      } else {
        setStatusText(isFastMode ? 'Thinking fast...' : 'Searching Google...');
        let fullText = '';
        let lastSources: GroundingSource[] = [];
        
        // Select model based on Fast Mode toggle
        const modelName = isFastMode ? 'gemini-flash-lite-latest' : 'gemini-3-flash-preview';
        
        const stream = geminiService.streamMessage(text, modelName);
        for await (const chunk of stream) {
          fullText += chunk.text;
          lastSources = chunk.sources;
          setSessions(prev => prev.map(s => s.id === currentSessionId ? {
            ...s,
            messages: s.messages.map(m => m.id === botMsgId ? { ...m, content: fullText, groundingSources: lastSources } : m)
          } : s));
        }
        setSessions(prev => prev.map(s => s.id === currentSessionId ? {
          ...s,
          messages: s.messages.map(m => m.id === botMsgId ? { ...m, isStreaming: false } : m)
        } : s));
      }
    } catch (error) {
      console.error(error);
      setSessions(prev => prev.map(s => s.id === currentSessionId ? {
        ...s,
        messages: s.messages.map(m => m.id === botMsgId ? { ...m, content: 'Error: Failed to process request.', isStreaming: false } : m)
      } : s));
    } finally {
      setIsTyping(false);
      setStatusText('');
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (currentSessionId === id) {
        setCurrentSessionId(filtered[0]?.id || null);
        geminiService.resetChat();
      }
      return filtered;
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: s.messages.filter(m => m.id !== messageId)
        };
      }
      return s;
    }));
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-inter">
      <Sidebar 
        sessions={sessions}
        currentSessionId={currentSessionId}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectSession={(id) => { setCurrentSessionId(id); geminiService.resetChat(); }}
        onNewChat={createNewSession}
        onDeleteSession={handleDeleteSession}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="flex-shrink-0 px-6 py-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl flex items-center justify-between z-10 shadow-2xl">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-slate-800 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M2 12h2"/><path d="m4.93 19.07 1.41-1.41"/><path d="M12 20v2"/><path d="m19.07 19.07-1.41-1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.41 14.97 12 21l-3.41-6.03A5 5 0 0 1 12 5a5 5 0 0 1 3.41 9.97z"/></svg>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-base tracking-tight truncate max-w-[200px]">{activeSession?.title || 'heckers_mind'}</h1>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isFastMode ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {isFastMode ? 'Fast AI Active' : 'Grounded Search Active'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsFastMode(!isFastMode)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all active:scale-95 shadow-lg ${
                isFastMode 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'
              }`}
              title={isFastMode ? "Switch to Grounded Mode" : "Switch to Fast Mode"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${isFastMode ? 'fill-amber-500' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              <span className="hidden md:inline text-xs font-bold uppercase tracking-widest">Fast AI</span>
            </button>
            <button onClick={() => setIsVoiceOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 font-bold text-xs transition-all border border-slate-700 active:scale-95 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
              <span className="hidden md:inline">Voice Call</span>
            </button>
            <button onClick={createNewSession} className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </header>

        <main ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-6 py-10 max-w-4xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in zoom-in duration-1000">
              <div className="w-24 h-24 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-8 shadow-2xl ring-1 ring-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Welcome to heckers_mind</h2>
              <p className="text-slate-400 max-w-md mx-auto text-lg leading-relaxed mb-12">I'm your intelligent companion. Let's explore information, edit visuals, or just chat. What's on your mind?</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(s.prompt)}
                    className="group relative flex flex-col items-start p-5 rounded-3xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/60 transition-all duration-300 text-left shadow-xl hover:shadow-indigo-500/10 active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-slate-800 group-hover:bg-indigo-600/20 flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 transition-colors mb-4 border border-slate-700 group-hover:border-indigo-500/30">
                      {s.icon}
                    </div>
                    <h3 className="font-bold text-slate-200 mb-1">{s.title}</h3>
                    <p className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">{s.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage 
                key={msg.id} 
                message={msg} 
                onDelete={handleDeleteMessage} 
              />
            ))
          )}
          {isTyping && (
            <div className="flex gap-3 mb-6 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-500 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
              </div>
              <div className="bg-slate-800/50 px-4 py-2 rounded-2xl text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                {statusText || 'Processing...'}
              </div>
            </div>
          )}
        </main>

        <div className="flex-shrink-0 px-6 pb-8 max-w-4xl mx-auto w-full">
          <ChatInput onSend={handleSendMessage} disabled={isTyping} />
          <div className="flex items-center justify-center gap-4 mt-4">
             <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span><span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Nano Banana</span></div>
             <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span><span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Veo Powered</span></div>
             <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Grounded Search</span></div>
          </div>
        </div>
      </div>
      {isVoiceOpen && <LiveVoice onClose={() => setIsVoiceOpen(false)} />}
    </div>
  );
};

export default App;
