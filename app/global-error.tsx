"use client";

/**
 * Last-resort error boundary.
 *
 * Rendered when the server throws outside a normal route failure — in
 * practice almost always because the database is unreachable (missing
 * DATABASE_URL, or the SQLite file lives on a filesystem that was wiped).
 *
 * Next renders this instead of the root <layout>, so it must emit its own
 * <html>/<body> and cannot rely on the stylesheet being present. Everything
 * below is therefore styled inline.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#f6f4ef",
          color: "#26221d",
          fontFeatureSettings: '"kern"',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <main
          style={{
            maxWidth: "46rem",
            width: "100%",
            background: "#fff",
            border: "1px solid #e4ddd1",
            borderRadius: "14px",
            padding: "clamp(24px, 5vw, 40px)",
            boxShadow: "0 1px 2px rgba(38,34,29,0.05)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.72rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#a1542a",
              fontWeight: 700,
            }}
          >
            Alyana Library
          </p>

          <h1
            style={{
              margin: "10px 0 0",
              fontSize: "clamp(1.5rem, 4vw, 2rem)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            We hit a problem loading the library
          </h1>

          <p style={{ margin: "16px 0 0", lineHeight: 1.65, color: "#5a5348" }}>
            The site is up, but it could not reach its database. If you are
            seeing this on a fresh deployment, the database file has not been
            created yet.
          </p>

          <div
            style={{
              marginTop: "22px",
              border: "1px solid #e4ddd1",
              borderRadius: "10px",
              background: "#faf8f4",
              padding: "18px 20px",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5a5348" }}>
              On Railway
            </p>
            <ol style={{ margin: "10px 0 0", paddingLeft: "20px", lineHeight: 1.7, color: "#5a5348" }}>
              <li>Service → Settings → Volume → add one, mount path <code style={code}>/data</code></li>
              <li>
                Service → Variables → add{" "}
                <code style={code}>DATABASE_URL=file:/data/library.db</code>
              </li>
              <li>Redeploy. The first boot creates and seeds the database.</li>
            </ol>
          </div>

          <div style={{ marginTop: "24px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                cursor: "pointer",
                border: "1px solid #26221d",
                background: "#26221d",
                color: "#fff",
                borderRadius: "999px",
                padding: "10px 20px",
                fontSize: "0.9rem",
                fontWeight: 600,
              }}
            >
              Try again
            </button>

            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                border: "1px solid #e4ddd1",
                background: "#fff",
                color: "#26221d",
                borderRadius: "999px",
                padding: "10px 20px",
                fontSize: "0.9rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Back to catalogue
            </a>
          </div>

          {error?.digest ? (
            <p style={{ marginTop: "22px", fontSize: "0.78rem", color: "#9a9184" }}>
              Reference: <code style={code}>{error.digest}</code>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}

const code: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: "0.86em",
  background: "#f0ebe1",
  border: "1px solid #e4ddd1",
  borderRadius: "5px",
  padding: "1px 6px",
  color: "#26221d",
};
