import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

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
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-28 pt-5">
        <header className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-primary">{kicker ?? "MyMojo"}</p>
            <h1 className="text-2xl font-black leading-tight text-foreground">{title}</h1>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onSignOut} className="tap-target">
            יציאה
          </Button>
        </header>
        <div className="flex flex-1 flex-col gap-4">{children}</div>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
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
                  className={`tap-target relative w-full rounded-2xl text-sm font-bold ${on ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {item.label}
                  {item.badge ? (
                    <span className="absolute start-2 top-1 rounded-full bg-xp px-1.5 text-[10px] text-xp-foreground">
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
    <div className="surface-card p-4">
      <div className="mb-2 flex items-end justify-between">
        <p className="text-sm font-bold text-muted-foreground">רמה {level}</p>
        <p className="text-sm font-black text-xp-foreground">{into}/100 נקודות</p>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-muted" aria-valuemin={0} aria-valuemax={100} aria-valuenow={into} role="progressbar">
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
