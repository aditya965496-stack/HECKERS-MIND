
import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string, media?: { data: string; type: string; mimeType: string }) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');
  const [media, setMedia] = useState<{ data: string; type: string; mimeType: string } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            setInput((prev) => prev + event.results[i][0].transcript);
          } else {
            // We could show interim results here if desired, 
            // but for now, we just wait for final chunks to avoid jumps.
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start recognition', err);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const base64 = (readerEvent.target?.result as string).split(',')[1];
        setMedia({
          data: base64,
          type: 'image',
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || media) && !disabled) {
      if (isListening) recognitionRef.current?.stop();
      onSend(input.trim(), media || undefined);
      setInput('');
      setMedia(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  return (
    <div className="space-y-3">
      {media && (
        <div className="flex items-center gap-3 p-2 bg-slate-900/50 border border-slate-700 rounded-xl w-fit group">
          <img src={`data:${media.mimeType};base64,${media.data}`} className="w-12 h-12 rounded-lg object-cover" />
          <div className="flex flex-col pr-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Image Attached</span>
            <button onClick={() => setMedia(null)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-2.5 rounded-2xl shadow-2xl">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        
        <div className="flex items-center gap-1.5 px-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Attach Image"
            className="flex-shrink-0 p-2.5 rounded-xl bg-slate-700/40 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 transition-all border border-transparent hover:border-indigo-500/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>

          <button
            type="button"
            onClick={toggleListening}
            disabled={disabled}
            title={isListening ? "Stop Listening" : "Start Voice Typing"}
            className={`flex-shrink-0 p-2.5 rounded-xl relative transition-all duration-500 group/mic ${
              isListening 
                ? 'bg-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                : 'bg-slate-700/40 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 border border-transparent hover:border-indigo-500/20'
            }`}
          >
            {isListening && (
              <span className="absolute inset-0 rounded-xl bg-red-500/40 animate-ping opacity-75"></span>
            )}
            <div className={`${isListening ? 'animate-pulse' : ''} relative z-10`}>
              {isListening ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
              )}
            </div>
          </button>
        </div>

        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Listening for your voice..." : media ? "Describe how to edit this image..." : "Ask me anything..."}
          disabled={disabled}
          className={`flex-1 bg-transparent text-slate-200 placeholder-slate-500 text-[15px] py-2.5 px-2 focus:outline-none resize-none min-h-[44px] max-h-[150px] custom-scrollbar transition-opacity duration-300 ${isListening ? 'opacity-80' : 'opacity-100'}`}
        />
        
        <button
          type="submit"
          disabled={(!input.trim() && !media) || disabled}
          className={`flex-shrink-0 p-2.5 rounded-xl transition-all duration-300 mr-1 mb-0.5 ${
            (input.trim() || media) && !disabled 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 active:scale-95' 
              : 'bg-slate-700/60 text-slate-500 cursor-not-allowed opacity-40'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
