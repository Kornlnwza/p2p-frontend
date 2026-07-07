import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css"; // 👈 สำคัญมาก! ต้องมีบรรทัดนี้ เพื่อดึง Tailwind มาใช้

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
