import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#0a0c0b",
    description:
      "Explainable AI evaluation and ERC-8183 settlement for agent coding work on X Layer.",
    display: "standalone",
    icons: [{ sizes: "any", src: "/mark.svg", type: "image/svg+xml" }],
    name: "ScopeSettle — Verified work. Automatic settlement.",
    short_name: "ScopeSettle",
    start_url: "/",
    theme_color: "#0a0c0b",
  };
}
