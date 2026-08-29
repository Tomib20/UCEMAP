import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useProgressStore } from "@/store/useProgressStore";
import { Welcome } from "@/pages/Welcome";
import { initSyncWatcher } from "@/store/syncWatcher";

// Inicia el watcher de sincronización una sola vez (a nivel de módulo).
initSyncWatcher();

/** Hay sesion iniciada? (la clave la escribe useUserStore al loguear). */
function estaLogueado(): boolean {
  try {
    return !!localStorage.getItem("ucema-map-usuario");
  } catch {
    return false;
  }
}

/**
 * Raiz: mostramos la bienvenida mientras no haya sesion, asi cada visita elige
 * su carrera en vez de caer siempre en Ingenieria en Informatica. Con sesion
 * iniciada se entra derecho a la ultima carrera del usuario.
 */
function DefaultRoute() {
  const carreraId = useProgressStore((s) => s.carreraId);
  if (estaLogueado()) {
    return <Navigate to={`/carrera/${carreraId}`} replace />;
  }
  return <Welcome />;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <DefaultRoute />,
  },
  {
    path: "/carrera/:carreraId",
    element: <AppLayout />,
  },
  {
    path: "*",
    element: <DefaultRoute />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
