import { useState, useEffect, useCallback, useRef } from "react";
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

  // Auto-login. If login changes the carrera in the store, redirect to it.
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    bootFromStorage().then(() => {
      const storeId = useProgressStore.getState().carreraId;
      if (storeId && storeId !== carreraId) {
        const exists = carrerasIndex.carreras.some((c) => c.id === storeId);
        if (exists) {
          navigate(`/carrera/${storeId}`, { replace: true });
        }
      }
    });
  }, [bootFromStorage, carreraId, navigate]);

  // Beforeunload warning
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
    </div>
  );
}
