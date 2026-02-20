import { useState, useRef } from 'react';
import Icon from '@/components/ui/icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AvatarImg } from '@/lib/avatars';

interface MyStatus {
  type: 'text' | 'image';
  content: string;
  time: string;
}

export default function StatusScreen({ displayName, avatar }: { displayName: string; avatar: string }) {
  const [myStatus, setMyStatus] = useState<MyStatus | null>(null);
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddText = () => {
    if (!text.trim()) return;
    setMyStatus({ type: 'text', content: text.trim(), time: 'Только что' });
    setText('');
    setComposing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMyStatus({ type: 'image', content: url, time: 'Только что' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-base font-semibold">Статусы</h2>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">

        {/* Мой статус */}
        <div className="border-b border-border pb-2 mb-1">
          <button
            onClick={() => setComposing(true)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
          >
            <div className="relative">
              <AvatarImg avatar={avatar} size={48} />
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center border-2 border-background">
                <Icon name="Plus" size={12} />
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Мой статус</div>
              <div className="text-xs text-muted-foreground">
                {myStatus ? myStatus.time : 'Нажмите, чтобы добавить статус'}
              </div>
            </div>
            {myStatus && (
              <div className="ml-auto">
                {myStatus.type === 'image'
                  ? <img src={myStatus.content} className="w-10 h-10 rounded-lg object-cover" />
                  : <span className="text-xs text-muted-foreground max-w-[80px] truncate block">{myStatus.content}</span>
                }
              </div>
            )}
          </button>

          {/* Composer */}
          {composing && (
            <div className="mx-4 mb-3 bg-card border border-border rounded-xl p-3 flex flex-col gap-2">
              <textarea
                className="w-full bg-transparent text-sm resize-none outline-none min-h-[60px] placeholder:text-muted-foreground"
                placeholder="Что у вас нового?"
                value={text}
                onChange={e => setText(e.target.value)}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted"
                >
                  <Icon name="Image" size={14} />
                  Фото
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <div className="flex-1" />
                <button
                  onClick={() => { setComposing(false); setText(''); }}
                  className="text-xs text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddText}
                  disabled={!text.trim()}
                  className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg disabled:opacity-40 transition-opacity"
                >
                  Опубликовать
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Заглушка — нет статусов контактов */}
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center opacity-60">
          <Icon name="CircleDot" size={32} className="text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Статусы ваших контактов появятся здесь</p>
        </div>

      </ScrollArea>
    </div>
  );
}
