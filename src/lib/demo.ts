export type DemoTask = {
  id: string;
  title: string;
  kind: "home" | "action";
  status: "active" | "pending_approval" | "approved";
  category: string;
  repeat_done: number;
  repeat_target: number;
  advances_goal: boolean;
};

export type DemoKid = {
  id: string;
  name: string;
  gender: "girl" | "boy";
  level: number;
  xp: number;
  pet: string;
  balance: number;
  goal: { title: string; price: number; path: string; method: string; target: number };
  tasks: DemoTask[];
  notes: string[];
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeDemo(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const kids: DemoKid[] = [
  {
    id: "noa",
    name: "נועה",
    gender: "girl",
    level: 4,
    xp: 340,
    pet: "מדוזה ורודה",
    balance: 27,
    goal: { title: "אופניים", price: 450, path: "צמיחה ויוזמה", method: "מסלולי אקשן", target: 6 },
    notes: ["נועה, אחרי הקהילה נשב על התקציב."],
    tasks: [
      { id: "n1", title: "פותחים את הראש!", kind: "action", status: "active", category: "למידה", repeat_done: 0, repeat_target: 1, advances_goal: true },
      { id: "n2", title: "אלופי התקציב!", kind: "action", status: "pending_approval", category: "בית", repeat_done: 0, repeat_target: 1, advances_goal: true },
      { id: "n3", title: "גיבורים למען הקהילה!", kind: "action", status: "approved", category: "נתינה", repeat_done: 1, repeat_target: 1, advances_goal: true },
      { id: "n4", title: "עושים מהלימון לימונדה!", kind: "action", status: "active", category: "יוזמה", repeat_done: 0, repeat_target: 2, advances_goal: true },
      { id: "n5", title: "להתראות אשפה!", kind: "home", status: "active", category: "בית", repeat_done: 2, repeat_target: 5, advances_goal: false },
    ],
  },
  {
    id: "itai",
    name: "איתי",
    gender: "boy",
    level: 2,
    xp: 160,
    pet: "עץ קטן",
    balance: 12,
    goal: { title: "לגו חלל", price: 280, path: "בית וקשרים", method: "כל משימה נחשבת", target: 4 },
    notes: ["איתי, החדר נספר הפעם."],
    tasks: [
      { id: "i1", title: "החדר טיפ-טופ!", kind: "home", status: "active", category: "בית", repeat_done: 0, repeat_target: 1, advances_goal: true },
      { id: "i2", title: "תולעי ספרים!", kind: "action", status: "pending_approval", category: "למידה", repeat_done: 0, repeat_target: 1, advances_goal: true },
      { id: "i3", title: "מושיטים יד!", kind: "action", status: "approved", category: "נתינה", repeat_done: 1, repeat_target: 1, advances_goal: true },
      { id: "i4", title: "כן שף!", kind: "home", status: "active", category: "בית", repeat_done: 0, repeat_target: 1, advances_goal: true },
    ],
  },
];

type Session = { view: "parent" | "child"; childId: string; chest: string | null };

let session: Session | null = null;
let rawCache = "";

function read() {
  if (typeof window === "undefined") return session;
  const raw = sessionStorage.getItem("mymojo-demo") ?? "";
  if (raw === rawCache) return session;
  rawCache = raw;
  if (!raw) return (session = null);
  try {
    session = JSON.parse(raw) as Session;
  } catch {
    session = null;
  }
  return session;
}

function write(next: Session | null) {
  session = next;
  rawCache = next ? JSON.stringify(next) : "";
  if (typeof window !== "undefined") {
    if (next) sessionStorage.setItem("mymojo-demo", rawCache);
    else sessionStorage.removeItem("mymojo-demo");
  }
  emit();
}

export function getDemo() {
  return read();
}

export function startDemo(view: "parent" | "child" = "parent", childId = "noa") {
  write({ view, childId, chest: null });
}

export function endDemo() {
  write(null);
}

export function setDemoView(view: "parent" | "child", childId?: string) {
  const current = read();
  if (!current) return;
  write({ ...current, view, childId: childId ?? current.childId });
}

export function demoKids() {
  return kids;
}

export function demoKid(id: string) {
  return kids.find((k) => k.id === id) ?? kids[0]!;
}

export function demoComplete(taskId: string) {
  for (const kid of kids) {
    const task = kid.tasks.find((t) => t.id === taskId);
    if (task && task.status === "active") task.status = "pending_approval";
  }
  emit();
}

export function demoDecide(taskId: string, approve: boolean) {
  for (const kid of kids) {
    const task = kid.tasks.find((t) => t.id === taskId);
    if (!task || task.status !== "pending_approval") continue;
    if (!approve) {
      task.status = "active";
      continue;
    }
    task.repeat_done += 1;
    task.status = task.repeat_done >= task.repeat_target ? "approved" : "active";
    kid.xp += 10;
    kid.level = Math.floor(kid.xp / 100) + 1;
    const earn = task.kind === "action" ? 5 : 2;
    kid.balance += earn;
    const current = read();
    if (current) write({ ...current, chest: task.title });
  }
  emit();
}

export function closeChest() {
  const current = read();
  if (current) write({ ...current, chest: null });
}
