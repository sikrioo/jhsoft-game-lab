import { getElements } from "./dom.js";
import { createRadarApp } from "./radar-app.js";

const radarApp = createRadarApp(getElements());

radarApp.init().catch((error) => {
  console.error("Failed to initialize radar app.", error);
});
