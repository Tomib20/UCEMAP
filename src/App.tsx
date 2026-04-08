import { useState, useEffect } from "react";
import type { Carrera } from "@/types/carrera";
import { Header } from "@/components/layout/Header";
import { MapPage } from "@/pages/MapPage";
import carreraData from "../data/carreras/ingenieria-informatica.json";

export default function App() {
  const [carrera, setCarrera] = useState<Carrera | null>(null);

  useEffect(() => {
    setCarrera(carreraData as unknown as Carrera);
  }, []);

  if (!carrera) {
    return (
      <div className="h-screen flex items-center justify-center text-navy">
        Cargando...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Header carrera={carrera} />
      <MapPage carrera={carrera} />
    </div>
  );
}
