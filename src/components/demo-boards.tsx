import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppFrame, XpMeter, stageFor } from "@/components/app-frame";
import { AvatarPlate } from "@/components/avatar-plate";
import { characterSrc, taskIcon } from "@/components/brand";
import { coinsFromXp, shopItems } from "@/lib/shop";
import { Button } from "@/components/ui/button";
import { Chip, ChipRow, Hero, Jar } from "@/components/mojo-ui";
import {
  closeChest,
  demoComplete,
  demoDecide,
  demoKid,
  demoKids,
  demoRequest,
  endDemo,
  setDemoView,
  type DemoTask,
} from "@/lib/demo";
import { useDemo } from "@/lib/use-demo";

export function DemoParent() {
  const navigate = useNavigate();
  const demo = useDemo();
  const kids = demoKids();
  const [tab, setTab] = useState("home");
  const [id, setId] = useState(demo?.childId ?? kids[0]!.id);
  const [method, setMethod] = useState("מסלולי אקשן");
  const kid = demoKid(id);
  const done = kid.tasks.filter((t) => t.advances_goal && t.status === "approved").length;
  const waiting = kids.flatMap((child) =>
    child.tasks.filter((t) => t.status === "pending_approval").map((t) => ({ ...t, childName: child.name })),
  );

  return (
    <AppFrame
      title="משפחת דמו"
      kicker="דמו · הורה"
      tab={tab}
      onTab={setTab}
      onSignOut={() => {
        endDemo();
        navigate({ to: "/login" });
      }}
      tabs={[
        { id: "home", label: "בית" },
        { id: "approve", label: "אישור", ...(waiting.length ? { badge: waiting.length } : {}) },
      ]}
      background="/brand/bg-parent-home.png"
    >
      <DemoSwitch />
      {tab === "home" ? (
        <>
          <ChipRow>
            {kids.map((child) => (
              <Chip key={child.id} label={child.name} on={child.id === kid.id} onClick={() => setId(child.id)} />
            ))}
          </ChipRow>
          <ChipRow>
            {["מסלולי אקשן", "כל משימה נחשבת", "דמי כיס"].map((name) => (
              <Chip key={name} label={name} on={method === name} onClick={() => setMethod(name)} />
            ))}
          </ChipRow>
          <Jar amount={kid.balance} caption={method === "דמי כיס" ? "המתנה נפתחת כשהצנצנת מלאה" : kid.pet} />
          <Hero eyebrow={method} title={kid.goal.title} detail={method === "דמי כיס" ? `${kid.balance}/${kid.goal.price} ₪` : `${done}/${kid.goal.target} · ${kid.goal.price} ₪`} progress={method === "דמי כיס" ? (kid.balance / kid.goal.price) * 100 : (done / kid.goal.target) * 100} />
          <section className="surface-card p-4">
            <XpMeter xp={kid.xp} level={kid.level} />
            <div className="mt-3"><AvatarPlate stage={stageFor(kid.level)} pet={kid.pet} gender={kid.gender} /></div>
          </section>
          <Button type="button" onClick={() => { setDemoView("child", kid.id); navigate({ to: "/child" }); }}>
            לראות כמו {kid.name}
          </Button>
        </>
      ) : (
        <section>
          <h2 className="mb-2 text-lg font-black">מחכה לאישור</h2>
          {waiting.length === 0 ? <p className="surface-card p-4 text-sm">אין משימות ממתינות.</p> : null}
          <ul className="flex flex-col gap-2">
            {waiting.map((task) => (
              <li key={task.id} className="surface-card flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-black">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.childName}</p>
                </div>
                <span className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => demoDecide(task.id, true)}>אישור</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => demoDecide(task.id, false)}>החזרה</Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {demo?.chest ? <Chest title={demo.chest} /> : null}
    </AppFrame>
  );
}

export function DemoChild() {
  const navigate = useNavigate();
  const demo = useDemo();
  const [tab, setTab] = useState("today");
  const kid = demoKid(demo?.childId ?? "noa");
  const done = kid.tasks.filter((t) => t.advances_goal && t.status === "approved").length;
  const open = kid.tasks.filter((t) => t.status === "active");
  const waiting = kid.tasks.filter((t) => t.status === "pending_approval");

  return (
    <AppFrame
      title={kid.name}
      kicker="דמו · ילד"
      tab={tab}
      onTab={setTab}
      onSignOut={() => {
        endDemo();
        navigate({ to: "/login" });
      }}
      tabs={[
        { id: "today", label: "בית" },
        { id: "tasks", label: "משימות" },
        { id: "prize", label: "חנות" },
        { id: "jar", label: "הודעות" },
      ]}
      background="/brand/room-1.png"
      icons={{ today: "/brand/nav-home.png", tasks: "/brand/nav-missions.png", prize: "/brand/nav-gifts.png", jar: "/brand/nav-chat.png" }}
    >
      <DemoSwitch />
      {tab === "today" ? (
        <>
          <section className="relative -mx-4 min-h-[68dvh]">
            <img src={characterSrc(kid.gender, stageFor(kid.level))} alt="" className="absolute inset-x-0 bottom-16 mx-auto h-[46dvh] w-auto object-contain drop-shadow-2xl" />
            <div className="absolute inset-x-4 top-0 flex justify-between">
              <span className="rounded-full bg-card/80 px-3 py-1 text-sm font-black">רמה {kid.level}</span>
              <span className="rounded-full bg-card/80 px-3 py-1 text-sm font-black">{kid.xp % 100}/100</span>
            </div>
          </section>
          <Hero eyebrow={kid.goal.path} title={kid.goal.title} detail={`${done}/${kid.goal.target}`} progress={(done / kid.goal.target) * 100} />
          <TaskBlock title="מחכה לך היום" tasks={open.slice(0, 2)} onDone={demoComplete} />
        </>
      ) : null}
      {tab === "tasks" ? (
        <>
          <TaskBlock title="היום" tasks={open} onDone={demoComplete} />
          <TaskBlock title="מחכה להורה" tasks={waiting} locked />
        </>
      ) : null}
      {tab === "prize" ? (
        <section>
          <p className="mb-2 text-3xl font-black">{coinsFromXp(kid.xp)} מטבעות</p>
          <ul className="grid grid-cols-2 gap-2">
            {shopItems.map((item) => (
              <li key={item.id} className="surface-card p-3 font-black">{item.title}<span className="block text-sm font-bold text-muted-foreground">{item.cost}</span></li>
            ))}
          </ul>
        </section>
      ) : null}
      {tab === "jar" ? (
        <>
          <Jar amount={kid.balance} caption={kid.goal.method} />
          <ul className="flex flex-col gap-2">
            {kid.notes.map((note) => <li key={note} className="surface-card px-4 py-3 text-sm">{note}</li>)}
          </ul>
        </>
      ) : null}
      <ChipRow>
        {demoKids().map((other) => (
          <Chip key={other.id} label={other.name} on={other.id === kid.id} onClick={() => setDemoView("child", other.id)} />
        ))}
      </ChipRow>
      {demo?.chest ? <Chest title={demo.chest} /> : null}
    </AppFrame>
  );
}

function TaskBlock({ title, tasks, locked, onDone }: { title: string; tasks: DemoTask[]; locked?: boolean; onDone?: (id: string) => void }) {
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
                <p className="font-black">{task.title}</p>
                <p className="text-xs text-muted-foreground">{task.kind === "action" ? "אקשן" : "בית"} · {task.repeat_done}/{task.repeat_target}</p>
              </div>
            </div>
            {onDone ? <Button type="button" size="sm" className="tap-target" onClick={() => onDone(task.id)}>סיימתי</Button> : locked ? <span className="text-xs font-bold text-muted-foreground">נעול</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DemoSwitch() {
  const navigate = useNavigate();
  const demo = useDemo();
  return (
    <ChipRow>
      <Chip label="הורה" on={demo?.view === "parent"} onClick={() => { setDemoView("parent"); navigate({ to: "/parent" }); }} />
      <Chip label="ילד" on={demo?.view === "child"} onClick={() => { setDemoView("child"); navigate({ to: "/child" }); }} />
    </ChipRow>
  );
}

function Chest({ title }: { title: string }) {
  return (
    <div className="surface-card border-2 border-xp p-4 text-center">
      <p className="text-sm font-bold text-xp-foreground">תיבה נפתחה</p>
      <p className="text-lg font-black">{title}</p>
      <Button type="button" className="mt-3" onClick={closeChest}>סגירה</Button>
    </div>
  );
}
