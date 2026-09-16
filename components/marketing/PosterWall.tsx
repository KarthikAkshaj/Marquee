import { posterWallRow } from "@/lib/poster-art";
import { cn } from "@/lib/utils";

type WallRow = {
  /** Rotates the gradient sequence so rows don't line up. */
  offset: number;
  /** A literal `animate-drift-*` class (plus an optional duration override). */
  drift: string;
};

type PosterWallProps = {
  rows: WallRow[];
  /** Position, spacing, blur and opacity of the whole wall. */
  className: string;
  /** Gap between tiles in a row. */
  rowClassName: string;
  /** Tile height and radius. */
  tileClassName: string;
};

/**
 * Blurred, slowly drifting "posters" made of gradients — atmosphere without
 * anyone's copyrighted art (SPEC §8.1). Drift stops for reduced motion.
 */
export function PosterWall({ rows, className, rowClassName, tileClassName }: PosterWallProps) {
  return (
    <div aria-hidden className={cn("absolute flex flex-col", className)}>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className={cn("flex", rowClassName, row.drift)}>
          {posterWallRow(row.offset).map((gradient, tileIndex) => (
            <div
              key={tileIndex}
              className={cn("flex-1", tileClassName)}
              style={{ background: gradient }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
