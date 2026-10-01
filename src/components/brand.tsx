import { useEffect, useState } from "react";

export function LogoSplash({ onDone }: { onDone?: () => void }) {
  const [play, setPlay] = useState(true);
  useEffect(() => {
    const seen = sessionStorage.getItem("mymojo-splash");
    if (seen) {
      setPlay(false);
      onDone?.();
      return;
    }
    const timer = window.setTimeout(() => {
      sessionStorage.setItem("mymojo-splash", "1");
      setPlay(false);
      onDone?.();
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  if (!play) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#fff7ef]" role="status" aria-label="MyMojo">
      <video
        className="h-40 w-40 object-contain"
        src="/brand/logo-intro.mp4"
        autoPlay
        muted
        playsInline
        onError={() => setPlay(false)}
      />
      <img src="/brand/logo.png" alt="" className="pointer-events-none absolute h-16 w-auto opacity-0" />
    </div>
  );
}

export function LogoMark({ className = "h-10" }: { className?: string }) {
  return <img src="/brand/logo.png" alt="MyMojo" className={`${className} w-auto object-contain`} />;
}

export function characterSrc(gender: string | null | undefined, stage: number) {
  const n = Math.min(5, Math.max(1, stage));
  const girl = gender === "girl" || gender === "female";
  return girl ? `/brand/girl-pinka-${n}.png` : `/brand/boy-tree-${n}.png`;
}

export function petSrc(seed: string) {
  return seed.length % 2 === 0 ? "/brand/pet-1.png" : "/brand/pet-2.png";
}

export function taskIcon(title: string) {
  const t = title;
  if (t.includes("אשפה") || t.includes("מחזור")) return "/brand/icon-trash.png";
  if (t.includes("ספר") || t.includes("קורא")) return "/brand/icon-book.png";
  if (t.includes("לימון")) return "/brand/icon-lemonade.png";
  if (t.includes("שיעור") || t.includes("למידה") || t.includes("ראש")) return "/brand/icon-homework.png";
  if (t.includes("קהילה") || t.includes("יד")) return "/brand/icon-help.png";
  return "/brand/icon-homework.png";
}

export const parentVideos = [
  { title: "איך מתחילים", id: "1AR7qrusvxKkpQ6z41xKKVO-g_J_V2EzB" },
  { title: "שיטת המסלולים", id: "1eChedRtLDmgWHnrZyzLXd5ChSCLhbSqC" },
  { title: "סופר נני", id: "1L7bHkJZkwzTEuLJ1_PNK9bfeMmyqd3h9" },
];
