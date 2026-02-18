import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  {
    name: '😊 Смайлы',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁','😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  },
  {
    name: '👋 Жесты',
    emojis: ['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','💪','🫂','🖤','❤️','🧡','💛','💚','💙','💜','🩷','🩵','🤎','🖤','🤍'],
  },
  {
    name: '🎉 Предметы',
    emojis: ['🎉','🎊','🎈','🎁','🏆','🥇','⚡','🔥','✨','🌟','💫','🎯','🚀','💎','🔔','📱','💻','⌨️','🖥️','📷','📸','🎬','🎵','🎶','🎤','🎧','☕','🍕','🍔','🍟','🍩','🍰','🎂','🍷','🍺','🥂'],
  },
  {
    name: '💬 Символы',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','✅','❌','❓','❗','💯','🔴','🟢','🔵','⭐','🌈','☀️','🌙','🌸','🍀','🦋','🐱','🐶'],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-fade-in w-full max-w-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex gap-1">
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={i}
              onClick={() => setActiveCategory(i)}
              className={`px-2 py-1 rounded-md text-xs transition-colors ${
                activeCategory === i ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {cat.emojis[0]}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
          <span className="text-xs text-muted-foreground">✕</span>
        </button>
      </div>

      <ScrollArea className="h-48 scrollbar-thin">
        <div className="p-2">
          <div className="text-[10px] text-muted-foreground font-medium mb-1.5 px-1">
            {EMOJI_CATEGORIES[activeCategory].name}
          </div>
          <div className="grid grid-cols-8 gap-0.5">
            {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, i) => (
              <button
                key={i}
                onClick={() => onSelect(emoji)}
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
