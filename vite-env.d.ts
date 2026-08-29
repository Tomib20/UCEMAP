/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OAuth Client ID de Google. Sin esta variable la app funciona 100% local (sin login). */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
