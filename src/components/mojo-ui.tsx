import type { ReactNode } from "react";

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="flex gap-2 overflow-x-auto pb-1">{children}</div>;
}

export function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`tap-target shrink-0 rounded-full px-4 text-sm font-black ${on ? "bg-foreground text-background" : "bg-card text-foreground"}`}
    >
      {label}
    </button>
  );
}

export function Hero({ eyebrow, title, detail, progress }: { eyebrow: string; title: string; detail: string; progress: number }) {
  return (
    <section className="surface-card p-5">
      <p className="text-xs font-bold text-accent-foreground">{eyebrow}</p>
      <h2 className="mt-1 text-3xl font-black leading-none">{title}</h2>
      <p className="mt-2 text-sm font-bold">{detail}</p>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>
    </section>
  );
}

export function Jar({ amount, caption }: { amount: number; caption: string }) {
  return (
    <section className="surface-card flex items-end justify-between p-5">
      <div>
        <p className="text-xs font-bold text-muted-foreground">הצנצנת</p>
        <p className="text-4xl font-black leading-none">{amount} ₪</p>
      </div>
      <p className="max-w-36 text-end text-xs text-muted-foreground">{caption}</p>
    </section>
  );
}
