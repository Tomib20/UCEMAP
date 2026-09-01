import { useState } from "react";
import { GRUPO_COLORS, CHAIN_COLORS, STATUS_STYLES, SURFACE } from "@/config/theme";
import { useThemeStore } from "@/store/useThemeStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { SocialLinks } from "@/components/ui/SocialLinks";

export function Legend() {
  const mode = useThemeStore((s) => s.mode);
  const isMobile = useIsMobile();
  const surface = SURFACE[mode];
  const grupos = GRUPO_COLORS[mode];
  const aprobadaStyle = STATUS_STYLES[mode].aprobada;
  const cursandoStyle = STATUS_STYLES[mode].cursando;
  const [expanded, setExpanded] = useState(!isMobile);

  const panelBg = mode === "dark" ? "rgba(30,41,59,0.92)" : "rgba(255,255,255,0.95)";

  /* ── Collapsed pill (mobile only) ── */
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`fixed ${isMobile ? "top-24 right-2" : "bottom-4 left-4"} backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md z-10 text-[11px] font-semibold`}
        style={{
          backgroundColor: panelBg,
          border: `1px solid ${surface.panelBorder}`,
          color: surface.textSecondary,
        }}
      >
        Leyenda
      </button>
    );
  }

  return (
    <div
      className={`fixed ${isMobile ? "top-24 right-2" : "bottom-4 left-4"} backdrop-blur-sm rounded-lg p-3 shadow-md z-10`}
      style={{
        backgroundColor: panelBg,
        border: `1px solid ${surface.panelBorder}`,
      }}
    >
      {/* Close button on mobile */}
      {isMobile && (
        <button
          onClick={() => setExpanded(false)}
          className="absolute top-1.5 right-2 text-sm leading-none hover:opacity-70"
          style={{ color: surface.textSecondary }}
        >
          &times;
        </button>
      )}

      <div className="text-[11px] font-bold mb-2" style={{ color: surface.textPrimary }}>
        Tipo de materia
      </div>
      <div className="flex flex-col gap-1.5">
        {Object.entries(grupos).map(([key, colors]) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className="w-5 h-3.5 rounded"
              style={{ backgroundColor: colors.bg, border: `1.5px solid ${colors.border}` }}
            />
            <span className="text-[11px]" style={{ color: surface.textSecondary }}>
              {colors.label}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-3.5 rounded"
            style={{ backgroundColor: cursandoStyle.bg, border: `1.5px solid ${cursandoStyle.border}` }}
          />
          <span className="text-[11px]" style={{ color: surface.textSecondary }}>Cursando</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-3.5 rounded"
            style={{ backgroundColor: aprobadaStyle.bg, border: `1.5px solid ${aprobadaStyle.border}` }}
          />
          <span className="text-[11px]" style={{ color: surface.textSecondary }}>Aprobada</span>
        </div>
      </div>

      <div className="my-2" style={{ borderTop: `1px solid ${surface.panelBorder}` }} />

      <div className="text-[11px] font-bold mb-2" style={{ color: surface.textPrimary }}>
        Al seleccionar
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-3.5 rounded"
            style={{ border: `2px solid ${CHAIN_COLORS.selected.border}`, backgroundColor: "transparent" }}
          />
          <span className="text-[11px]" style={{ color: surface.textSecondary }}>Seleccionada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-0.5 rounded" style={{ backgroundColor: CHAIN_COLORS.edgeAncestor }} />
          <span className="text-[11px]" style={{ color: surface.textSecondary }}>Prerequisitos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-0.5 rounded" style={{ backgroundColor: CHAIN_COLORS.edgeDescendant }} />
          <span className="text-[11px]" style={{ color: surface.textSecondary }}>Habilita (directa)</span>
        </div>
      </div>

      {/* Redes del autor: van dentro del panel para no dejar dos bloques de
          distinto ancho apilados. En mobile viven en la barra de chips. */}
      {!isMobile && <SocialLinks variant="map" />}
    </div>
  );
}
