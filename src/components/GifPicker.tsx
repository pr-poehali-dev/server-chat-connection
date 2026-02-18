import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';

const GIF_CATEGORIES = [
  { label: '👋 Привет', gifs: ['👋😊', '🙋‍♂️', '🤗✨'] },
  { label: '😂 Смех', gifs: ['🤣💀', '😂👌', '😆🔥'] },
  { label: '❤️ Любовь', gifs: ['😍❤️', '🥰💕', '💖✨'] },
  { label: '🎉 Ура', gifs: ['🎉🥳', '🎊🏆', '🥂✨'] },
  { label: '👍 ОК', gifs: ['👍✅', '💯🔥', '🤝👌'] },
  { label: '😢 Грусть', gifs: ['😢💔', '😭😿', '🥺💧'] },
];

interface GifPickerProps {
  onSelect: (gif: string) => void;
  onClose: () => void;
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [search, setSearch] = useState('');

  const filteredCategories = search
    ? GIF_CATEGORIES.filter(c => c.label.toLowerCase().includes(search.toLowerCase()))
    : GIF_CATEGORIES;

  return (
    <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in w-full max-w-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Icon name="Search" size={14} className="text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск GIF..."
          className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
          <span className="text-xs text-muted-foreground">✕</span>
        </button>
      </div>

      <ScrollArea className="h-48 scrollbar-thin">
        <div className="p-2 space-y-3">
          {filteredCategories.map((cat, ci) => (
            <div key={ci}>
              <div className="text-[10px] text-muted-foreground font-medium mb-1.5 px-1">{cat.label}</div>
              <div className="grid grid-cols-3 gap-1.5">
                {cat.gifs.map((gif, gi) => (
                  <button
                    key={gi}
                    onClick={() => onSelect(gif)}
                    className="aspect-square bg-muted rounded-lg flex items-center justify-center text-2xl hover:bg-muted/80 transition-colors hover:scale-105"
                  >
                    {gif}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Ничего не найдено</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
