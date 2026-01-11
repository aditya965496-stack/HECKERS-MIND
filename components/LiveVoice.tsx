
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface LiveVoiceProps {
  onClose: () => void;
}

export const LiveVoice: React.FC<LiveVoiceProps> = ({ onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Connecting...');
  const [transcript, setTranscript] = useState('');
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    async function startSession() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          callbacks: {
            onopen: () => {
              setIsActive(true);
              setStatus('Listening...');
              const source = audioContextRef.current!.createMediaStreamSource(stream);
              const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
                const base64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
                sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } }));
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(audioContextRef.current!.destination);
            },
            onmessage: async (msg: LiveServerMessage) => {
              if (msg.serverContent?.outputTranscription) {
                setTranscript(prev => prev + ' ' + msg.serverContent!.outputTranscription!.text);
              }
              const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (audioData) {
                const binary = atob(audioData);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                const dataInt16 = new Int16Array(bytes.buffer);
                const buffer = outputAudioContextRef.current!.createBuffer(1, dataInt16.length, 24000);
                const channelData = buffer.getChannelData(0);
                for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;

                const source = outputAudioContextRef.current!.createBufferSource();
                source.buffer = buffer;
                source.connect(outputAudioContextRef.current!.destination);
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current!.currentTime);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
              }
              if (msg.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            },
            onclose: onClose,
            onerror: (e) => console.error(e),
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            outputAudioTranscription: {},
          },
        });
        sessionRef.current = await sessionPromise;
      } catch (e) {
        console.error(e);
        onClose();
      }
    }
    startSession();
    return () => {
      sessionRef.current?.close();
      audioContextRef.current?.close();
      outputAudioContextRef.current?.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="relative w-full max-w-lg flex flex-col items-center">
        <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-1000 ${isActive ? 'bg-indigo-600 shadow-[0_0_80px_rgba(79,70,229,0.4)] scale-110' : 'bg-slate-800'}`}>
          <div className={`absolute inset-0 rounded-full border-4 border-indigo-500/30 ${isActive ? 'animate-ping' : ''}`} />
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
        </div>
        
        <h2 className="mt-8 text-2xl font-bold text-white tracking-tight">{status}</h2>
        <p className="mt-4 text-slate-400 text-center text-sm max-h-32 overflow-y-auto italic">
          {transcript || "Speak to start the conversation..."}
        </p>

        <button 
          onClick={onClose}
          className="mt-12 px-8 py-3 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all border border-slate-700 active:scale-95"
        >
          End Call
        </button>
      </div>
    </div>
  );
};
