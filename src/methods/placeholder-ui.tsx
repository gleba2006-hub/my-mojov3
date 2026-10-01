import type { MethodScreenProps } from "./types";

/**
 * Stage 1 skeleton UI. Each method replaces these with real screens
 * in its own folder when the method is implemented.
 */
export function makePlaceholderScreen(label: string) {
  return function PlaceholderScreen(_props: MethodScreenProps) {
    return (
      <div className="surface-card p-4 text-sm text-muted-foreground">{label}</div>
    );
  };
}
