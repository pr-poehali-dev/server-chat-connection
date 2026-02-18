import Icon from '@/components/ui/icon';

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <Icon name="Shield" size={28} className="text-primary" />
      </div>
      <h2 className="text-lg font-semibold mb-2">Шифр</h2>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
        Выберите чат для начала общения. Все сообщения защищены сквозным шифрованием.
      </p>
      <div className="flex items-center gap-4 mt-8 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Icon name="Lock" size={12} />
          <span>E2E шифрование</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon name="WifiOff" size={12} />
          <span>Офлайн-режим</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon name="RefreshCw" size={12} />
          <span>Авто-синхронизация</span>
        </div>
      </div>
    </div>
  );
}
