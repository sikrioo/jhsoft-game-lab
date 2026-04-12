import { chooseHeroSkillOption, chooseLevelUpSkill, initCombatSystem, nextWave, resetBattle, startBattle, toggleSpeed } from './systems/combat-system.js';
import { recalculatePlayerStats } from './systems/character-system.js';
import { clearQueue, loadStarterQueue, syncBuildCost } from './systems/selection-system.js';
import { applySpecialSlotItem } from './systems/slot-system.js';
import {
  buildSkillLibrary,
  initUI,
  log,
  renderAllSlots,
  renderBuildMana,
  renderEffects,
  renderEnemyBars,
  renderEquipment,
  renderInventory,
  renderPlayerBars,
  renderPlayerMeta,
  renderQueueStatus,
  renderScore,
  renderSidePanels,
  renderSlotInventory,
  renderStrategy,
  renderWaveStatus,
} from './ui/app-ui.js';

function refreshPanels() {
  renderPlayerMeta();
  renderPlayerBars();
  renderInventory();
  renderEquipment();
  renderSidePanels();
  renderSlotInventory();
  buildSkillLibrary();
  renderBuildMana();
}

function clearSlots() {
  clearQueue();
  syncBuildCost();
  renderAllSlots();
  renderBuildMana();
  renderQueueStatus();
  renderPlayerMeta();
  buildSkillLibrary();
  renderStrategy();
  log('슬롯에 배치된 스킬을 모두 해제했습니다.', 'status');
}

function applySlotItem(itemId) {
  const result = applySpecialSlotItem(itemId);
  if (!result.ok) {
    log(result.reason, 'status');
    return;
  }

  recalculatePlayerStats();
  syncBuildCost();
  renderAllSlots();
  renderBuildMana();
  renderPlayerMeta();
  renderPlayerBars();
  renderSidePanels();
  renderSlotInventory();
  buildSkillLibrary();
  log(`${result.item.name}을(를) ${result.item.slotType} 특수 슬롯에 적용했습니다.`, 'status');
}

initUI({ startBattle, nextWave, resetBattle, toggleSpeed, refreshPanels, chooseLevelUpSkill, chooseHeroSkill: chooseHeroSkillOption, clearSlots, applySlotItem });
initCombatSystem();
loadStarterQueue();
syncBuildCost();
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
renderSlotInventory();
renderStrategy();

log('트리에서 해금한 스킬을 드래그해 전략 슬롯 보드에 배치하세요.', 'sys');
log('각 행의 3열은 영웅 슬롯, 마지막 열은 특수 슬롯입니다.', 'sys');
log('전략과 전술이 같아도 슬롯 배치에 따라 자동전투 흐름이 크게 달라집니다.', 'sys');
