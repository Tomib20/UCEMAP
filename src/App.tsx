import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Welcome } from "@/pages/Welcome";
import { Privacidad, Terminos } from "@/pages/Legal";
import { Diagnostico } from "@/pages/Diagnostico";
import { initSyncWatcher } from "@/store/syncWatcher";
import { useUserStore } from "@/store/useUserStore";
import { isSyncConfigured, precargarGoogle } from "@/lib/googleDrive";

// Inicia el watcher de sincronización una sola vez (a nivel de módulo).
initSyncWatcher();

// Si el usuario ya se logueó antes en este dispositivo, intentamos reconectar en
// silencio para que no tenga que apretar nada. Si Google no lo reconoce, no pasa
// nada: queda el botón "Continuar como ...".
void useUserStore.getState().restoreSession();

// El script de Google se baja apenas arranca la app, no al hacer click: si el
// click tiene que esperarlo, el navegador bloquea la ventana emergente y el
// login falla al instante.
if (isSyncConfigured()) precargarGoogle();

// Basura del sistema de cuentas anterior (usuario UCEMA + Google Sheets).
// Se limpia una sola vez para que no quede nada de aquel login dando vueltas.
try {
  localStorage.removeItem("ucema-map-usuario");
} catch {
  /* ignore */
}

/**
 * La raiz es siempre la bienvenida: es la puerta de entrada donde elegis carrera
 * o retomas tu sesion. Para ir directo a un mapa esta la URL /carrera/:id.
 */
const router = createBrowserRouter([
  {
    path: "/",
    element: <Welcome />,
  },
  {
    path: "/carrera/:carreraId",
    element: <AppLayout />,
  },
  {
    path: "/privacidad",
    element: <Privacidad />,
  },
  {
    path: "/terminos",
    element: <Terminos />,
  },
  {
    path: "/diagnostico",
    element: <Diagnostico />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
