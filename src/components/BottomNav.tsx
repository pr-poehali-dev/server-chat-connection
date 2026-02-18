import Icon from '@/components/ui/icon';

export type TabId = 'status' | 'chats' | 'calls';

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  unreadChats: number;
}

const tabs: { id: TabId; icon: string; label: string }[] = [
  { id: 'status', icon: 'CircleDot', label: 'Статусы' },
  { id: 'chats', icon: 'MessageCircle', label: 'Чаты' },
  { id: 'calls', icon: 'Phone', label: 'Звонки' },
];

export default function BottomNav({ active, onChange, unreadChats }: BottomNavProps) {
  return (
    <nav className="flex items-center justify-around border-t border-border bg-card/90 backdrop-blur-sm px-2 py-1 safe-bottom">
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
    </nav>
  );
}
