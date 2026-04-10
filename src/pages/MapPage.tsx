import type { Carrera } from "@/types/carrera";
import { GraphView } from "@/components/graph/GraphView";
import { MateriaDetail } from "@/components/ui/MateriaDetail";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SearchPalette } from "@/components/ui/SearchPalette";

interface MapPageProps {
  carrera: Carrera;
  searchOpen: boolean;
  onSearchClose: () => void;
}

export function MapPage({ carrera, searchOpen, onSearchClose }: MapPageProps) {
  return (
    <div className="flex-1 relative overflow-hidden">
      <GraphView carrera={carrera} />
      <ProgressBar carrera={carrera} />
      <MateriaDetail carrera={carrera} />
      <SearchPalette
        carrera={carrera}
        isOpen={searchOpen}
        onClose={onSearchClose}
      />
    </div>
  );
}
