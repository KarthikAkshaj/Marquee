import type { ReactNode } from "react";

/**
 * Every page change fades in (SPEC §9.6). Opacity only: a transform here would
 * unpin the pages' fixed ambient light while it plays. Grid items add their own
 * 8px rise (`rise()` in lib/motion.ts).
 */
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 animate-page-in flex-col">{children}</div>;
}
