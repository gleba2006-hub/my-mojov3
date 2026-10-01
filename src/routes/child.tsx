import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppFrame, XpMeter, stageFor } from "@/components/app-frame";
import { AvatarPlate } from "@/components/avatar-plate";
import { taskIcon } from "@/components/brand";
import { Hero, Jar } from "@/components/mojo-ui";
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
  const [tab, setTab] = useState("today");
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
    <AppFrame
      title={data?.child.name || "המשימות שלי"}
      kicker="לוח ילד"
      tab={tab}
      onTab={setTab}
      onSignOut={() => signOut()}
      background="/brand/room-1.png"
      icons={{ today: "/brand/nav-home.png", prize: "/brand/nav-gifts.png", jar: "/brand/nav-chat.png" }}
      tabs={[
        { id: "today", label: "היום" },
        { id: "prize", label: "מתנה" },
        { id: "jar", label: "צנצנת" },
      ]}
    >
      {!data ? <p className="text-center text-sm text-muted-foreground">טוענים את הלוח…</p> : null}
      {data && tab === "today" ? (
        <>
          <section className="surface-card p-4">
            <XpMeter xp={data.child.xp} level={data.child.level} />
            <div className="mt-3">
              <AvatarPlate stage={stageFor(data.child.level)} gender={data.child.gender} />
            </div>
            <LevelUp level={data.child.level} name={data.child.name} />
          </section>
          <TaskList title="לעשות היום" tasks={open} action={(id) => done.mutate(id)} busy={done.isPending} />
          <TaskList title="מחכה להורה" tasks={waiting} />
          {open.length === 0 && waiting.length === 0 ? <p className="surface-card p-4 text-sm">אין משימות פתוחות.</p> : null}
        </>
      ) : null}
      {data && tab === "prize" ? (
        goal ? (
          <Hero
            eyebrow={(goal.method_config as { pathName?: string }).pathName ?? "המתנה"}
            title={goal.title}
            detail={`${approved}/${target || "?"} משימות שסופרות`}
            progress={target ? (approved / target) * 100 : 0}
          />
        ) : (
          <p className="surface-card p-4 text-sm">ההורה עוד לא פתח מטרה.</p>
        )
      ) : null}
      {data && tab === "prize" && goal?.status === "completed" && !(goal.method_config as { requested?: boolean }).requested ? (
        <Button type="button" disabled={ask.isPending} onClick={() => ask.mutate(goal.id)}>לבקש מההורה</Button>
      ) : null}
      {data && tab === "prize" && (goal?.method_config as { requested?: boolean } | undefined)?.requested ? <p className="text-sm font-bold">ביקשת. מחכים להורה.</p> : null}
      {data && tab === "jar" ? (
        <>
          <Jar amount={data.balance} caption={data.allowance ? `בסיס ${data.allowance.base_amount} ₪ ${data.allowance.period === "weekly" ? "בשבוע" : "בחודש"}` : "עוד בלי דמי כיס"} />
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
      ) : null}
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
            <div className="flex items-center gap-3">
              <img src={taskIcon(task.title)} alt="" className="h-12 w-12 object-contain" />
              <div>
                <p className="font-bold">{task.title}</p>
                <p className="text-xs text-muted-foreground">{task.kind === "action" ? "אקשן" : "בית"} · {task.category}</p>
              </div>
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
