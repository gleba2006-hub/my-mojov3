import { z } from "zod";
import type { EducationMethod } from "../types";
import { makePlaceholderScreen } from "../placeholder-ui";

const configSchema = z.object({
  baseAmountIls: z.number().min(0).default(0),
  period: z.enum(["weekly", "monthly"]).default("weekly"),
  payoutDay: z.number().int().min(1).max(31).default(1),
  amountPerHomeTask: z.number().min(0).default(1),
  amountPerActionTask: z.number().min(0).default(3),
});

export const pocketMoneyMethod: EducationMethod = {
  id: "pocket_money",
  name: "דמי כיס",
  tagline: "חיסכון אמיתי בשקלים",
  description:
    "סכום בסיס שבועי או חודשי, זיכוי לכל משימה מאושרת, מעקב יתרה בצנצנת וכפתור תשלום להורה.",
  configSchema,
  onTaskApproved: (ctx) => {
    const config = configSchema.partial().parse(ctx.config ?? {});
    const amount =
      ctx.taskKind === "action"
        ? (config.amountPerActionTask ?? 3)
        : (config.amountPerHomeTask ?? 1);
    return {
      xp: ctx.taskXpValue,
      ledger: amount > 0 ? [{ amount, type: "earn", reason: "משימה מאושרת" }] : [],
    };
  },
  ParentSetupScreen: makePlaceholderScreen("הגדרת דמי כיס — בשלב 5"),
  ParentDashboardWidget: makePlaceholderScreen("יתרה ותשלום — בשלב 5"),
  ChildProgressWidget: makePlaceholderScreen("הצנצנת שלי — בשלב 5"),
};
