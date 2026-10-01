import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireMethod } from "@/methods/registry";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertParent(userId: string, familyId: string) {
  const db = await admin();
  const { data } = await db
    .from("family_members")
    .select("id")
    .eq("user_id", userId)
    .eq("family_id", familyId)
    .eq("role", "parent")
    .eq("approved", true)
    .maybeSingle();
  if (!data) throw new Error("אין הרשאה");
}

async function childOf(userId: string) {
  const db = await admin();
  const { data } = await db
    .from("child_profiles")
    .select("id, family_id, name, xp, level, gender")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("אין הרשאה");
  return data;
}

export const listRanges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const db = await admin();
    const { data: ranges } = await db
      .from("reward_price_ranges")
      .select("id, label, min_ils, max_ils, task_count, sort_order")
      .order("sort_order");
    const { data: paths } = await db
      .from("reward_paths")
      .select("id, range_id, path_index, name")
      .order("path_index");
    return { ranges: ranges ?? [], paths: paths ?? [] };
  });

export const createGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      childId: z.string().uuid(),
      title: z.string().trim().min(2).max(60),
      priceIls: z.number().positive().max(1_000_000),
      methodId: z.enum(["tracks", "classic", "pocket_money"]),
      pathIndex: z.number().int().min(1).max(3).default(1),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: child } = await db
      .from("child_profiles")
      .select("id, family_id")
      .eq("id", data.childId)
      .maybeSingle();
    if (!child) throw new Error("הילד לא נמצא");
    await assertParent(context.userId, child.family_id);

    const { data: ranges } = await db
      .from("reward_price_ranges")
      .select("id, label, min_ils, max_ils, task_count")
      .order("sort_order");
    const range = (ranges ?? []).find(
      (r) => data.priceIls >= Number(r.min_ils) && (r.max_ils == null || data.priceIls <= Number(r.max_ils)),
    );
    if (!range) throw new Error("לא נמצא טווח מחיר למתנה");

    const pocket = data.methodId === "pocket_money";
    const { data: path } = pocket
      ? { data: null }
      : await db
          .from("reward_paths")
          .select("id, name")
          .eq("range_id", range.id)
          .eq("path_index", data.pathIndex)
          .maybeSingle();
    if (!pocket && !path) throw new Error("המסלול לא נמצא");

    const { data: links } = pocket
      ? { data: [] }
      : await db.from("reward_path_tasks").select("task_id, sort_order").eq("path_id", path!.id).order("sort_order");
    const ids = (links ?? []).map((l) => l.task_id);
    const { data: catalog } = ids.length
      ? await db.from("reward_tasks").select("id, title, category, kind").in("id", ids)
      : { data: [] };

    const { data: goal, error } = await db
      .from("goals")
      .insert({
        child_id: child.id,
        title: data.title,
        price_ils: data.priceIls,
        method_id: data.methodId,
        status: "active",
        method_config: {
          rangeId: range.id,
          rangeLabel: range.label,
          pathId: path?.id ?? null,
          pathName: pocket ? "צנצנת" : path!.name,
          pathIndex: data.pathIndex,
          taskTarget: pocket ? 0 : range.task_count,
          completeBy: pocket ? "balance" : "tasks",
        },
      })
      .select("id")
      .single();
    if (error || !goal) throw new Error("לא הצלחנו ליצור את המטרה");

    const byId = new Map((catalog ?? []).map((t) => [t.id, t]));
    const rows = (links ?? [])
      .map((link) => byId.get(link.task_id))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .map((t) => ({
        family_id: child.family_id,
        child_id: child.id,
        goal_id: goal.id,
        kind: t.kind,
        title: t.title,
        category: t.category,
        xp_value: 10,
        status: "active" as const,
        created_by: context.userId,
        repeat_target: 1,
        advances_goal: data.methodId === "classic" || (data.methodId === "tracks" && t.kind === "action"),
      }));
    const { data: home } = await db.from("reward_tasks").select("id, title, category, kind").eq("kind", "home");
    const homeRows = (home ?? []).map((t) => ({
      family_id: child.family_id,
      child_id: child.id,
      goal_id: goal.id,
      kind: t.kind,
      title: t.title,
      category: t.category,
      xp_value: 10,
      status: "active" as const,
      created_by: context.userId,
      repeat_target: 1,
      advances_goal: data.methodId === "classic",
    }));
    const allRows = [...rows, ...homeRows];
    if (allRows.length) {
      const { data: inserted } = await db.from("tasks").insert(allRows).select("id, title");
      if (inserted?.length) {
        await db.from("sub_tasks").insert(
          inserted.map((t) => ({ task_id: t.id, title: t.title, needs_parent_approval: true })),
        );
      }
    }
    await db.from("goal_progress").insert({ goal_id: goal.id, value: 0, note: "פתיחה" });
    return { goalId: goal.id, pathName: path?.name ?? "צנצנת", taskCount: allRows.length };
  });

export const addCustomTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      goalId: z.string().uuid(),
      title: z.string().trim().min(2).max(60),
      kind: z.enum(["home", "action"]),
      repeats: z.number().int().min(1).max(3).default(1),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: goal } = await db
      .from("goals")
      .select("id, child_id, method_id")
      .eq("id", data.goalId)
      .maybeSingle();
    if (!goal) throw new Error("המטרה לא נמצאה");
    const { data: child } = await db
      .from("child_profiles")
      .select("family_id")
      .eq("id", goal.child_id)
      .single();
    await assertParent(context.userId, child!.family_id);
    const advances = goal.method_id === "classic" || (goal.method_id === "tracks" && data.kind === "action");
    const { data: task, error } = await db
      .from("tasks")
      .insert({
        family_id: child!.family_id,
        child_id: goal.child_id,
        goal_id: goal.id,
        title: data.title,
        kind: data.kind,
        category: "משימה של ההורה",
        repeat_target: data.repeats,
        advances_goal: advances,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error || !task) throw new Error("לא הצלחנו להוסיף משימה");
    await db.from("sub_tasks").insert({ task_id: task.id, title: data.title, needs_parent_approval: true });
    return { taskId: task.id };
  });

export const cancelGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ goalId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: goal } = await db.from("goals").select("id, child_id, status").eq("id", data.goalId).maybeSingle();
    if (!goal) throw new Error("המטרה לא נמצאה");
    if (goal.status !== "active") throw new Error("אפשר לבטל רק מטרה פעילה");
    const { data: child } = await db.from("child_profiles").select("family_id").eq("id", goal.child_id).maybeSingle();
    if (!child) throw new Error("הילד לא נמצא");
    await assertParent(context.userId, child.family_id);
    await db.from("goals").update({ status: "cancelled" }).eq("id", goal.id);
    await db.from("tasks").update({ status: "archived" }).eq("goal_id", goal.id).eq("status", "active");
    return { ok: true };
  });

export const setPet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ petId: z.string().min(1).max(20) }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const me = await childOf(context.userId);
    await db.from("child_profiles").update({ pet_id: data.petId }).eq("id", me.id);
    return { ok: true };
  });

export const setAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ avatarId: z.string().min(2).max(20) }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const me = await childOf(context.userId);
    await db.from("child_profiles").update({ avatar_id: data.avatarId }).eq("id", me.id);
    return { ok: true };
  });

export const requestShop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ title: z.string().min(2).max(40), cost: z.number().int().positive() }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: me } = await db.from("child_profiles").select("id, family_id, name, xp").eq("user_id", context.userId).maybeSingle();
    if (!me) throw new Error("רק ילד יכול לבקש מהחנות");
    if (Math.floor(me.xp / 10) < data.cost) throw new Error("אין מספיק מטבעות");
    await db.from("messages").insert({
      family_id: me.family_id,
      child_id: me.id,
      body: `בקשת חנות: ${data.title} · ${data.cost} מטבעות`,
      sender_user_id: context.userId,
    });
    return { ok: true };
  });

export const decideShop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ messageId: z.string().uuid(), approve: z.boolean() }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: message } = await db.from("messages").select("id, family_id, body").eq("id", data.messageId).maybeSingle();
    if (!message) throw new Error("הבקשה לא נמצאה");
    await assertParent(context.userId, message.family_id);
    await db.from("messages").update({ body: `${data.approve ? "אושר" : "נדחה"}: ${message.body}` }).eq("id", message.id);
    if (data.approve) {
      const cost = Number(message.body.match(/(\d+)/)?.[1] ?? 0);
      const childId = (await db.from("messages").select("child_id").eq("id", message.id).maybeSingle()).data?.child_id;
      if (childId && cost > 0) {
        const { data: wallet } = await db.from("coin_wallets").select("balance").eq("child_id", childId).maybeSingle();
        const next = Math.max(0, Number(wallet?.balance ?? 0) - cost);
        await db.from("coin_wallets").upsert({ child_id: childId, balance: next });
        await db.from("coin_ledger").insert({ child_id: childId, amount: -cost, reason: message.body });
      }
    }
    return { ok: true };
  });

export const requestPrize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ goalId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: me } = await db.from("child_profiles").select("id, family_id, name").eq("user_id", context.userId).maybeSingle();
    if (!me) throw new Error("רק ילד יכול לבקש את המתנה");
    const { data: goal } = await db.from("goals").select("id, child_id, status, title, method_config").eq("id", data.goalId).maybeSingle();
    if (!goal || goal.child_id !== me.id) throw new Error("המתנה לא שלך");
    if (goal.status !== "completed") throw new Error("המתנה עוד לא הושגה");
    const config = { ...(goal.method_config as Record<string, unknown>), requested: true };
    await db.from("goals").update({ method_config: config }).eq("id", goal.id);
    await db.from("messages").insert({
      family_id: me.family_id,
      child_id: me.id,
      body: `${me.name} מבקש/ת את ${goal.title}`,
      sender_user_id: context.userId,
    });
    return { ok: true };
  });

export const deliverGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ goalId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: goal } = await db.from("goals").select("id, child_id, status, method_config").eq("id", data.goalId).maybeSingle();
    if (!goal) throw new Error("המטרה לא נמצאה");
    const { data: child } = await db.from("child_profiles").select("family_id").eq("id", goal.child_id).maybeSingle();
    if (!child) throw new Error("הילד לא נמצא");
    await assertParent(context.userId, child.family_id);
    if (goal.status !== "completed") throw new Error("המתנה עוד לא הושגה");
    const config = { ...(goal.method_config as Record<string, unknown>), delivered: true };
    await db.from("goals").update({ method_config: config }).eq("id", goal.id);
    return { ok: true };
  });

export const setRepeats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ taskId: z.string().uuid(), repeats: z.number().int().min(1).max(3) }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: task } = await db.from("tasks").select("id, family_id").eq("id", data.taskId).maybeSingle();
    if (!task) throw new Error("המשימה לא נמצאה");
    await assertParent(context.userId, task.family_id);
    await db.from("tasks").update({ repeat_target: data.repeats }).eq("id", task.id);
    return { ok: true };
  });

export const getBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ childId: z.string().uuid().optional() }).optional())
  .handler(async ({ data, context }) => {
    const db = await admin();
    let childId = data?.childId;
    if (!childId) childId = (await childOf(context.userId)).id;
    const { data: child } = await db
      .from("child_profiles")
      .select("id, family_id, name, xp, level, gender, user_id, avatar_id, pet_id")
      .eq("id", childId)
      .maybeSingle();
    if (!child) throw new Error("הילד לא נמצא");
    const isSelf = child.user_id === context.userId;
    if (!isSelf) await assertParent(context.userId, child.family_id);

    const [{ data: goals }, { data: tasks }, { data: allowance }, { data: ledger }, { data: messages }, { data: wallet }, { data: streak }] =
      await Promise.all([
        db.from("goals").select("id, title, price_ils, method_id, method_config, status").eq("child_id", child.id).order("created_at", { ascending: false }),
        db.from("tasks").select("id, title, kind, status, category, xp_value, repeat_target, repeat_done, advances_goal, goal_id").eq("child_id", child.id).order("created_at"),
        db.from("child_allowances").select("period, base_amount, payout_day, home_amount, action_amount").eq("child_id", child.id).maybeSingle(),
        db.from("money_ledger").select("amount, type, reason, created_at").eq("child_id", child.id).order("created_at", { ascending: false }).limit(12),
        db.from("messages").select("id, body, created_at").eq("child_id", child.id).order("created_at", { ascending: false }).limit(8),
        db.from("coin_wallets").select("balance").eq("child_id", child.id).maybeSingle(),
        db.from("streaks").select("current_count, best_count").eq("child_id", child.id).maybeSingle(),
      ]);
    const balance = (ledger ?? []).reduce((sum, row) => {
      const n = Number(row.amount);
      if (row.type === "payout" || row.type === "deduct") return sum - n;
      return sum + n;
    }, 0);
    return { child, goals: goals ?? [], tasks: tasks ?? [], allowance, ledger: ledger ?? [], messages: messages ?? [], balance, coins: wallet?.balance ?? 0, streak: streak?.current_count ?? 0 };
  });

export const completeTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ taskId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const me = await childOf(context.userId);
    const { data: task } = await db.from("tasks").select("id, child_id, status").eq("id", data.taskId).maybeSingle();
    if (!task || task.child_id !== me.id) throw new Error("אין הרשאה");
    if (task.status !== "active") throw new Error("המשימה לא פתוחה");
    await db.from("tasks").update({ status: "pending_approval" }).eq("id", task.id);
    await db.from("sub_tasks").update({ completed_at: new Date().toISOString() }).eq("task_id", task.id).is("approved_at", null);
    return { ok: true };
  });

export const approveTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ taskId: z.string().uuid(), approve: z.boolean() }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: task } = await db
      .from("tasks")
      .select("id, family_id, child_id, goal_id, kind, status, xp_value, repeat_target, repeat_done, advances_goal, title")
      .eq("id", data.taskId)
      .maybeSingle();
    if (!task) throw new Error("המשימה לא נמצאה");
    await assertParent(context.userId, task.family_id);
    if (task.status !== "pending_approval") throw new Error("אין מה לאשר");

    if (!data.approve) {
      await db.from("tasks").update({ status: "active" }).eq("id", task.id);
      await db.from("sub_tasks").update({ completed_at: null }).eq("task_id", task.id).is("approved_at", null);
      return { ok: true };
    }

    await db.from("sub_tasks").update({ approved_at: new Date().toISOString(), approved_by: context.userId }).eq("task_id", task.id).is("approved_at", null);
    const done = task.repeat_done + 1;
    const finished = done >= task.repeat_target;
    await db.from("tasks").update({ repeat_done: done, status: finished ? "approved" : "active" }).eq("id", task.id);
    if (!finished) {
      await db.from("sub_tasks").insert({ task_id: task.id, title: task.title, needs_parent_approval: true });
    }

    let goalProgress = 0;
    if (task.goal_id && task.advances_goal) {
      const { data: goal } = await db.from("goals").select("id, method_id, method_config, status").eq("id", task.goal_id).maybeSingle();
      if (goal && goal.status === "active") {
        const method = requireMethod(goal.method_id);
        const effects = method.onTaskApproved({
          childId: task.child_id!,
          goalId: goal.id,
          taskId: task.id,
          subTaskId: null,
          taskKind: task.kind,
          taskXpValue: task.xp_value,
          config: (goal.method_config ?? {}) as Record<string, unknown>,
        });
        goalProgress = effects.goalProgress ?? 0;
        if (goalProgress > 0) {
          await db.from("goal_progress").insert({ goal_id: goal.id, value: goalProgress, note: task.title });
          const { data: rows } = await db.from("goal_progress").select("value").eq("goal_id", goal.id);
          const total = (rows ?? []).reduce((s, r) => s + Number(r.value), 0);
          const target = Number((goal.method_config as { taskTarget?: number } | null)?.taskTarget ?? 0);
          if (target > 0 && total >= target) {
            await db.from("goals").update({ status: "completed" }).eq("id", goal.id);
          }
        }
      }
    }

    const { data: allowance } = await db.from("child_allowances").select("home_amount, action_amount").eq("child_id", task.child_id!).maybeSingle();
    if (allowance && task.child_id) {
      const amount = Number(task.kind === "action" ? allowance.action_amount : allowance.home_amount);
      if (amount > 0) {
        await db.from("money_ledger").insert({
          child_id: task.child_id,
          goal_id: task.goal_id,
          amount,
          type: "earn",
          reason: task.title,
          created_by: context.userId,
        });
      }
    }
    if (task.goal_id) {
      const { data: goal } = await db.from("goals").select("id, method_id, price_ils, status").eq("id", task.goal_id).maybeSingle();
      if (goal?.method_id === "pocket_money" && goal.status === "active") {
        const { data: ledger } = await db.from("money_ledger").select("amount, type").eq("child_id", task.child_id!);
        const balance = (ledger ?? []).reduce((sum, row) => sum + (row.type === "earn" ? Number(row.amount) : -Number(row.amount)), 0);
        if (balance >= Number(goal.price_ils ?? 0)) {
          await db.from("goals").update({ status: "completed" }).eq("id", goal.id);
        }
      }
    }
    if (task.child_id) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: streak } = await db.from("streaks").select("current_count, best_count, last_active_date").eq("child_id", task.child_id).maybeSingle();
      const last = streak?.last_active_date;
      const current = last === today ? Number(streak?.current_count ?? 1) : Number(streak?.current_count ?? 0) + 1;
      await db.from("streaks").upsert({
        child_id: task.child_id,
        current_count: current,
        best_count: Math.max(current, Number(streak?.best_count ?? 0)),
        last_active_date: today,
      });
      const { data: wallet } = await db.from("coin_wallets").select("balance").eq("child_id", task.child_id).maybeSingle();
      const next = Number(wallet?.balance ?? 0) + 1;
      await db.from("coin_wallets").upsert({ child_id: task.child_id, balance: next });
      await db.from("coin_ledger").insert({ child_id: task.child_id, amount: 1, reason: task.title });
    }
    return { ok: true, goalProgress };
  });

export const saveAllowance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      childId: z.string().uuid(),
      period: z.enum(["weekly", "monthly"]),
      baseAmount: z.number().min(0).max(10000),
      payoutDay: z.number().int().min(1).max(31),
      homeAmount: z.number().min(0).max(1000),
      actionAmount: z.number().min(0).max(1000),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: child } = await db.from("child_profiles").select("family_id").eq("id", data.childId).maybeSingle();
    if (!child) throw new Error("הילד לא נמצא");
    await assertParent(context.userId, child.family_id);
    await db.from("child_allowances").upsert({
      child_id: data.childId,
      period: data.period,
      base_amount: data.baseAmount,
      payout_day: data.payoutDay,
      home_amount: data.homeAmount,
      action_amount: data.actionAmount,
    });
    return { ok: true };
  });

export const markPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ childId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: child } = await db.from("child_profiles").select("family_id").eq("id", data.childId).maybeSingle();
    if (!child) throw new Error("הילד לא נמצא");
    await assertParent(context.userId, child.family_id);
    const { data: ledger } = await db.from("money_ledger").select("amount, type").eq("child_id", data.childId);
    const balance = (ledger ?? []).reduce((sum, row) => {
      const n = Number(row.amount);
      return row.type === "earn" ? sum + n : sum - n;
    }, 0);
    if (balance <= 0) throw new Error("אין יתרה לתשלום");
    await db.from("money_ledger").insert({
      child_id: data.childId,
      amount: balance,
      type: "payout",
      reason: "שולם על ידי ההורה",
      created_by: context.userId,
    });
    return { paid: balance };
  });

export const sendNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ childId: z.string().uuid(), body: z.string().trim().min(1).max(280) }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: child } = await db.from("child_profiles").select("family_id").eq("id", data.childId).maybeSingle();
    if (!child) throw new Error("הילד לא נמצא");
    await assertParent(context.userId, child.family_id);
    await db.from("messages").insert({ family_id: child.family_id, child_id: data.childId, body: data.body, sender_user_id: context.userId });
    return { ok: true };
  });

export const adminSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data: role } = await db.from("user_roles").select("id").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("אין הרשאה");
    const [families, children, goals, methods, tasks] = await Promise.all([
      db.from("families").select("id", { count: "exact", head: true }),
      db.from("child_profiles").select("id", { count: "exact", head: true }),
      db.from("goals").select("id", { count: "exact", head: true }),
      db.from("education_methods").select("id, name, enabled, tagline").order("sort_order"),
      db.from("reward_tasks").select("id", { count: "exact", head: true }),
    ]);
    return {
      families: families.count ?? 0,
      children: children.count ?? 0,
      goals: goals.count ?? 0,
      catalog: tasks.count ?? 0,
      methods: methods.data ?? [],
    };
  });

export const setMethodEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().min(2).max(40), enabled: z.boolean() }))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: role } = await db.from("user_roles").select("id").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("אין הרשאה");
    await db.from("education_methods").update({ enabled: data.enabled }).eq("id", data.id);
    return { ok: true };
  });
