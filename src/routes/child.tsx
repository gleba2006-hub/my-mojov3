import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppFrame, XpMeter, stageFor } from "@/components/app-frame";
import { AvatarPlate } from "@/components/avatar-plate";
import { characterSrc, characters, pets, petSrc, taskIcon } from "@/components/brand";
import { Hero, Jar } from "@/components/mojo-ui";
import { LevelUp } from "@/components/level-up";
import { Button } from "@/components/ui/button";
import { completeTask, getBoard, requestPrize, requestShop, setAvatar, setPet } from "@/lib/mojo.functions";
import { coinsFromXp, shopItems } from "@/lib/shop";
import { endDemo } from "@/lib/demo";
import { RequireAuth, signOut } from "@/lib/session";
import type { MyContext } from "@/lib/family.functions";

export const Route = createFileRoute("/child")({
  head: () => ({ meta: [{ title: "המשימות שלי — MyMojo" }] }),
  component: ChildGate,
});

function ChildGate() {
  useEffect(() => {
    endDemo();
  }, []);
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
  const pet = useMutation({
    mutationFn: (petId: string) => setPet({ data: { petId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board"] }),
  });
  const avatar = useMutation({
    mutationFn: (avatarId: string) => setAvatar({ data: { avatarId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board"] }),
  });
  const ask = useMutation({
    mutationFn: (goalId: string) => requestPrize({ data: { goalId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board"] }),
  });
  const data = board.data;
  const goal = data?.goals.find((g) => g.status === "active")
    ?? data?.goals.find((g) => g.status === "completed" && !(g.method_config as { delivered?: boolean }).delivered);
  const approved = (data?.tasks ?? []).filter((t) => t.advances_goal && t.status === "approved").length;
  const target = Number((goal?.method_config as { taskTarget?: number } | null)?.taskTarget ?? 0);
  const pocket = goal?.method_id === "pocket_money";
  const price = Number(goal?.price_ils ?? 0);
  const progress = pocket ? (price ? ((data?.balance ?? 0) / price) * 100 : 0) : target ? (approved / target) * 100 : 0;
  const detail = pocket ? `${data?.balance ?? 0}/${price} ₪ בצנצנת` : `${approved}/${target || "?"} משימות`;
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
        { id: "jar", label: "צנצנת" },
      ]}
    >
      {board.isError ? <p className="surface-card p-4 text-center font-black">{board.error instanceof Error ? board.error.message : "הלוח לא נטען"}</p> : null}
      {!data && !board.isError ? <p className="text-center text-sm text-muted-foreground">טוענים את הלוח…</p> : null}
      {data && tab === "today" ? (
        <>
          <section className="relative -mx-4 min-h-[68dvh]">
            <img src={faceFor(data.child.avatar_id, data.child.gender, data.child.level)} alt="" className="absolute inset-x-0 bottom-8 mx-auto h-[46dvh] w-auto object-contain drop-shadow-2xl" />
            <img src={petSrc(data.child.pet_id)} alt="" className="absolute bottom-10 start-4 h-20 w-20 object-contain" />
            <div className="absolute inset-x-4 top-0 flex justify-between">
              <span className="rounded-full bg-card/80 px-3 py-1 text-sm font-black">רמה {data.child.level}</span>
              <span className="rounded-full bg-card/80 px-3 py-1 text-sm font-black">רצף {data.streak}</span>
            </div>
            <LevelUp level={data.child.level} name={data.child.name} />
          </section>
          {goal ? (
            <>
            <Hero
              eyebrow={goal.method_id === "pocket_money" ? "דמי כיס" : goal.method_id === "classic" ? "כל משימה" : "מסלול אקשן"}
              title={goal.title}
              detail={detail}
              progress={progress}
            />
            <p className="text-sm font-bold">
              {goal.method_id === "pocket_money" ? "המתנה נפתחת כשהצנצנת מלאה. משימות ממלאות אותה בשקלים." : goal.method_id === "classic" ? "כל משימה שאושרה מקרבת למתנה." : "רק אקשן מקרב למתנה. בית נותן נקודות."}
            </p>
            </>
          ) : (
            <p className="surface-card p-4 text-center font-black">ההורים עוד בוחרים מתנה. אפשר כבר לסמן משימות.</p>
          )}
          {goal?.status === "completed" && !(goal.method_config as { delivered?: boolean }).delivered && !(goal.method_config as { requested?: boolean }).requested ? (
            <>
            <Button type="button" className="h-11 font-black" disabled={ask.isPending} onClick={() => ask.mutate(goal.id)}>לבקש את המתנה</Button>
            {ask.error instanceof Error ? <p className="text-center text-sm font-bold">{ask.error.message}</p> : null}
            </>
          ) : null}
          {goal && (goal.method_config as { requested?: boolean }).requested && !(goal.method_config as { delivered?: boolean }).delivered ? (
            <p className="surface-card p-4 text-center font-black">ביקשת את {goal.title}. מחכים שההורה ימסור.</p>
          ) : null}
          {(goal?.method_config as { delivered?: boolean } | undefined)?.delivered ? (
            <p className="surface-card p-4 text-center font-black">המתנה נמסרה. אפשר לפתוח מתנה חדשה.</p>
          ) : null}
          <TaskList title="מחכה לך היום" tasks={open.slice(0, 2)} action={(id) => done.mutate(id)} busy={done.isPending} />
          {waiting.length ? <p className="text-center text-sm font-bold">{waiting.length} אצל ההורה לאישור</p> : null}
          <div className="flex gap-2 overflow-x-auto">
            {pets.map((p) => (
              <button key={p.id} type="button" className="shrink-0" onClick={() => pet.mutate(p.id)}>
                <img src={p.src} alt={p.name} className="h-14 w-14 object-contain" />
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {characters.map((c) => (
              <button key={c.id} type="button" className="shrink-0" onClick={() => { localStorage.setItem("mymojo-character", c.id); avatar.mutate(c.id); }}>
                <img src={c.src} alt={c.name} className="h-16 w-16 object-contain" />
              </button>
            ))}
          </div>
          {cheer ? <p className="surface-card p-4 text-center text-lg font-black">{cheer}</p> : null}
          {done.error instanceof Error ? <p className="surface-card p-4 text-center text-sm font-bold">{done.error.message}</p> : null}
        </>
      ) : null}
      {data && tab === "tasks" ? (
        <>
          {open.length + waiting.length + closed.length === 0 ? (
            <p className="surface-card p-4 text-center font-black">עוד אין משימות. ההורה פותח מתנה, והן מופיעות כאן.</p>
          ) : null}
          <TaskList title="היום" tasks={open} action={(id) => done.mutate(id)} busy={done.isPending} />
          <TaskList title="מחכה להורה" tasks={waiting} />
          <TaskList title="נסגרו" tasks={closed} />
          {open.length === 0 && waiting.length > 0 ? <p className="text-center text-sm font-bold">הכול אצל ההורה לאישור.</p> : null}
        </>
      ) : null}
      {data && tab === "prize" ? (
        <ShopGrid coins={data.coins || coinsFromXp(data.child.xp)} busy={buy.isPending} onBuy={(item) => buy.mutate(item)} note={buy.error instanceof Error ? buy.error.message : buy.isSuccess ? "נשלח להורה" : null} />
      ) : null}
      {data && tab === "jar" ? (
        <>
          <Jar amount={data.balance} caption={data.allowance ? `בסיס ${data.allowance.base_amount} ₪ ${data.allowance.period === "weekly" ? "בשבוע" : "בחודש"}` : "עוד בלי דמי כיס"} />
          <section className="surface-card p-4">
            <h2 className="mb-2 font-black">הודעות מההורים</h2>
            {data.messages.length === 0 ? <p className="text-sm text-muted-foreground">עוד אין פתקים.</p> : null}
            <ul className="flex flex-col gap-2">
              {data.messages.map((m) => (
                <li key={m.id} className="rounded-2xl bg-muted px-3 py-2 text-sm">{m.body}</li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </AppFrame>
  );
}

function faceFor(avatarId: string | null, gender: string | null, level: number) {
  const stage = stageFor(level);
  if (avatarId === "pinka") return `/brand/girl-pinka-${stage}.png`;
  if (avatarId === "tree" || !avatarId) return characterSrc(gender, stage);
  return characters.find((c) => c.id === avatarId)?.src ?? characterSrc(gender, stage);
}

function ShopGrid({ coins, busy, onBuy, note }: { coins: number; busy: boolean; onBuy: (item: { title: string; cost: number }) => void; note: string | null }) {
  return (
    <section className="flex flex-col gap-3">
      <p className="text-3xl font-black">{coins} מטבעות</p>
      <p className="text-sm text-muted-foreground">מטבע מגיע מאישור משימה. הבקשה מחכה להורה, והמטבעות יורדים רק אחרי אישור.</p>
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
  tasks: Array<{ id: string; title: string; kind: string; category: string | null; status?: string; advances_goal?: boolean; repeat_done?: number; repeat_target?: number }>;
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
                <p className="text-xs text-muted-foreground">{task.kind === "action" ? "אקשן" : "בית"} · {task.advances_goal ? "סופר למתנה" : "רק נקודות"} · {task.repeat_done ?? 0}/{task.repeat_target ?? 1}</p>
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
