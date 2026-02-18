import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Status {
  id: string;
  name: string;
  avatar: string;
  time: string;
  seen: boolean;
}

const DEMO_STATUSES: Status[] = [
  { id: '1', name: 'Алексей', avatar: 'А', time: '12 мин. назад', seen: false },
  { id: '2', name: 'Мария', avatar: 'М', time: '45 мин. назад', seen: false },
  { id: '3', name: 'Дмитрий', avatar: 'Д', time: '2 ч. назад', seen: true },
  { id: '4', name: 'Анна', avatar: 'А', time: '5 ч. назад', seen: true },
];

export default function StatusScreen({ displayName, avatar }: { displayName: string; avatar: string }) {
  const [statuses] = useState<Status[]>(DEMO_STATUSES);
  const unseen = statuses.filter(s => !s.seen);
  const seen = statuses.filter(s => s.seen);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-base font-semibold">Статусы</h2>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              {avatar || displayName[0]?.toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center border-2 border-background">
              <Icon name="Plus" size={12} />
            </div>
          </div>
          <div>
            <div className="text-sm font-medium">Мой статус</div>
            <div className="text-xs text-muted-foreground">Нажмите, чтобы добавить статус</div>
          </div>
        </button>

        {unseen.length > 0 && (
          <>
            <div className="px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Новые</span>
            </div>
            {unseen.map(s => (
              <button key={s.id} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left">
                <div className="w-12 h-12 rounded-full border-2 border-primary p-0.5">
                  <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                    {s.avatar}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.time}</div>
                </div>
              </button>
            ))}
          </>
        )}

        {seen.length > 0 && (
          <>
            <div className="px-4 py-2 mt-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Просмотренные</span>
            </div>
            {seen.map(s => (
              <button key={s.id} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left">
                <div className="w-12 h-12 rounded-full border-2 border-muted-foreground/30 p-0.5">
                  <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-semibold">
                    {s.avatar}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.time}</div>
                </div>
              </button>
            ))}
          </>
        )}
      </ScrollArea>
    </div>
  );
}
