import type { ComponentType } from "react";
import type { z } from "zod";

/**
 * Education methods are plugins. Core code must NEVER branch on a method id —
 * it only looks the method up in the registry and calls this interface.
 */

export type TaskKind = "home" | "action";

/** Context passed to a method when a parent approves a (sub)task. */
export interface TaskApprovedContext {
  childId: string;
  goalId: string | null;
  taskId: string;
  subTaskId: string | null;
  taskKind: TaskKind;
  taskXpValue: number;
  /** Per-goal settings the parent filled in (validated by configSchema). */
  config: Record<string, unknown>;
}

/** What a method wants the core to persist after an approval. */
export interface MethodEffects {
  /** XP to add to the child. */
  xp?: number;
  /** Progress to add to the active goal (same unit as the goal target). */
  goalProgress?: number;
  /** Pocket-money ledger entries to write. */
  ledger?: Array<{
    amount: number;
    type: "earn" | "deduct" | "payout";
    reason?: string;
  }>;
}

export interface MethodScreenProps {
  childId: string;
  goalId?: string;
  config: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
}

export interface EducationMethod {
  id: string;
  name: string;
  tagline: string;
  description: string;
  configSchema: z.ZodTypeAny;
  onTaskApproved: (ctx: TaskApprovedContext) => MethodEffects;
  ParentSetupScreen: ComponentType<MethodScreenProps>;
  ParentDashboardWidget: ComponentType<MethodScreenProps>;
  ChildProgressWidget: ComponentType<MethodScreenProps>;
}
