"use client";

import { useEffect } from "react";

export default function KcalsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Stale chunk after deployment — auto-reload to fetch fresh assets
    if (error.message?.includes("Failed to load chunk") || error.message?.includes("Loading chunk")) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div style={{ padding: 32, fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
      <h2 style={{ fontSize: 20, marginBottom: 12 }}>Something went wrong</h2>
      <pre style={{
        fontSize: 13,
        background: "#f5f5f5",
        padding: 12,
        borderRadius: 8,
        textAlign: "left",
        overflow: "auto",
        maxHeight: 200,
        marginBottom: 16,
      }}>
        {error.message}
      </pre>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: "10px 24px",
          fontSize: 16,
          borderRadius: 8,
          border: "none",
          background: "#222",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
