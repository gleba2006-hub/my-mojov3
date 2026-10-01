import { createFileRoute } from "@tanstack/react-router";
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
            הורים מגדירים משימות ומטרות, הילדים משלימים, צוברים נקודות ניסיון
            ומתקדמים צעד-צעד למתנה.
          </p>
        </header>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold text-foreground">
            שלוש שיטות חינוכיות
          </h2>
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
          <h2 className="text-base font-bold text-foreground">שלב 1 הושלם</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            מסד הנתונים, כללי ההרשאות, חוקי הנקודות והשלד של השיטות מוכנים.
            השלב הבא: כניסה, יצירת משפחה וחיבור ילד.
          </p>
        </section>
      </div>
    </main>
  );
}
