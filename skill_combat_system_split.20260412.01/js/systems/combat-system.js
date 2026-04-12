import { SPEED_STEPS } from '../data/constants.js';
import { createEnemyState } from '../domain/enemy.js';
import { battleState, clearBattleTimers, resetBattleState } from '../domain/battle-state.js';
import { getEnemyDefinitionForWave } from './stage-system.js';
import {
  animateEnemyHit,
  animatePlayerAttack,
  animatePlayerHit,
  buildSkillLibrary,
  clearLog,
  clearTurnBar,
  getParticleAnchors,
  log,
  markEnemyDead,
  markPlayerDead,
  hideLevelUpOverlay,
  renderAllSlots,
  renderBuildMana,
  renderEffects,
  renderEnemyBars,
  renderEquipment,
  renderInventory,
  renderLevelUpOverlay,
  renderPlayerBars,
  renderPlayerMeta,
  renderScore,
  renderSidePanels,
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
import { clearQueue, loadStarterQueue, syncBuildMana } from './selection-system.js';
import { getSkillPreview, getSkillUpgradeChoices, upgradeSkillLevel } from './skill-system.js';

const ATB_MAX = 100;
const ATB_TICK_MS = 60;
const PLAYER_CRIT_MULTIPLIER = 1.6;
const ENEMY_CRIT_MULTIPLIER = 1.5;

export function initCombatSystem() {
  initParticleLayer();
  recalculatePlayerStats();
}

export function startBattle() {
  if (!battleState.queue.some(Boolean)) {
    log('먼저 스킬을 배열에 배치해 주세요.', 'sys');
    return;
  }

  if (battleState.player.resources.hp <= 0) {
    log('캐릭터가 사망한 상태입니다. 초기화 후 다시 시작해 주세요.', 'sys');
    return;
  }

  clearBattleTimers();
  battleState.fighting = true;
  battleState.cooldowns.fill(0);
  battleState.turn.playerMeter = 0;
  battleState.turn.enemyMeter = 0;
  battleState.turn.playerSlotCursor = 0;
  battleState.turn.acting = false;
  battleState.battleProgress.expEarned = 0;
  loadWave(battleState.waveIndex);
  setControls({ canStart: false, showNext: false });
  startAtbLoop();
}

export function nextWave() {
  const nextDefinition = getEnemyDefinitionForWave(battleState.waveIndex + 1);
  if (!nextDefinition) {
    return;
  }

  battleState.waveIndex += 1;
  battleState.fighting = true;
  battleState.cooldowns.fill(0);
  battleState.turn.playerMeter = 0;
  battleState.turn.enemyMeter = 0;
  battleState.turn.playerSlotCursor = 0;
  battleState.turn.acting = false;
  battleState.battleProgress.expEarned = 0;
  battleState.player.resources.mp = Math.min(battleState.player.stats.maxMp, battleState.player.resources.mp + 50);
  renderAllSlots();
  renderPlayerBars();
  log('다음 웨이브 진입, MP +50 회복', 'sys');
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
  syncBuildMana();
  renderBuildMana();
  renderPlayerMeta();
  renderPlayerBars();
  renderEnemyBars();
  renderEffects();
  renderSidePanels();
  clearTurnBar();
  log('초기화 완료 - 스킬을 배열하고 전투를 시작하세요.', 'sys');
}

export function toggleSpeed() {
  const currentIndex = SPEED_STEPS.indexOf(battleState.speed);
  battleState.speed = SPEED_STEPS[(currentIndex + 1) % SPEED_STEPS.length];
  document.getElementById('btn-speed').textContent = `${battleState.speed}x`;
}

export function chooseLevelUpSkill(skillId) {
  const nextLevel = upgradeSkillLevel(skillId);
  if (!nextLevel) {
    log('이미 최대 레벨인 스킬입니다.', 'status');
    return;
  }

  battleState.overlays.levelUp.pending = Math.max(0, battleState.overlays.levelUp.pending - 1);
  const chosenSkill = battleState.overlays.levelUp.choices.find((skill) => skill.id === skillId);
  battleState.overlays.levelUp.choices = [];
  log(`${chosenSkill?.name ?? skillId} 강화! Lv.${nextLevel}`, 'sys');
  buildSkillLibrary();
  renderAllSlots();
  renderBuildMana();
  renderSidePanels();

  if (battleState.overlays.levelUp.pending > 0) {
    openLevelUpSelection();
    return;
  }

  battleState.overlays.levelUp.open = false;
  hideLevelUpOverlay();
}

function loadWave(waveIndex) {
  const definition = getEnemyDefinitionForWave(waveIndex);
  battleState.enemy = createEnemyState(definition);
  grantExperience(8, { trackBattle: true });
  setEnemyInfo(battleState.enemy);
  renderEnemyBars();
  renderWaveStatus();
  renderTurnMeters(0, 0);
  setWaveHeader(`웨이브 ${waveIndex + 1}/5 - ${definition.name}`);
  log(`${definition.name} 등장! HP: ${definition.hp}`, 'sys');
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

  battleState.turn.playerMeter = Math.min(ATB_MAX, battleState.turn.playerMeter + getTurnGain(battleState.player.stats.speed, battleState.player.effects));
  battleState.turn.enemyMeter = Math.min(ATB_MAX, battleState.turn.enemyMeter + getTurnGain(battleState.enemy.stats.speed, battleState.enemy.effects));
  renderTurnMeters(battleState.turn.playerMeter, battleState.turn.enemyMeter);

  if (battleState.turn.playerMeter >= ATB_MAX && battleState.turn.enemyMeter >= ATB_MAX) {
    if (battleState.player.stats.speed >= battleState.enemy.stats.speed) {
      performPlayerTurn();
    } else {
      performEnemyTurn();
    }
    return;
  }

  if (battleState.turn.playerMeter >= ATB_MAX) {
    performPlayerTurn();
    return;
  }

  if (battleState.turn.enemyMeter >= ATB_MAX) {
    performEnemyTurn();
  }
}

function performPlayerTurn() {
  const slots = battleState.queue.map((skill, index) => (skill ? index : -1)).filter((index) => index >= 0);
  if (slots.length === 0) {
    endBattle('배열된 스킬이 없습니다.');
    return;
  }

  battleState.turn.acting = true;
  const slotIndex = slots[battleState.turn.playerSlotCursor % slots.length];
  battleState.turn.playerSlotCursor = (battleState.turn.playerSlotCursor + 1) % slots.length;
  const skill = battleState.queue[slotIndex];

  setActiveSlot(slotIndex);
  battleState.turn.playerMeter = 0;
  renderTurnMeters(battleState.turn.playerMeter, battleState.turn.enemyMeter);

  if (!skill) {
    battleState.turn.acting = false;
    return;
  }

  if (battleState.cooldowns[slotIndex] > 0) {
    log(`${skill.name} 쿨다운 중입니다. (${battleState.cooldowns[slotIndex]}턴 남음)`, 'status');
    battleState.cooldowns[slotIndex] -= 1;
    renderAllSlots();
    battleState.turn.acting = false;
    return;
  }

  if (battleState.player.resources.mp < skill.mp) {
    log(`MP 부족 - ${skill.name} 사용 불가 (필요 ${skill.mp}, 보유 ${battleState.player.resources.mp})`, 'status');
    battleState.turn.acting = false;
    return;
  }

  battleState.player.resources.mp = Math.max(0, battleState.player.resources.mp - skill.mp);
  if (skill.cd > 0) {
    battleState.cooldowns[slotIndex] = skill.cd;
  }

  renderAllSlots();
  renderPlayerBars();
  animatePlayerAttack();
  playSkillParticles({
    skill,
    sourceEl: getParticleAnchors().player,
    targetEl: skill.target === 'self' ? getParticleAnchors().player : getParticleAnchors().enemy,
  });

  const result = executeSkill(skill);
  log(result.message, result.type);
  grantExperience(4, { trackBattle: true });

  const preview = getSkillPreview(skill);
  if (preview.manaGain) {
    battleState.player.resources.mp = Math.min(battleState.player.stats.maxMp, battleState.player.resources.mp + preview.manaGain);
    playFloatingText({ targetEl: getParticleAnchors().player, text: `+${preview.manaGain} MP`, type: 'mana' });
  }

  applySkillEffects(skill);
  tickEffects();
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
  battleState.turn.enemyMeter = 0;
  renderTurnMeters(battleState.turn.playerMeter, battleState.turn.enemyMeter);
  doEnemyAction();
  grantExperience(3, { trackBattle: true });

  if (battleState.player.resources.hp <= 0) {
    handlePlayerDefeat();
    return;
  }

  battleState.turn.acting = false;
}

function getTurnGain(speed, effects = {}) {
  let gain = Math.max(1.4, speed * 0.38) * battleState.speed;

  if (effects.slow > 0) {
    gain *= 0.7;
  }
  if (effects.freeze > 0 || effects.stun > 0 || effects.root > 0 || effects.paralyze > 0) {
    gain *= 0.12;
  }

  return gain;
}

function executeSkill(skill) {
  const preview = getSkillPreview(skill);

  if (preview.heal) {
    const amount = rand(preview.heal[0], preview.heal[1]);
    battleState.player.resources.hp = Math.min(battleState.player.stats.maxHp, battleState.player.resources.hp + amount);
    playFloatingText({ targetEl: getParticleAnchors().player, text: `+${amount}`, type: 'heal' });
    return { message: `✨ ${skill.name} - HP +${amount} 회복 (${battleState.player.resources.hp}/${battleState.player.stats.maxHp})`, type: 'heal' };
  }

  if (preview.manaGain) {
    playFloatingText({ targetEl: getParticleAnchors().player, text: `+${preview.manaGain} MP`, type: 'mana' });
    return { message: `🔹 ${skill.name} - MP +${preview.manaGain} 회복`, type: 'heal' };
  }

  if (!preview.damage || (preview.damage[0] === 0 && preview.damage[1] === 0)) {
    return { message: `🌀 ${skill.name} 사용`, type: 'status' };
  }

  const hitCount = skill.hits ?? 1;
  let totalDamage = 0;
  let criticalCount = 0;
  let blockedCount = 0;
  const powerMultiplier = (battleState.player.effects.powerup > 0 ? 2 : 1) * (battleState.player.effects.berserk > 0 ? 2 : 1);

  for (let hit = 0; hit < hitCount; hit += 1) {
    let damage = Math.floor(rand(preview.damage[0], preview.damage[1]) * powerMultiplier);
    let isCritical = Math.random() < Math.max(0, battleState.player.stats.crit ?? 0);

    if (isCritical) {
      damage = Math.floor(damage * PLAYER_CRIT_MULTIPLIER);
      criticalCount += 1;
    }
    if (skill.holy && battleState.enemy.el === 'dark') damage = Math.floor(damage * 2);
    if (skill.pen) damage = Math.floor(damage * 1.3);

    if (battleState.enemy.effects.shield > 0) {
      damage = 0;
      blockedCount += 1;
      battleState.enemy.effects.shield -= 1;
    }

    if (damage > 0 && skill.drain) {
      const drainAmount = Math.floor(damage * skill.drain);
      battleState.player.resources.hp = Math.min(battleState.player.stats.maxHp, battleState.player.resources.hp + drainAmount);
      playFloatingText({ targetEl: getParticleAnchors().player, text: `+${drainAmount}`, type: 'heal' });
    }

    battleState.enemy.curHp = Math.max(0, battleState.enemy.curHp - damage);
    totalDamage += damage;
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

  const hitText = hitCount > 1 ? ` (${hitCount}회 타격)` : '';
  const holyText = skill.holy && battleState.enemy.el === 'dark' ? ' [성속성 약점!]' : '';
  const critText = criticalCount > 0 ? ` / CRITICAL x${criticalCount}` : '';
  const blockedText = blockedCount > 0 && totalDamage === 0 ? ' / BLOCKED' : blockedCount > 0 ? ` / 방어 ${blockedCount}` : '';
  let message = `⚔️ ${skill.name}${hitText} - ${totalDamage} 피해${holyText}${critText}${blockedText}`;
  if (skill.effect?.burn) message += ' / 화상!';
  if (skill.effect?.freeze) message += ' / 빙결!';
  if (skill.effect?.stun) message += ' / 기절!';
  if (skill.effect?.poison) message += ' / 중독!';
  if (battleState.player.effects.berserk > 0) {
    const hpCost = rand(8, 15);
    battleState.player.resources.hp = Math.max(1, battleState.player.resources.hp - hpCost);
    playFloatingText({ targetEl: getParticleAnchors().player, text: `-${hpCost}`, type: 'damage' });
    message += ` (광폭 반동 -${hpCost} HP)`;
  }

  return { message, type: criticalCount > 0 ? 'heal' : 'dmg' };
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
}

function doEnemyAction() {
  if (!battleState.enemy || battleState.enemy.curHp <= 0 || battleState.player.resources.hp <= 0) {
    return;
  }

  if (hasControlEffect(battleState.enemy.effects)) {
    const label = battleState.enemy.effects.stun > 0 ? '기절' : battleState.enemy.effects.root > 0 ? '속박' : battleState.enemy.effects.freeze > 0 ? '빙결' : '마비';
    log(`⛓ ${battleState.enemy.name} - ${label} 상태로 행동 불가!`, 'status');
    consumeEnemyControlEffect();
    renderEffects();
    return;
  }

  if (battleState.player.effects.dodge > 0) {
    battleState.player.effects.dodge -= 1;
    playFloatingText({ targetEl: getParticleAnchors().player, text: 'MISS', type: 'miss' });
    log('💨 플레이어가 회피로 적 공격을 피했습니다!', 'status');
    renderEffects();
    return;
  }

  let damage = rand(battleState.enemy.atk[0], battleState.enemy.atk[1]);
  const enemyCritChance = Math.min(0.35, 0.05 + (battleState.enemy.attributes?.dexterity ?? 10) * 0.005);
  const isCritical = Math.random() < enemyCritChance;
  if (isCritical) {
    damage = Math.floor(damage * ENEMY_CRIT_MULTIPLIER);
  }

  if (battleState.player.effects.guard > 0) {
    damage = Math.floor(damage * 0.3);
    battleState.player.effects.guard -= 1;
  }

  if (battleState.player.effects.shield > 0) {
    battleState.player.effects.shield -= 1;
    playFloatingText({ targetEl: getParticleAnchors().player, text: 'BLOCKED', type: 'blocked' });
    log('🛡️ 보호막이 적의 공격을 차단했습니다!', 'status');
  } else {
    battleState.player.resources.hp = Math.max(0, battleState.player.resources.hp - damage);
    animatePlayerHit();
    playImpactParticles({ targetEl: getParticleAnchors().player, variant: 'player-hit', intensity: Math.min(1.8, damage / 24) });
    if (isCritical) {
      playFloatingText({ targetEl: getParticleAnchors().player, text: 'CRITICAL', type: 'critical' });
    }
    playFloatingText({ targetEl: getParticleAnchors().player, text: `-${damage}`, type: isCritical ? 'critical' : 'damage' });
    log(`🗡 ${battleState.enemy.name} 공격 - ${damage} 피해${isCritical ? ' / CRITICAL' : ''} (${battleState.player.resources.hp}/${battleState.player.stats.maxHp} HP)`, 'enemy');
    applyEnemySpecial(damage);
  }

  renderEffects();
  renderPlayerBars();
  renderEnemyBars();
}

function applyEnemySpecial(damage) {
  if (battleState.enemy.special === 'fire' && Math.random() < 0.3) {
    applyEffect(battleState.player.effects, { burn: 2 });
    log('🔥 화염 공격! 플레이어가 화상 상태가 되었습니다.', 'status');
  }

  if (battleState.enemy.special === 'fire_breath' && Math.random() < 0.45) {
    applyEffect(battleState.player.effects, { burn: 3 });
    log('🐉 브레스 공격! 강한 화상 상태가 적용되었습니다.', 'status');
  }

  if (battleState.enemy.special === 'drain' && Math.random() < 0.25) {
    const heal = Math.floor(damage * 0.3);
    battleState.enemy.curHp = Math.min(battleState.enemy.hp, battleState.enemy.curHp + heal);
    playFloatingText({ targetEl: getParticleAnchors().enemy, text: `+${heal}`, type: 'heal' });
    log(`🩸 리치가 생명력을 흡수했습니다! +${heal} HP`, 'enemy');
  }

  if (battleState.enemy.special === 'poison' && Math.random() < 0.3) {
    applyEffect(battleState.player.effects, { poison: 2 });
    log('☠️ 독 공격!', 'status');
  }
}

function tickEffects() {
  if (battleState.enemy) {
    if (battleState.enemy.effects.burn > 0) {
      const damage = rand(8, 14);
      battleState.enemy.curHp = Math.max(0, battleState.enemy.curHp - damage);
      battleState.enemy.effects.burn -= 1;
      playFloatingText({ targetEl: getParticleAnchors().enemy, text: `-${damage}`, type: 'damage' });
      log(`🔥 화상 지속 피해 ${damage}`, 'dmg');
    }

    if (battleState.enemy.effects.poison > 0) {
      const damage = rand(10, 18);
      battleState.enemy.curHp = Math.max(0, battleState.enemy.curHp - damage);
      battleState.enemy.effects.poison -= 1;
      playFloatingText({ targetEl: getParticleAnchors().enemy, text: `-${damage}`, type: 'damage' });
      log(`☠️ 중독 지속 피해 ${damage}`, 'dmg');
    }

    if (battleState.enemy.effects.slow > 0) battleState.enemy.effects.slow -= 1;
    if (battleState.enemy.effects.curse > 0) {
      const damage = rand(5, 10);
      battleState.enemy.curHp = Math.max(0, battleState.enemy.curHp - damage);
      battleState.enemy.effects.curse -= 1;
      playFloatingText({ targetEl: getParticleAnchors().enemy, text: `-${damage}`, type: 'damage' });
      log('🌑 저주 피해', 'dmg');
    }
  }

  if (battleState.player.effects.regen > 0) {
    battleState.player.resources.hp = Math.min(battleState.player.stats.maxHp, battleState.player.resources.hp + 15);
    battleState.player.effects.regen -= 1;
    playFloatingText({ targetEl: getParticleAnchors().player, text: '+15', type: 'heal' });
    log('💚 재생 +15 HP', 'heal');
  }

  if (battleState.player.effects.burn > 0) {
    const damage = rand(6, 12);
    battleState.player.resources.hp = Math.max(0, battleState.player.resources.hp - damage);
    battleState.player.effects.burn -= 1;
    animatePlayerHit();
    playImpactParticles({ targetEl: getParticleAnchors().player, variant: 'burn', intensity: 0.8 });
    playFloatingText({ targetEl: getParticleAnchors().player, text: `-${damage}`, type: 'damage' });
    log(`🔥 플레이어가 화상으로 ${damage} HP를 잃었습니다.`, 'enemy');
  }

  if (battleState.player.effects.poison > 0) {
    const damage = rand(8, 15);
    battleState.player.resources.hp = Math.max(0, battleState.player.resources.hp - damage);
    battleState.player.effects.poison -= 1;
    animatePlayerHit();
    playImpactParticles({ targetEl: getParticleAnchors().player, variant: 'poison', intensity: 0.9 });
    playFloatingText({ targetEl: getParticleAnchors().player, text: `-${damage}`, type: 'damage' });
    log(`☠️ 플레이어가 중독으로 ${damage} HP를 잃었습니다.`, 'enemy');
  }

  if (battleState.player.effects.powerup > 0) battleState.player.effects.powerup -= 1;
  if (battleState.player.effects.berserk > 0) battleState.player.effects.berserk -= 1;
  renderEffects();
}

function handleEnemyDefeat() {
  clearBattleTimers();
  clearTurnBar();
  markEnemyDead();
  setActiveSlot(null);
  battleState.fighting = false;
  battleState.turn.acting = false;
  battleState.score += battleState.enemy.reward;
  const gainedExp = grantExperience(battleState.enemy.progression?.exp ?? battleState.enemy.exp ?? 0, { trackBattle: true });
  const drops = rollLootForEnemy(battleState.enemy);
  if (drops.length > 0) {
    battleState.player.inventory.push(...drops);
  }
  renderScore();
  renderPlayerMeta();
  renderInventory();
  renderEquipment();
  log(`${battleState.enemy.name} 처치! +${battleState.enemy.reward} 코인 획득 / EXP +${gainedExp} / 전투 EXP ${battleState.battleProgress.expEarned}`, 'sys');
  drops.forEach((item) => {
    log(`획득: ${item.name} [${item.category}]`, 'heal');
  });

  if (getEnemyDefinitionForWave(battleState.waveIndex + 1)) {
    setControls({ canStart: false, showNext: true });
  } else {
    log('모든 웨이브를 클리어했습니다. 당신이 최강입니다.', 'sys');
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
  if (battleState.battleProgress.expEarned > 0) {
    log(`전투 경험치는 유지됩니다. 이번 전투 EXP ${battleState.battleProgress.expEarned}`, 'sys');
  }
  log('☠️ 전투 패배...', 'sys');
}

function endBattle(message) {
  clearBattleTimers();
  clearTurnBar();
  battleState.fighting = false;
  battleState.turn.acting = false;
  setActiveSlot(null);
  setControls({ canStart: true, showNext: false });
  log(message, 'sys');
  if (battleState.battleProgress.expEarned > 0) {
    log(`전투 참여 EXP ${battleState.battleProgress.expEarned} 획득`, 'sys');
  }
}

function grantExperience(amount, { trackBattle = false } = {}) {
  if (!amount || amount <= 0) {
    return 0;
  }

  const finalAmount = scaleExperienceGain(amount);
  battleState.player.progression.exp += finalAmount;
  if (trackBattle) {
    battleState.battleProgress.expEarned += finalAmount;
  }

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
  renderSidePanels();
  log(`🌟 레벨 업! Lv.${battleState.player.progression.level} / 스탯 포인트 +5`, 'sys');
}

function scaleExperienceGain(amount) {
  const level = battleState.player.progression.level;
  const earlyMultiplier = level <= 5
    ? [1.6, 1.45, 1.3, 1.18, 1.08][level - 1]
    : 1;

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
  battleState.overlays.levelUp.choices = choices;
  renderLevelUpOverlay();
}

function applyEffect(effectStore, effect) {
  Object.entries(effect).forEach(([key, value]) => {
    if (key === 'chance') {
      return;
    }
    effectStore[key] = (effectStore[key] || 0) + value;
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

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
