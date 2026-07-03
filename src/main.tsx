/**
 * main.tsx — Entry point for the standalone client.
 *
 * Thin: mounts <App /> only. All SSE / state / actions live in useController.
 */

import { createRoot } from "react-dom/client";
import App from "./App";

const rootEl = document.getElementById("root");
if (rootEl) createRoot(rootEl).render(<App />);
