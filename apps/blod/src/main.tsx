import React, { Component, type ErrorInfo, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { applyBlodBrandCssVars } from "./brandColor";

applyBlodBrandCssVars();

class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Blod render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: "1.5rem",
            fontFamily: "system-ui, sans-serif",
            background: "#1a0a0c",
            color: "#f0e0e4",
            minHeight: "100vh",
            whiteSpace: "pre-wrap",
          }}
        >
          <h1 style={{ fontSize: "1.1rem", marginTop: 0 }}>Blod failed to render</h1>
          <p style={{ opacity: 0.85 }}>
            Open the browser devtools console (⌥⌘J / F12). Source:{" "}
            <code>apps/blod/src/</code> in the refrct monorepo.
          </p>
          <code style={{ fontSize: "0.75rem", display: "block", marginTop: "1rem" }}>
            {this.state.error.message}
          </code>
        </div>
      );
    }
    return this.props.children;
  }
}

function showFatalError(rootEl: HTMLElement, err: unknown) {
  const msg =
    err instanceof Error
      ? `${err.message}\n\n${err.stack ?? ""}`
      : String(err);
  rootEl.replaceChildren();
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "padding:1.5rem;font-family:system-ui,sans-serif;background:#1a0a0c;color:#f0e0e4;min-height:100vh";
  const h = document.createElement("h1");
  h.style.cssText = "font-size:1rem;margin:0 0 0.75rem";
  h.textContent = "Blod could not load (module error)";
  const p = document.createElement("p");
  p.style.cssText = "opacity:0.9;font-size:0.85rem;margin:0 0 1rem";
  p.textContent =
    "Use the Vite dev server: from the refrct repo root run npm run dev:blod, then open the http://localhost URL shown in the terminal (not a file:// path).";
  const pre = document.createElement("pre");
  pre.style.cssText =
    "font-size:0.72rem;overflow:auto;white-space:pre-wrap;word-break:break-word";
  pre.textContent = msg;
  wrap.append(h, p, pre);
  rootEl.append(wrap);
}

void (async () => {
  const rootEl = document.getElementById("root");
  if (!rootEl) {
    console.error("Missing #root — check apps/blod/index.html");
    return;
  }

  try {
    await import("./fontSetup");
    const { App } = await import("./App");
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <RootErrorBoundary>
          <App />
        </RootErrorBoundary>
      </React.StrictMode>,
    );
  } catch (err) {
    console.error("Blod bootstrap error:", err);
    showFatalError(rootEl, err);
  }
})();
