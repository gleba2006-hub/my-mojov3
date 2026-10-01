import { useSyncExternalStore } from "react";
import { getDemo, subscribeDemo } from "@/lib/demo";

export function useDemo() {
  return useSyncExternalStore(subscribeDemo, getDemo, () => null);
}
