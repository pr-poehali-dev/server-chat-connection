import Icon from '@/components/ui/icon';
import { AvatarImg } from '@/lib/avatars';

interface IncomingCallOverlayProps {
  peerName: string;
  peerAvatar: string;
  callType: 'voice' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallOverlay({ peerName, peerAvatar, callType, onAccept, onReject }: IncomingCallOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between py-16 px-6 bg-gradient-to-b from-zinc-900/95 to-zinc-800/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2 animate-fade-in">
        <div className="text-sm text-white/60 uppercase tracking-wider font-medium">
          {callType === 'video' ? 'Входящий видеозвонок' : 'Входящий звонок'}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/50">
          <img src="https://cdn.poehali.dev/projects/2bf6d4f6-893f-48e1-986c-00c5bd829ead/bucket/afbe201b-93df-4672-998c-17567d16ef9b.jpg" alt="Того" className="w-3 h-3 rounded-full object-cover" />
          Зашифрован
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="w-32 h-32 rounded-full animate-pulse flex items-center justify-center overflow-hidden ring-4 ring-white/20">
          <AvatarImg avatar={peerAvatar} size={128} />
        </div>
        <h2 className="text-2xl font-semibold text-white">{peerName}</h2>
      </div>

      <div className="flex items-center gap-12">
        <button
          onClick={onReject}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors">
            <Icon name="PhoneOff" size={24} />
          </div>
          <span className="text-xs text-white/60">Отклонить</span>
        </button>

        <button
          onClick={onAccept}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-16 h-16 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center text-white transition-colors animate-bounce">
            <Icon name="Phone" size={24} />
          </div>
          <span className="text-xs text-white/60">Принять</span>
        </button>
      </div>
    </div>
  );
}
