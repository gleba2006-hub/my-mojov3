import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppFrame, XpMeter, stageFor } from "@/components/app-frame";
import { AvatarPlate } from "@/components/avatar-plate";
import { LevelUp } from "@/components/level-up";
import { Button } from "@/components/ui/button";
import { completeTask, getBoard, requestPrize } from "@/lib/mojo.functions";
import { DemoChild } from "@/components/demo-boards";
import { useDemo } from "@/lib/use-demo";
import { RequireAuth, signOut } from "@/lib/session";
import type { MyContext } from "@/lib/family.functions";

export const Route = createFileRoute("/child")({
  head: () => ({ meta: [{ title: "המשימות שלי — MyMojo" }] }),
  component: ChildGate,
});

function ChildGate() {
  const demo = useDemo();
  if (demo) return <DemoChild />;
  return <RequireAuth allow={["child"]}>{(me) => <ChildHome me={me} />}</RequireAuth>;
}

function ChildHome({ me }: { me: MyContext }) {
  const qc = useQueryClient();
  const board = useQuery({ queryKey: ["board", me.childId], queryFn: () => getBoard({ data: {} }) });
  const done = useMutation({
    mutationFn: (taskId: string) => completeTask({ data: { taskId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board"] }),
  });
  const ask = useMutation({
    mutationFn: (goalId: string) => requestPrize({ data: { goalId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board"] }),
  });
  const data = board.data;
  const goal = data?.goals.find((g) => g.status === "active") ?? data?.goals[0];
  const approved = (data?.tasks ?? []).filter((t) => t.advances_goal && t.status === "approved").length;
  const target = Number((goal?.method_config as { taskTarget?: number } | null)?.taskTarget ?? 0);
  const open = (data?.tasks ?? []).filter((t) => t.status === "active");
  const waiting = (data?.tasks ?? []).filter((t) => t.status === "pending_approval");
  const closed = (data?.tasks ?? []).filter((t) => t.status === "approved");

  return (
    <AppFrame title={data?.child.name || "המשימות שלי"} kicker="לוח ילד" tab="home" onTab={() => undefined} onSignOut={() => signOut()} tabs={[{ id: "home", label: "הבית" }]}>
      {data ? (
        <>
          <section className="surface-card p-4">
            <p className="text-sm font-bold text-accent-foreground">דמות בשלב {stageFor(data.child.level)}</p>
            <h2 className="text-xl font-black">{data.child.gender === "boy" ? "גיבור הבית" : "גיבורת הבית"}</h2>
            <div className="mt-3">
              <XpMeter xp={data.child.xp} level={data.child.level} />
            </div>
            <div className="mt-3">
              <AvatarPlate stage={stageFor(data.child.level)} />
            </div>
            <LevelUp level={data.child.level} name={data.child.name} />
          </section>
          {goal ? (
            <section className="surface-card p-4">
              <p className="text-sm text-muted-foreground">{(goal.method_config as { pathName?: string }).pathName}</p>
              <h2 className="text-xl font-black">{goal.title}</h2>
              <p className="mt-1 text-sm font-bold">{approved}/{target || "?"} משימות שסופרות למתנה</p>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${target ? Math.min(100, (approved / target) * 100) : 0}%` }} />
              </div>
              {goal.status === "completed" ? <p className="mt-2 font-black text-success-foreground">המתנה הושגה</p> : null}
              {goal.status === "completed" && !(goal.method_config as { requested?: boolean }).requested ? (
                <Button type="button" className="mt-3" disabled={ask.isPending} onClick={() => ask.mutate(goal.id)}>לבקש מההורה</Button>
              ) : null}
              {(goal.method_config as { requested?: boolean }).requested ? <p className="mt-2 text-sm font-bold">ביקשת. מחכים להורה.</p> : null}
              {(goal.method_config as { delivered?: boolean }).delivered ? <p className="mt-2 text-sm font-bold text-success-foreground">המתנה נמסרה</p> : null}
            </section>
          ) : (
            <p className="surface-card p-4 text-sm text-muted-foreground">ההורה עוד לא פתח מטרה.</p>
          )}
          {data.allowance ? (
            <section className="surface-card p-4">
              <h2 className="font-black">הצנצנת</h2>
              <p className="text-3xl font-black">{data.balance} ₪</p>
              <p className="text-sm text-muted-foreground">
                בסיס {data.allowance.base_amount} ₪ {data.allowance.period === "weekly" ? "בשבוע" : "בחודש"}
              </p>
            </section>
          ) : null}
          <TaskList title="לעשות היום" tasks={open} action={(id) => done.mutate(id)} busy={done.isPending} />
          <TaskList title="מחכה להורה" tasks={waiting} />
          <TaskList title="נסגרו" tasks={closed} />
          {data.messages.length > 0 ? (
            <section className="surface-card p-4">
              <h2 className="mb-2 font-black">פתקים</h2>
              <ul className="flex flex-col gap-2">
                {data.messages.map((m) => (
                  <li key={m.id} className="rounded-2xl bg-muted px-3 py-2 text-sm">{m.body}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <p className="text-center text-sm text-muted-foreground">טוענים את הלוח…</p>
      )}
    </AppFrame>
  );
}

function TaskList({
  title,
  tasks,
  action,
  busy,
}: {
  title: string;
  tasks: Array<{ id: string; title: string; kind: string; category: string | null; status?: string }>;
  action?: (id: string) => void;
  busy?: boolean;
}) {
  if (tasks.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-lg font-black">{title}</h2>
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <li key={task.id} className="surface-card flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-bold">{task.title}</p>
              <p className="text-xs text-muted-foreground">{task.kind === "action" ? "אקשן" : "בית"} · {task.category}</p>
            </div>
            {action ? (
              <Button type="button" size="sm" disabled={busy} onClick={() => action(task.id)} className="tap-target">
                סיימתי
              </Button>
            ) : task.status === "approved" ? (
              <span className="text-xs font-bold text-success-foreground">נסגר</span>
            ) : (
              <span className="text-xs font-bold text-muted-foreground">נעול</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
