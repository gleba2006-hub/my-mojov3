import { useEffect, useState } from "react";

export function LogoSplash({ onDone }: { onDone?: () => void }) {
  const [play, setPlay] = useState(true);
  const [skip, setSkip] = useState(false);
  function close() {
    sessionStorage.setItem("mymojo-splash", "1");
    setPlay(false);
    onDone?.();
  }
  useEffect(() => {
    if (sessionStorage.getItem("mymojo-splash") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      close();
      return;
    }
    const showSkip = window.setTimeout(() => setSkip(true), 1000);
    const safety = window.setTimeout(close, 7000);
    return () => {
      window.clearTimeout(showSkip);
      window.clearTimeout(safety);
    };
  }, [onDone]);
  if (!play) return null;
  return (
    <div className="fixed inset-0 z-50 bg-foreground" role="status" aria-label="MyMojo">
      <video
        className="h-[100dvh] w-full object-cover"
        src="/brand/logo-intro.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={close}
        onError={close}
      />
      {skip ? (
        <button type="button" onClick={close} className="tap-target absolute end-4 top-4 rounded-full bg-card/80 px-4 text-sm font-black">
          דלג
        </button>
      ) : null}
    </div>
  );
}

export function LogoMark({ className = "h-10" }: { className?: string }) {
  return <img src="/brand/logo.png" alt="MyMojo" className={`${className} w-auto object-contain`} />;
}

export const characters = [
  { id: "tree", name: "עץ", src: "/brand/boy-tree-1.png" },
  { id: "fury", name: "אש", src: "/brand/boy-fury-1.png" },
  { id: "vulcano", name: "הר", src: "/brand/boy-vulcano-1.png" },
  { id: "pinka", name: "פינקה", src: "/brand/girl-pinka-1.png" },
  { id: "clauda", name: "קלאודיה", src: "/brand/girl-clauda-1.png" },
  { id: "jelly", name: "מדוזה", src: "/brand/girl-jelly-1.png" },
];

export function chosenCharacter() {
  if (typeof window === "undefined") return characters[0]!;
  const id = localStorage.getItem("mymojo-character");
  return characters.find((c) => c.id === id) ?? characters[0]!;
}

export function characterSrc(gender: string | null | undefined, stage: number) {
  const chosen = chosenCharacter();
  if (chosen.id !== "tree" && chosen.id !== "pinka") return chosen.src;
  const n = Math.min(5, Math.max(1, stage));
  const girl = gender === "girl" || gender === "female" || chosen.id === "pinka";
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
