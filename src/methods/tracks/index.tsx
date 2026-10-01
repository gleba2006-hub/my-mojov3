import { z } from "zod";
import type { EducationMethod } from "../types";
import { makePlaceholderScreen } from "../placeholder-ui";

const configSchema = z.object({
  priceRangeId: z.string().optional(),
  trackId: z.string().optional(),
  maxRepeatsPerTask: z.number().int().min(1).max(3).default(3),
});

export const tracksMethod: EducationMethod = {
  id: "tracks",
  name: "מסלולי אקשן",
  tagline: "מסלול משימות לכל מתנה",
  description:
    "הורה בוחר טווח מחיר ומסלול אקשן. רק משימות אקשן מקדמות את המתנה; משימות בית נותנות נקודות ניסיון ושלבים.",
  configSchema,
  onTaskApproved: (ctx) => ({
    xp: ctx.taskXpValue,
    goalProgress: ctx.taskKind === "action" ? 1 : 0,
  }),
  ParentSetupScreen: makePlaceholderScreen("הגדרת מסלול אקשן — בשלב 3"),
  ParentDashboardWidget: makePlaceholderScreen("התקדמות במסלול — בשלב 3"),
  ChildProgressWidget: makePlaceholderScreen("המסלול שלי — בשלב 3"),
};
