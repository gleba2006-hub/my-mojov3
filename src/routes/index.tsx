import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { startDemo } from "@/lib/demo";
import { listMethods } from "@/methods/registry";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MyMojo — משימות, נקודות ומתנות למשפחה" },
      {
        name: "description",
        content:
          "הורים מגדירים משימות ומתנות, ילדים משלימים משימות, צוברים נקודות ניסיון ומתקדמים למטרה.",
      },
      { property: "og:title", content: "MyMojo — משימות, נקודות ומתנות למשפחה" },
      {
        property: "og:description",
        content:
          "הורים מגדירים משימות ומתנות, ילדים משלימים משימות, צוברים נקודות ניסיון ומתקדמים למטרה.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const methods = listMethods();
  const navigate = useNavigate();

  return (
    <main className="safe-pad min-h-screen gradient-hero">
      <div className="mx-auto w-full max-w-md px-5 pb-16 pt-12">
        <header className="text-center">
          <span className="inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-pop)]">
            MyMojo
          </span>
          <h1 className="mt-6 text-4xl font-black leading-tight text-foreground">
            משימות שהופכות למתנות
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            הורים מגדירים משימות ומטרות, הילדים משלימים, צוברים נקודות ניסיון ומתקדמים צעד-צעד
            למתנה.
          </p>
        </header>

        <nav aria-label="כניסה" className="mt-8 flex flex-col gap-3">
          <Link
            to="/register"
            className="tap-target flex items-center justify-center rounded-2xl bg-primary px-4 py-3 text-base font-bold text-primary-foreground shadow-[var(--shadow-pop)]"
          >
            הרשמה להורים
          </Link>
          <Link
            to="/login"
            className="tap-target flex items-center justify-center rounded-2xl border-2 border-primary px-4 py-3 text-base font-bold text-foreground"
          >
            כניסה
          </Link>
          <button
            type="button"
            onClick={() => {
              startDemo("parent");
              navigate({ to: "/parent" });
            }}
            className="tap-target rounded-2xl bg-xp px-4 py-3 text-base font-black text-xp-foreground"
          >
            DEMO
          </button>
          <Link
            to="/join"
            className="tap-target flex items-center justify-center text-sm font-bold text-primary"
          >
            ילד/ה? חיבור עם קוד
          </Link>
        </nav>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold text-foreground">שלוש שיטות חינוכיות</h2>
          <ul className="flex flex-col gap-3">
            {methods.map((method) => (
              <li key={method.id} className="surface-card p-4">
                <p className="text-base font-bold text-foreground">{method.name}</p>
                <p className="mt-0.5 text-sm font-medium text-accent-foreground">
                  {method.tagline}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {method.description}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-card mt-8 p-4">
          <h2 className="text-base font-bold text-foreground">אפשר להציץ בלי הרשמה</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            DEMO פותח לוח הורה עם נועה ואיתי, ומעבר ללוח הילד עם משימות לדוגמה.
          </p>
        </section>
      </div>
    </main>
  );
}
