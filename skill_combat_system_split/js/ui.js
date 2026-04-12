import { QUEUE_SIZE, SKILLS } from './data.js';
import { state } from './state.js';

const EFFECT_ICONS = {
  burn: '🔥',
  freeze: '❄️',
  poison: '☠️',
  stun: '💫',
  slow: '🐢',
  root: '🌿',
  paralyze: '⚡',
  curse: '💀',
  regen: '💛',
  powerup: '💪',
  berserk: '😡',
  shield: '🛡️',
  dodge: '✨',
  guard: '🔰',
  knockback: '💨',
};

const elements = {};
let actionHandlers = {};

export function initUI(handlers) {
  actionHandlers = handlers;
  cacheElements();
  bindControls();
  buildSkillLibrary();
  buildQueueGrid();
}

export function buildSkillLibrary() {
  elements.skillLib.innerHTML = '';

  SKILLS.forEach((skill) => {
    const card = document.createElement('div');
    const mpColor = skill.mp > 0 ? '#4070b0' : '#5a4020';
    const cdText = skill.cd > 0 ? `&nbsp;· CD ${skill.cd}` : '';

    card.className = `skill-card el-${skill.el}`;
    card.innerHTML = `<span class="sk-ic">${skill.icon}</span><div class="sk-info"><div class="sk-name">${skill.name}</div><div class="sk-type">${skill.type}</div><div class="sk-cost"><span style="color:${mpColor}">MP ${skill.mp}</span><span style="color:#4a3820;font-size:7px;">${cdText}</span></div></div>`;
    card.addEventListener('mouseenter', () => showTip(skill));
    card.addEventListener('mouseleave', clearTip);
    card.addEventListener('mousedown', (event) => startLibraryDrag(event, skill, card));

    elements.skillLib.appendChild(card);
  });
}

export function buildQueueGrid() {
  elements.queueGrid.innerHTML = '';

  for (let index = 0; index < QUEUE_SIZE; index += 1) {
    const slot = document.createElement('div');
    slot.className = 'sq';
    slot.dataset.idx = String(index);

    slot.addEventListener('mouseenter', () => {
      if (state.queue[index]) {
        showTip(state.queue[index]);
      }
    });
    slot.addEventListener('mouseleave', clearTip);
    slot.addEventListener('mousedown', (event) => {
      if (event.target.classList.contains('sq-remove')) {
        return;
      }

      if (state.queue[index] && !state.fighting) {
        startSlotDrag(event, index, state.queue[index]);
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

  const skill = state.queue[index];
  const cooldown = state.cdState[index];

  if (skill) {
    const cdText = cooldown > 0 ? `<span class="sq-cooldown">CD ${cooldown}</span>` : '';
    slot.innerHTML = `<span class="seq-num">${index + 1}</span><div class="sq-cd-overlay${cooldown > 0 ? ' active' : ''}" id="cdov-${index}">${cooldown > 0 ? cooldown : ''}</div><span class="sq-remove">✕</span><span class="sq-icon">${skill.icon}</span><span class="sq-name">${skill.name}</span>${cdText}`;
    slot.querySelector('.sq-icon').style.color = getElementColor(skill.el);
    slot.querySelector('.sq-remove').addEventListener('click', (event) => {
      event.stopPropagation();
      removeSlot(index);
    });
  } else {
    slot.innerHTML = `<span class="seq-num">${index + 1}</span><div class="sq-cd-overlay" id="cdov-${index}"></div><span class="sq-empty-hint">⬡</span>`;
  }

  updateQueueStatus();
}

export function renderEffects() {
  ['player', 'enemy'].forEach((target) => {
    const effectState = target === 'player' ? state.player.effects : state.enemy?.effects ?? {};
    const host = target === 'player' ? elements.playerEffects : elements.enemyEffects;

    host.innerHTML = Object.entries(effectState)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `<span class="sfx" title="${key}:${value}">${EFFECT_ICONS[key] || '◆'}<span style="font-size:6px;font-family:Cinzel,serif;color:#c9a84c;">${value}</span></span>`)
      .join('');
  });
}

export function updateBars() {
  elements.hpBar.style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
  elements.mpBar.style.width = `${(state.player.mp / state.player.maxMp) * 100}%`;
  elements.hpText.textContent = `${state.player.hp}/${state.player.maxHp}`;
  elements.mpText.textContent = `${state.player.mp}/${state.player.maxMp}`;

  if (state.enemy) {
    elements.enemyHpBar.style.width = `${(state.enemy.curHp / state.enemy.hp) * 100}%`;
    elements.enemyHpText.textContent = `${state.enemy.curHp}/${state.enemy.hp}`;
  } else {
    elements.enemyHpBar.style.width = '100%';
    elements.enemyHpText.textContent = '300/300';
  }
}

export function updateQueueStatus() {
  const count = state.queue.filter(Boolean).length;
  elements.queueStatus.textContent = `배열: ${count}/${QUEUE_SIZE}`;
}

export function updateScore() {
  elements.scoreStatus.textContent = `Score: ${state.score.toLocaleString()}`;
}

export function updateWaveLabel() {
  elements.waveStatus.textContent = `웨이브 ${state.waveIdx + 1}/5`;
}

export function setWaveHeader(text) {
  elements.waveHeader.textContent = text;
}

export function setEnemyPresentation(name, icon) {
  elements.enemyName.textContent = name.toUpperCase();
  elements.enemySprite.textContent = icon;
  elements.enemySprite.classList.remove('dead');
}

export function setBattleControls({ canStart, showNextWave }) {
  elements.startButton.disabled = !canStart;
  elements.nextButton.style.display = showNextWave ? '' : 'none';
}

export function setActiveSlot(index) {
  elements.queueGrid.querySelectorAll('.sq').forEach((slot) => slot.classList.remove('active-slot'));
  if (index === null || index === undefined) {
    return;
  }

  elements.queueGrid.querySelector(`.sq[data-idx="${index}"]`)?.classList.add('active-slot');
}

export function animateTurnBar(delay) {
  clearTurnBar();

  let progress = 0;
  const step = 50;
  state.turnBarIntervalId = setInterval(() => {
    progress += step / delay;
    elements.turnFill.style.width = `${Math.min(100, progress * 100)}%`;
    if (progress >= 1) {
      clearTurnBar();
    }
  }, step);
}

export function clearTurnBar() {
  if (state.turnBarIntervalId) {
    clearInterval(state.turnBarIntervalId);
    state.turnBarIntervalId = null;
  }

  elements.turnFill.style.width = '0%';
}

export function animatePlayerAttack() {
  replayAnimation(elements.playerSprite, 'attack-anim');
}

export function animatePlayerHit() {
  replayAnimation(elements.playerSprite, 'hit-anim');
}

export function animateEnemyHit() {
  replayAnimation(elements.enemySprite, 'hit-anim');
}

export function showPlayerDeath() {
  elements.playerSprite.classList.add('dead');
}

export function showEnemyDeath() {
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
  elements.tip.innerHTML = '<div class="tip-empty">스킬에 마우스를<br>올려보세요</div>';
}

export function showTip(skill) {
  const effectText = skill.effect ? `<div class="tip-row">효과: <span>${formatEffect(skill.effect)}</span></div>` : '';
  const damageText = skill.dmg && (skill.dmg[0] > 0 || skill.dmg[1] > 0) ? `<div class="tip-row">피해: <span>${skill.dmg[0]}~${skill.dmg[1]}</span></div>` : '';
  const healText = skill.heal ? `<div class="tip-row">회복: <span>${skill.heal[0]}~${skill.heal[1]}</span></div>` : '';
  const hitsText = skill.hits ? `<div class="tip-row">타격 횟수: <span>${skill.hits}회</span></div>` : '';
  const dotText = skill.dot ? `<div class="tip-row">지속 피해: <span>${skill.dmg[0]}~${skill.dmg[1]} × ${skill.dot}턴</span></div>` : '';
  const mpText = skill.mpgain ? `<div class="tip-row">MP 회복: <span>+${skill.mpgain}</span></div>` : '';

  elements.tip.innerHTML = `<div class="tip-nm" style="color:${getElementColor(skill.el)}">${skill.name}</div><div class="tip-ty">${skill.el} · ${skill.type} · ${skill.target}</div><hr class="tip-div"><div class="tip-row">MP: <span>${skill.mp}</span> / CD: <span>${skill.cd}턴</span></div>${damageText}${healText}${hitsText}${dotText}${mpText}${effectText}<hr class="tip-div"><div class="tip-row" style="font-style:italic;color:#7a6040;font-family:'Crimson Pro',serif;">${skill.desc}</div>`;
}

export function removeSlot(index) {
  if (state.fighting) {
    return;
  }

  state.queue[index] = null;
  state.cdState[index] = 0;
  renderSlot(index);
}

export function resetPresentation() {
  elements.playerSprite.classList.remove('dead');
  elements.enemySprite.classList.remove('dead');
  elements.enemySprite.textContent = '🧟';
  elements.enemyName.textContent = 'DARK KNIGHT';
  elements.playerEffects.innerHTML = '';
  elements.enemyEffects.innerHTML = '';
  elements.turnFill.style.width = '0%';
  elements.nextButton.style.display = 'none';
  elements.startButton.disabled = false;
  elements.speedButton.textContent = `${state.battleSpeed}x`;
  setWaveHeader('웨이브 1 - 전투 준비');
  updateWaveLabel();
  updateScore();
}

function cacheElements() {
  elements.skillLib = document.getElementById('skill-lib');
  elements.queueGrid = document.getElementById('queue-grid');
  elements.tip = document.getElementById('tip');
  elements.log = document.getElementById('blog');
  elements.waveHeader = document.getElementById('wave-hdr');
  elements.queueStatus = document.getElementById('s-queue');
  elements.waveStatus = document.getElementById('s-wave');
  elements.scoreStatus = document.getElementById('s-score');
  elements.startButton = document.getElementById('btn-start');
  elements.nextButton = document.getElementById('btn-next');
  elements.resetButton = document.getElementById('btn-reset');
  elements.speedButton = document.getElementById('btn-speed');
  elements.playerSprite = document.getElementById('sp-player');
  elements.enemySprite = document.getElementById('sp-enemy');
  elements.enemyName = document.getElementById('enemy-name');
  elements.playerEffects = document.getElementById('sfx-player');
  elements.enemyEffects = document.getElementById('sfx-enemy');
  elements.hpBar = document.getElementById('hp-bar');
  elements.mpBar = document.getElementById('mp-bar');
  elements.enemyHpBar = document.getElementById('ehp-bar');
  elements.hpText = document.getElementById('hp-txt');
  elements.mpText = document.getElementById('mp-txt');
  elements.enemyHpText = document.getElementById('ehp-txt');
  elements.turnFill = document.getElementById('turn-fill');
  elements.ghost = document.getElementById('gh');
}

function bindControls() {
  elements.startButton.addEventListener('click', actionHandlers.startBattle);
  elements.nextButton.addEventListener('click', actionHandlers.nextWave);
  elements.resetButton.addEventListener('click', actionHandlers.resetBattle);
  elements.speedButton.addEventListener('click', actionHandlers.toggleSpeed);
}

function startLibraryDrag(event, skill, card) {
  event.preventDefault();
  state.drag = { source: 'library', skill, card };
  card.classList.add('dragging');
  showGhost(skill, event.clientX, event.clientY);
  attachDragListeners();
}

function startSlotDrag(event, index, skill) {
  event.preventDefault();
  state.drag = { source: 'slot', index, skill };
  state.queue[index] = null;
  state.cdState[index] = 0;
  renderSlot(index);
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
  if (!state.drag) {
    return;
  }

  elements.ghost.style.left = `${event.clientX}px`;
  elements.ghost.style.top = `${event.clientY}px`;
  clearSlotHighlights();
  getHoveredSlot(event.clientX, event.clientY)?.classList.add('drag-ok');
}

function onDragEnd(event) {
  if (!state.drag) {
    return;
  }

  elements.ghost.style.display = 'none';
  clearSlotHighlights();
  const hoveredSlot = getHoveredSlot(event.clientX, event.clientY);

  if (hoveredSlot && !state.fighting) {
    const hoveredIndex = Number(hoveredSlot.dataset.idx);

    if (state.drag.source === 'slot' && state.drag.index === hoveredIndex) {
      state.queue[hoveredIndex] = state.drag.skill;
    } else {
      if (state.drag.source === 'slot' && state.queue[hoveredIndex]) {
        state.queue[state.drag.index] = state.queue[hoveredIndex];
        state.cdState[state.drag.index] = 0;
        renderSlot(state.drag.index);
      }

      state.queue[hoveredIndex] = state.drag.skill;
    }

    state.cdState[hoveredIndex] = 0;
    renderSlot(hoveredIndex);
  } else if (state.drag.source === 'slot') {
    state.queue[state.drag.index] = state.drag.skill;
    state.cdState[state.drag.index] = 0;
    renderSlot(state.drag.index);
  }

  state.drag.card?.classList.remove('dragging');
  state.drag = null;
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
}

function clearSlotHighlights() {
  elements.queueGrid.querySelectorAll('.sq.drag-ok').forEach((slot) => slot.classList.remove('drag-ok'));
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

function formatEffect(effect) {
  return Object.entries(effect)
    .filter(([key]) => key !== 'chance')
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ');
}

function getElementColor(element) {
  return {
    physical: '#c8b060',
    fire: '#e05020',
    ice: '#4090d0',
    lightning: '#d0c020',
    dark: '#8050d0',
    nature: '#40b040',
    holy: '#d0b050',
    buff: '#50c0a0',
  }[element] ?? '#c9a84c';
}

function replayAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}
