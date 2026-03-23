import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./index.css";
import { initTestMode } from "./lib/testMode.js";

// Persist test mode flag before React mounts — survives SPA navigations
initTestMode();

const root = document.getElementById("root");

if (!root) {
	throw new Error("Root element not found");
}

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
