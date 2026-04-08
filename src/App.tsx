import { useState, useEffect, useCallback } from "react";
import type { Carrera } from "@/types/carrera";
import { Header } from "@/components/layout/Header";
import { MapPage } from "@/pages/MapPage";
import { useProgressStore } from "@/store/useProgressStore";
import { useUserStore } from "@/store/useUserStore";
import { initSyncWatcher } from "@/store/syncWatcher";
import carrerasIndex from "../data/carreras/index.json";

// Inicia el watcher de sincronizacion una sola vez (a nivel de modulo).
initSyncWatcher();

const carreraLoaders = import.meta.glob("../data/carreras/*.json") as Record<string, () => Promise<{ default: Carrera }>>;

async function loadCarrera(id: string): Promise<Carrera | null> {
  const entry = carrerasIndex.carreras.find((c) => c.id === id);
  if (!entry) return null;
  const key = `../data/carreras/${entry.archivo}`;
  const loader = carreraLoaders[key];
  if (!loader) return null;
  const mod = await loader();
  return (mod.default ?? mod) as unknown as Carrera;
}

export default function App() {
  const carreraId = useProgressStore((s) => s.carreraId);
  const setCarreraStore = useProgressStore((s) => s.setCarrera);
  const bootFromStorage = useUserStore((s) => s.bootFromStorage);
  const [carrera, setCarreraData] = useState<Carrera | null>(null);

  // Auto-login si hay un usuario en localStorage (corre una sola vez al boot).
  useEffect(() => {
    bootFromStorage();
  }, [bootFromStorage]);

  // Aviso si el usuario intenta cerrar la pestania con cambios sin guardar.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (useUserStore.getState().isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadCarrera(carreraId).then((data) => {
      if (cancelled) return;
      if (data) {
        setCarreraData(data);
      } else if (carrerasIndex.carreras.length > 0) {
        const fallback = carrerasIndex.carreras[0].id;
        setCarreraStore(fallback);
      }
    });
    return () => { cancelled = true; };
  }, [carreraId, setCarreraStore]);

  const onCarreraChange = useCallback(
    (id: string) => {
      setCarreraStore(id);
    },
    [setCarreraStore]
  );

  if (!carrera) {
    return (
      <div className="h-screen flex items-center justify-center text-navy">
        Cargando...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Header
        carrera={carrera}
        carreras={carrerasIndex.carreras}
        onCarreraChange={onCarreraChange}
      />
      <MapPage carrera={carrera} />
    </div>
  );
}
