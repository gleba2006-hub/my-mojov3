import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** Shows once when the level number grows during this browser session. */
export function LevelUp({ level, name }: { level: number; name: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const key = `mymojo-level-${name}`;
    const prev = Number(sessionStorage.getItem(key) || level);
    if (level > prev) setOpen(true);
    sessionStorage.setItem(key, String(level));
  }, [level, name]);
  if (!open) return null;
  return (
    <div className="surface-card border-2 border-xp p-4 text-center" role="status">
      <p className="text-sm font-bold text-xp-foreground">עליית רמה</p>
      <p className="text-2xl font-black">{name} ברמה {level}</p>
      <Button type="button" className="mt-3" onClick={() => setOpen(false)}>יאללה</Button>
    </div>
  );
}
