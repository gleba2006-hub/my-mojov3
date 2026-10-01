import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppFrame } from "@/components/app-frame";
import { characters, parentVideos, pets } from "@/components/brand";
import { MethodGuide } from "@/components/method-guide";
import { Button } from "@/components/ui/button";
import { adminSnapshot, listRanges, setMethodEnabled } from "@/lib/mojo.functions";
import { plan } from "@/lib/plan";
import { RequireAuth, signOut } from "@/lib/session";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "ניהול — MyMojo" }] }),
  component: () => <RequireAuth allow={["admin"]}>{() => <AdminHome />}</RequireAuth>,
});

function AdminHome() {
  const [tab, setTab] = useState("home");
  const qc = useQueryClient();
  const snap = useQuery({ queryKey: ["admin"], queryFn: () => adminSnapshot() });
  const ranges = useQuery({ queryKey: ["ranges"], queryFn: () => listRanges() });
  const toggle = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => setMethodEnabled({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
  const data = snap.data;
  return (
    <AppFrame
      title="ניהול"
      kicker="אדמין"
      tab={tab}
      onTab={setTab}
      onSignOut={() => signOut()}
      tabs={[
        { id: "home", label: "סקירה" },
        { id: "families", label: "משפחות" },
        { id: "methods", label: "שיטות" },
        { id: "catalog", label: "קטלוג" },
        { id: "assets", label: "נכסים" },
        { id: "plan", label: "מנוי" },
      ]}
    >
      {snap.isError ? <p className="surface-card p-4 text-sm">אין הרשאת אדמין. מוסיפים שורה ב-user_roles.</p> : null}
      {tab === "home" && data ? (
        <dl className="grid grid-cols-2 gap-3">
          {[
            ["משפחות", data.families],
            ["ילדים", data.children],
            ["מטרות", data.goals],
            ["משימות בקטלוג", data.catalog],
            ["פתוחות", data.taskCounts.active],
            ["ממתינות", data.taskCounts.pending_approval],
            ["אושרו", data.taskCounts.approved],
          ].map(([label, value]) => (
            <div key={String(label)} className="surface-card p-4">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-2xl font-black">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {tab === "families" && data ? (
        <ul className="flex flex-col gap-2">
          {data.familyRows.map((family) => (
            <li key={family.id} className="surface-card p-4">
              <p className="font-black">{family.name}</p>
              <p className="text-sm text-muted-foreground">
                {data.childRows.filter((child) => child.family_id === family.id).map((child) => `${child.name} · רמה ${child.level}`).join(" · ") || "בלי ילדים"}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      {tab === "methods" && data ? (
        <>
          <ul className="flex flex-col gap-2">
            {data.methods.map((m) => (
              <li key={m.id} className="surface-card flex items-center justify-between gap-3 p-4">
                <span>
                  <span className="block font-black">{m.name}</span>
                  <span className="text-xs text-muted-foreground">{m.tagline}</span>
                </span>
                <Button type="button" size="sm" variant={m.enabled ? "outline" : "default"} disabled={toggle.isPending} onClick={() => toggle.mutate({ id: m.id, enabled: !m.enabled })}>
                  {m.enabled ? "פעילה" : "כבויה"}
                </Button>
              </li>
            ))}
          </ul>
          <MethodGuide />
        </>
      ) : null}
      {tab === "catalog" ? (
        <ul className="flex flex-col gap-2">
          {(ranges.data?.ranges ?? []).map((range) => {
            const paths = (ranges.data?.paths ?? []).filter((path) => path.range_id === range.id);
            return (
              <li key={range.id} className="surface-card p-4">
                <p className="font-black">{range.label}</p>
                <p className="text-sm text-muted-foreground">{range.min_ils}–{range.max_ils ?? "∞"} ₪ · {range.task_count} משימות</p>
                <p className="mt-1 text-sm font-bold">{paths.map((path) => path.name).join(" · ") || "בלי מסלול"}</p>
              </li>
            );
          })}
        </ul>
      ) : null}
      {tab === "assets" ? (
        <>
          <section className="surface-card p-4">
            <h2 className="mb-2 font-black">דמויות</h2>
            <div className="flex gap-2 overflow-x-auto">{characters.map((c) => <img key={c.id} src={c.src} alt={c.name} className="h-16 w-16 object-contain" />)}</div>
          </section>
          <section className="surface-card p-4">
            <h2 className="mb-2 font-black">חיות</h2>
            <div className="flex gap-2">{pets.map((p) => <img key={p.id} src={p.src} alt={p.name} className="h-14 w-14 object-contain" />)}</div>
          </section>
          <section className="surface-card p-4">
            <h2 className="mb-2 font-black">סרטוני הורים</h2>
            <ul className="flex flex-col gap-2">
              {parentVideos.map((video) => (
                <li key={video.id}><a className="font-bold text-primary" href={`https://drive.google.com/file/d/${video.id}/view`} target="_blank" rel="noreferrer">{video.title}</a></li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
      {tab === "plan" ? (
        <section className="surface-card p-4">
          <h2 className="text-2xl font-black">{plan.live ? `${plan.priceIls} ₪ לחודש` : "חינם כרגע"}</h2>
          <p className="mt-2 text-sm">{plan.note}</p>
          <p className="mt-2 text-sm text-muted-foreground">אין Stripe ואין חסימת מסכים.</p>
        </section>
      ) : null}
      {!data && tab !== "catalog" && tab !== "assets" && tab !== "plan" ? <p className="text-sm text-muted-foreground">טוענים…</p> : null}
    </AppFrame>
  );
}
