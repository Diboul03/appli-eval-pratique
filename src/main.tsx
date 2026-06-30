import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { DialogProvider } from "./components/Dialogs";
import { initPortableStorage } from "./lib/portableStorage";

initPortableStorage().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <DialogProvider>
        <App />
      </DialogProvider>
    </StrictMode>
  );
});
