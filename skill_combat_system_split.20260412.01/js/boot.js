import { chooseLevelUpSkill, initCombatSystem, startBattle, nextWave, resetBattle, toggleSpeed } from './systems/combat-system.js';
import { loadStarterQueue, syncBuildMana } from './systems/selection-system.js';
import { initUI, log, renderAllSlots, renderBuildMana, renderEffects, renderEnemyBars, renderEquipment, renderInventory, renderPlayerBars, renderPlayerMeta, renderQueueStatus, renderScore, renderSidePanels, renderWaveStatus } from './ui/app-ui.js';

function refreshPanels() {
  renderPlayerMeta();
  renderPlayerBars();
  renderInventory();
  renderEquipment();
  renderSidePanels();
}

initUI({ startBattle, nextWave, resetBattle, toggleSpeed, refreshPanels, chooseLevelUpSkill });
initCombatSystem();
loadStarterQueue();
syncBuildMana();
renderAllSlots();
renderBuildMana();
renderQueueStatus();
renderWaveStatus();
renderScore();
renderPlayerMeta();
renderPlayerBars();
renderEnemyBars();
renderEffects();
renderInventory();
renderEquipment();
renderSidePanels();

log('스킬 목록에서 스킬을 드래그해 배열에 배치하세요.', 'sys');
log('배열 마나 한도 안에서만 스킬을 넣을 수 있습니다.', 'sys');
log('전투가 시작되면 배열 순서대로 스킬이 자동 실행됩니다.', 'sys');
