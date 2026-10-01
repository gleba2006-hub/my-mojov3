import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppFrame } from "@/components/app-frame";
import { Button } from "@/components/ui/button";
import { adminSnapshot, listRanges, setMethodEnabled } from "@/lib/mojo.functions";
import { RequireAuth, signOut } from "@/lib/session";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "ניהול — MyMojo" }] }),
  component: () => <RequireAuth allow={["admin"]}>{( ) => <AdminHome />}</RequireAuth>,
});

function AdminHome() {
  const qc = useQueryClient();
  const snap = useQuery({ queryKey: ["admin"], queryFn: () => adminSnapshot() });
  const ranges = useQuery({ queryKey: ["ranges"], queryFn: () => listRanges() });
  const toggle = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => setMethodEnabled({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
  const data = snap.data;
  return (
    <AppFrame title="ניהול" kicker="אדמין" tab="home" onTab={() => undefined} onSignOut={() => signOut()} tabs={[{ id: "home", label: "סקירה" }]}>
      {snap.isError ? <p className="text-destructive">אין הרשאת אדמין. מוסיפים שורה ב-user_roles.</p> : null}
      {data ? (
        <>
          <dl className="grid grid-cols-2 gap-3">
            {[
              ["משפחות", data.families],
              ["ילדים", data.children],
              ["מטרות", data.goals],
              ["משימות בקטלוג", data.catalog],
            ].map(([label, value]) => (
              <div key={String(label)} className="surface-card p-4">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="text-2xl font-black">{value}</dd>
              </div>
            ))}
          </dl>
          <section className="surface-card p-4">
            <h2 className="mb-2 font-black">שיטות חינוך</h2>
            <ul className="flex flex-col gap-2">
              {data.methods.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block font-bold">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.tagline}</span>
                  </span>
                  <Button type="button" size="sm" variant={m.enabled ? "outline" : "default"} disabled={toggle.isPending} onClick={() => toggle.mutate({ id: m.id, enabled: !m.enabled })}>
                    {m.enabled ? "פעילה" : "כבויה"}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
          <section className="surface-card p-4">
            <h2 className="mb-2 font-black">טווחי מחיר</h2>
            <ul className="flex flex-col gap-2">
              {(ranges.data?.ranges ?? []).map((range) => (
                <li key={range.id} className="flex items-center justify-between text-sm">
                  <span className="font-bold">{range.label}</span>
                  <span className="text-muted-foreground">{range.task_count} משימות</span>
                </li>
              ))}
            </ul>
          </section>
          <p className="surface-card p-4 text-sm text-muted-foreground">
            מנויים: הטבלה קיימת, בלי מחירים. Stripe יחובר אחרי שמות התוכניות והמחירים.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">טוענים…</p>
      )}
    </AppFrame>
  );
}
