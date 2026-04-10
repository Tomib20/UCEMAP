import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyThemeToDOM } from "@/config/theme";

interface ThemeState {
  mode: "light" | "dark";
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "light",
      toggle: () =>
        set((s) => {
          const next = s.mode === "light" ? "dark" : "light";
          applyThemeToDOM(next);
          return { mode: next };
        }),
    }),
    {
      name: "ucema-map-theme",
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeToDOM(state.mode);
      },
    }
  )
);
