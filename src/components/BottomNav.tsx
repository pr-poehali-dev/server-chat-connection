import Icon from '@/components/ui/icon';

export type TabId = 'chats' | 'status' | 'calls' | 'profile';

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  unreadChats: number;
}

const tabs: { id: TabId; icon: string; label: string }[] = [
  { id: 'chats', icon: 'MessageCircle', label: 'Чаты' },
  { id: 'status', icon: 'CircleDot', label: 'Статусы' },
  { id: 'calls', icon: 'Phone', label: 'Звонки' },
  { id: 'profile', icon: 'User', label: 'Профиль' },
];

const EvenkiStripe = () => (
  <div className="h-1.5 w-full overflow-hidden flex-shrink-0" aria-hidden>
    <svg width="100%" height="6" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="evk-b" x="0" y="0" width="48" height="6" patternUnits="userSpaceOnUse">
          <rect width="48" height="6" fill="#1a3a5c"/>
          <rect y="0" width="48" height="1.2" fill="#c0392b"/>
          <rect y="4.8" width="48" height="1.2" fill="#c0392b"/>
          <polygon points="8,3 11,1.5 14,3 11,4.5" fill="#2ab3b0"/>
          <polygon points="24,3 27,1.5 30,3 27,4.5" fill="#2ab3b0"/>
          <polygon points="40,3 43,1.5 46,3 43,4.5" fill="#2ab3b0"/>
          <circle cx="4" cy="3" r="0.8" fill="#d4a843"/>
          <circle cx="19" cy="3" r="0.8" fill="#d4a843"/>
          <circle cx="35" cy="3" r="0.8" fill="#d4a843"/>
        </pattern>
      </defs>
      <rect width="100%" height="6" fill="url(#evk-b)"/>
    </svg>
  </div>
);

export default function BottomNav({ active, onChange, unreadChats }: BottomNavProps) {
  return (
    <nav className="border-t border-border bg-card/90 backdrop-blur-sm safe-bottom">
      <EvenkiStripe />
      <div className="flex items-center justify-around px-2 py-1">
        {tabs.map(tab => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-colors relative ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon name={tab.icon} size={20} />
                {tab.id === 'chats' && unreadChats > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {unreadChats > 99 ? '99+' : unreadChats}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <div className="absolute -bottom-1 w-5 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}