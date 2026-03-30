import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// BUG-09 FIX: Removed global anti-cheat from main.tsx
// Anti-cheat is now ONLY active during tournaments (Tournament.tsx)
// Global right-click and keyboard blocking was breaking normal site usability

createRoot(document.getElementById("root")!).render(<App />);
