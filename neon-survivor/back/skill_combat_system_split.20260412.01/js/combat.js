import { DEFAULT_STARTER, QUEUE_SIZE, SKILLS, WAVES } from './data.js';
import { clearTimers, resetBattleState, state } from './state.js';
import {
  animateEnemyHit,
  animatePlayerAttack,
  animatePlayerHit,
  animateTurnBar,
  clearLog,
  clearTurnBar,
  log,
  renderEffects,
  renderSlot,
  resetPresentation,
  setActiveSlot,
  setBattleControls,
  setEnemyPresentation,
  setWaveHeader,
  showEnemyDeath,
  showPlayerDeath,
  updateBars,
  updateScore,
  updateWaveLabel,
} from './ui.js';

export function loadStarterQueue() {
  DEFAULT_STARTER.forEach((id, index) => {
    const skill = SKILLS.find((entry) => entry.id === id);
    if (skill) {
      state.queue[index] = skill;
      renderSlot(index);
    }
  });
}

export function startBattle() {
  if (!state.queue.some(Boolean)) {
    log('먼저 스킬을 배열에 배치해 주세요!', 'sys');
    return;
  }

  if (state.player.hp <= 0) {
    log('캐릭터가 사망했습니다. 초기화 후 다시 시작하세요.', 'sys');
    return;
  }

  clearTimers();
  state.fighting = true;
  state.cdState.fill(0);
  loadWave(state.waveIdx);
  setBattleControls({ canStart: false, showNextWave: false });
  runBattleLoop();
}

export function nextWave() {
  if (state.waveIdx >= WAVES.length - 1) {
    return;
  }

  state.waveIdx += 1;
  state.fighting = true;
  state.cdState.fill(0);
  state.player.mp = Math.min(state.player.maxMp, state.player.mp + 50);

  for (let index = 0; index < QUEUE_SIZE; index += 1) {
    renderSlot(index);
  }

  log('✦ 다음 웨이브! MP +50 회복', 'sys');
  setBattleControls({ canStart: false, showNextWave: false });
  loadWave(state.waveIdx);
  runBattleLoop();
}

export function resetBattle() {
  resetBattleState();
  clearLog();
  resetPresentation();

  for (let index = 0; index < QUEUE_SIZE; index += 1) {
    renderSlot(index);
  }

  updateBars();
  renderEffects();
  log('⬥ 초기화 완료 - 스킬을 배열하고 전투를 시작하세요', 'sys');
}

export function toggleSpeed() {
  const speeds = [1, 2, 4];
  const current = speeds.indexOf(state.battleSpeed);
  state.battleSpeed = speeds[(current + 1) % speeds.length];
  document.getElementById('btn-speed').textContent = `${state.battleSpeed}x`;
}

function loadWave(index) {
  const wave = WAVES[index];
  state.enemy = { ...wave, curHp: wave.hp, effects: {} };

  setEnemyPresentation(wave.name, wave.icon);
  updateBars();
  updateWaveLabel();
  setWaveHeader(`웨이브 ${index + 1}/${WAVES.length} - ${wave.name}`);
  log(`⚔ ${wave.name} 등장! HP: ${wave.hp}`, 'sys');
}

function runBattleLoop() {
  const slotOrder = state.queue.map((skill, index) => (skill ? index : -1)).filter((index) => index >= 0);
  if (slotOrder.length === 0) {
    endBattle('스킬이 없습니다');
    return;
  }

  let cursor = 0;

  const doTurn = () => {
    if (!state.fighting || !state.enemy || state.enemy.curHp <= 0 || state.player.hp <= 0) {
      return;
    }

    const slotIndex = slotOrder[cursor % slotOrder.length];
    const skill = state.queue[slotIndex];

    if (!skill) {
      cursor += 1;
      scheduleNextTurn(doTurn);
      return;
    }

    setActiveSlot(slotIndex);

    if (state.cdState[slotIndex] > 0) {
      log(`${skill.name} 재충전 중... (${state.cdState[slotIndex]}턴 남음)`, 'status');
      state.cdState[slotIndex] -= 1;
      renderSlot(slotIndex);
      cursor += 1;
      doEnemyAction();
      scheduleNextTurn(doTurn);
      return;
    }

    if (state.player.mp < skill.mp) {
      log(`MP 부족 - ${skill.name} 사용 불가 (필요 ${skill.mp}, 보유 ${state.player.mp})`, 'status');
      cursor += 1;
      doEnemyAction();
      scheduleNextTurn(doTurn);
      return;
    }

    state.player.mp = Math.max(0, state.player.mp - skill.mp);
    if (skill.cd > 0) {
      state.cdState[slotIndex] = skill.cd;
      renderSlot(slotIndex);
    }

    animatePlayerAttack();
    const result = executeSkill(skill);
    log(result.message, result.type);

    if (skill.mpgain) {
      state.player.mp = Math.min(state.player.maxMp, state.player.mp + skill.mpgain);
    }

    applySkillEffects(skill);
    tickEffects();
    updateBars();

    if (state.enemy.curHp <= 0) {
      handleEnemyDefeat();
      return;
    }

    if (state.player.hp <= 0) {
      handlePlayerDefeat();
      return;
    }

    cursor += 1;
    doEnemyAction();
    scheduleNextTurn(doTurn);
  };

  scheduleNextTurn(doTurn);
}

function scheduleNextTurn(doTurn) {
  const delay = Math.max(300, 1000 / state.battleSpeed);
  animateTurnBar(delay);
  state.battleTimeoutId = setTimeout(doTurn, delay);
}

function executeSkill(skill) {
  if (skill.heal) {
    const amount = rand(skill.heal[0], skill.heal[1]);
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + amount);
    return { message: `💚 ${skill.name} - HP +${amount} 회복 (${state.player.hp}/${state.player.maxHp})`, type: 'heal' };
  }

  if (skill.mpgain) {
    return { message: `✨ ${skill.name} - MP +${skill.mpgain} 회복`, type: 'heal' };
  }

  if (!skill.dmg || (skill.dmg[0] === 0 && skill.dmg[1] === 0)) {
    return { message: `✦ ${skill.name} 사용`, type: 'status' };
  }

  const hitCount = skill.hits ?? 1;
  let totalDamage = 0;
  const powerMultiplier = (state.player.effects.powerup > 0 ? 2 : 1) * (state.player.effects.berserk > 0 ? 2 : 1);

  for (let hit = 0; hit < hitCount; hit += 1) {
    let damage = Math.floor(rand(skill.dmg[0], skill.dmg[1]) * powerMultiplier);

    if (skill.holy && state.enemy.el === 'dark') {
      damage = Math.floor(damage * 2);
    }

    if (skill.pen) {
      damage = Math.floor(damage * 1.3);
    }

    if (state.enemy.effects.shield > 0) {
      damage = 0;
      state.enemy.effects.shield -= 1;
    }

    if (skill.drain) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + Math.floor(damage * skill.drain));
    }

    state.enemy.curHp = Math.max(0, state.enemy.curHp - damage);
    totalDamage += damage;
  }

  animateEnemyHit();

  const hitText = hitCount > 1 ? ` (${hitCount}회 타격)` : '';
  const holyText = skill.holy && state.enemy.el === 'dark' ? ' [성스러운 일격!]' : '';
  let message = `⚔ ${skill.name}${hitText} - ${totalDamage} 피해${holyText}`;

  if (skill.drain) {
    message += ` / HP +${Math.floor(totalDamage * skill.drain)} 흡수`;
  }

  if (skill.effect?.burn) message += ' / 화상!';
  if (skill.effect?.freeze) message += ' / 빙결!';
  if (skill.effect?.stun) message += ' / 스턴!';
  if (skill.effect?.poison) message += ' / 독!';

  if (state.player.effects.berserk > 0) {
    const cost = rand(8, 15);
    state.player.hp = Math.max(1, state.player.hp - cost);
    message += ` (광폭화: -${cost} HP)`;
  }

  return { message, type: 'dmg' };
}

function applySkillEffects(skill) {
  if (!skill.effect) {
    return;
  }

  const effect = rollEffect(skill.effect);
  if (!effect) {
    return;
  }

  if (skill.target === 'self') {
    applyEffect(state.player.effects, effect);
  } else {
    applyEffect(state.enemy.effects, effect);
  }
}

function doEnemyAction() {
  if (!state.enemy || state.enemy.curHp <= 0 || state.player.hp <= 0) {
    return;
  }

  if (hasControlEffect(state.enemy.effects)) {
    const label = state.enemy.effects.stun > 0 ? '스턴' : state.enemy.effects.root > 0 ? '속박' : state.enemy.effects.freeze > 0 ? '빙결' : '마비';
    log(`👹 ${state.enemy.name} - ${label} 상태로 행동 불능!`, 'status');
    consumeEnemyControlEffect();
    renderEffects();
    return;
  }

  if (state.player.effects.dodge > 0) {
    state.player.effects.dodge -= 1;
    log('✨ 순간이동으로 적 공격 회피!', 'status');
    renderEffects();
    return;
  }

  let damage = rand(state.enemy.atk[0], state.enemy.atk[1]);

  if (state.player.effects.guard > 0) {
    damage = Math.floor(damage * 0.3);
    state.player.effects.guard -= 1;
  }

  if (state.player.effects.shield > 0) {
    state.player.effects.shield -= 1;
    log('🛡️ 신성 보호막이 공격을 차단!', 'status');
  } else {
    state.player.hp = Math.max(0, state.player.hp - damage);
    animatePlayerHit();
    log(`👹 ${state.enemy.name} 공격 - ${damage} 피해 (${state.player.hp}/${state.player.maxHp} HP)`, 'enemy');
    applyEnemySpecial(damage);
  }

  renderEffects();
  updateBars();
}

function applyEnemySpecial(damage) {
  if (state.enemy.special === 'fire' && Math.random() < 0.3) {
    applyEffect(state.player.effects, { burn: 2 });
    log('🔥 화염 공격! 화상 상태!', 'status');
  }

  if (state.enemy.special === 'fire_breath' && Math.random() < 0.45) {
    applyEffect(state.player.effects, { burn: 3 });
    log('🐉 브레스 공격! 강한 화상 상태!', 'status');
  }

  if (state.enemy.special === 'drain' && Math.random() < 0.25) {
    const heal = Math.floor(damage * 0.3);
    state.enemy.curHp = Math.min(state.enemy.hp, state.enemy.curHp + heal);
    log(`💀 리치가 생명을 흡수! +${heal} HP`, 'enemy');
  }

  if (state.enemy.special === 'poison' && Math.random() < 0.3) {
    applyEffect(state.player.effects, { poison: 2 });
    log('☠️ 독 공격!', 'status');
  }
}

function tickEffects() {
  if (state.enemy) {
    if (state.enemy.effects.burn > 0) {
      const damage = rand(8, 14);
      state.enemy.curHp = Math.max(0, state.enemy.curHp - damage);
      state.enemy.effects.burn -= 1;
      log(`🔥 화상 지속 피해 ${damage}`, 'dmg');
    }

    if (state.enemy.effects.poison > 0) {
      const damage = rand(10, 18);
      state.enemy.curHp = Math.max(0, state.enemy.curHp - damage);
      state.enemy.effects.poison -= 1;
      log(`☠️ 독 지속 피해 ${damage}`, 'dmg');
    }

    if (state.enemy.effects.slow > 0) {
      state.enemy.effects.slow -= 1;
    }

    if (state.enemy.effects.curse > 0) {
      state.enemy.curHp = Math.max(0, state.enemy.curHp - rand(5, 10));
      state.enemy.effects.curse -= 1;
      log('💀 저주 피해', 'dmg');
    }
  }

  if (state.player.effects.regen > 0) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 15);
    state.player.effects.regen -= 1;
    log('💛 재생 +15 HP', 'heal');
  }

  if (state.player.effects.burn > 0) {
    const damage = rand(6, 12);
    state.player.hp = Math.max(0, state.player.hp - damage);
    state.player.effects.burn -= 1;
    log(`🔥 화상 ${damage} HP 손실`, 'enemy');
  }

  if (state.player.effects.poison > 0) {
    const damage = rand(8, 15);
    state.player.hp = Math.max(0, state.player.hp - damage);
    state.player.effects.poison -= 1;
    log(`☠️ 독 ${damage} HP 손실`, 'enemy');
  }

  if (state.player.effects.powerup > 0) {
    state.player.effects.powerup -= 1;
  }

  if (state.player.effects.berserk > 0) {
    state.player.effects.berserk -= 1;
  }

  renderEffects();
}

function handleEnemyDefeat() {
  clearTimers();
  showEnemyDeath();
  setActiveSlot(null);
  state.fighting = false;
  state.score += state.enemy.reward;
  updateScore();
  log(`${state.enemy.name} 처치! +${state.enemy.reward} 포인트 획득`, 'sys');

  if (state.waveIdx < WAVES.length - 1) {
    setBattleControls({ canStart: false, showNextWave: true });
  } else {
    log('🏆 모든 웨이브 클리어! 당신이 최강입니다!', 'sys');
    setBattleControls({ canStart: true, showNextWave: false });
  }
}

function handlePlayerDefeat() {
  clearTimers();
  state.fighting = false;
  showPlayerDeath();
  setActiveSlot(null);
  setBattleControls({ canStart: true, showNextWave: false });
  log('💀 전투 패배...', 'sys');
}

function endBattle(message) {
  clearTimers();
  clearTurnBar();
  state.fighting = false;
  setActiveSlot(null);
  setBattleControls({ canStart: true, showNextWave: false });
  log(message, 'sys');
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
  if (state.enemy.effects.stun > 0) state.enemy.effects.stun -= 1;
  if (state.enemy.effects.root > 0) state.enemy.effects.root -= 1;
  if (state.enemy.effects.freeze > 0) state.enemy.effects.freeze -= 1;
  if (state.enemy.effects.paralyze > 0) state.enemy.effects.paralyze -= 1;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
