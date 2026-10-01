import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark, LogoSplash } from "@/components/brand";
import { endDemo } from "@/lib/demo";
import { MethodGuide } from "@/components/method-guide";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MyMojo — משימות, נקודות ומתנות למשפחה" },
      { name: "description", content: "הורים מגדירים משימות ומתנות, ילדים משלימים ומקדמים את המתנה." },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    endDemo();
  }, []);
  return (
    <main className="safe-pad min-h-[100dvh] bg-cover bg-center" style={{ backgroundImage: "url(/brand/bg-parent-home.png)" }}>
      <LogoSplash />
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-10 pt-8">
        <header className="text-center">
          <LogoMark className="mx-auto h-16" />
          <h1 className="mt-5 text-4xl font-black leading-none">משימות שהופכות למתנות</h1>
          <p className="mt-3 text-base font-bold">בוחרים שיטה, פותחים מתנה, והילד רואה את הדרך.</p>
        </header>
        <nav aria-label="כניסה" className="mt-8 flex flex-col gap-3">
          <Link to="/register" className="tap-target flex items-center justify-center rounded-full bg-primary px-4 text-lg font-black text-primary-foreground shadow-[var(--shadow-pop)]">
            הרשמה להורים
          </Link>
          <Link to="/login" className="tap-target flex items-center justify-center rounded-full bg-card px-4 text-lg font-black">
            כניסה
          </Link>
          <Link to="/join" className="tap-target text-center text-sm font-black text-primary">ילד/ה? חיבור עם קוד</Link>
        </nav>
        <section className="mt-8">
          <MethodGuide />
        </section>
      </div>
    </main>
  );
}
