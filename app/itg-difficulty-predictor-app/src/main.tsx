import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
//import "@mantine/core/styles.css";

//import { MantineProvider } from "@mantine/core";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
