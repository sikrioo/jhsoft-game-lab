const PARTICLE_COLORS = {
  physical: ['#d7dbe4', '#9aa7bc', '#c9b174'],
  fire: ['#ffb36b', '#ff6b5f', '#ffd56a'],
  ice: ['#c7f2ff', '#7bd0ff', '#b8d6ff'],
  lightning: ['#fff19d', '#7ef9ff', '#d7c6ff'],
  dark: ['#8f6fff', '#cf8dff', '#5f4ab8'],
  nature: ['#8cff8b', '#4fd47a', '#b6ffbe'],
  holy: ['#fff1a8', '#ffe18a', '#fff8de'],
  buff: ['#86ffd4', '#7fe6ff', '#ccffea'],
};

let layer;

export function initParticleLayer() {
  layer = document.getElementById('fx-layer');
}

export function playSkillParticles({ skill, sourceEl, targetEl }) {
  if (!layer || !skill) {
    return;
  }

  const sourceRect = sourceEl?.getBoundingClientRect();
  const targetRect = targetEl?.getBoundingClientRect();
  if (!sourceRect || !targetRect) {
    return;
  }

  const startX = sourceRect.left + sourceRect.width / 2;
  const startY = sourceRect.top + sourceRect.height / 2;
  const endX = targetRect.left + targetRect.width / 2;
  const endY = targetRect.top + targetRect.height / 2;
  const colors = PARTICLE_COLORS[skill.el] ?? PARTICLE_COLORS.buff;
  const burstCount = Math.min(14, 6 + (skill.hits ?? 1) * 2 + (skill.rarity === 'legendary' ? 4 : skill.rarity === 'epic' ? 3 : skill.rarity === 'rare' ? 2 : 0));

  createPulse(endX, endY, colors[0], skill.rarity);
  createTrail(startX, startY, endX, endY, colors, skill.rarity);

  for (let index = 0; index < burstCount; index += 1) {
    createParticle(endX, endY, colors[index % colors.length], index, burstCount, skill.rarity);
  }
}

export function playImpactParticles({ targetEl, variant = 'enemy-hit', intensity = 1 }) {
  if (!layer || !targetEl) {
    return;
  }

  const rect = targetEl.getBoundingClientRect();
  if (!rect) {
    return;
  }

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const colorMap = {
    'player-hit': ['#ffd0d6', '#ff8b98', '#ff5e73'],
    'enemy-hit': ['#fff0b5', '#ffcf70', '#ff9a3c'],
    burn: ['#ffcf8a', '#ff7d57', '#ff4e35'],
    poison: ['#c0ff9f', '#6ad16b', '#2fa74b'],
  };
  const colors = colorMap[variant] ?? colorMap['enemy-hit'];
  const burstCount = Math.max(6, Math.round(8 * intensity));

  createPulse(centerX, centerY, colors[1], 'common');
  for (let index = 0; index < burstCount; index += 1) {
    createParticle(centerX, centerY, colors[index % colors.length], index, burstCount, 'common');
  }
}

export function playFloatingText({ targetEl, text, type = 'damage' }) {
  if (!layer || !targetEl || !text) {
    return;
  }

  const rect = targetEl.getBoundingClientRect();
  const float = document.createElement('span');
  const xJitter = (Math.random() - 0.5) * 28;

  float.className = `fx-float ${type}`;
  float.textContent = text;
  float.style.left = `${rect.left + rect.width / 2 + xJitter}px`;
  float.style.top = `${rect.top + Math.max(10, rect.height * 0.22)}px`;
  layer.appendChild(float);
  float.addEventListener('animationend', () => float.remove(), { once: true });
}

function createPulse(x, y, color, rarity) {
  const pulse = document.createElement('span');
  pulse.className = `fx-pulse rarity-${rarity}`;
  pulse.style.left = `${x}px`;
  pulse.style.top = `${y}px`;
  pulse.style.setProperty('--fx-color', color);
  layer.appendChild(pulse);
  pulse.addEventListener('animationend', () => pulse.remove(), { once: true });
}

function createTrail(startX, startY, endX, endY, colors, rarity) {
  const trail = document.createElement('span');
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  trail.className = `fx-trail rarity-${rarity}`;
  trail.style.left = `${startX}px`;
  trail.style.top = `${startY}px`;
  trail.style.width = `${length}px`;
  trail.style.transform = `translateY(-50%) rotate(${angle}deg)`;
  trail.style.background = `linear-gradient(90deg, ${colors[0]}00, ${colors[0]}, ${colors[1]}, ${colors[2]}00)`;
  layer.appendChild(trail);
  trail.addEventListener('animationend', () => trail.remove(), { once: true });
}

function createParticle(x, y, color, index, total, rarity) {
  const particle = document.createElement('span');
  const angle = (Math.PI * 2 * index) / total + Math.random() * 0.35;
  const distance = 26 + Math.random() * 34;
  const driftX = Math.cos(angle) * distance;
  const driftY = Math.sin(angle) * distance;

  particle.className = `fx-particle rarity-${rarity}`;
  particle.style.left = `${x}px`;
  particle.style.top = `${y}px`;
  particle.style.setProperty('--fx-color', color);
  particle.style.setProperty('--drift-x', `${driftX}px`);
  particle.style.setProperty('--drift-y', `${driftY}px`);
  particle.style.animationDelay = `${Math.random() * 70}ms`;
  layer.appendChild(particle);
  particle.addEventListener('animationend', () => particle.remove(), { once: true });
}
