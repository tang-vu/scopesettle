import { ImageResponse } from "next/og";

export const alt = "ScopeSettle — Verified work. Automatic settlement.";
export const size = { height: 630, width: 1200 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#090b0a",
        color: "#f0eee6",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
        height: "100%",
        justifyContent: "space-between",
        padding: "64px 72px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          backgroundImage:
            "linear-gradient(#1d221e 1px, transparent 1px), linear-gradient(90deg, #1d221e 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          display: "flex",
          inset: 0,
          opacity: 0.42,
          position: "absolute",
        }}
      />
      <div style={{ alignItems: "center", display: "flex", gap: 18 }}>
        <div
          style={{
            alignItems: "center",
            border: "2px solid #b8ff5a",
            color: "#b8ff5a",
            display: "flex",
            fontSize: 30,
            fontWeight: 800,
            height: 58,
            justifyContent: "center",
            width: 58,
          }}
        >
          S
        </div>
        <span style={{ fontSize: 32, fontWeight: 750 }}>ScopeSettle</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <span
          style={{
            color: "#b8ff5a",
            fontFamily: "monospace",
            fontSize: 20,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          Scope → Evidence → Settlement
        </span>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 72,
            fontWeight: 760,
            letterSpacing: -3,
            lineHeight: 1.02,
          }}
        >
          <span>Verified work.</span>
          <span>Automatic settlement.</span>
        </div>
        <span style={{ color: "#9ca39a", fontSize: 25 }}>
          Explainable AI settlement for ERC-8183 agent jobs on X Layer.
        </span>
      </div>
      <div
        style={{
          borderTop: "1px solid #303630",
          color: "#9ca39a",
          display: "flex",
          fontFamily: "monospace",
          fontSize: 18,
          justifyContent: "space-between",
          paddingTop: 24,
        }}
      >
        <span>PUBLIC BETA</span>
        <span>ERC-8183 · X LAYER</span>
      </div>
    </div>,
    size,
  );
}
