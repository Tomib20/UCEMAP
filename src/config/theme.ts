import type { MateriaGrupo, MateriaStatus } from "@/types/carrera";

export const BRANDING = {
  name: "UCEMA Map",
  university: "Universidad del CEMA",
  subtitle: "Mapa de Correlatividades",
};

interface GrupoColor {
  bg: string;
  border: string;
  text: string;
  label: string;
}

export const GRUPO_COLORS: Record<"light" | "dark", Record<MateriaGrupo, GrupoColor>> = {
  light: {
    obligatoria: { bg: "#bfdbfe", border: "#2563eb", text: "#1e3a5f", label: "Obligatoria" },
    topico: { bg: "#fde68a", border: "#b45309", text: "#78350f", label: "Topico (Electiva)" },
    tesis: { bg: "#ddd6fe", border: "#6d28d9", text: "#4c1d95", label: "Tesis / Proyecto Final" },
    requisito: { bg: "#e2e8f0", border: "#64748b", text: "#334155", label: "Requisito" },
    taller: { bg: "#fce7f3", border: "#db2777", text: "#831843", label: "Taller" },
  },
  dark: {
    obligatoria: { bg: "#2d4a7a", border: "#60a5fa", text: "#dbeafe", label: "Obligatoria" },
    topico: { bg: "#451a03", border: "#fbbf24", text: "#fef9c3", label: "Topico (Electiva)" },
    tesis: { bg: "#2e1065", border: "#a78bfa", text: "#ede9fe", label: "Tesis / Proyecto Final" },
    requisito: { bg: "#1e293b", border: "#94a3b8", text: "#e2e8f0", label: "Requisito" },
    taller: { bg: "#4a1942", border: "#f472b6", text: "#fce7f3", label: "Taller" },
  },
};

interface StatusStyle {
  bg: string;
  border: string;
  textOverride: string;
}

export const STATUS_STYLES: Record<"light" | "dark", Record<MateriaStatus, StatusStyle>> = {
  light: {
    aprobada: { bg: "#86efac", border: "#16a34a", textOverride: "#14532d" },
    cursando: { bg: "#fef08a", border: "#ca8a04", textOverride: "#713f12" },
    disponible: { bg: "", border: "", textOverride: "" },
    bloqueada: { bg: "", border: "", textOverride: "" },
  },
  dark: {
    aprobada: { bg: "#14532d", border: "#4ade80", textOverride: "#bbf7d0" },
    cursando: { bg: "#713f12", border: "#facc15", textOverride: "#fef9c3" },
    disponible: { bg: "", border: "", textOverride: "" },
    bloqueada: { bg: "", border: "", textOverride: "" },
  },
};

export const CHAIN_COLORS = {
  selected: { border: "#0ea5e9", glow: "rgba(14,165,233,0.35)" },
  ancestor: { border: "#f59e0b", glow: "rgba(245,158,11,0.2)" },
  descendant: { border: "#8b5cf6", glow: "rgba(139,92,246,0.2)" },
  edgeAncestor: "#f59e0b",
  edgeDescendant: "#8b5cf6",
};

export const EDGE_COLORS = {
  light: { default: "#cbd5e1", dimmed: "#f1f5f9" },
  dark: { default: "#475569", dimmed: "#1e293b" },
};

export const SURFACE = {
  light: { bg: "#f8fafc", panel: "#ffffff", panelBorder: "#e2e8f0", textPrimary: "#1a2744", textSecondary: "#64748b", dots: "#e2e8f0" },
  dark: { bg: "#0f172a", panel: "#1e293b", panelBorder: "#334155", textPrimary: "#e2e8f0", textSecondary: "#94a3b8", dots: "#334155" },
};

/**
 * CSS variable references for use in inline styles.
 * These read from :root / :root[data-theme="dark"] defined in index.css.
 * Use these instead of `mode === "dark" ? X : Y` for surface colors.
 */
export const cssVar = {
  bg: "var(--surface-bg)",
  panel: "var(--surface-panel)",
  panelBorder: "var(--surface-panel-border)",
  textPrimary: "var(--surface-text-primary)",
  textSecondary: "var(--surface-text-secondary)",
  dots: "var(--surface-dots)",
  panelBlur: "var(--surface-panel-blur)",
  separator: "var(--surface-separator)",
  edgeDefault: "var(--edge-default)",
  edgeDimmed: "var(--edge-dimmed)",
};

/** Apply data-theme attribute to document root. Call when theme changes. */
export function applyThemeToDOM(mode: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", mode);
}

export const COLUMN_WIDTH = 220;
export const ROW_HEIGHT = 90;
export const NODE_WIDTH = 190;
export const NODE_HEIGHT = 60;
