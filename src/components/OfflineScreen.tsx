export default function OfflineScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-8 text-center">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-6 opacity-80">
        <circle cx="60" cy="60" r="58" stroke="hsl(181 55% 38%)" strokeWidth="2" fill="hsl(181 55% 38% / 0.08)" />
        <ellipse cx="60" cy="90" rx="18" ry="7" fill="hsl(181 55% 38% / 0.15)" />
        <path d="M44 54 L60 30 L76 54" stroke="hsl(181 55% 38%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="hsl(181 55% 38% / 0.12)" />
        <path d="M52 54 L60 40 L68 54" stroke="hsl(181 55% 38%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="hsl(181 55% 38% / 0.2)" />
        <line x1="60" y1="54" x2="60" y2="82" stroke="hsl(181 55% 38%)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="48" y1="66" x2="72" y2="66" stroke="hsl(181 55% 38%)" strokeWidth="2" strokeLinecap="round" />
        <line x1="42" y1="78" x2="78" y2="78" stroke="hsl(181 55% 38% / 0.5)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="60" cy="85" r="5" fill="hsl(181 55% 38%)" />
        <path d="M28 35 Q38 18 60 15 Q82 18 92 35" stroke="hsl(181 55% 38% / 0.3)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M22 42 Q30 22 60 18 Q90 22 98 42" stroke="hsl(181 55% 38% / 0.15)" strokeWidth="1" strokeLinecap="round" fill="none" />
        <line x1="25" y1="100" x2="35" y2="100" stroke="hsl(181 55% 38% / 0.4)" strokeWidth="2" strokeLinecap="round" />
        <line x1="85" y1="100" x2="95" y2="100" stroke="hsl(181 55% 38% / 0.4)" strokeWidth="2" strokeLinecap="round" />
        <line x1="30" y1="95" x2="30" y2="105" stroke="hsl(181 55% 38% / 0.4)" strokeWidth="2" strokeLinecap="round" />
        <line x1="90" y1="95" x2="90" y2="105" stroke="hsl(181 55% 38% / 0.4)" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <div className="mb-2 flex gap-1 justify-center">
        {['▲','◆','▲','◆','▲'].map((s, i) => (
          <span key={i} className="text-primary text-xs opacity-60">{s}</span>
        ))}
      </div>

      <h2 className="text-xl font-semibold text-foreground mb-2">Нет соединения</h2>
      <p className="text-muted-foreground text-sm leading-relaxed mb-6">
        Связь с тайгой потеряна.<br />Чаты доступны в кэше — проверьте интернет и возвращайтесь.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Попробовать снова
      </button>

      <div className="mt-8 flex gap-1 justify-center">
        {['▲','◆','▲','◆','▲'].map((s, i) => (
          <span key={i} className="text-primary text-xs opacity-60">{s}</span>
        ))}
      </div>
    </div>
  );
}
