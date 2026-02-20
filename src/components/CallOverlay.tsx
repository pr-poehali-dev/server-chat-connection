import Icon from '@/components/ui/icon';
import { AvatarImg } from '@/lib/avatars';
import { type CallState, type ActiveCallInfo } from '@/hooks/use-webrtc';

interface CallOverlayProps {
  callState: CallState;
  callInfo: ActiveCallInfo;
  duration: number;
  muted: boolean;
  speakerOn: boolean;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function stateLabel(state: CallState, isIncoming: boolean) {
  switch (state) {
    case 'calling': return 'Вызов...';
    case 'ringing': return isIncoming ? 'Входящий звонок...' : 'Звонит...';
    case 'connecting': return 'Подключение...';
    case 'ended': return 'Завершён';
    default: return '';
  }
}

export default function CallOverlay({ callState, callInfo, duration, muted, speakerOn, onEnd, onToggleMute, onToggleSpeaker }: CallOverlayProps) {
  const isVideo = callInfo.callType === 'video';

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-between py-16 px-6 transition-opacity duration-300 ${
      callState === 'ended' ? 'opacity-0' : 'opacity-100'
    } ${isVideo ? 'bg-zinc-900' : 'bg-gradient-to-b from-primary/90 to-primary/70'}`}>
      <div className="flex flex-col items-center gap-2 animate-fade-in">
        <div className="text-sm text-white/60 uppercase tracking-wider font-medium">
          {isVideo ? 'Видеозвонок' : 'Голосовой звонок'}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/50">
          <img src="https://cdn.poehali.dev/projects/2bf6d4f6-893f-48e1-986c-00c5bd829ead/bucket/afbe201b-93df-4672-998c-17567d16ef9b.jpg" alt="Того" className="w-3 h-3 rounded-full object-cover" />
          Зашифрован
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className={`w-28 h-28 rounded-full flex items-center justify-center overflow-hidden ${
          callState === 'calling' || callState === 'ringing' ? 'animate-pulse' : ''
        }`}>
          <AvatarImg avatar={callInfo.peerAvatar} size={112} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">{callInfo.peerName}</h2>
          <p className="text-sm text-white/60 mt-1">
            {callState === 'active' ? formatDuration(duration) : stateLabel(callState, callInfo.isIncoming)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={onToggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            muted ? 'bg-white text-zinc-900' : 'bg-white/20 text-white'
          }`}
        >
          <Icon name={muted ? 'MicOff' : 'Mic'} size={22} />
        </button>

        <button
          onClick={onEnd}
          className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <Icon name="PhoneOff" size={24} />
        </button>

        <button
          onClick={onToggleSpeaker}
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
