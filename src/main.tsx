import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Anti-cheat: disable right-click context menu
document.addEventListener("contextmenu", (e) => e.preventDefault());

// Anti-cheat: disable copy shortcuts and F12/DevTools
document.addEventListener("keydown", (e) => {
  // Block F12
  if (e.key === "F12") { e.preventDefault(); return; }
  // Block Ctrl+Shift+I / Cmd+Option+I (DevTools)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "I") { e.preventDefault(); return; }
  // Block Ctrl+Shift+J / Cmd+Option+J (Console)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "J") { e.preventDefault(); return; }
  // Block Ctrl+U / Cmd+U (View Source)
  if ((e.ctrlKey || e.metaKey) && e.key === "u") { e.preventDefault(); return; }
  // Block Ctrl+C / Cmd+C (Copy)
  if ((e.ctrlKey || e.metaKey) && e.key === "c") { e.preventDefault(); return; }
  // Block Ctrl+S / Cmd+S (Save)
  if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); return; }
});

createRoot(document.getElementById("root")!).render(<App />);
