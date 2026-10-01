import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppFrame, XpMeter, stageFor } from "@/components/app-frame";
import { AvatarPlate } from "@/components/avatar-plate";
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
    >
      <DemoSwitch />
      {tab === "home" ? (
        <>
          <ChipRow>
            {kids.map((child) => (
              <Chip key={child.id} label={child.name} on={child.id === kid.id} onClick={() => setId(child.id)} />
            ))}
          </ChipRow>
          <Jar amount={kid.balance} caption={kid.pet} />
          <Hero eyebrow={kid.goal.path} title={kid.goal.title} detail={`${done}/${kid.goal.target} · ${kid.goal.price} ₪`} progress={(done / kid.goal.target) * 100} />
          <section className="surface-card p-4">
            <XpMeter xp={kid.xp} level={kid.level} />
            <div className="mt-3"><AvatarPlate stage={stageFor(kid.level)} pet={kid.pet} /></div>
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
        { id: "today", label: "היום" },
        { id: "prize", label: "מתנה" },
        { id: "jar", label: "צנצנת" },
      ]}
    >
      <DemoSwitch />
      {tab === "today" ? (
        <>
          <section className="surface-card p-4">
            <XpMeter xp={kid.xp} level={kid.level} />
            <div className="mt-3"><AvatarPlate stage={stageFor(kid.level)} pet={kid.pet} /></div>
          </section>
          <TaskBlock title="לעשות היום" tasks={open} onDone={demoComplete} />
          <TaskBlock title="מחכה להורה" tasks={waiting} locked />
        </>
      ) : null}
      {tab === "prize" ? (
        <>
          <Hero eyebrow={kid.goal.path} title={kid.goal.title} detail={`${done}/${kid.goal.target} למתנה של ${kid.goal.price} ₪`} progress={(done / kid.goal.target) * 100} />
          {done >= kid.goal.target && !kid.goal.requested ? <Button type="button" onClick={() => demoRequest(kid.id)}>לבקש מההורה</Button> : null}
          {kid.goal.requested ? <p className="text-sm font-bold">ביקשת. מחכים להורה.</p> : null}
        </>
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
            <div>
              <p className="font-black">{task.title}</p>
              <p className="text-xs text-muted-foreground">{task.kind === "action" ? "אקשן" : "בית"} · {task.repeat_done}/{task.repeat_target}</p>
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
