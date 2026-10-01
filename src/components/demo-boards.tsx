import { useNavigate } from "@tanstack/react-router";
import { AppFrame, XpMeter, stageFor } from "@/components/app-frame";
import { AvatarPlate } from "@/components/avatar-plate";
import { Button } from "@/components/ui/button";
import {
  closeChest,
  demoComplete,
  demoDecide,
  demoKid,
  demoKids,
  endDemo,
  setDemoView,
  type DemoTask,
} from "@/lib/demo";
import { useDemo } from "@/lib/use-demo";

export function DemoParent() {
  const navigate = useNavigate();
  const demo = useDemo();
  const kids = demoKids();
  const waiting = kids.flatMap((kid) =>
    kid.tasks.filter((t) => t.status === "pending_approval").map((t) => ({ ...t, childName: kid.name })),
  );

  return (
    <AppFrame
      title="משפחת דמו"
      kicker="דמו · הורה"
      tab="home"
      onTab={() => undefined}
      onSignOut={() => {
        endDemo();
        navigate({ to: "/login" });
      }}
      tabs={[{ id: "home", label: "בית" }]}
    >
      <DemoBar />
      <p className="text-sm text-muted-foreground">שני ילדים, מטרות ומשימות לדוגמה. האישורים כאן מקומיים ולא נשמרים.</p>
      {kids.map((kid) => {
        const done = kid.tasks.filter((t) => t.advances_goal && t.status === "approved").length;
        return (
          <article key={kid.id} className="surface-card p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">{kid.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {kid.goal.method} · {kid.pet} · שלב {stageFor(kid.level)}
                </p>
              </div>
              <p className="font-black text-primary">{kid.balance} ₪</p>
            </div>
            <XpMeter xp={kid.xp} level={kid.level} />
            <div className="mt-3">
              <AvatarPlate stage={stageFor(kid.level)} pet={kid.pet} />
            </div>
            <p className="mt-3 text-sm font-bold">
              {kid.goal.title} ({kid.goal.price} ₪) · {done}/{kid.goal.target} · {kid.goal.path}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{done >= kid.goal.target ? "המתנה בחנות, מוכנה למסירה" : "המתנה נעולה עד סוף המסלול"}</p>
            <Button
              type="button"
              className="mt-3 tap-target"
              onClick={() => {
                setDemoView("child", kid.id);
                navigate({ to: "/child" });
              }}
            >
              לראות כמו {kid.name}
            </Button>
          </article>
        );
      })}
      <section>
        <h2 className="mb-2 text-lg font-black">מחכה לאישור</h2>
        {waiting.length === 0 ? <p className="surface-card p-4 text-sm text-muted-foreground">אין משימות ממתינות.</p> : null}
        <ul className="flex flex-col gap-2">
          {waiting.map((task) => (
            <li key={task.id} className="surface-card flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-bold">{task.title}</p>
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
      {demo?.chest ? <Chest title={demo.chest} /> : null}
    </AppFrame>
  );
}

export function DemoChild() {
  const navigate = useNavigate();
  const demo = useDemo();
  const kid = demoKid(demo?.childId ?? "noa");
  const done = kid.tasks.filter((t) => t.advances_goal && t.status === "approved").length;
  const open = kid.tasks.filter((t) => t.status === "active");
  const waiting = kid.tasks.filter((t) => t.status === "pending_approval");

  return (
    <AppFrame
      title={kid.name}
      kicker="דמו · ילד"
      tab="home"
      onTab={() => undefined}
      onSignOut={() => {
        endDemo();
        navigate({ to: "/login" });
      }}
      tabs={[{ id: "home", label: "הבית" }]}
    >
      <DemoBar />
      <section className="surface-card p-4">
        <p className="text-sm font-bold text-accent-foreground">שלב דמות {stageFor(kid.level)} · {kid.pet}</p>
        <div className="mt-2">
          <AvatarPlate stage={stageFor(kid.level)} pet={kid.pet} />
        </div>
        <h2 className="text-xl font-black">{kid.gender === "boy" ? "גיבור הבית" : "גיבורת הבית"}</h2>
        <div className="mt-3">
          <XpMeter xp={kid.xp} level={kid.level} />
        </div>
      </section>
      <section className="surface-card p-4">
        <p className="text-sm text-muted-foreground">{kid.goal.method} · {kid.goal.path}</p>
        <h2 className="text-xl font-black">{kid.goal.title}</h2>
        <p className="mt-1 text-sm font-bold">{done}/{kid.goal.target} למתנה של {kid.goal.price} ₪</p>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (done / kid.goal.target) * 100)}%` }} />
        </div>
      </section>
      <section className="surface-card p-4">
        <h2 className="font-black">הצנצנת</h2>
        <p className="text-3xl font-black">{kid.balance} ₪</p>
      </section>
      <TaskBlock title="לעשות היום" tasks={open} onDone={demoComplete} />
      <TaskBlock title="מחכה להורה" tasks={waiting} locked />
      <section className="surface-card p-4">
        <h2 className="mb-2 font-black">פתקים</h2>
        <ul className="flex flex-col gap-2">
          {kid.notes.map((note) => (
            <li key={note} className="rounded-2xl bg-muted px-3 py-2 text-sm">{note}</li>
          ))}
        </ul>
      </section>
      <div className="flex gap-2">
        {demoKids().map((other) => (
          <Button key={other.id} type="button" variant={other.id === kid.id ? "default" : "outline"} onClick={() => setDemoView("child", other.id)}>
            {other.name}
          </Button>
        ))}
      </div>
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
              <p className="font-bold">{task.title}</p>
              <p className="text-xs text-muted-foreground">{task.kind === "action" ? "אקשן" : "בית"} · {task.category} · {task.repeat_done}/{task.repeat_target}</p>
            </div>
            {onDone ? (
              <Button type="button" size="sm" className="tap-target" onClick={() => onDone(task.id)}>סיימתי</Button>
            ) : locked ? (
              <span className="text-xs font-bold text-muted-foreground">נעול</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DemoBar() {
  const navigate = useNavigate();
  const demo = useDemo();
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        variant={demo?.view === "parent" ? "default" : "outline"}
        onClick={() => {
          setDemoView("parent");
          navigate({ to: "/parent" });
        }}
      >
        לוח הורה
      </Button>
      <Button
        type="button"
        size="sm"
        variant={demo?.view === "child" ? "default" : "outline"}
        onClick={() => {
          setDemoView("child");
          navigate({ to: "/child" });
        }}
      >
        לוח ילד
      </Button>
    </div>
  );
}

function Chest({ title }: { title: string }) {
  return (
    <div className="surface-card border-2 border-xp p-4 text-center">
      <p className="text-sm font-bold text-xp-foreground">תיבה נפתחה</p>
      <p className="text-lg font-black">{title}</p>
      <p className="text-sm text-muted-foreground">10 נקודות ניסיון נכנסו לרמה.</p>
      <Button type="button" className="mt-3" onClick={closeChest}>סגירה</Button>
    </div>
  );
}
