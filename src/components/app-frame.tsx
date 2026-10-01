import type { ReactNode } from "react";

export function AppFrame({
  title,
  kicker,
  tabs,
  tab,
  onTab,
  onSignOut,
  children,
}: {
  title: string;
  kicker?: string;
  tabs: Array<{ id: string; label: string; badge?: number }>;
  tab: string;
  onTab: (id: string) => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  return (
    <div className="safe-pad min-h-[100dvh] gradient-hero">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-28 pt-4">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-primary">{kicker ?? "MyMojo"}</p>
            <h1 className="truncate text-2xl font-black leading-tight text-foreground">{title}</h1>
          </div>
          <button type="button" onClick={onSignOut} className="tap-target rounded-full bg-card px-4 text-sm font-bold text-muted-foreground">
            יציאה
          </button>
        </header>
        <div className="flex flex-1 flex-col gap-4">{children}</div>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
        aria-label="ניווט"
      >
        <ul className="mx-auto grid max-w-lg gap-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((item) => {
            const on = item.id === tab;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={on ? "page" : undefined}
                  onClick={() => onTab(item.id)}
                  className={`tap-target relative w-full rounded-2xl text-sm font-black ${on ? "bg-primary text-primary-foreground shadow-[var(--shadow-pop)]" : "text-muted-foreground"}`}
                >
                  {item.label}
                  {item.badge ? (
                    <span className="absolute start-1 top-1 min-w-5 rounded-full bg-xp px-1 text-[10px] leading-5 text-xp-foreground">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function XpMeter({ xp, level }: { xp: number; level: number }) {
  const into = xp % 100;
  return (
    <div>
      <div className="mb-1 flex items-end justify-between">
        <p className="text-sm font-black">רמה {level}</p>
        <p className="text-xs font-bold text-muted-foreground">{into}/100</p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-valuemin={0} aria-valuemax={100} aria-valuenow={into} role="progressbar">
        <div className="h-full rounded-full bg-xp" style={{ width: `${into}%` }} />
      </div>
    </div>
  );
}

export function stageFor(level: number) {
  if (level >= 8) return 5;
  if (level >= 6) return 4;
  if (level >= 4) return 3;
  if (level >= 2) return 2;
  return 1;
}
