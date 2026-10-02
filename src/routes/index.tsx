import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark, LogoSplash } from "@/components/brand";
import { endDemo } from "@/lib/demo";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MyMojo — משימות, נקודות ומתנות" },
      { name: "description", content: "הילד עושה משימות, ההורה מאשר, והמתנה מתקרבת." },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    endDemo();
  }, []);
  return (
    <main className="safe-pad min-h-[100dvh] bg-[#fff6ea]">
      <LogoSplash />
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-10 pt-8">
        <header className="text-center">
          <img src="/brand/logo.png" alt="" className="mx-auto h-28 w-28 object-contain drop-shadow-md" />
          <LogoMark className="mx-auto mt-3 h-10" />
          <h1 className="mt-4 text-4xl font-black leading-none text-[#c4512c]">MyMojo</h1>
          <p className="mt-3 text-lg font-bold leading-snug text-[#5c3b2e]">הילד עושה משימות.<br />אתם מאשרים. המתנה מתקרבת.</p>
        </header>
        <nav aria-label="כניסה" className="mt-8 flex flex-col gap-3">
          <Link to="/register" className="tap-target flex items-center justify-center rounded-full bg-[#e86a45] px-4 text-lg font-black text-white shadow-[0_8px_0_#c4512c]">פתיחת משפחה</Link>
          <Link to="/login" className="tap-target flex items-center justify-center rounded-full bg-white px-4 text-lg font-black text-[#5c3b2e]">כניסה</Link>
          <Link to="/join" className="tap-target text-center text-sm font-black text-[#c4512c]">ילד/ה? חיבור עם קוד</Link>
        </nav>
        <ul className="mt-8 grid grid-cols-3 gap-2 text-center text-xs font-black text-[#5c3b2e]">
          <li className="rounded-2xl bg-white/80 px-2 py-3">מסלול אקשן</li>
          <li className="rounded-2xl bg-white/80 px-2 py-3">כל משימה</li>
          <li className="rounded-2xl bg-white/80 px-2 py-3">דמי כיס</li>
        </ul>
      </div>
    </main>
  );
}
