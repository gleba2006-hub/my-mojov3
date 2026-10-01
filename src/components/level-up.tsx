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
  const stage = Math.floor((level - 1) / 3) + 1;
  return (
    <div className="surface-card border-2 border-xp p-5 text-center" role="status">
      <p className="text-sm font-bold">תיבה נפתחה</p>
      <p className="mt-1 text-3xl font-black">{name} ברמה {level}</p>
      <p className="mt-1 text-sm font-bold">שלב דמות {Math.min(stage, 5)} מתוך 5. כל 3 רמות הדמות מתפתחת.</p>
      <Button type="button" className="mt-3 h-11 font-black" onClick={() => setOpen(false)}>לקחת את הנקודות</Button>
    </div>
  );
}
