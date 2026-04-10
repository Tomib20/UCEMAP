import { useState, useEffect, useCallback } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import type { Carrera } from "@/types/carrera";
import { Header } from "@/components/layout/Header";
import { MapPage } from "@/pages/MapPage";
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
  const navigate = useNavigate();
  const storeCarreraId = useProgressStore((s) => s.carreraId);
  const setCarreraStore = useProgressStore((s) => s.setCarrera);
  const bootFromStorage = useUserStore((s) => s.bootFromStorage);
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

  // Auto-login si hay un usuario en localStorage (corre una sola vez al boot).
  useEffect(() => {
    bootFromStorage();
  }, [bootFromStorage]);

  // Aviso si el usuario intenta cerrar la pestaña con cambios sin guardar.
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

  // Si el store cambió de carrera (ej: login cargó otra carrera desde la nube),
  // sincronizar el cambio a la URL.
  useEffect(() => {
    if (storeCarreraId && storeCarreraId !== carreraId) {
      const exists = carrerasIndex.carreras.some((c) => c.id === storeCarreraId);
      if (exists) {
        navigate(`/carrera/${storeCarreraId}`, { replace: true });
      }
    }
  }, [storeCarreraId, carreraId, navigate]);

  // Sincronizar URL → store y cargar JSON de la carrera.
  useEffect(() => {
    if (!carreraId) return;

    // Validar que la carrera existe en el index
    const exists = carrerasIndex.carreras.some((c) => c.id === carreraId);
    if (!exists) {
      setInvalidId(true);
      return;
    }

    setInvalidId(false);
    // Solo actualizar store si realmente difiere (evita loop con store→URL sync)
    if (useProgressStore.getState().carreraId !== carreraId) {
      setCarreraStore(carreraId);
    }

    let cancelled = false;
    loadCarrera(carreraId).then((data) => {
      if (cancelled) return;
      if (data) setCarreraData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [carreraId, setCarreraStore]);

  // Redirigir si el carreraId de la URL no es válido
  if (invalidId) {
    const fallback = carrerasIndex.carreras[0]?.id ?? "ingenieria-informatica";
    return <Navigate to={`/carrera/${fallback}`} replace />;
  }

  if (!carrera || carrera.id !== carreraId) {
    return (
      <div className="h-screen flex items-center justify-center text-navy">
        Cargando...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Header carrera={carrera} carreras={carrerasIndex.carreras} onSearchOpen={openSearch} />
      <MapPage carrera={carrera} searchOpen={searchOpen} onSearchClose={closeSearch} />
    </div>
  );
}
