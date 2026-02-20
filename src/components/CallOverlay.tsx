import { useState, useEffect, useRef } from 'react';
import { type Chat } from '@/lib/storage';
import Icon from '@/components/ui/icon';

interface CallOverlayProps {
  chat: Chat;
  callType: 'voice' | 'video';
  onEnd: () => void;
}

export default function CallOverlay({ chat, callType, onEnd }: CallOverlayProps) {
  const [status, setStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const connectTimer = setTimeout(() => {
      setStatus('connected');
    }, 2000 + Math.random() * 2000);

    return () => clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const handleEnd = () => {
    setStatus('ended');
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(onEnd, 600);
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-between py-16 px-6 transition-opacity duration-300 ${
      status === 'ended' ? 'opacity-0' : 'opacity-100'
    } ${callType === 'video' ? 'bg-zinc-900' : 'bg-gradient-to-b from-primary/90 to-primary/70'}`}>
      <div className="flex flex-col items-center gap-2 animate-fade-in">
        <div className="text-sm text-white/60 uppercase tracking-wider font-medium">
          {callType === 'video' ? 'Видеозвонок' : 'Голосовой звонок'}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/50">
          <img src="https://cdn.poehali.dev/projects/2bf6d4f6-893f-48e1-986c-00c5bd829ead/bucket/afbe201b-93df-4672-998c-17567d16ef9b.jpg" alt="Того" className="w-3 h-3 rounded-full object-cover" />
          Зашифрован
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className={`w-28 h-28 rounded-full flex items-center justify-center text-white text-4xl font-semibold ${
          status === 'calling' ? 'bg-white/20 animate-pulse' : 'bg-white/15'
        }`}>
          {chat.avatar}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">{chat.name}</h2>
          <p className="text-sm text-white/60 mt-1">
            {status === 'calling' && 'Вызов...'}
            {status === 'connected' && formatDuration(duration)}
            {status === 'ended' && 'Завершён'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={() => setMuted(!muted)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            muted ? 'bg-white text-zinc-900' : 'bg-white/20 text-white'
          }`}
        >
          <Icon name={muted ? 'MicOff' : 'Mic'} size={22} />
        </button>

        <button
          onClick={handleEnd}
          className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <Icon name="PhoneOff" size={24} />
        </button>

        <button
          onClick={() => setSpeakerOn(!speakerOn)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            speakerOn ? 'bg-white text-zinc-900' : 'bg-white/20 text-white'
          }`}
        >
          <Icon name={speakerOn ? 'Volume2' : 'Volume1'} size={22} />
        </button>
      </div>
    </div>
  );
}