import NetworkStatus from '@/components/NetworkStatus';
import Icon from '@/components/ui/icon';

interface AppHeaderProps {
  displayName: string;
  online: boolean;
  quality: string;
  syncing: boolean;
  queueLength: number;
  onLogout: () => void;
}

export default function AppHeader({ displayName, online, quality, syncing, queueLength, onLogout }: AppHeaderProps) {
  return (
    <>
      <div className="h-1.5 w-full overflow-hidden flex-shrink-0" aria-hidden>
        <svg width="100%" height="6" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="evk" x="0" y="0" width="48" height="6" patternUnits="userSpaceOnUse">
              {/* фон */}
              <rect width="48" height="6" fill="#1a3a5c"/>
              {/* красная полоса верх */}
              <rect y="0" width="48" height="1.2" fill="#c0392b"/>
              {/* красная полоса низ */}
              <rect y="4.8" width="48" height="1.2" fill="#c0392b"/>
              {/* бирюзовые ромбы */}
              <polygon points="8,3 11,1.5 14,3 11,4.5" fill="#2ab3b0"/>
              <polygon points="24,3 27,1.5 30,3 27,4.5" fill="#2ab3b0"/>
              <polygon points="40,3 43,1.5 46,3 43,4.5" fill="#2ab3b0"/>
              {/* золотые точки */}
              <circle cx="4" cy="3" r="0.8" fill="#d4a843"/>
              <circle cx="19" cy="3" r="0.8" fill="#d4a843"/>
              <circle cx="35" cy="3" r="0.8" fill="#d4a843"/>
            </pattern>
          </defs>
          <rect width="100%" height="6" fill="url(#evk)"/>
        </svg>
      </div>
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img src="https://cdn.poehali.dev/projects/2bf6d4f6-893f-48e1-986c-00c5bd829ead/bucket/afbe201b-93df-4672-998c-17567d16ef9b.jpg" alt="Того" className="w-full h-full object-cover" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Того</span>
          <span className="text-xs text-muted-foreground ml-1">{displayName}</span>
        </div>
        <div className="flex items-center gap-3">
          <NetworkStatus online={online} quality={quality} syncing={syncing} queueLength={queueLength} />
          <button onClick={onLogout} className="p-1.5 hover:bg-muted rounded-md transition-colors" title="Выйти">
            <Icon name="LogOut" size={16} className="text-muted-foreground" />
          </button>
        </div>
      </header>
    </>
  );
}
