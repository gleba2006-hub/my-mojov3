import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoSplash } from "@/components/brand";
import { endDemo } from "@/lib/demo";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MyMojo — משימות שמתקרבות מתנה" },
      { name: "description", content: "הורים פותחים מתנה, ילדים משלימים משימות, והמתנה מתקרבת." },
    ],
  }),
  component: Index,
});

const methods = [
  { title: "מסלול אקשן", text: "רק משימות ההרפתקה סופרות למתנה. בית נותן נקודות." },
  { title: "כל משימה", text: "כל משימה שאושרה מקדמת את המתנה. בלי מסלול." },
  { title: "דמי כיס", text: "כל משימה ממלאת את הצנצנת. כשהסכום מגיע — המתנה שלו." },
];

function Index() {
  useEffect(() => {
    endDemo();
  }, []);
  return (
    <main className="safe-pad min-h-[100dvh] bg-[#fff4e8] text-[#4a3028]">
      <LogoSplash />
      <div className="mx-auto flex w-full max-w-md flex-col px-4 pb-10 pt-4">
        <img src="/brand/room-1.png" alt="" className="h-52 w-full rounded-[28px] object-cover object-[center_40%] shadow-lg" />
        <header className="mt-5 text-center">
          <img src="/brand/logo.png" alt="MyMojo" className="mx-auto h-20 w-20 object-contain" />
          <h1 className="mt-2 text-4xl font-black text-[#c4512c]">MyMojo</h1>
          <p className="mt-2 text-base font-bold leading-snug">משימות של הילד מתקרבות מתנה שאתם פותחים.</p>
        </header>
        <nav aria-label="כניסה" className="mt-5 flex flex-col gap-3">
          <Link to="/register" className="flex h-14 items-center justify-center rounded-full bg-[#e86a45] text-lg font-black text-white shadow-[0_6px_0_#c4512c]">פתיחת משפחה</Link>
          <Link to="/login" className="flex h-14 items-center justify-center rounded-full bg-white text-lg font-black">כניסה</Link>
          <Link to="/join" className="text-center text-sm font-black text-[#c4512c]">ילד/ה? חיבור עם קוד</Link>
        </nav>
        <section className="mt-6" aria-label="שלוש שיטות">
          <h2 className="mb-2 text-sm font-black text-[#c4512c]">איך זה עובד</h2>
          <ul className="flex flex-col gap-2">
            {methods.map((m) => (
              <li key={m.title} className="rounded-2xl bg-white/90 px-4 py-3">
                <p className="font-black">{m.title}</p>
                <p className="text-sm leading-snug">{m.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
