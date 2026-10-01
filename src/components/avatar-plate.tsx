const stages = [
  { label: "ניצן", color: "#F6C90E" },
  { label: "צומח", color: "#7BC47F" },
  { label: "בטוח", color: "#3D9B8F" },
  { label: "גיבור", color: "#E07A5F" },
  { label: "אגדה", color: "#6C4AB6" },
];

export function AvatarPlate({ stage, pet }: { stage: number; pet?: string }) {
  const safe = Math.min(5, Math.max(1, stage));
  const current = stages[safe - 1]!;
  return (
    <div className="flex items-center gap-3">
      <div className="grid grid-cols-5 gap-1" aria-label={`שלב דמות ${safe}`}>
        {stages.map((item, i) => (
          <span
            key={item.label}
            className="h-8 w-8 rounded-full border-2 border-background"
            style={{ background: i < safe ? item.color : "var(--muted)", opacity: i === safe - 1 ? 1 : 0.55 }}
          />
        ))}
      </div>
      <div>
        <p className="text-sm font-black" style={{ color: current.color }}>{current.label}</p>
        {pet ? <p className="text-xs text-muted-foreground">{pet}</p> : null}
      </div>
    </div>
  );
}
