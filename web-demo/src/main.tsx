import { createRoot } from "react-dom/client";
import Home from "./App";

document.documentElement.dataset.distribution = "portable";

const container = document.getElementById("root");

if (!container) {
  throw new Error("TMA demonstrator root element was not found.");
}

createRoot(container).render(<Home />);
