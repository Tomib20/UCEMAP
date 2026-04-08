import type { Carrera } from "@/types/carrera";
import { GraphView } from "@/components/graph/GraphView";
import { MateriaDetail } from "@/components/ui/MateriaDetail";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface MapPageProps {
  carrera: Carrera;
}

export function MapPage({ carrera }: MapPageProps) {
  return (
    <div className="flex-1 relative overflow-hidden">
      <GraphView carrera={carrera} />
      <ProgressBar carrera={carrera} />
      <MateriaDetail carrera={carrera} />
    </div>
  );
}
