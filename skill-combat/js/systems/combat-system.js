import { SPEED_STEPS } from '../data/constants.js';
import { getEnemySkill } from '../data/enemy-skills.js';
import { createEnemyState } from '../domain/enemy.js';
import { battleState, clearBattleTimers, resetBattleState } from '../domain/battle-state.js';
import { getCurrentStage, getEnemyDefinitionForWave, getNextEncounterContext, hasNextEncounter } from './stage-system.js';
import {
  animateEnemyHit,
  animatePlayerAttack,
  animatePlayerHit,
  buildSkillLibrary,
  clearLog,
  clearTurnBar,
  getParticleAnchors,
  hideLevelUpOverlay,
  log,
  markEnemyDead,
  markPlayerDead,
  renderAllSlots,
  renderBuildMana,
  renderEffects,
  renderEnemyBars,
  renderEquipment,
  renderInventory,
  renderLevelUpOverlay,
  renderPlayerBars,
  renderPlayerMeta,
  renderSlotInventory,
  renderScore,
  renderSidePanels,
  renderStrategy,
  renderTurnMeters,
  renderWaveStatus,
  resetPresentation,
  setActiveSlot,
  setControls,
  setEnemyInfo,
  setWaveHeader,
} from '../ui/app-ui.js';
import { initParticleLayer, playFloatingText, playImpactParticles, playSkillParticles } from '../ui/particle-effects.js';
import { recalculatePlayerStats } from './character-system.js';
import { rollLootForEnemy } from './loot-system.js';
import { clearQueue, loadStarterQueue, syncBuildCost } from './selection-system.js';
import { chooseHeroSkill, getHeroChoices, getSkillPreview, getSkillUpgradeChoices, isSkillUnlocked, upgradeSkillLevel } from './skill-system.js';
import { choosePlayerSkill } from './strategy-system.js';

const ATB_MAX = 100;
const ATB_TICK_MS = 60;
const PLAYER_CRIT_MULTIPLIER = 1.6;
const ENEMY_CRIT_MULTIPLIER = 1.45;

export function initCombatSystem() {
  initParticleLayer();
  recalculatePlayerStats();
}

export function startBattle() {
  if (!battleState.queue.some(Boolean)) {
    log('먼저 슬롯에 스킬을 배치해주세요.', 'sys');
    return;
  }

  if (battleState.player.resources.hp <= 0) {
    log('플레이어가 쓰러져 있습니다. 초기화 후 다시 시작해주세요.', 'sys');
    return;
  }

  clearBattleTimers();
  battleState.fighting = true;
  battleState.cooldowns.fill(0);
  battleState.turn.playerMeter = 0;
  battleState.turn.enemyMeter = 0;
  battleState.turn.acting = false;
  battleState.turn.lastPlayerSlot = null;
  loadWave(battleState.waveIndex);
  setControls({ canStart: false, showNext: false });
  startAtbLoop();
}

export function nextWave() {
  const nextContext = getNextEncounterContext();
  if (!nextContext) {
    return;
  }

  const stageChanged = nextContext.stageIndex !== battleState.stageIndex;
  battleState.stageIndex = nextContext.stageIndex;
  battleState.waveIndex = nextContext.waveIndex;
  battleState.fighting = true;
  battleState.cooldowns.fill(0);
  battleState.turn.playerMeter = 0;
  battleState.turn.enemyMeter = 0;
  battleState.turn.acting = false;
  battleState.turn.lastPlayerSlot = null;
  battleState.player.resources.mp = Math.min(battleState.player.stats.maxMp, battleState.player.resources.mp + 40);
  renderAllSlots();
  renderPlayerBars();
  log(stageChanged ? `다음 스테이지 진입: ${nextContext.stage.name} ${nextContext.stage.floor}층` : '다음 웨이브 진입. MP가 일부 회복되었습니다.', 'sys');
  setControls({ canStart: false, showNext: false });
  loadWave(battleState.waveIndex);
  startAtbLoop();
}

export function resetBattle() {
  resetBattleState();
  recalculatePlayerStats();
  clearLog();
  resetPresentation();
  hideLevelUpOverlay();
  clearQueue();
  loadStarterQueue();
  renderAllSlots();
  syncBuildCost();
  renderBuildMana();
  renderPlayerMeta();
  renderPlayerBars();
  renderEnemyBars();
  renderEffects();
  renderSidePanels();
  renderStrategy();
  clearTurnBar();
  log('초기화 완료. 전략과 슬롯을 정비한 뒤 전투를 시작하세요.', 'sys');
}

export function toggleSpeed() {
  const currentIndex = SPEED_STEPS.indexOf(battleState.speed);
  battleState.speed = SPEED_STEPS[(currentIndex + 1) % SPEED_STEPS.length];
  document.getElementById('btn-speed').textContent = `${battleState.speed}x`;
}

export function chooseLevelUpSkill(skillId) {
  const result = upgradeSkillLevel(skillId);
  if (!result) {
    log('이미 최대 레벨인 스킬입니다.', 'status');
    return;
  }

  battleState.overlays.levelUp.pending = Math.max(0, battleState.overlays.levelUp.pending - 1);
  const chosenSkill = battleState.overlays.levelUp.choices.find((skill) => skill.id === skillId);
  battleState.overlays.levelUp.choices = [];

  log(`${chosenSkill?.name ?? skillId} 강화! Lv.${result.level}`, 'sys');
  result.unlocks.unlockedSkillIds.forEach((unlockedSkillId) => {
    log(`새 스킬 해금: ${unlockedSkillId}`, 'sys');
  });
  buildSkillLibrary();
  renderAllSlots();
  renderBuildMana();
  renderSidePanels();

  if (result.unlocks.heroTreeId) {
    openHeroSelection(result.unlocks.heroTreeId);
    return;
  }

  if (battleState.overlays.levelUp.pending > 0) {
    openLevelUpSelection();
    return;
  }

  battleState.overlays.levelUp.open = false;
  hideLevelUpOverlay();
}

export function chooseHeroSkillOption(skillId) {
  const result = chooseHeroSkill(skillId);
  if (!result.ok) {
    log(result.reason, 'status');
    return;
  }

  battleState.overlays.levelUp.open = false;
  battleState.overlays.levelUp.mode = 'skill';
  battleState.overlays.levelUp.treeId = null;
  battleState.overlays.levelUp.choices = [];
  hideLevelUpOverlay();
  buildSkillLibrary();
  renderAllSlots();
  renderBuildMana();
  renderSidePanels();
  log(`영웅 스킬 선택: ${result.skill.name}`, 'sys');

  if (battleState.overlays.levelUp.pending > 0) {
    openLevelUpSelection();
  }
}

function loadWave(waveIndex) {
  const definition = getEnemyDefinitionForWave(waveIndex);
  const stage = getCurrentStage();
  battleState.enemy = createEnemyState(definition);
  setEnemyInfo(battleState.enemy);
  renderEnemyBars();
  renderWaveStatus();
  renderTurnMeters(0, 0);
  setWaveHeader(`${stage.name} · ${stage.floor}층 · 웨이브 ${waveIndex + 1}/${stage.waves.length} · ${definition.name}`);
  log(`${definition.name} 출현! HP ${definition.hp}`, 'sys');
}

function startAtbLoop() {
  clearBattleTimers();
  battleState.timers.atbIntervalId = setInterval(tickAtbLoop, ATB_TICK_MS);
}

function tickAtbLoop() {
  if (!battleState.fighting || !battleState.enemy) {
    return;
  }

  if (battleState.overlays.levelUp.open) {
    return;
  }

  if (battleState.enemy.curHp <= 0) {
    handleEnemyDefeat();
    return;
  }

  if (battleState.player.resources.hp <= 0) {
    handlePlayerDefeat();
    return;
  }

  if (battleState.turn.acting) {
    return;
  }

  battleState.turn.playerMeter = Math.min(ATB_MAX, battleState.turn.playerMeter + getTurnGain(battleState.player, battleState.player.effects));
  battleState.turn.enemyMeter = Math.min(ATB_MAX, battleState.turn.enemyMeter + getTurnGain(battleState.enemy, battleState.enemy.effects));
  renderTurnMeters(battleState.turn.playerMeter, battleState.turn.enemyMeter);

  const playerChoice = choosePlayerSkill();
  const playerReady = Boolean(playerChoice) || battleState.turn.playerMeter >= ATB_MAX;
  const enemyReady = battleState.turn.enemyMeter >= getEnemyActionCost();

  if (playerReady && enemyReady) {
    if ((battleState.player.attributes?.dexterity ?? 10) >= (battleState.enemy.attributes?.dexterity ?? 10)) {
      performPlayerTurn();
    } else {
      performEnemyTurn();
    }
    return;
  }

  if (playerReady) {
    performPlayerTurn();
    return;
  }

  if (enemyReady) {
    performEnemyTurn();
  }
}

function performPlayerTurn() {
  const choice = choosePlayerSkill();
  if (!choice) {
    battleState.turn.playerMeter = Math.max(0, battleState.turn.playerMeter - 24);
    battleState.player.resources.mp = Math.min(battleState.player.stats.maxMp, battleState.player.resources.mp + 6);
    renderPlayerBars();
    renderTurnMeters(battleState.turn.playerMeter, battleState.turn.enemyMeter);
    log('사용 가능한 스킬이 없어 숨을 고르며 MP를 회복합니다. (+6 MP)', 'status');
    return;
  }

  const { slot, skill } = choice;
  battleState.turn.acting = true;
  battleState.turn.playerMeter = Math.max(0, battleState.turn.playerMeter - (skill.atbCost ?? 20));
  battleState.turn.lastPlayerSlot = slot.index;
  setActiveSlot(slot.index);
  renderTurnMeters(battleState.turn.playerMeter, battleState.turn.enemyMeter);

  battleState.player.resources.mp = Math.max(0, battleState.player.resources.mp - skill.mp);
  if (skill.cd > 0) {
    battleState.cooldowns[slot.index] = skill.cd;
  }

  renderAllSlots();
  renderPlayerBars();
  animatePlayerAttack();
  playSkillParticles({
    skill,
    sourceEl: getParticleAnchors().player,
    targetEl: skill.target === 'self' ? getParticleAnchors().player : getParticleAnchors().enemy,
  });

  const result = executeSkill(skill, slot.index);
  log(result.message, result.type);
  if (result.preview.manaGain > 0) {
    battleState.player.resources.mp = Math.min(battleState.player.stats.maxMp, battleState.player.resources.mp + result.preview.manaGain);
    playFloatingText({ targetEl: getParticleAnchors().player, text: `+${result.preview.manaGain} MP`, type: 'mana' });
  }

  applySkillEffects(skill);
  tickEffects();
  reduceCooldowns(slot.index);
  renderPlayerBars();
  renderEnemyBars();

  if (battleState.enemy.curHp <= 0) {
    handleEnemyDefeat();
    return;
  }

  if (battleState.player.resources.hp <= 0) {
    handlePlayerDefeat();
    return;
  }

  battleState.turn.acting = false;
}

function performEnemyTurn() {
  battleState.turn.acting = true;
  battleState.turn.enemyMeter = Math.max(0, battleState.turn.enemyMeter - getEnemyActionCost());
  renderTurnMeters(battleState.turn.playerMeter, battleState.turn.enemyMeter);
  doEnemyAction();
  tickEffects();

  if (battleState.player.resources.hp <= 0) {
    handlePlayerDefeat();
    return;
  }

  battleState.turn.acting = false;
}

function getTurnGain(actor, effects = {}) {
  const dexterity = actor?.attributes?.dexterity ?? 10;
  let gain = (10 + dexterity * 0.5) * 0.12 * battleState.speed;

  if (effects.slow > 0) {
    gain *= 0.7;
  }
  if (effects.haste > 0) {
    gain *= 1.22;
  }
  if (effects.freeze > 0 || effects.stun > 0 || effects.root > 0 || effects.paralyze > 0) {
    gain *= 0.12;
  }

  return gain;
}

function executeSkill(skill, slotIndex) {
  const preview = getSkillPreview(skill);
  const statScale = skill.school === 'magic'
    ? battleState.player.stats.magicAtk * 0.34
    : battleState.player.stats.atk * 0.32;
  const slotMultiplier = getSlotMultiplier(skill, slotIndex);

  if (preview.heal) {
    const amount = Math.round((rand(preview.heal[0], preview.heal[1]) + battleState.player.stats.magicAtk * 0.22) * slotMultiplier);
    battleState.player.resources.hp = Math.min(battleState.player.stats.maxHp, battleState.player.resources.hp + amount);
    playFloatingText({ targetEl: getParticleAnchors().player, text: `+${amount}`, type: 'heal' });
    return { message: `✨ ${skill.name} - HP +${amount} 회복`, type: 'heal', preview };
  }

  if (preview.manaGain) {
    playFloatingText({ targetEl: getParticleAnchors().player, text: `+${preview.manaGain} MP`, type: 'mana' });
    return { message: `🔷 ${skill.name} - MP +${preview.manaGain}`, type: 'heal', preview };
  }

  if (!preview.damage) {
    return { message: `🌀 ${skill.name} 사용`, type: 'status', preview };
  }

  const hitCount = skill.hits ?? 1;
  let totalDamage = 0;
  let criticalCount = 0;
  let blockedCount = 0;

  for (let hit = 0; hit < hitCount; hit += 1) {
    let damage = preview.damage ? rand(preview.damage[0], preview.damage[1]) + statScale : 0;
    if (skill.pen) {
      damage *= 1.15;
    }
    if (battleState.player.effects.powerup > 0) {
      damage *= 1.2;
    }
    if (battleState.player.effects.berserk > 0) {
      damage *= 1.4;
    }

    let critChance = Math.max(0, battleState.player.stats.crit ?? 0) + (skill.critBonusFlat ?? 0);
    if (battleState.player.effects.stealth > 0) {
      critChance += 0.35;
      battleState.player.effects.stealth -= 1;
    }
    const isCritical = Math.random() < critChance;
    if (isCritical) {
      damage *= PLAYER_CRIT_MULTIPLIER;
      criticalCount += 1;
    }

    damage = Math.round(damage * slotMultiplier);
    damage = applyElementalAdjustment(skill, damage);
    damage = applyConditionalBonuses(skill, damage);

    if (battleState.enemy.effects.shield > 0) {
      damage = 0;
      blockedCount += 1;
      battleState.enemy.effects.shield -= 1;
    } else {
      damage = Math.max(0, Math.round(damage - (skill.school === 'physical' ? battleState.enemy.attributes.vitality * 0.2 : 0)));
    }

    if (damage > 0 && skill.drain) {
      const drainAmount = Math.floor(damage * skill.drain);
      battleState.player.resources.hp = Math.min(battleState.player.stats.maxHp, battleState.player.resources.hp + drainAmount);
      playFloatingText({ targetEl: getParticleAnchors().player, text: `+${drainAmount}`, type: 'heal' });
    }

    battleState.enemy.curHp = Math.max(0, battleState.enemy.curHp - damage);
    totalDamage += damage;
  }

  if (skill.extraHitChance && Math.random() < skill.extraHitChance) {
    const bonusHit = Math.round((preview.damage ? rand(preview.damage[0], preview.damage[1]) : 0) * 0.85);
    battleState.enemy.curHp = Math.max(0, battleState.enemy.curHp - bonusHit);
    totalDamage += bonusHit;
  }

  if (skill.consumeBleed && battleState.enemy.effects.bleed > 0) {
    const bleedBonus = Math.round((battleState.enemy.effects.bleed * 10) * (1 + (skill.bonusPerBleedStack ?? 0)));
    battleState.enemy.curHp = Math.max(0, battleState.enemy.curHp - bleedBonus);
    totalDamage += bleedBonus;
    battleState.enemy.effects.bleed = 0;
  }

  if (criticalCount > 0) {
    playFloatingText({ targetEl: getParticleAnchors().enemy, text: 'CRITICAL', type: 'critical' });
  }

  if (totalDamage > 0) {
    animateEnemyHit();
    playFloatingText({ targetEl: getParticleAnchors().enemy, text: `-${totalDamage}`, type: criticalCount > 0 ? 'critical' : 'damage' });
  } else if (blockedCount > 0) {
    playFloatingText({ targetEl: getParticleAnchors().enemy, text: 'BLOCKED', type: 'blocked' });
  }

  if (battleState.player.effects.berserk > 0 && totalDamage > 0) {
    const backlash = rand(6, 12);
    battleState.player.resources.hp = Math.max(1, battleState.player.resources.hp - backlash);
    playFloatingText({ targetEl: getParticleAnchors().player, text: `-${backlash}`, type: 'damage' });
  }

  const suffix = blockedCount > 0 && totalDamage === 0 ? ' / BLOCKED' : criticalCount > 0 ? ` / CRITICAL x${criticalCount}` : '';
  applySkillSelfCosts(skill);
  return {
    message: `⚔ ${skill.name} - ${totalDamage} 피해${suffix}`,
    type: criticalCount > 0 ? 'dmg' : 'status',
    preview,
  };
}

function applySkillEffects(skill) {
  const preview = getSkillPreview(skill);
  if (!preview.effect) {
    return;
  }

  const effect = rollEffect(preview.effect);
  if (!effect) {
    return;
  }

  const targetEffects = skill.target === 'self' ? battleState.player.effects : battleState.enemy.effects;
  applyEffect(targetEffects, effect);

  if (skill.selfSlow) {
    applyEffect(battleState.player.effects, { slow: skill.selfSlow });
  }
}

function doEnemyAction() {
  if (!battleState.enemy || battleState.enemy.curHp <= 0 || battleState.player.resources.hp <= 0) {
    return;
  }

  if (hasControlEffect(battleState.enemy.effects)) {
    const label = battleState.enemy.effects.stun > 0 ? '기절' : battleState.enemy.effects.root > 0 ? '속박' : battleState.enemy.effects.freeze > 0 ? '빙결' : '마비';
    log(`${battleState.enemy.name}은(는) ${label} 상태로 행동하지 못했습니다.`, 'status');
    consumeEnemyControlEffect();
    renderEffects();
    return;
  }

  if (battleState.player.effects.dodge > 0) {
    battleState.player.effects.dodge -= 1;
    playFloatingText({ targetEl: getParticleAnchors().player, text: 'MISS', type: 'miss' });
    log('플레이어가 적 공격을 회피했습니다.', 'status');
    renderEffects();
    return;
  }

  if (battleState.player.effects.stealth > 0) {
    battleState.player.effects.stealth -= 1;
    playFloatingText({ targetEl: getParticleAnchors().player, text: 'MISS', type: 'miss' });
    log('플레이어가 은신으로 적 공격을 흘려냈습니다.', 'status');
    renderEffects();
    return;
  }

  const enemySkill = chooseEnemySkill();
  if (enemySkill) {
    executeEnemySkill(enemySkill);
    reduceEnemySkillCooldowns(enemySkill.id);
    renderEffects();
    renderPlayerBars();
    renderEnemyBars();
    return;
  }

  let damage = rand(battleState.enemy.atk[0], battleState.enemy.atk[1]);
  damage += Math.round((battleState.enemy.attributes?.strength ?? 10) * 0.9);

  const isCritical = Math.random() < Math.min(0.32, 0.04 + (battleState.enemy.attributes?.dexterity ?? 10) * 0.004);
  if (isCritical) {
    damage = Math.round(damage * ENEMY_CRIT_MULTIPLIER);
  }

  if (battleState.player.effects.guard > 0) {
    damage = Math.round(damage * 0.35);
    battleState.player.effects.guard -= 1;
  }

  if (battleState.player.effects.shield > 0) {
    battleState.player.effects.shield -= 1;
    playFloatingText({ targetEl: getParticleAnchors().player, text: 'BLOCKED', type: 'blocked' });
    log('보호막이 적의 공격을 막아냈습니다.', 'status');
  } else {
    const reducedDamage = Math.max(0, Math.round(damage - battleState.player.stats.def * 0.18));
    battleState.player.resources.hp = Math.max(0, battleState.player.resources.hp - reducedDamage);
    animatePlayerHit();
    playImpactParticles({ targetEl: getParticleAnchors().player, variant: 'player-hit', intensity: Math.min(1.8, reducedDamage / 24) });
    if (isCritical) {
      playFloatingText({ targetEl: getParticleAnchors().player, text: 'CRITICAL', type: 'critical' });
    }
    playFloatingText({ targetEl: getParticleAnchors().player, text: `-${reducedDamage}`, type: isCritical ? 'critical' : 'damage' });
    log(`${battleState.enemy.name} 공격 - ${reducedDamage} 피해${isCritical ? ' / CRITICAL' : ''}`, 'enemy');
    if (battleState.player.effects.reflect > 0) {
      const reflected = Math.max(1, Math.round(reducedDamage * (0.12 * battleState.player.effects.reflect)));
      battleState.enemy.curHp = Math.max(0, battleState.enemy.curHp - reflected);
      playFloatingText({ targetEl: getParticleAnchors().enemy, text: `-${reflected}`, type: 'damage' });
      log(`반사 피해 ${reflected}`, 'status');
    }
    applyEnemySpecial(reducedDamage);
  }

  renderEffects();
  renderPlayerBars();
  renderEnemyBars();
  reduceEnemySkillCooldowns();
}

function applyEnemySpecial(damage) {
  if (battleState.enemy.special === 'fire' && Math.random() < 0.28) {
    applyEffect(battleState.player.effects, { burn: 2 });
    log('플레이어가 화상 상태가 되었습니다.', 'status');
  }

  if (battleState.enemy.special === 'fire_breath' && Math.random() < 0.4) {
    applyEffect(battleState.player.effects, { burn: 3 });
    log('강한 화염 브레스가 화상을 남깁니다.', 'status');
  }

  if (battleState.enemy.special === 'drain' && Math.random() < 0.25) {
    const heal = Math.floor(damage * 0.28);
    battleState.enemy.curHp = Math.min(battleState.enemy.hp, battleState.enemy.curHp + heal);
    playFloatingText({ targetEl: getParticleAnchors().enemy, text: `+${heal}`, type: 'heal' });
    log(`${battleState.enemy.name}이(가) 생명력을 흡수했습니다.`, 'enemy');
  }

  if (battleState.enemy.special === 'poison' && Math.random() < 0.28) {
    applyEffect(battleState.player.effects, { poison: 2 });
    log('플레이어가 중독되었습니다.', 'status');
  }
}

function tickEffects() {
  if (battleState.enemy) {
    if (battleState.enemy.effects.burn > 0) {
      const damage = rand(8, 14);
      battleState.enemy.curHp = Math.max(0, battleState.enemy.curHp - damage);
      battleState.enemy.effects.burn -= 1;
      playFloatingText({ targetEl: getParticleAnchors().enemy, text: `-${damage}`, type: 'damage' });
      log(`적이 화상으로 ${damage} 피해를 받았습니다.`, 'dmg');
    }

    if (battleState.enemy.effects.bleed > 0) {
      const damage = rand(10, 16);
      battleState.enemy.curHp = Math.max(0, battleState.enemy.curHp - damage);
      battleState.enemy.effects.bleed -= 1;
      playFloatingText({ targetEl: getParticleAnchors().enemy, text: `-${damage}`, type: 'damage' });
      log(`적이 출혈로 ${damage} 피해를 받았습니다.`, 'dmg');
    }

    if (battleState.enemy.effects.poison > 0) {
      const damage = rand(10, 16);
      battleState.enemy.curHp = Math.max(0, battleState.enemy.curHp - damage);
      battleState.enemy.effects.poison -= 1;
      playFloatingText({ targetEl: getParticleAnchors().enemy, text: `-${damage}`, type: 'damage' });
      log(`적이 중독으로 ${damage} 피해를 받았습니다.`, 'dmg');
    }

    if (battleState.enemy.effects.curse > 0) {
      const damage = rand(6, 10);
      battleState.enemy.curHp = Math.max(0, battleState.enemy.curHp - damage);
      battleState.enemy.effects.curse -= 1;
      playFloatingText({ targetEl: getParticleAnchors().enemy, text: `-${damage}`, type: 'damage' });
    }

    if (battleState.enemy.effects.slow > 0) battleState.enemy.effects.slow -= 1;
    if (battleState.enemy.effects.haste > 0) battleState.enemy.effects.haste -= 1;
  }

  if (battleState.player.effects.regen > 0) {
    battleState.player.resources.hp = Math.min(battleState.player.stats.maxHp, battleState.player.resources.hp + 16);
    battleState.player.effects.regen -= 1;
    playFloatingText({ targetEl: getParticleAnchors().player, text: '+16', type: 'heal' });
  }

  if (battleState.player.effects.burn > 0) {
    const damage = rand(6, 12);
    battleState.player.resources.hp = Math.max(0, battleState.player.resources.hp - damage);
    battleState.player.effects.burn -= 1;
    animatePlayerHit();
    playImpactParticles({ targetEl: getParticleAnchors().player, variant: 'burn', intensity: 0.8 });
    playFloatingText({ targetEl: getParticleAnchors().player, text: `-${damage}`, type: 'damage' });
  }

  if (battleState.player.effects.poison > 0) {
    const damage = rand(8, 14);
    battleState.player.resources.hp = Math.max(0, battleState.player.resources.hp - damage);
    battleState.player.effects.poison -= 1;
    animatePlayerHit();
    playImpactParticles({ targetEl: getParticleAnchors().player, variant: 'poison', intensity: 0.9 });
    playFloatingText({ targetEl: getParticleAnchors().player, text: `-${damage}`, type: 'damage' });
  }

  if (battleState.player.effects.powerup > 0) battleState.player.effects.powerup -= 1;
  if (battleState.player.effects.berserk > 0) battleState.player.effects.berserk -= 1;
  if (battleState.player.effects.haste > 0) battleState.player.effects.haste -= 1;
  if (battleState.player.effects.reflect > 0) battleState.player.effects.reflect -= 1;
  if (battleState.player.effects.slow > 0) battleState.player.effects.slow -= 1;
  if (battleState.player.effects.curse > 0) battleState.player.effects.curse -= 1;
  renderEffects();
}

function chooseEnemySkill() {
  if (!battleState.enemy?.skills?.length) {
    return null;
  }

  if (battleState.enemy.rank === 'boss') {
    return chooseBossPatternSkill();
  }

  const hpRatio = battleState.enemy.curHp / Math.max(1, battleState.enemy.hp);
  const usableSkills = battleState.enemy.skills
    .map((skillId) => getEnemySkill(skillId))
    .filter(Boolean)
    .filter((skill) => (battleState.enemy.curMp ?? 0) >= (skill.mpCost ?? 0))
    .filter((skill) => (battleState.enemy.skillCooldowns?.[skill.id] ?? 0) <= 0)
    .filter((skill) => {
      if (skill.target === 'self' && skill.selfEffect?.shield && (battleState.enemy.effects.shield ?? 0) > 0) {
        return false;
      }
      return true;
    });

  if (usableSkills.length === 0) {
    return null;
  }

  const weightedSkills = usableSkills.map((skill) => {
    let weight = skill.weight ?? 1;
    if (battleState.enemy.rank === 'boss') {
      weight *= skill.target === 'self' ? (hpRatio < 0.45 ? 2.3 : 1.2) : 1.8;
      if ((skill.damage?.[1] ?? 0) >= 55) {
        weight *= 1.45;
      }
    } else if (battleState.enemy.rank === 'midboss') {
      weight *= skill.target === 'self' ? (hpRatio < 0.5 ? 1.9 : 1.1) : 1.35;
    } else if (battleState.enemy.rank === 'elite') {
      weight *= skill.target === 'self' ? (hpRatio < 0.38 ? 1.5 : 0.9) : 1.2;
    }

    if (skill.heal && hpRatio > 0.82) {
      weight *= 0.2;
    }
    if (skill.selfEffect?.shield && (battleState.enemy.effects.shield ?? 0) > 0) {
      weight *= 0.35;
    }
    if (skill.effect?.burn && (battleState.player.effects.burn ?? 0) > 0) {
      weight *= 0.7;
    }
    if (skill.effect?.poison && (battleState.player.effects.poison ?? 0) > 0) {
      weight *= 0.7;
    }
    if (skill.effect?.slow && (battleState.player.effects.slow ?? 0) > 0) {
      weight *= 0.7;
    }
    return { skill, weight: Math.max(0.1, weight) };
  });

  const totalWeight = weightedSkills.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of weightedSkills) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.skill;
    }
  }
  return weightedSkills[0]?.skill ?? null;
}

function chooseBossPatternSkill() {
  const skills = battleState.enemy.skills
    .map((skillId) => getEnemySkill(skillId))
    .filter(Boolean);

  if (skills.length === 0) {
    return null;
  }

  const attempts = skills.length;
  for (let offset = 0; offset < attempts; offset += 1) {
    const index = (battleState.enemy.patternIndex + offset) % skills.length;
    const skill = skills[index];
    const hasMp = (battleState.enemy.curMp ?? 0) >= (skill.mpCost ?? 0);
    const isReady = (battleState.enemy.skillCooldowns?.[skill.id] ?? 0) <= 0;
    const shieldConflict = skill.target === 'self' && skill.selfEffect?.shield && (battleState.enemy.effects.shield ?? 0) > 0;
    if (hasMp && isReady && !shieldConflict) {
      battleState.enemy.patternIndex = (index + 1) % skills.length;
      return skill;
    }
  }

  return null;
}

function executeEnemySkill(skill) {
  battleState.enemy.curMp = Math.max(0, (battleState.enemy.curMp ?? 0) - (skill.mpCost ?? 0));
  battleState.enemy.skillCooldowns[skill.id] = skill.cooldown ?? 0;
  playSkillParticles({
    skill: {
      element: skill.element ?? battleState.enemy.el,
      school: skill.school ?? 'magic',
      target: skill.target === 'self' ? 'self' : 'enemy',
    },
    sourceEl: getParticleAnchors().enemy,
    targetEl: skill.target === 'self' ? getParticleAnchors().enemy : getParticleAnchors().player,
  });

  if (skill.target === 'self') {
    if (skill.heal) {
      const amount = rand(skill.heal[0], skill.heal[1]) + Math.round((battleState.enemy.attributes?.intelligence ?? 10) * 0.8);
      battleState.enemy.curHp = Math.min(battleState.enemy.hp, battleState.enemy.curHp + amount);
      playFloatingText({ targetEl: getParticleAnchors().enemy, text: `+${amount}`, type: 'heal' });
      log(`${battleState.enemy.name} ${skill.castLog ?? `${skill.name} 준비`} HP +${amount}`, 'enemy');
    }
    if (skill.selfEffect) {
      applyEffect(battleState.enemy.effects, skill.selfEffect);
      playFloatingText({ targetEl: getParticleAnchors().enemy, text: skill.selfEffect.shield ? 'SHIELD' : 'BUFF', type: 'heal' });
      log(`${battleState.enemy.name} ${skill.selfLog ?? `${skill.name}로 강화 효과를 얻습니다.`}`, 'enemy');
    }
    return;
  }

  if (skill.castLog) {
    log(`${battleState.enemy.name} ${skill.castLog}`, 'enemy');
  }

  let damage = rand(skill.damage?.[0] ?? battleState.enemy.atk[0], skill.damage?.[1] ?? battleState.enemy.atk[1]);
  damage += Math.round((skill.school === 'magic' ? (battleState.enemy.attributes?.intelligence ?? 10) : (battleState.enemy.attributes?.strength ?? 10)) * 0.9);
  if (skill.critBonus) {
    const critChance = Math.min(0.45, 0.06 + skill.critBonus);
    if (Math.random() < critChance) {
      damage = Math.round(damage * ENEMY_CRIT_MULTIPLIER);
      playFloatingText({ targetEl: getParticleAnchors().player, text: 'CRITICAL', type: 'critical' });
    }
  }

  if (battleState.player.effects.guard > 0) {
    damage = Math.round(damage * 0.35);
    battleState.player.effects.guard -= 1;
  }

  if (battleState.player.effects.shield > 0) {
    battleState.player.effects.shield -= 1;
    playFloatingText({ targetEl: getParticleAnchors().player, text: 'BLOCKED', type: 'blocked' });
    log(`${battleState.enemy.name} ${skill.name} - BLOCKED`, 'status');
    return;
  }

  const reducedDamage = Math.max(0, Math.round(damage - battleState.player.stats.def * 0.15));
  battleState.player.resources.hp = Math.max(0, battleState.player.resources.hp - reducedDamage);
  animatePlayerHit();
  playImpactParticles({
    targetEl: getParticleAnchors().player,
    variant: skill.element === 'fire' ? 'burn' : skill.element === 'poison' ? 'poison' : 'player-hit',
    intensity: Math.min(2, reducedDamage / 20),
  });
  playFloatingText({ targetEl: getParticleAnchors().player, text: `-${reducedDamage}`, type: 'damage' });
  log(`${battleState.enemy.name} ${skill.hitLog ?? `${skill.name} - ${reducedDamage} 피해`}`, 'enemy');

  if (skill.effect) {
    const rolledEffect = rollEffect(skill.effect);
    if (rolledEffect) {
      applyEffect(battleState.player.effects, rolledEffect);
      if (rolledEffect.burn) {
        playFloatingText({ targetEl: getParticleAnchors().player, text: 'BURN', type: 'damage' });
      }
      if (rolledEffect.poison) {
        playFloatingText({ targetEl: getParticleAnchors().player, text: 'POISON', type: 'damage' });
      }
      if (rolledEffect.slow) {
        playFloatingText({ targetEl: getParticleAnchors().player, text: 'SLOW', type: 'blocked' });
      }
      if (rolledEffect.curse) {
        playFloatingText({ targetEl: getParticleAnchors().player, text: 'CURSE', type: 'blocked' });
      }
    }
  }

  if (skill.drainRatio) {
    const heal = Math.max(1, Math.round(reducedDamage * skill.drainRatio));
    battleState.enemy.curHp = Math.min(battleState.enemy.hp, battleState.enemy.curHp + heal);
    playFloatingText({ targetEl: getParticleAnchors().enemy, text: `+${heal}`, type: 'heal' });
    log(`${battleState.enemy.name}이(가) 흡수한 생명력 ${heal}을 회복합니다.`, 'enemy');
  }
}

function reduceEnemySkillCooldowns(usedSkillId = null) {
  if (!battleState.enemy?.skillCooldowns) {
    return;
  }

  Object.keys(battleState.enemy.skillCooldowns).forEach((skillId) => {
    if (skillId === usedSkillId) {
      return;
    }
    battleState.enemy.skillCooldowns[skillId] = Math.max(0, (battleState.enemy.skillCooldowns[skillId] ?? 0) - 1);
  });
}

function handleEnemyDefeat() {
  clearBattleTimers();
  clearTurnBar();
  markEnemyDead();
  setActiveSlot(null);
  battleState.fighting = false;
  battleState.turn.acting = false;
  battleState.score += battleState.enemy.reward;
  const gainedExp = grantExperience(battleState.enemy.progression?.exp ?? battleState.enemy.exp ?? 0);
  const drops = rollLootForEnemy(battleState.enemy);
  if (drops.items.length > 0) {
    battleState.player.inventory.push(...drops.items);
  }
  if (drops.slotItems.length > 0) {
    battleState.player.slotInventory.push(...drops.slotItems);
  }

  renderScore();
  renderPlayerMeta();
  renderInventory();
  renderEquipment();
  renderSlotInventory();
  buildSkillLibrary();
  log(`${battleState.enemy.name} 처치! +${battleState.enemy.reward} 코인 / EXP +${gainedExp}`, 'sys');
  drops.items.forEach((item) => log(`획득: ${item.name} [${item.category}]`, 'heal'));
  drops.slotItems.forEach((item) => log(`획득: ${item.name} [특수 슬롯]`, 'heal'));

  if (hasNextEncounter()) {
    setControls({ canStart: false, showNext: true });
  } else {
    log('모든 스테이지를 클리어했습니다.', 'sys');
    setControls({ canStart: true, showNext: false });
  }
}

function handlePlayerDefeat() {
  clearBattleTimers();
  clearTurnBar();
  battleState.fighting = false;
  battleState.turn.acting = false;
  markPlayerDead();
  setActiveSlot(null);
  setControls({ canStart: true, showNext: false });
  log('플레이어가 쓰러졌습니다.', 'sys');
}

function endBattle(message) {
  clearBattleTimers();
  clearTurnBar();
  battleState.fighting = false;
  battleState.turn.acting = false;
  setActiveSlot(null);
  setControls({ canStart: true, showNext: false });
  log(message, 'sys');
}

function grantExperience(amount) {
  if (!amount || amount <= 0) {
    return 0;
  }

  const finalAmount = scaleExperienceGain(amount);
  battleState.player.progression.exp += finalAmount;

  while (battleState.player.progression.exp >= battleState.player.progression.nextExp) {
    battleState.player.progression.exp -= battleState.player.progression.nextExp;
    levelUpPlayer();
  }

  renderPlayerMeta();
  return finalAmount;
}

function levelUpPlayer() {
  battleState.player.progression.level += 1;
  battleState.player.progression.statPoints += 5;
  battleState.player.progression.nextExp = Math.floor(battleState.player.progression.nextExp * 1.22 + 18);
  recalculatePlayerStats();
  battleState.player.resources.hp = battleState.player.stats.maxHp;
  battleState.player.resources.mp = battleState.player.stats.maxMp;
  queueLevelUpSelection();

  renderPlayerBars();
  renderPlayerMeta();
  renderBuildMana();
  renderSidePanels();
  log(`레벨 업! Lv.${battleState.player.progression.level} / 스탯 포인트 +5`, 'sys');
}

function scaleExperienceGain(amount) {
  const level = battleState.player.progression.level;
  const earlyMultiplier = level <= 5 ? [1.6, 1.45, 1.3, 1.18, 1.08][level - 1] : 1;
  return Math.max(1, Math.round(amount * (earlyMultiplier ?? 1)));
}

function queueLevelUpSelection() {
  battleState.overlays.levelUp.pending += 1;
  if (!battleState.overlays.levelUp.open) {
    openLevelUpSelection();
  }
}

function openLevelUpSelection() {
  const choices = getSkillUpgradeChoices(3);
  if (choices.length === 0) {
    battleState.overlays.levelUp.open = false;
    battleState.overlays.levelUp.pending = 0;
    hideLevelUpOverlay();
    log('모든 스킬이 최대 레벨입니다.', 'status');
    return;
  }

  battleState.overlays.levelUp.open = true;
  battleState.overlays.levelUp.mode = 'skill';
  battleState.overlays.levelUp.treeId = null;
  battleState.overlays.levelUp.choices = choices;
  renderLevelUpOverlay();
}

function openHeroSelection(treeId) {
  const choices = getHeroChoices(treeId);
  if (choices.length === 0) {
    return;
  }

  battleState.overlays.levelUp.open = true;
  battleState.overlays.levelUp.mode = 'hero';
  battleState.overlays.levelUp.treeId = treeId;
  battleState.overlays.levelUp.choices = choices;
  renderLevelUpOverlay();
}

function applyEffect(store, effect) {
  Object.entries(effect).forEach(([key, value]) => {
    if (key === 'chance') {
      return;
    }
    store[key] = (store[key] || 0) + value;
  });
  renderEffects();
}

function rollEffect(effect) {
  if (typeof effect.chance === 'number' && Math.random() > effect.chance) {
    return null;
  }
  return effect;
}

function hasControlEffect(effects) {
  return effects.stun > 0 || effects.root > 0 || effects.freeze > 0 || effects.paralyze > 0;
}

function consumeEnemyControlEffect() {
  if (battleState.enemy.effects.stun > 0) battleState.enemy.effects.stun -= 1;
  if (battleState.enemy.effects.root > 0) battleState.enemy.effects.root -= 1;
  if (battleState.enemy.effects.freeze > 0) battleState.enemy.effects.freeze -= 1;
  if (battleState.enemy.effects.paralyze > 0) battleState.enemy.effects.paralyze -= 1;
}

function reduceCooldowns(activeIndex) {
  battleState.cooldowns = battleState.cooldowns.map((value, index) => {
    if (index === activeIndex) {
      return value;
    }
    return Math.max(0, value > 0 ? value - 1 : 0);
  });
  renderAllSlots();
}

function getSlotMultiplier(skill, slotIndex) {
  const slot = battleState.queue[slotIndex];
  if (!slot) {
    return 1;
  }

  if (skill.slotRole === 'attack' && battleState.player.stats.slotAtkMultiplier > 1 && slotIndex === 3) {
    return 1.05;
  }
  if (skill.slotRole === 'defense' && battleState.player.stats.slotDefMultiplier > 1 && slotIndex === 7) {
    return 1.05;
  }
  if (skill.slotRole === 'magic' && battleState.player.stats.slotMagicMultiplier > 1 && slotIndex === 11) {
    return 1.05;
  }
  return 1;
}

function getEnemyActionCost() {
  return battleState.enemy?.atbCost ?? 28;
}

function applyConditionalBonuses(skill, damage) {
  let adjusted = damage;
  if (skill.bonusVsStunned && battleState.enemy.effects.stun > 0) {
    adjusted *= 1 + skill.bonusVsStunned;
  }
  if (skill.bonusVsBurning && battleState.enemy.effects.burn > 0) {
    adjusted *= 1 + skill.bonusVsBurning;
  }
  if (skill.bonusPerBleedStack && battleState.enemy.effects.bleed > 0) {
    adjusted *= 1 + skill.bonusPerBleedStack * battleState.enemy.effects.bleed;
  }
  if (skill.bonusWhenLowHp && battleState.player.resources.hp / Math.max(1, battleState.player.stats.maxHp) < 0.45) {
    adjusted *= 1 + skill.bonusWhenLowHp;
  }
  if (skill.chainOnControl && hasControlEffect(battleState.enemy.effects)) {
    adjusted *= 1 + skill.chainOnControl;
  }
  return Math.round(adjusted);
}

function applySkillSelfCosts(skill) {
  if (skill.selfDamagePct) {
    const backlash = Math.max(1, Math.round(battleState.player.stats.maxHp * skill.selfDamagePct));
    battleState.player.resources.hp = Math.max(1, battleState.player.resources.hp - backlash);
    playFloatingText({ targetEl: getParticleAnchors().player, text: `-${backlash}`, type: 'damage' });
  }
}

function applyElementalAdjustment(skill, damage) {
  if (!battleState.enemy) {
    return Math.round(damage);
  }

  let adjusted = damage;
  if (skill.element === 'fire' && battleState.enemy.el === 'fire') adjusted *= 0.92;
  if (skill.element === 'cold' && battleState.enemy.el === 'fire') adjusted *= 1.08;
  if (skill.element === 'holy' && battleState.enemy.el === 'dark') adjusted *= 1.18;
  if (skill.element === 'poison' && battleState.enemy.el === 'nature') adjusted *= 0.9;
  return Math.round(adjusted);
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
