import { z } from "zod";
import type { EducationMethod } from "../types";
import { makePlaceholderScreen } from "../placeholder-ui";

const configSchema = z.object({
  priceRangeId: z.string().optional(),
  coinsPerTask: z.number().min(0).default(1),
});

export const classicMethod: EducationMethod = {
  id: "classic",
  name: "כל משימה נחשבת",
  tagline: "כל משימה מקרבת למטרה",
  description:
    "משימות בית ומשימות אקשן נמצאות באותו מסלול. כל משימה שהושלמה מקדמת את המטרה ונותנת נקודות ניסיון ומטבעות.",
  configSchema,
  onTaskApproved: (ctx) => ({
    xp: ctx.taskXpValue,
    goalProgress: 1,
  }),
  ParentSetupScreen: makePlaceholderScreen("הגדרת השיטה — בשלב 4"),
  ParentDashboardWidget: makePlaceholderScreen("התקדמות למטרה — בשלב 4"),
  ChildProgressWidget: makePlaceholderScreen("המטרה שלי — בשלב 4"),
};
