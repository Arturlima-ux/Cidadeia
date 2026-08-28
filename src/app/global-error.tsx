"use client";

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
            padding: "1rem",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              A aplicação encontrou um erro grave
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1rem" }}>
              Tente recarregar a página.
            </p>
            <button
              onClick={() => unstable_retry()}
              style={{
                background: "#0e8f6f",
                color: "white",
                fontWeight: 600,
                fontSize: "0.875rem",
                borderRadius: "999px",
                padding: "0.5rem 1rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              Tentar de novo
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
