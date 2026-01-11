
import React, { useState } from 'react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  isOpen,
  onClose,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}) => {
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  const sortedSessions = [...sessions].sort((a, b) => {
    if (sortBy === 'date') return b.createdAt.getTime() - a.createdAt.getTime();
    return a.title.localeCompare(b.title);
  });

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5">
          <button
            onClick={() => { onNewChat(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-xl shadow-indigo-600/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Start New Chat
          </button>
        </div>

        <div className="px-5 mb-2 flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em]">Recent</h3>
          <div className="flex bg-slate-800/50 p-1 rounded-lg">
            <button 
              onClick={() => setSortBy('date')}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${sortBy === 'date' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Recent
            </button>
            <button 
              onClick={() => setSortBy('name')}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${sortBy === 'name' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              A-Z
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1.5 custom-scrollbar">
          {sortedSessions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-slate-800 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <p className="text-sm text-slate-500 italic">History is empty</p>
            </div>
          ) : (
            sortedSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => { onSelectSession(session.id); onClose(); }}
                className={`group flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all border ${
                  currentSessionId === session.id
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span className="text-sm font-semibold truncate">{session.title}</span>
                </div>
                <button
                  onClick={(e) => onDeleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-5 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50 shadow-inner">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">JS</div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-200 truncate">Jane Smith</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pro User</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
