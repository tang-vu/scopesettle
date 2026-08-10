"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error("ScopeSettle root error", { digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          alignItems: "center",
          background: "#0a0c0b",
          color: "#f0eee6",
          display: "flex",
          fontFamily: "system-ui, sans-serif",
          justifyContent: "center",
          margin: 0,
          minHeight: "100vh",
          padding: 24,
        }}
      >
        <main style={{ maxWidth: 560 }}>
          <p style={{ color: "#b8ff5a", fontFamily: "monospace" }}>
            RECOVERY BOUNDARY
          </p>
          <h1>ScopeSettle could not render this request.</h1>
          <p style={{ color: "#a5aca2", lineHeight: 1.6 }}>
            No wallet transaction was initiated by this error. Retry once, then
            verify the configured network and service status before taking an
            onchain action.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#b8ff5a",
              border: 0,
              borderRadius: 4,
              color: "#0a0c0b",
              cursor: "pointer",
              fontWeight: 750,
              marginTop: 14,
              padding: "12px 18px",
            }}
            type="button"
          >
            Retry request
          </button>
        </main>
      </body>
    </html>
  );
}
