import { SlotGameApp } from "./application/SlotGameApp.js";
import { GAME_CONFIG } from "./shared/config/gameConfig.js";
import { FxCanvas } from "./presentation/FxCanvas.js";
import { SlotMachineView } from "./presentation/SlotMachineView.js";

const view = new SlotMachineView(GAME_CONFIG);
const fx = new FxCanvas(document.getElementById("fx"), document.getElementById("wrap"));
const app = new SlotGameApp({
  config: GAME_CONFIG,
  view,
  fx,
});

app.init();
