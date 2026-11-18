import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./index.css";
class AppBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="app-error"><h1>PolyCompile could not open this workspace.</h1><p>Reload the page to retry the local editor. Your saved projects remain in this browser.</p><button onClick={() => location.reload()}>Reload workspace</button></main>;
    return this.props.children;
  }
}
function Loading() { return <main className="loading-shell"><div className="loading-mark">polycompile <i>pro</i></div><div className="loading-bar" /><p>Opening your workspace…</p></main>; }
createRoot(document.getElementById("root")!).render(<React.StrictMode><React.Suspense fallback={<Loading />}><AppBoundary><App /></AppBoundary></React.Suspense></React.StrictMode>);
