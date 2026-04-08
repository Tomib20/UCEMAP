import { getColumnLabels } from "@/utils/layoutGraph";
import { NODE_WIDTH } from "@/config/theme";

export function YearLabels() {
  const labels = getColumnLabels();

  return (
    <>
      {labels.map((col) => (
        <div
          key={col.label}
          className="absolute top-0 text-center text-xs font-semibold text-navy/60 py-2 pointer-events-none"
          style={{
            left: col.x,
            width: NODE_WIDTH,
          }}
        >
          {col.label}
        </div>
      ))}
    </>
  );
}
