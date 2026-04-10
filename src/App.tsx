import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useProgressStore } from "@/store/useProgressStore";
import { initSyncWatcher } from "@/store/syncWatcher";

// Inicia el watcher de sincronización una sola vez (a nivel de módulo).
initSyncWatcher();

function DefaultRedirect() {
  const carreraId = useProgressStore((s) => s.carreraId);
  return <Navigate to={`/carrera/${carreraId}`} replace />;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <DefaultRedirect />,
  },
  {
    path: "/carrera/:carreraId",
    element: <AppLayout />,
  },
  {
    path: "*",
    element: <DefaultRedirect />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
