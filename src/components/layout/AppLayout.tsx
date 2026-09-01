import { useState, useEffect, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import type { Carrera } from "@/types/carrera";
import { Header } from "@/components/layout/Header";
import { MapPage } from "@/pages/MapPage";
import { RecuperarProgreso } from "@/components/ui/RecuperarProgreso";
import { useProgressStore } from "@/store/useProgressStore";
import { useUserStore } from "@/store/useUserStore";
import carrerasIndex from "../../../data/carreras/index.json";

const carreraLoaders = import.meta.glob("../../../data/carreras/*.json") as Record<
  string,
  () => Promise<{ default: Carrera }>
>;

async function loadCarrera(id: string): Promise<Carrera | null> {
  const entry = carrerasIndex.carreras.find((c) => c.id === id);
  if (!entry) return null;
  const key = `../../../data/carreras/${entry.archivo}`;
  const loader = carreraLoaders[key];
  if (!loader) return null;
  const mod = await loader();
  return (mod.default ?? mod) as unknown as Carrera;
}

export function AppLayout() {
  const { carreraId } = useParams<{ carreraId: string }>();
  const setCarreraStore = useProgressStore((s) => s.setCarrera);
  const [carrera, setCarreraData] = useState<Carrera | null>(null);
  const [invalidId, setInvalidId] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Titulo por carrera: cada URL indexada aparece con su nombre en Google.
  useEffect(() => {
    if (!carrera) return;
    document.title = `${carrera.nombre} - Correlatividades UCEMA | UCEMA Map`;
    return () => {
      document.title = "UCEMA Map - Mapa de Correlatividades";
    };
  }, [carrera]);

  // Beforeunload warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      // Solo si quedo un guardado en vuelo hacia Drive (debounce de 1,5s).
      if (useUserStore.getState().pendingSave) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Single source of truth: URL drives everything.
  // When carreraId in URL changes, sync store and load JSON.
  useEffect(() => {
    if (!carreraId) return;

    const exists = carrerasIndex.carreras.some((c) => c.id === carreraId);
    if (!exists) {
      setInvalidId(true);
      return;
    }

    setInvalidId(false);
    setCarreraData(null);
    useProgressStore.getState().selectMateria(null);
    setCarreraStore(carreraId);

    let cancelled = false;
    loadCarrera(carreraId).then((data) => {
      if (cancelled) return;
      if (data) setCarreraData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [carreraId, setCarreraStore]);

  if (invalidId) {
    const fallback = carrerasIndex.carreras[0]?.id ?? "ingenieria-informatica";
    return <Navigate to={`/carrera/${fallback}`} replace />;
  }

  if (!carrera) {
    return (
      <div className="h-screen flex items-center justify-center text-navy">
        Cargando...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header carrera={carrera} carreras={carrerasIndex.carreras} onSearchOpen={openSearch} />
      <MapPage key={carrera.id} carrera={carrera} searchOpen={searchOpen} onSearchClose={closeSearch} />
      <RecuperarProgreso />
    </div>
  );
}
