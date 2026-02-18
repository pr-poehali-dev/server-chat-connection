import { type NetworkQuality } from '@/hooks/use-network';
import Icon from '@/components/ui/icon';

interface NetworkStatusProps {
  online: boolean;
  quality: NetworkQuality;
  syncing: boolean;
  queueLength: number;
}

const qualityConfig: Record<NetworkQuality, { color: string; bars: number; label: string }> = {
  excellent: { color: 'bg-emerald-500', bars: 4, label: 'Отличная связь' },
  good: { color: 'bg-emerald-400', bars: 3, label: 'Хорошая связь' },
  poor: { color: 'bg-amber-500', bars: 2, label: 'Слабый сигнал' },
  offline: { color: 'bg-red-500', bars: 0, label: 'Нет связи' },
};

function SignalBars({ bars, color }: { bars: number; color: string }) {
  return (
    <div className="flex items-end gap-[2px] h-3.5">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all duration-300 ${
            i <= bars ? color : 'bg-muted-foreground/20'
          }`}
          style={{ height: `${25 + i * 20}%` }}
        />
      ))}
    </div>
  );
}

export default function NetworkStatus({ online, quality, syncing, queueLength }: NetworkStatusProps) {
  const config = qualityConfig[quality];

  return (
    <div className="flex items-center gap-2.5">
      {syncing && (
        <div className="flex items-center gap-1.5 text-xs text-primary animate-fade-in">
          <Icon name="RefreshCw" size={12} className="animate-spin" />
          <span>Синхронизация...</span>
        </div>
      )}

      {!online && queueLength > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-amber-500 animate-fade-in">
          <Icon name="Clock" size={12} />
          <span>{queueLength} в очереди</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 group relative">
        <SignalBars bars={config.bars} color={config.color} />
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            online ? 'bg-emerald-500' : 'bg-red-500 animate-pulse-dot'
          }`}
        />
        <div className="absolute -bottom-8 right-0 bg-card border border-border rounded-md px-2 py-1 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          {config.label}
        </div>
      </div>
    </div>
  );
}
