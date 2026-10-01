import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppFrame, XpMeter, stageFor } from "@/components/app-frame";
import { characterSrc, characters, petSrc } from "@/components/brand";
import { FormError } from "@/components/auth-shell";
import { ConnectChild } from "@/components/connect-child";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addChild,
  createInviteCode,
  decideJoinRequest,
  listChildren,
  listJoinRequests,
  type MyContext,
} from "@/lib/family.functions";
import {
  addCustomTask,
  approveTask,
  createGoal,
  cancelGoal,
  deliverGoal,
  decideShop,
  getBoard,
  listRanges,
  markPaid,
  saveAllowance,
  sendNote,
  setRepeats,
} from "@/lib/mojo.functions";
import { AvatarPlate } from "@/components/avatar-plate";
import { parentVideos } from "@/components/brand";
import { Chip, ChipRow, Hero, Jar } from "@/components/mojo-ui";
import { MethodGuide } from "@/components/method-guide";
import { endDemo } from "@/lib/demo";
import { listMethods } from "@/methods/registry";
import { RequireAuth, signOut } from "@/lib/session";

export const Route = createFileRoute("/parent")({
  head: () => ({ meta: [{ title: "המשפחה — MyMojo" }] }),
  component: ParentGate,
});

function ParentGate() {
  useEffect(() => {
    endDemo();
  }, []);
  return <RequireAuth allow={["parent"]}>{(me) => <ParentHome me={me} />}</RequireAuth>;
}

function ParentHome({ me }: { me: MyContext }) {
  const [tab, setTab] = useState("home");
  const children = useQuery({ queryKey: ["children"], queryFn: () => listChildren() });
  const pending = useQuery({
    queryKey: ["approvals", (children.data ?? []).map((c) => c.id).join(",")],
    enabled: (children.data ?? []).length > 0,
    queryFn: async () => {
      const all = await Promise.all((children.data ?? []).map(async (c) => getBoard({ data: { childId: c.id } })));
      return all.reduce((n, board) => n + board.tasks.filter((t) => t.status === "pending_approval").length, 0);
    },
  });
  return (
    <AppFrame
      title={me.family?.name || "המשפחה"}
      kicker="לוח הורה"
      tab={tab}
      onTab={setTab}
      onSignOut={() => signOut()}
      background={tab === "approve" ? "/brand/bg-parent-approve.png" : "/brand/bg-parent-home.png"}
      tabs={[
        { id: "home", label: "בית" },
        { id: "approve", label: "אישור", ...(pending.data ? { badge: pending.data } : {}) },
        { id: "goal", label: "מטרה" },
        { id: "more", label: "עוד" },
      ]}
    >
      {tab === "home" ? (
        <>
          {pending.data ? (
            <button type="button" onClick={() => setTab("approve")} className="surface-card p-4 text-start">
              <p className="text-2xl font-black">{pending.data} מחכים לך</p>
              <p className="text-sm text-muted-foreground">אישור משימות ובקשות חנות</p>
            </button>
          ) : null}
          <PrizeReady children={children.data ?? []} />
          <Kids children={children.data ?? []} onMore={() => setTab("more")} onGoal={() => setTab("goal")} />
        </>
      ) : null}
      {tab === "approve" ? <Approvals children={children.data ?? []} /> : null}
      {tab === "goal" ? <GoalMaker children={children.data ?? []} /> : null}
      {tab === "more" ? (
        <>
          <Shop children={children.data ?? []} />
          <FamilyTab familyId={me.family!.id} children={children.data ?? []} />
          <MethodGuide />
          <section className="surface-card p-4">
            <h2 className="mb-2 font-black">סרטוני הסבר</h2>
            <ul className="flex flex-col gap-2">
              {parentVideos.map((video) => (
                <li key={video.id}>
                  <a className="font-bold text-primary" href={`https://drive.google.com/file/d/${video.id}/view`} target="_blank" rel="noreferrer">
                    {video.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </AppFrame>
  );
}


function PrizeReady({ children }: { children: Array<{ id: string; name: string }> }) {
  const qc = useQueryClient();
  const boards = useQuery({
    queryKey: ["prizes", children.map((c) => c.id).join(",")],
    enabled: children.length > 0,
    queryFn: () => Promise.all(children.map(async (c) => ({ child: c, board: await getBoard({ data: { childId: c.id } }) }))),
  });
  const give = useMutation({
    mutationFn: (goalId: string) => deliverGoal({ data: { goalId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prizes"] }),
  });
  const rows = (boards.data ?? []).flatMap(({ child, board }) =>
    board.goals
      .filter((g) => g.status === "completed" && !(g.method_config as { delivered?: boolean }).delivered)
      .map((g) => ({ ...g, childName: child.name })),
  );
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      {rows.map((goal) => {
        const asked = Boolean((goal.method_config as { requested?: boolean }).requested);
        return (
          <article key={goal.id} className="surface-card p-4">
            <p className="text-xs font-bold text-primary">{asked ? "הילד ביקש את המתנה" : "המתנה הושגה"}</p>
            <h2 className="text-xl font-black">{goal.title}</h2>
            <p className="text-sm text-muted-foreground">{goal.childName} · {goal.price_ils ?? 0} ₪</p>
            <Button type="button" className="mt-3 h-11 w-full font-black" disabled={give.isPending} onClick={() => give.mutate(goal.id)}>
              סמן כנמסר
            </Button>
          </article>
        );
      })}
    </section>
  );
}

function Kids({ children, onMore, onGoal }: { children: Array<{ id: string; name: string; connected: boolean }>; onMore: () => void; onGoal: () => void }) {
  const [id, setId] = useState(children[0]?.id ?? "");
  const current = children.find((c) => c.id === id) ?? children[0];
  if (!current) {
    return (
      <section className="surface-card p-5">
        <p className="text-xs font-bold text-primary">התחלה</p>
        <h2 className="mt-1 text-2xl font-black">שלושה צעדים, ואז הילד רואה מתנה</h2>
        <ol className="mt-4 flex flex-col gap-2 text-sm font-bold">
          <li>1. מוסיפים ילד או ילדה</li>
          <li>2. בוחרים שיטת חינוך</li>
          <li>3. פותחים מתנה</li>
        </ol>
        <Button type="button" className="mt-4 h-11 w-full font-black" onClick={onMore}>הוספת ילד</Button>
      </section>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <ChipRow>
        {children.map((child) => (
          <Chip key={child.id} label={child.name} on={child.id === current.id} onClick={() => setId(child.id)} />
        ))}
      </ChipRow>
      <KidCard child={current} onGoal={onGoal} />
    </div>
  );
}

function KidCard({ child, onGoal }: { child: { id: string; name: string; connected: boolean }; onGoal: () => void }) {
  const board = useQuery({ queryKey: ["board", child.id], queryFn: () => getBoard({ data: { childId: child.id } }) });
  const goal = board.data?.goals.find((g) => g.status === "active");
  const done = (board.data?.tasks ?? []).filter((t) => t.advances_goal && t.status === "approved").length;
  const target = Number((goal?.method_config as { taskTarget?: number } | null)?.taskTarget ?? 0);
  const pocket = goal?.method_id === "pocket_money";
  const price = Number(goal?.price_ils ?? 0);
  const progress = pocket ? (price ? ((board.data?.balance ?? 0) / price) * 100 : 0) : target ? (done / target) * 100 : 0;
  const methodName = pocket ? "דמי כיס" : goal?.method_id === "classic" ? "כל משימה" : goal ? "מסלול אקשן" : "בלי שיטה";
  const detail = !goal ? "עוד אין מתנה" : pocket ? `${board.data?.balance ?? 0}/${price} ₪ בצנצנת` : `${done}/${target || "?"} משימות`;
  const open = (board.data?.tasks ?? []).filter((t) => t.status === "active").length;
  const waiting = (board.data?.tasks ?? []).filter((t) => t.status === "pending_approval").length;
  const stage = stageFor(board.data?.child.level ?? 1);
  const face = characters.find((c) => c.id === board.data?.child.avatar_id)?.src ?? characterSrc(board.data?.child.gender, stage);
  return (
    <div className="flex flex-col gap-3">
      <section className="surface-card flex items-center gap-3 p-4">
        <img src={face} alt="" className="h-24 w-24 object-contain" />
        <img src={petSrc(board.data?.child.pet_id)} alt="" className="h-14 w-14 object-contain" />
        <div>
          <p className="text-xl font-black">{child.name}</p>
          <p className="text-sm font-bold">רמה {board.data?.child.level ?? 1} · שלב {stage}</p>
          <p className="text-sm text-muted-foreground">{open} פתוחות · {waiting} ממתינות</p>
        </div>
      </section>
      <Jar amount={board.data?.balance ?? 0} caption={child.connected ? "מכשיר מחובר" : "עוד בלי מכשיר"} />
      <Hero
        eyebrow={goal ? `${methodName} · ${(goal.method_config as { pathName?: string }).pathName ?? ""}` : "אין מתנה פעילה"}
        title={goal?.title ?? "פותחים מתנה"}
        detail={detail}
        progress={progress}
      />
      <Button type="button" className="h-11 font-black" onClick={onGoal}>{goal ? "עריכת שיטה ומתנה" : "בחירת שיטה ומתנה"}</Button>
      <section className="surface-card p-4">
        <XpMeter xp={board.data?.child.xp ?? 0} level={board.data?.child.level ?? 1} />
        <p className="mt-2 text-sm font-bold">{board.data?.coins ?? 0} מטבעות · רצף {board.data?.streak ?? 0}</p>
        {board.data?.ledger.length ? (
          <ul className="mt-3 flex flex-col gap-1">
            {board.data.ledger.slice(0, 3).map((row) => (
              <li key={row.created_at} className="flex justify-between text-xs text-muted-foreground">
                <span>{row.reason}</span>
                <span>{row.type === "earn" ? "+" : "-"}{row.amount} ₪</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function Approvals({ children }: { children: Array<{ id: string; name: string }> }) {
  const qc = useQueryClient();
  const boards = useQuery({
    queryKey: ["approvals", children.map((c) => c.id).join(",")],
    enabled: children.length > 0,
    queryFn: async () => {
      const all = await Promise.all(children.map(async (c) => ({ child: c, board: await getBoard({ data: { childId: c.id } }) })));
      return all.flatMap(({ child, board }) => [
        ...board.tasks.filter((t) => t.status === "pending_approval").map((t) => ({ ...t, childName: child.name, shop: false })),
        ...board.messages.filter((m) => m.body.startsWith("בקשת חנות")).map((m) => ({ id: m.id, title: m.body, childName: child.name, kind: "home", repeat_done: 0, repeat_target: 1, shop: true })),
      ]);
    },
  });
  const decide = useMutation({
    mutationFn: (v: { taskId: string; approve: boolean }) => approveTask({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["board"] });
    },
  });
  const shop = useMutation({
    mutationFn: (v: { messageId: string; approve: boolean }) => decideShop({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approvals"] }),
  });
  const rows = boards.data ?? [];
  if (rows.length === 0) return <Empty text="אין משימות שמחכות לאישור." />;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((task) => (
        <li key={task.id} className="surface-card p-4">
          <p className="font-black">{task.title}</p>
          <p className="text-sm text-muted-foreground">
            {task.childName} · {task.shop ? "חנות" : task.kind === "action" ? "אקשן מקדם מסלול" : "בית נותן נקודות"} · {task.repeat_done}/{task.repeat_target}
          </p>
          <div className="mt-3 flex gap-2">
            {task.shop ? (
              <>
                <Button type="button" disabled={shop.isPending} onClick={() => shop.mutate({ messageId: task.id, approve: true })}>אישור</Button>
                <Button type="button" variant="outline" disabled={shop.isPending} onClick={() => shop.mutate({ messageId: task.id, approve: false })}>לא עכשיו</Button>
              </>
            ) : (
              <>
                <Button type="button" className="tap-target" disabled={decide.isPending} onClick={() => decide.mutate({ taskId: task.id, approve: true })}>
                  אישור
                </Button>
                <Button type="button" variant="outline" className="tap-target" disabled={decide.isPending} onClick={() => decide.mutate({ taskId: task.id, approve: false })}>
                  החזרה
                </Button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function GoalMaker({ children }: { children: Array<{ id: string; name: string }> }) {
  const qc = useQueryClient();
  const ranges = useQuery({ queryKey: ["ranges"], queryFn: () => listRanges() });
  const [childId, setChildId] = useState(children[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("350");
  const [methodId, setMethodId] = useState<"tracks" | "classic" | "pocket_money">("tracks");
  const [pathIndex, setPathIndex] = useState(1);
  const [custom, setCustom] = useState("");
  const create = useMutation({
    mutationFn: () =>
      createGoal({
        data: { childId, title, priceIls: Number(price), methodId, pathIndex },
      }),
    onSuccess: () => {
      setTitle("");
      qc.invalidateQueries({ queryKey: ["board"] });
    },
  });
  const board = useQuery({
    queryKey: ["board", childId],
    enabled: !!childId,
    queryFn: () => getBoard({ data: { childId } }),
  });
  const extra = useMutation({
    mutationFn: () => addCustomTask({ data: { goalId: board.data?.goals[0]?.id ?? "", title: custom, kind: "action", repeats: 1 } }),
    onSuccess: () => {
      setCustom("");
      qc.invalidateQueries({ queryKey: ["board"] });
    },
  });
  const [base, setBase] = useState("20");
  const [homePay, setHomePay] = useState("2");
  const [actionPay, setActionPay] = useState("5");
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const allowance = useMutation({
    mutationFn: () =>
      saveAllowance({
        data: {
          childId,
          period,
          baseAmount: Number(base) || 0,
          payoutDay: 1,
          homeAmount: Number(homePay) || 0,
          actionAmount: Number(actionPay) || 0,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board"] }),
  });
  const pay = useMutation({
    mutationFn: () => markPaid({ data: { childId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board"] }),
  });
  const note = useMutation({
    mutationFn: (body: string) => sendNote({ data: { childId, body } }),
  });
  const methods = listMethods();
  const priceNum = Number(price);
  const range = (ranges.data?.ranges ?? []).find(
    (r) => priceNum >= Number(r.min_ils) && (r.max_ils == null || priceNum <= Number(r.max_ils)),
  );
  const paths = (ranges.data?.paths ?? []).filter((p) => p.range_id === range?.id);

  if (children.length === 0) return <Empty text="קודם מוסיפים ילד." />;
  return (
    <div className="flex flex-col gap-4">
      <form
        className="surface-card flex flex-col gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <h2 className="text-lg font-black">1. בוחרים שיטה</h2>
        <FormError message={create.error instanceof Error ? create.error.message : null} />
        {create.isSuccess ? <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-bold">המתנה נפתחה. הילד רואה אותה בלוח.</p> : null}
        <div className="flex flex-col gap-2">
          {methods.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={methodId === m.id}
              onClick={() => setMethodId(m.id as typeof methodId)}
              className={`rounded-2xl border px-3 py-3 text-start ${methodId === m.id ? "border-primary bg-primary/10" : "border-border"}`}
            >
              <span className="block font-black">{m.name}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{m.tagline}</span>
            </button>
          ))}
        </div>
        <p className="text-sm font-bold">
          {methodId === "tracks" ? "רק משימות אקשן סופרות למתנה. בית נותן נקודות." : methodId === "classic" ? "כל משימה שאושרה מקרבת למתנה." : "המתנה נפתחת כשהצנצנת מגיעה למחיר. אין מסלול."}
        </p>
        <MethodGuide id={methodId} />
        <h2 className="text-lg font-black">2. המתנה</h2>
        <Label htmlFor="kid">ילד/ה</Label>
        <select id="kid" value={childId} onChange={(e) => setChildId(e.target.value)} className="h-11 rounded-xl border border-input bg-background px-3">
          {children.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Label htmlFor="gift">שם המתנה</Label>
        <Input id="gift" value={title} onChange={(e) => setTitle(e.target.value)} required className="h-11" />
        <Label htmlFor="price">מחיר בשקלים</Label>
        <Input id="price" inputMode="decimal" dir="ltr" value={price} onChange={(e) => setPrice(e.target.value)} className="h-11" />
        <p className="text-sm text-muted-foreground">{methodId === "pocket_money" ? "המתנה נפתחת לפי יתרה, לא לפי מספר משימות." : range ? `${range.label} · ${range.task_count} משימות` : "מחוץ לטווחים"}</p>
        {methodId === "tracks" ? (
          <div className="grid grid-cols-1 gap-2">
            {paths.map((p) => (
              <button key={p.id} type="button" aria-pressed={pathIndex === p.path_index} onClick={() => setPathIndex(p.path_index)} className={`rounded-2xl border px-3 py-2 text-sm font-bold ${pathIndex === p.path_index ? "border-accent bg-accent/15" : "border-border"}`}>
                {p.name}
              </button>
            ))}
          </div>
        ) : null}
        <Button type="submit" disabled={create.isPending || title.trim().length < 2} className="h-11 font-bold">
          {create.isPending ? "יוצרים…" : "פתיחת מטרה"}
        </Button>
        {board.data?.goals.find((g) => g.status === "active") ? (
          <CancelGoal goalId={board.data.goals.find((g) => g.status === "active")!.id} />
        ) : null}
      </form>

      {methodId === "pocket_money" ? <section className="surface-card flex flex-col gap-3 p-4">
        <h2 className="text-lg font-black">3. כמה נכנס לצנצנת</h2>
        <p className="text-2xl font-black">{board.data?.balance ?? 0} ₪ בצנצנת</p>
        <div className="grid grid-cols-2 gap-2">
          <Input inputMode="decimal" dir="ltr" value={base} onChange={(e) => setBase(e.target.value)} aria-label="בסיס" />
          <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} className="h-11 rounded-xl border border-input bg-background px-3">
            <option value="weekly">שבועי</option>
            <option value="monthly">חודשי</option>
          </select>
          <Input inputMode="decimal" dir="ltr" value={homePay} onChange={(e) => setHomePay(e.target.value)} aria-label="בית" />
          <Input inputMode="decimal" dir="ltr" value={actionPay} onChange={(e) => setActionPay(e.target.value)} aria-label="אקשן" />
        </div>
        <p className="text-xs text-muted-foreground">בסיס, תדירות, תשלום לבית, תשלום לאקשן. חל קדימה בלבד.</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => allowance.mutate()} disabled={allowance.isPending}>שמירה</Button>
          <Button type="button" onClick={() => pay.mutate()} disabled={pay.isPending}>סמן כשולם</Button>
        </div>
        <FormError message={pay.error instanceof Error ? pay.error.message : null} />
      </section> : <p className="text-sm font-bold text-muted-foreground">דמי כיס מופיעים רק בשיטת הצנצנת.</p>}

      {board.data?.goals[0] ? (
        <section className="surface-card p-4">
          <h2 className="mb-2 font-black">קטלוג מוכן</h2>
          <div className="flex flex-wrap gap-2">
            {["סידור החדר", "כלים", "שיניים", "אשפה", "מיטה", "חיה", "כביסה", "קריאה"].map((title) => (
              <button
                key={title}
                type="button"
                className="rounded-full bg-muted px-3 py-2 text-sm font-black"
                onClick={() => addCustomTask({ data: { goalId: board.data!.goals[0]!.id, title, kind: "home", repeats: 1 } }).then(() => qc.invalidateQueries({ queryKey: ["board"] }))}
              >
                {title}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {board.data?.goals[0] ? (
        <form
          className="surface-card flex flex-col gap-2 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            extra.mutate();
          }}
        >
          <h2 className="font-black">משימה ידנית למטרה הפעילה</h2>
          <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="שם המשימה" />
          <Button type="submit" variant="outline" disabled={extra.isPending || custom.trim().length < 2}>הוספה</Button>
        </form>
      ) : null}

      <TaskRepeats tasks={board.data?.tasks ?? []} />

      <form
        className="surface-card flex flex-col gap-2 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const body = new FormData(e.currentTarget).get("note");
          if (typeof body === "string" && body.trim()) note.mutate(body.trim());
          e.currentTarget.reset();
        }}
      >
        <Label htmlFor="note">פתק לילד</Label>
        <Input id="note" name="note" maxLength={280} />
        <Button type="submit" variant="secondary">שליחה</Button>
      </form>
    </div>
  );
}

function CancelGoal({ goalId }: { goalId: string }) {
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => cancelGoal({ data: { goalId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board"] }),
  });
  return (
    <Button type="button" variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
      ביטול המטרה הפעילה
    </Button>
  );
}

function TaskRepeats({ tasks }: { tasks: Array<{ id: string; title: string; repeat_target: number; status: string }> }) {
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (v: { taskId: string; repeats: number }) => setRepeats({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board"] }),
  });
  const open = tasks.filter((t) => t.status !== "approved");
  if (open.length === 0) return null;
  return (
    <section className="surface-card p-4">
      <h2 className="mb-2 font-black">כמה פעמים עד שנסגר</h2>
      <ul className="flex flex-col gap-2">
        {open.map((task) => (
          <li key={task.id} className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold">{task.title}</span>
            <span className="flex gap-1">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={task.repeat_target === n}
                  disabled={save.isPending}
                  onClick={() => save.mutate({ taskId: task.id, repeats: n })}
                  className={`h-9 w-9 rounded-full text-sm font-black ${task.repeat_target === n ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {n}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Shop({ children }: { children: Array<{ id: string; name: string }> }) {
  const qc = useQueryClient();
  const boards = useQuery({
    queryKey: ["shop", children.map((c) => c.id).join(",")],
    enabled: children.length > 0,
    queryFn: () => Promise.all(children.map(async (c) => ({ child: c, board: await getBoard({ data: { childId: c.id } }) }))),
  });
  const give = useMutation({
    mutationFn: (goalId: string) => deliverGoal({ data: { goalId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop"] }),
  });
  const rows = (boards.data ?? []).flatMap(({ child, board }) => board.goals.map((g) => ({ ...g, childName: child.name })));
  if (rows.length === 0) return <Empty text="אין מתנות בחנות. פותחים מטרה בטאב מטרה." />;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((goal) => {
        const delivered = Boolean((goal.method_config as { delivered?: boolean }).delivered);
        return (
          <li key={goal.id} className="surface-card p-4">
            <p className="font-black">{goal.title}</p>
            <p className="text-sm text-muted-foreground">
              {goal.childName} · {goal.price_ils ?? 0} ₪ · {goal.status === "completed" ? "הושגה" : "בדרך"}
            </p>
            {goal.status === "completed" && !delivered ? (
              <Button type="button" className="mt-3" disabled={give.isPending} onClick={() => give.mutate(goal.id)}>
                {(goal.method_config as { requested?: boolean }).requested ? "הילד ביקש · סמן כנמסר" : "סמן כנמסר"}
              </Button>
            ) : null}
            {delivered ? <p className="mt-2 text-sm font-bold text-success-foreground">נמסר</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

function FamilyTab({
  familyId,
  children,
}: {
  familyId: string;
  children: Array<{ id: string; name: string; connected: boolean }>;
}) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"girl" | "boy">("girl");
  const active = children.find((c) => c.id === connecting);
  const invite = useMutation({ mutationFn: () => createInviteCode({ data: { familyId } }) });
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: () => addChild({ data: { familyId, name, gender, birthYear: new Date().getFullYear() - 8 } }),
    onSuccess: async (res) => {
      setName("");
      await qc.invalidateQueries({ queryKey: ["children"] });
      setConnecting(res.childId);
    },
  });
  const requests = useQuery({ queryKey: ["join-requests", familyId], queryFn: () => listJoinRequests({ data: { familyId } }) });
  const decide = useMutation({
    mutationFn: (v: { memberId: string; approve: boolean }) => decideJoinRequest({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["join-requests", familyId] }),
  });
  if (active) {
    return (
      <div className="surface-card p-4">
        <ConnectChild childId={active.id} childName={active.name} />
        <Button type="button" className="mt-3 w-full" onClick={() => setConnecting(null)}>חזרה</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <form
        className="surface-card flex flex-col gap-2 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <h2 className="font-black">ילד/ה חדש/ה</h2>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם" />
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={gender === "girl" ? "default" : "outline"} onClick={() => setGender("girl")}>בת</Button>
          <Button type="button" variant={gender === "boy" ? "default" : "outline"} onClick={() => setGender("boy")}>בן</Button>
        </div>
        <Button type="submit" disabled={add.isPending || name.trim().length < 2}>הוספה וחיבור מכשיר</Button>
      </form>
      <ul className="flex flex-col gap-2">
        {children.map((c) => (
          <li key={c.id} className="surface-card flex items-center justify-between px-4 py-3">
            <span className="font-bold">{c.name}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => setConnecting(c.id)}>
              {c.connected ? "מכשיר נוסף" : "חיבור"}
            </Button>
          </li>
        ))}
      </ul>
      <section className="surface-card p-4">
        <h2 className="font-black">הורה נוסף</h2>
        {invite.data ? <p dir="ltr" className="my-2 text-center text-2xl font-black tracking-[0.2em]">{invite.data.code}</p> : null}
        <Button type="button" variant="outline" onClick={() => invite.mutate()}>{invite.data ? "קוד חדש" : "יצירת קוד"}</Button>
      </section>
      {(requests.data ?? []).length > 0 ? (
        <ul className="flex flex-col gap-2">
          {requests.data!.map((r) => (
            <li key={r.id} className="surface-card flex items-center justify-between px-4 py-3">
              <span className="font-bold">{r.name}</span>
              <span className="flex gap-2">
                <Button type="button" size="sm" onClick={() => decide.mutate({ memberId: r.id, approve: true })}>אישור</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => decide.mutate({ memberId: r.id, approve: false })}>דחייה</Button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="surface-card p-6 text-center text-sm text-muted-foreground">{text}</p>;
}
