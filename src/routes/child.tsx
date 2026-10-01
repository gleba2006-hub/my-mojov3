import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppFrame, XpMeter, stageFor } from "@/components/app-frame";
import { AvatarPlate } from "@/components/avatar-plate";
import { characterSrc, characters, taskIcon } from "@/components/brand";
import { Hero, Jar } from "@/components/mojo-ui";
import { LevelUp } from "@/components/level-up";
import { Button } from "@/components/ui/button";
import { completeTask, getBoard, requestPrize, requestShop } from "@/lib/mojo.functions";
import { coinsFromXp, shopItems } from "@/lib/shop";
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
  const [cheer, setCheer] = useState("");
  const done = useMutation({
    mutationFn: (taskId: string) => completeTask({ data: { taskId } }),
    onSuccess: () => {
      setCheer("נשלח להורה. כל הכבוד!");
      qc.invalidateQueries({ queryKey: ["board"] });
    },
  });
  const buy = useMutation({
    mutationFn: (item: { title: string; cost: number }) => requestShop({ data: item }),
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
      icons={{ today: "/brand/nav-home.png", tasks: "/brand/nav-missions.png", prize: "/brand/nav-gifts.png", jar: "/brand/nav-chat.png" }}
      tabs={[
        { id: "today", label: "בית" },
        { id: "tasks", label: "משימות" },
        { id: "prize", label: "חנות" },
        { id: "jar", label: "הודעות" },
      ]}
    >
      {!data ? <p className="text-center text-sm text-muted-foreground">טוענים את הלוח…</p> : null}
      {data && tab === "today" ? (
        <>
          <section className="relative -mx-4 min-h-[68dvh]">
            <img src={characterSrc(data.child.gender, stageFor(data.child.level))} alt="" className="absolute inset-x-0 bottom-8 mx-auto h-[46dvh] w-auto object-contain drop-shadow-2xl" />
            <div className="absolute inset-x-4 top-0 flex justify-between">
              <span className="rounded-full bg-card/80 px-3 py-1 text-sm font-black">רמה {data.child.level}</span>
              <span className="rounded-full bg-card/80 px-3 py-1 text-sm font-black">{data.child.xp % 100}/100</span>
            </div>
            <LevelUp level={data.child.level} name={data.child.name} />
          </section>
          {goal ? (
            <Hero
              eyebrow={goal.method_id === "pocket_money" ? "דמי כיס" : goal.method_id === "classic" ? "כל משימה" : "מסלול אקשן"}
              title={goal.title}
              detail={`${approved}/${target || "צנצנת"}`}
              progress={target ? (approved / target) * 100 : 0}
            />
          ) : null}
          {goal?.status === "completed" && !(goal.method_config as { requested?: boolean }).requested ? (
            <Button type="button" disabled={ask.isPending} onClick={() => ask.mutate(goal.id)}>לבקש את המתנה</Button>
          ) : null}
          <TaskList title="מחכה לך היום" tasks={open.slice(0, 2)} action={(id) => done.mutate(id)} busy={done.isPending} />
          <div className="flex gap-2 overflow-x-auto">
            {characters.map((c) => (
              <button key={c.id} type="button" className="shrink-0" onClick={() => { localStorage.setItem("mymojo-character", c.id); location.reload(); }}>
                <img src={c.src} alt={c.name} className="h-16 w-16 object-contain" />
              </button>
            ))}
          </div>
          {cheer ? <p className="surface-card p-4 text-center text-lg font-black">{cheer}</p> : null}
        </>
      ) : null}
      {data && tab === "tasks" ? (
        <>
          <TaskList title="היום" tasks={open} action={(id) => done.mutate(id)} busy={done.isPending} />
          <TaskList title="מחכה להורה" tasks={waiting} />
          <TaskList title="נסגרו" tasks={closed} />
        </>
      ) : null}
      {data && tab === "prize" ? (
        <ShopGrid coins={coinsFromXp(data.child.xp)} busy={buy.isPending} onBuy={(item) => buy.mutate(item)} note={buy.isSuccess ? "נשלח להורה" : null} />
      ) : null}
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

function ShopGrid({ coins, busy, onBuy, note }: { coins: number; busy: boolean; onBuy: (item: { title: string; cost: number }) => void; note: string | null }) {
  return (
    <section className="flex flex-col gap-3">
      <p className="text-3xl font-black">{coins} מטבעות</p>
      {note ? <p className="text-sm font-bold">{note}</p> : null}
      <ul className="grid grid-cols-2 gap-2">
        {shopItems.map((item) => (
          <li key={item.id} className="surface-card p-3">
            <p className="font-black">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.cost}</p>
            <Button type="button" size="sm" className="mt-2" disabled={busy || coins < item.cost} onClick={() => onBuy(item)}>
              {coins < item.cost ? `עוד ${item.cost - coins}` : "לבקש"}
            </Button>
          </li>
        ))}
      </ul>
    </section>
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
