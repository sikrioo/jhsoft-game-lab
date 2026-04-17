import { ELEMENT_COLORS, EFFECT_ICONS, QUEUE_SIZE, RANK_LABELS, RARITY_LABELS } from '../data/constants.js';
import { SKILLS } from '../data/skills.js';
import { battleState } from '../domain/battle-state.js';
import { ITEM_CATEGORY_LABELS } from '../data/items.js';
import { allocateStat, equipItem, getEquipmentSlots, unequipItem, useConsumable } from '../systems/character-system.js';
import { getSkillLevel, getSkillPreview, MAX_SKILL_LEVEL } from '../systems/skill-system.js';
import { canPlaceSkill, placeSkillAt, removeSkillFromQueue } from '../systems/selection-system.js';

const elements = {};
let handlers = {};

export function initUI(actionHandlers) {
  handlers = actionHandlers;
  cacheElements();
  bindControls();
  bindSideTabs();
  bindPanelActions();
  buildSkillLibrary();
  buildQueueGrid();
}

export function buildSkillLibrary() {
  elements.skillLib.innerHTML = '';

  SKILLS.forEach((skill) => {
    const card = document.createElement('div');
    const cdText = skill.cd > 0 ? ` 쨌 CD ${skill.cd}` : '';
    const isDisabled = battleState.player.build.usedMana + skill.mp > battleState.player.build.manaLimit;
    const rarityLabel = RARITY_LABELS[skill.rarity] ?? skill.rarity;
    const skillLevel = getSkillLevel(skill.id);

    card.className = `skill-card el-${skill.el} rarity-${skill.rarity}${isDisabled ? ' disabled' : ''}`;
    card.innerHTML = `<span class="sk-ic">${skill.icon}</span><div class="sk-info"><div class="sk-name">${skill.name} <span class="rarity-tag rarity-${skill.rarity}">${rarityLabel}</span></div><div class="sk-type">${skill.type} 쨌 Lv.${skillLevel}</div><div class="sk-cost"><span style="color:${skill.mp > 0 ? '#7bbdff' : '#8fa2c6'}">MP ${skill.mp}</span><span style="color:#8fa2c6;font-size:11px;">${cdText}</span></div></div>`;
    card.addEventListener('mouseenter', () => showTip(skill));
    card.addEventListener('mouseleave', clearTip);
    card.addEventListener('mousedown', (event) => {
      if (isDisabled) {
        log(`諛곗뿴 留덈굹媛 遺議깊빐 ${skill.name}??瑜? ?ｌ쓣 ???놁뒿?덈떎.`, 'status');
        return;
      }
      startLibraryDrag(event, skill, card);
    });
    elements.skillLib.appendChild(card);
  });
}

export function buildQueueGrid() {
  elements.queueGrid.innerHTML = '';

  for (let index = 0; index < QUEUE_SIZE; index += 1) {
    const slot = document.createElement('div');
    slot.className = 'sq';
    slot.dataset.idx = String(index);
    slot.addEventListener('mouseenter', () => battleState.queue[index] && showTip(battleState.queue[index]));
    slot.addEventListener('mouseleave', clearTip);
    slot.addEventListener('mousedown', (event) => {
      if (event.target.classList.contains('sq-remove')) {
        return;
      }
      if (battleState.queue[index] && !battleState.fighting) {
        startSlotDrag(event, index, battleState.queue[index]);
      }
    });
    slot.addEventListener('dblclick', () => {
      if (battleState.fighting) {
        return;
      }
      if (removeSkillFromQueue(index)) {
        renderAllSlots();
        renderBuildMana();
        buildSkillLibrary();
      }
    });

    elements.queueGrid.appendChild(slot);
    renderSlot(index);
  }
}

export function renderSlot(index) {
  const slot = elements.queueGrid.querySelector(`.sq[data-idx="${index}"]`);
  if (!slot) {
    return;
  }

  const skill = battleState.queue[index];
  const cooldown = battleState.cooldowns[index];

  if (skill) {
    const cdText = cooldown > 0 ? `<span class="sq-cooldown">CD ${cooldown}</span>` : '';
    slot.className = `sq rarity-${skill.rarity}`;
    slot.innerHTML = `<span class="seq-num">${index + 1}</span><div class="sq-cd-overlay${cooldown > 0 ? ' active' : ''}">${cooldown > 0 ? cooldown : ''}</div><span class="sq-remove">✕</span><span class="sq-icon">${skill.icon}</span><span class="sq-name">${skill.name}</span>${cdText}`;
    slot.querySelector('.sq-icon').style.color = getElementColor(skill.el);
    slot.querySelector('.sq-remove').addEventListener('click', (event) => {
      event.stopPropagation();
      if (removeSkillFromQueue(index)) {
        renderAllSlots();
        renderBuildMana();
        buildSkillLibrary();
      }
    });
  } else {
    slot.className = 'sq';
    slot.innerHTML = `<span class="seq-num">${index + 1}</span><div class="sq-cd-overlay"></div><span class="sq-empty-hint">⬡</span>`;
  }

  renderQueueStatus();
}

export function renderAllSlots() {
  for (let index = 0; index < QUEUE_SIZE; index += 1) {
    renderSlot(index);
  }
}

export function renderEffects() {
  ['player', 'enemy'].forEach((target) => {
    const effectState = target === 'player' ? battleState.player.effects : battleState.enemy?.effects ?? {};
    const host = target === 'player' ? elements.playerEffects : elements.enemyEffects;
    host.innerHTML = Object.entries(effectState)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `<span class="sfx" title="${key}:${value}">${EFFECT_ICONS[key] || '•'}<span style="font-size:6px;font-family:var(--mono);color:#c9a84c;">${value}</span></span>`)
      .join('');
  });
}

export function renderPlayerBars() {
  elements.hpBar.style.width = `${(battleState.player.resources.hp / battleState.player.stats.maxHp) * 100}%`;
  elements.mpBar.style.width = `${(battleState.player.resources.mp / battleState.player.stats.maxMp) * 100}%`;
  elements.hpText.textContent = `${Math.floor(battleState.player.resources.hp)}/${battleState.player.stats.maxHp}`;
  elements.mpText.textContent = `${Math.floor(battleState.player.resources.mp)}/${battleState.player.stats.maxMp}`;
}

export function renderEnemyBars() {
  if (!battleState.enemy) {
    elements.enemyHpBar.style.width = '100%';
    elements.enemyHpText.textContent = '300/300';
    elements.enemyMpBar.style.width = '100%';
    elements.enemyMpText.textContent = '80/80';
    return;
  }

  elements.enemyHpBar.style.width = `${(battleState.enemy.curHp / battleState.enemy.hp) * 100}%`;
  elements.enemyHpText.textContent = `${Math.floor(battleState.enemy.curHp)}/${battleState.enemy.hp}`;
  const enemyMpMax = Math.max(1, battleState.enemy.maxMp ?? 0);
  const enemyMpCur = Math.max(0, battleState.enemy.curMp ?? 0);
  elements.enemyMpBar.style.width = `${(enemyMpCur / enemyMpMax) * 100}%`;
  elements.enemyMpText.textContent = `${Math.floor(enemyMpCur)}/${battleState.enemy.maxMp ?? 0}`;
}

export function renderBuildMana() {
  const { usedMana, manaLimit } = battleState.player.build;
  elements.buildManaStatus.textContent = `코스트: ${usedMana}/${manaLimit}`;
}

export function renderQueueStatus() {
  const count = battleState.queue.filter(Boolean).length;
  elements.queueStatus.textContent = `배열: ${count}/${QUEUE_SIZE}`;
}

export function renderWaveStatus() {
  elements.waveStatus.textContent = `웨이브 ${battleState.waveIndex + 1}/5`;
}

export function renderScore() {
  elements.scoreStatus.textContent = `Score: ${battleState.score.toLocaleString()}`;
}

export function renderPlayerMeta() {
  const { name } = battleState.player.profile;
  const { level, exp, nextExp, statPoints } = battleState.player.progression;

  elements.playerName.textContent = `${name} · Lv.${level}`;
  elements.playerLevelStatus.textContent = `Lv.${level} · EXP ${exp}/${nextExp}`;
  elements.characterSummary.innerHTML = `<div class="char-head"><span class="rarity-tag rarity-rare">ADVENTURER</span><strong>${name}</strong></div><div class="char-meta">레벨 ${level} · 남은 스탯 포인트 ${statPoints}</div>`;
  renderCharacterStats();
}

export function renderLevelUpOverlay() {
  const levelUpState = battleState.overlays.levelUp;
  if (!levelUpState.open || levelUpState.choices.length === 0) {
    hideLevelUpOverlay();
    return;
  }

  elements.levelUpOverlay.classList.remove('hidden');
  elements.levelUpCopy.textContent = levelUpState.pending > 1
    ? `레벨 업 보상이 ${levelUpState.pending}개 남았습니다. 하나를 선택하세요.`
    : '무작위 스킬 3개 중 하나를 선택하세요.';

  elements.levelUpChoices.innerHTML = levelUpState.choices.map((skill) => {
    const currentLevel = getSkillLevel(skill.id);
    const nextLevel = Math.min(MAX_SKILL_LEVEL, currentLevel + 1);
    const currentPreview = getSkillPreview(skill, currentLevel);
    const nextPreview = getSkillPreview(skill, nextLevel);
    const rarityLabel = RARITY_LABELS[skill.rarity] ?? skill.rarity;
    const damageLine = nextPreview.damage ? `<div class="levelup-stat">피해 ${formatRange(nextPreview.damage)} <span class="delta">${formatDeltaRange(currentPreview.damage, nextPreview.damage)}</span></div>` : '';
    const healLine = nextPreview.heal ? `<div class="levelup-stat">회복 ${formatRange(nextPreview.heal)} <span class="delta">${formatDeltaRange(currentPreview.heal, nextPreview.heal)}</span></div>` : '';
    const manaLine = nextPreview.manaGain > 0 ? `<div class="levelup-stat">MP 회복 +${nextPreview.manaGain}</div>` : '';

    return `<button class="levelup-card rarity-${skill.rarity}" data-action="pick-levelup-skill" data-skill-id="${skill.id}">
      <div class="levelup-card-top">
        <span class="levelup-icon">${skill.icon}</span>
        <div class="levelup-head">
          <div class="levelup-name">${skill.name}</div>
          <div class="levelup-meta"><span class="rarity-tag rarity-${skill.rarity}">${rarityLabel}</span><span>Lv.${currentLevel} -> Lv.${nextLevel}</span></div>
        </div>
      </div>
      <div class="levelup-desc">${skill.desc}</div>
      ${damageLine}${healLine}${manaLine}
    </button>`;
  }).join('');
}

export function hideLevelUpOverlay() {
  elements.levelUpOverlay.classList.add('hidden');
  elements.levelUpChoices.innerHTML = '';
}

export function renderCharacterStats() {
  const attrs = battleState.player.attributes;
  const { statPoints } = battleState.player.progression;
  const attrRows = [
    ['strength', '힘', attrs.strength],
    ['dexterity', '민첩', attrs.dexterity],
    ['intelligence', '지능', attrs.intelligence],
    ['vitality', '체력', attrs.vitality],
  ];

  elements.statList.innerHTML = attrRows
    .map(([key, label, value]) => `<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value">${value}</span><button class="mini-btn" data-action="alloc-stat" data-stat="${key}" ${statPoints <= 0 ? 'disabled' : ''}>+</button></div>`)
    .join('');

  const derived = battleState.player.stats;
  elements.derivedList.innerHTML = [
    ['공격력', derived.atk],
    ['방어력', derived.def],
    ['속도', derived.speed],
    ['치명타', `${Math.round(derived.crit * 100)}%`],
    ['최대 HP', derived.maxHp],
    ['최대 MP', derived.maxMp],
  ].map(([label, value]) => `<div class="stat-row derived"><span class="stat-label">${label}</span><span class="stat-value">${value}</span></div>`).join('');
}

export function renderInventory() {
  const rows = battleState.player.inventory;
  if (rows.length === 0) {
    elements.inventoryList.innerHTML = `<div class="empty-panel">인벤토리가 비어 있습니다.</div>`;
    elements.equipInventoryList.innerHTML = `<div class="empty-panel">장착 가능한 장비가 없습니다.</div>`;
    return;
  }

  elements.inventoryList.innerHTML = rows.map((item) => renderInventoryItem(item, true)).join('');
  const equipables = rows.filter((item) => item.category === 'equipment');
  elements.equipInventoryList.innerHTML = equipables.length > 0
    ? equipables.map((item) => renderInventoryItem(item, false)).join('')
    : `<div class="empty-panel">장착 가능한 장비가 없습니다.</div>`;
}

export function renderEquipment() {
  elements.equipSlots.innerHTML = getEquipmentSlots().map(({ slotKey, label, item }) => {
    if (!item) {
      return `<div class="equip-row empty"><span class="equip-slot">${label}</span><span class="equip-item">鍮꾩뼱 ?덉쓬</span></div>`;
    }
    return `<div class="equip-row rarity-${item.rarity}"><span class="equip-slot">${label}</span><div class="equip-main"><span class="equip-item">${item.icon} ${item.name}</span><span class="equip-stats">${formatItemStats(item.stats)}</span></div><button class="mini-btn" data-action="unequip-item" data-slot="${slotKey}">?댁젣</button></div>`;
  }).join('');
}

export function renderSidePanels() {
  renderInventory();
  renderEquipment();
  renderCharacterStats();
}

export function setWaveHeader(text) {
  elements.waveHeader.textContent = text;
}

export function setEnemyInfo(enemy) {
  const rankLabel = RANK_LABELS[enemy.rank] ?? enemy.rank;
  const rarityLabel = RARITY_LABELS[enemy.rarity] ?? enemy.rarity;
  elements.enemyName.innerHTML = `<span class="enemy-rank rank-${enemy.rank}">${rankLabel}</span> <span class="enemy-rarity rarity-${enemy.rarity}">${rarityLabel}</span> Lv.${enemy.progression?.level ?? enemy.level ?? 1} ${enemy.name}`;
  elements.enemySprite.textContent = enemy.icon;
  elements.enemySprite.className = `fighter-sprite enemy-rarity-${enemy.rarity}`;
  elements.enemySprite.classList.remove('dead');
}

export function setControls({ canStart, showNext }) {
  elements.startButton.disabled = !canStart;
  elements.nextButton.style.display = showNext ? '' : 'none';
}

export function setActiveSlot(index) {
  elements.queueGrid.querySelectorAll('.sq').forEach((slot) => slot.classList.remove('active-slot'));
  if (index !== null && index !== undefined) {
    elements.queueGrid.querySelector(`.sq[data-idx="${index}"]`)?.classList.add('active-slot');
  }
}

export function renderTurnMeters(playerMeter = 0, enemyMeter = 0) {
  elements.turnFillPlayer.style.width = `${Math.max(0, Math.min(100, playerMeter))}%`;
  elements.turnFillEnemy.style.width = `${Math.max(0, Math.min(100, enemyMeter))}%`;
}

export function clearTurnBar() {
  elements.turnFillPlayer.style.width = '0%';
  elements.turnFillEnemy.style.width = '0%';
}

export function animatePlayerAttack() {
  replayAnimation(elements.playerSprite, 'attack-anim');
}

export function animatePlayerHit() {
  replayAnimation(elements.playerFighter, 'impact-anim');
  replayAnimation(elements.playerSprite, 'hit-anim');
}

export function animateEnemyHit() {
  replayAnimation(elements.enemyFighter, 'impact-anim');
  replayAnimation(elements.enemySprite, 'hit-anim');
}

export function getParticleAnchors() {
  return {
    player: elements.playerSprite,
    enemy: elements.enemySprite,
  };
}

export function markPlayerDead() {
  elements.playerSprite.classList.add('dead');
}

export function markEnemyDead() {
  elements.enemySprite.classList.add('dead');
}

export function clearLog() {
  elements.log.innerHTML = '';
}

export function log(message, type = '') {
  const row = document.createElement('div');
  row.className = `blog-line ${type}`;
  row.textContent = message;
  elements.log.appendChild(row);
  elements.log.scrollTop = elements.log.scrollHeight;
}

export function clearTip() {
  elements.tip.innerHTML = '<div class="tip-empty">스킬에 마우스를 올려보세요.</div>';
}

export function showTip(skill) {
  const preview = getSkillPreview(skill);
  const skillLevel = getSkillLevel(skill.id);
  const effectText = preview.effect ? `<div class="tip-row">?④낵: <span>${formatEffect(preview.effect)}</span></div>` : '';
  const damageText = preview.damage && (preview.damage[0] > 0 || preview.damage[1] > 0) ? `<div class="tip-row">?쇳빐: <span>${preview.damage[0]}~${preview.damage[1]}</span></div>` : '';
  const healText = preview.heal ? `<div class="tip-row">?뚮났: <span>${preview.heal[0]}~${preview.heal[1]}</span></div>` : '';
  const hitsText = skill.hits ? `<div class="tip-row">타격 횟수: <span>${skill.hits}회</span></div>` : '';
  const dotText = skill.dot && preview.damage ? `<div class="tip-row">지속 피해: <span>${preview.damage[0]}~${preview.damage[1]} x ${skill.dot}턴</span></div>` : '';
  const mpGainText = preview.manaGain ? `<div class="tip-row">MP ?뚮났: <span>+${preview.manaGain}</span></div>` : '';
  const selectionCost = `<div class="tip-row">코스트: <span>${skill.mp}</span></div>`;
  const rarityLabel = RARITY_LABELS[skill.rarity] ?? skill.rarity;

  elements.tip.innerHTML = `<div class="tip-nm rarity-${skill.rarity}" style="color:${getElementColor(skill.el)}">${skill.name}</div><div class="tip-ty">${rarityLabel} · ${skill.type} · Lv.${skillLevel}</div><hr class="tip-div"><div class="tip-row">전투 MP: <span>${skill.mp}</span> / CD: <span>${skill.cd}턴</span></div>${selectionCost}${damageText}${healText}${hitsText}${dotText}${mpGainText}${effectText}<hr class="tip-div"><div class="tip-row" style="font-style:italic;color:#7a6040;font-family:var(--mono);">${skill.desc}</div>`;
}

export function resetPresentation() {
  elements.playerSprite.classList.remove('dead');
  elements.enemySprite.className = 'fighter-sprite';
  elements.enemySprite.classList.remove('dead');
  elements.enemySprite.textContent = '?쭫';
  elements.enemyName.textContent = 'DARK KNIGHT';
  elements.playerEffects.innerHTML = '';
  elements.enemyEffects.innerHTML = '';
  clearTurnBar();
  elements.nextButton.style.display = 'none';
  elements.startButton.disabled = false;
  elements.speedButton.textContent = `${battleState.speed}x`;
  setWaveHeader('웨이브 1 - 전투 준비');
  renderWaveStatus();
  renderScore();
  renderPlayerMeta();
  renderBuildMana();
  renderQueueStatus();
  renderInventory();
  renderEquipment();
  buildSkillLibrary();
}

function cacheElements() {
  elements.skillLib = document.getElementById('skill-lib');
  elements.queueGrid = document.getElementById('queue-grid');
  elements.tip = document.getElementById('tip');
  elements.log = document.getElementById('blog');
  elements.waveHeader = document.getElementById('wave-hdr');
  elements.queueStatus = document.getElementById('s-queue');
  elements.buildManaStatus = document.getElementById('s-build-mana');
  elements.playerLevelStatus = document.getElementById('s-player-level');
  elements.waveStatus = document.getElementById('s-wave');
  elements.scoreStatus = document.getElementById('s-score');
  elements.startButton = document.getElementById('btn-start');
  elements.nextButton = document.getElementById('btn-next');
  elements.resetButton = document.getElementById('btn-reset');
  elements.speedButton = document.getElementById('btn-speed');
  elements.playerFighter = document.getElementById('f-player');
  elements.playerSprite = document.getElementById('sp-player');
  elements.playerName = document.getElementById('player-name');
  elements.enemyFighter = document.getElementById('f-enemy');
  elements.enemySprite = document.getElementById('sp-enemy');
  elements.enemyName = document.getElementById('enemy-name');
  elements.playerEffects = document.getElementById('sfx-player');
  elements.enemyEffects = document.getElementById('sfx-enemy');
  elements.hpBar = document.getElementById('hp-bar');
  elements.mpBar = document.getElementById('mp-bar');
  elements.enemyHpBar = document.getElementById('ehp-bar');
  elements.enemyMpBar = document.getElementById('emp-bar');
  elements.hpText = document.getElementById('hp-txt');
  elements.mpText = document.getElementById('mp-txt');
  elements.enemyHpText = document.getElementById('ehp-txt');
  elements.enemyMpText = document.getElementById('emp-txt');
  elements.turnFillPlayer = document.getElementById('turn-fill-player');
  elements.turnFillEnemy = document.getElementById('turn-fill-enemy');
  elements.ghost = document.getElementById('gh');
  elements.sideTabs = [...document.querySelectorAll('.side-tab')];
  elements.sidePanels = [...document.querySelectorAll('.side-panel')];
  elements.inventoryList = document.getElementById('inventory-list');
  elements.characterSummary = document.getElementById('character-summary');
  elements.statList = document.getElementById('stat-list');
  elements.derivedList = document.getElementById('derived-list');
  elements.equipSlots = document.getElementById('equip-slots');
  elements.equipInventoryList = document.getElementById('equip-inventory-list');
  elements.levelUpOverlay = document.getElementById('levelup-overlay');
  elements.levelUpChoices = document.getElementById('levelup-choices');
  elements.levelUpCopy = document.getElementById('levelup-copy');
}

function bindControls() {
  elements.startButton.addEventListener('click', handlers.startBattle);
  elements.nextButton.addEventListener('click', handlers.nextWave);
  elements.resetButton.addEventListener('click', handlers.resetBattle);
  elements.speedButton.addEventListener('click', handlers.toggleSpeed);
}

function bindSideTabs() {
  elements.sideTabs.forEach((tab) => {
    tab.addEventListener('click', () => setActiveSideTab(tab.dataset.tab));
  });
}

function bindPanelActions() {
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) {
      return;
    }

    const action = target.dataset.action;
    if (action === 'alloc-stat') {
      const result = allocateStat(target.dataset.stat);
      if (!result.ok) {
        log(result.reason, 'status');
      }
      handlers.refreshPanels?.();
    }

    if (action === 'equip-item') {
      const result = equipItem(target.dataset.itemId);
      if (!result.ok) {
        log(result.reason, 'status');
      }
      handlers.refreshPanels?.();
    }

    if (action === 'unequip-item') {
      const result = unequipItem(target.dataset.slot);
      if (!result.ok) {
        log(result.reason, 'status');
      }
      handlers.refreshPanels?.();
    }

    if (action === 'use-item') {
      const result = useConsumable(target.dataset.itemId);
      if (!result.ok) {
        log(result.reason, 'status');
      } else {
        log(`${result.item.name} ?ъ슜`, 'heal');
      }
      handlers.refreshPanels?.();
    }

    if (action === 'pick-levelup-skill') {
      handlers.chooseLevelUpSkill?.(target.dataset.skillId);
    }
  });
}

function setActiveSideTab(tabId) {
  elements.sideTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === tabId));
  elements.sidePanels.forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === tabId));
}

function startLibraryDrag(event, skill, card) {
  event.preventDefault();
  battleState.drag = { source: 'library', skill, card };
  card.classList.add('dragging');
  showGhost(skill, event.clientX, event.clientY);
  attachDragListeners();
}

function startSlotDrag(event, index, skill) {
  event.preventDefault();
  battleState.drag = { source: 'slot', originIndex: index, skill };
  battleState.queue[index] = null;
  battleState.cooldowns[index] = 0;
  battleState.player.build.usedMana = battleState.queue.reduce((total, queuedSkill) => total + (queuedSkill?.mp ?? 0), 0);
  renderAllSlots();
  renderBuildMana();
  buildSkillLibrary();
  showGhost(skill, event.clientX, event.clientY);
  attachDragListeners();
}

function showGhost(skill, x, y) {
  elements.ghost.textContent = skill.icon;
  elements.ghost.style.left = `${x}px`;
  elements.ghost.style.top = `${y}px`;
  elements.ghost.style.display = 'flex';
}

function attachDragListeners() {
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
}

function onDragMove(event) {
  if (!battleState.drag) {
    return;
  }

  elements.ghost.style.left = `${event.clientX}px`;
  elements.ghost.style.top = `${event.clientY}px`;
  clearSlotHighlights();

  const hoveredSlot = getHoveredSlot(event.clientX, event.clientY);
  if (!hoveredSlot) {
    return;
  }

  const targetIndex = Number(hoveredSlot.dataset.idx);
  const available = canPlaceSkill(battleState.drag.skill, targetIndex, battleState.drag.originIndex ?? null);
  hoveredSlot.classList.add(available ? 'drag-ok' : 'drag-no');
}

function onDragEnd(event) {
  if (!battleState.drag) {
    return;
  }

  elements.ghost.style.display = 'none';
  clearSlotHighlights();
  const hoveredSlot = getHoveredSlot(event.clientX, event.clientY);
  const droppedOnLibrary = isOverSkillLibrary(event.clientX, event.clientY);

  if (hoveredSlot && !battleState.fighting) {
    const targetIndex = Number(hoveredSlot.dataset.idx);
    const result = placeSkillAt(battleState.drag.skill, targetIndex, battleState.drag.originIndex ?? null);
    if (!result.ok && battleState.drag.source === 'slot') {
      placeSkillAt(battleState.drag.skill, battleState.drag.originIndex, battleState.drag.originIndex);
      log(result.reason, 'status');
    } else if (!result.ok) {
      log(result.reason, 'status');
    }
  } else if (battleState.drag.source === 'slot' && droppedOnLibrary) {
    log(`${battleState.drag.skill.name} 諛곗튂瑜??댁젣?덉뒿?덈떎.`, 'status');
  } else if (battleState.drag.source === 'slot') {
    placeSkillAt(battleState.drag.skill, battleState.drag.originIndex, battleState.drag.originIndex);
  }

  battleState.drag.card?.classList.remove('dragging');
  battleState.drag = null;
  renderAllSlots();
  renderBuildMana();
  buildSkillLibrary();
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
}

function clearSlotHighlights() {
  elements.queueGrid.querySelectorAll('.sq.drag-ok,.sq.drag-no').forEach((slot) => slot.classList.remove('drag-ok', 'drag-no'));
}

function getHoveredSlot(x, y) {
  const slots = elements.queueGrid.querySelectorAll('.sq');
  for (const slot of slots) {
    const rect = slot.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return slot;
    }
  }
  return null;
}

function isOverSkillLibrary(x, y) {
  if (!elements.skillLib) {
    return false;
  }

  const rect = elements.skillLib.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function renderInventoryItem(item, includeUseAction) {
  const rarityLabel = RARITY_LABELS[item.rarity] ?? item.rarity;
  const categoryLabel = ITEM_CATEGORY_LABELS[item.category] ?? item.category;
  const actionButton = item.category === 'equipment'
    ? `<button class="mini-btn" data-action="equip-item" data-item-id="${item.id}">장착</button>`
    : item.category === 'consumable' && includeUseAction
      ? `<button class="mini-btn" data-action="use-item" data-item-id="${item.id}">사용</button>`
      : '';

  return `<div class="inventory-row rarity-${item.rarity}"><div class="inventory-main"><div class="inventory-name">${item.icon} ${item.name}</div><div class="inventory-meta"><span class="rarity-tag rarity-${item.rarity}">${rarityLabel}</span><span class="item-category">${categoryLabel}</span></div><div class="inventory-desc">${item.desc ?? ''}</div>${item.stats ? `<div class="inventory-stats">${formatItemStats(item.stats)}</div>` : ''}</div>${actionButton}</div>`;
}

function formatItemStats(stats = {}) {
  return Object.entries(stats)
    .map(([key, value]) => `${formatStatKey(key)} +${typeof value === 'number' && value < 1 ? `${Math.round(value * 100)}%` : value}`)
    .join(' · ');
}

function formatEffect(effect) {
  return Object.entries(effect)
    .filter(([key]) => key !== 'chance')
    .map(([key, value]) => `${formatStatKey(key)} ${value}`)
    .join(' | ');
}

function formatStatKey(key) {
  return {
    strength: '힘',
    dexterity: '민첩',
    intelligence: '지능',
    vitality: '체력',
    atk: '공격력',
    def: '방어력',
    speed: '속도',
    crit: '치명타',
    hp: 'HP',
    mp: 'MP',
    maxHp: '최대 HP',
    maxMp: '최대 MP',
    burn: '화상',
    freeze: '빙결',
    poison: '중독',
    stun: '기절',
    slow: '감속',
    root: '속박',
    paralyze: '마비',
    curse: '저주',
    regen: '재생',
    powerup: '강화',
    berserk: '광폭',
    shield: '보호막',
    dodge: '회피',
    guard: '방어',
  }[key] ?? key;
}

function getElementColor(element) {
  return ELEMENT_COLORS[element] ?? '#c9a84c';
}

function replayAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function formatRange(range) {
  return Array.isArray(range) ? `${range[0]}~${range[1]}` : '-';
}

function formatDeltaRange(currentRange, nextRange) {
  if (!Array.isArray(currentRange) || !Array.isArray(nextRange)) {
    return '';
  }

  const minDelta = nextRange[0] - currentRange[0];
  const maxDelta = nextRange[1] - currentRange[1];
  return `(+${minDelta}~+${maxDelta})`;
}


