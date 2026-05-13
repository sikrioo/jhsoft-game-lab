import { COLORS, player, typeConfig } from "./config.js";
import { createState } from "./state.js";
import { angleDiff, clamp, lerp, padDeg, rand } from "./utils.js";

export function createRadarApp(els) {
  const state = createState();
  const targetCardPool = [];
  const MAX_TARGET_LIST_ITEMS = 12;
  const CONTACT_VISIBLE_WINDOW = 3200;
  let resizeTimer = 0;

  function getPixi() {
    if (!window.PIXI) {
      throw new Error("PIXI global is not available.");
    }

    return window.PIXI;
  }

  function formatClock() {
    return new Date().toLocaleTimeString("en-GB", { hour12: false });
  }

  function addLog(text, level = "") {
    state.logLines.unshift({ text: `[${formatClock()}] ${text}`, level });
    state.logLines = state.logLines.slice(0, 9);
    els.log.innerHTML = state.logLines
      .map((line) => `<div class="log-line ${line.level}">${line.text}</div>`)
      .join("");
  }

  function syncControlValues() {
    state.controlValues.speed = Number(els.speed.value);
    state.controlValues.range = Number(els.range.value);
    state.controlValues.noise = Number(els.noise.value);
    state.controlValues.angularResolution = Number(els.angularResolution.value);
    state.controlValues.detectionProbability = Number(els.detectionProbability.value);
    state.controlValues.falseAlarmRate = Number(els.falseAlarmRate.value);
    if (state.controlValues.falseAlarmRate === 0) {
      state.falseAlarmCharge = 0;
    }
  }

  function writeTargetInfo(target, dx, dy, range, angleRad, dir, vector) {
    if (!target.info) {
      target.info = { dx, dy, range, angleRad, dir, vector };
      return target.info;
    }

    target.info.dx = dx;
    target.info.dy = dy;
    target.info.range = range;
    target.info.angleRad = angleRad;
    target.info.dir = dir;
    target.info.vector = vector;
    return target.info;
  }

  function refreshTargetInfo(target) {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const range = Math.sqrt(dx * dx + dy * dy);
    const angleRad = Math.atan2(dy, dx);
    const dir = (angleRad * 180 / Math.PI + 360) % 360;
    const deltaRange = range - (target.lastRange ?? range);
    const vector = deltaRange < -0.25 ? "APPROACHING" : deltaRange > 0.25 ? "LEAVING" : "STABLE";

    return writeTargetInfo(target, dx, dy, range, angleRad, dir, vector);
  }

  function getTargetInfo(target) {
    return target.info || refreshTargetInfo(target);
  }

  function destroyChildren(container) {
    const children = container.removeChildren();
    for (const child of children) {
      child.destroy();
    }
  }

  function createTargetCard() {
    const card = document.createElement("div");
    card.className = "target-card";
    card.innerHTML = `
      <div class="target-type"></div>
      <div>
        <div class="target-name"></div>
        <div class="target-meta"></div>
      </div>
      <div class="target-distance"></div>
    `;

    return {
      root: card,
      name: card.querySelector(".target-name"),
      meta: card.querySelector(".target-meta"),
      distance: card.querySelector(".target-distance")
    };
  }

  function ensureTargetCardPool(size) {
    while (targetCardPool.length < size) {
      const card = createTargetCard();
      targetCardPool.push(card);
      els.targetList.appendChild(card.root);
    }
  }

  function findContact(id) {
    for (const target of state.targets) {
      if (target.id === id) {
        return target;
      }
    }

    for (const target of state.falseContacts) {
      if (target.id === id) {
        return target;
      }
    }

    return null;
  }

  function isTrackedContact(target, now) {
    return target.id === state.lockedId || now - target.lastPing < CONTACT_VISIBLE_WINDOW;
  }

  function collectTrackedContacts(out, now) {
    out.length = 0;

    for (const target of state.targets) {
      if (isTrackedContact(target, now)) {
        out.push(target);
      }
    }

    for (const target of state.falseContacts) {
      if (isTrackedContact(target, now)) {
        out.push(target);
      }
    }

    return out;
  }

  function getNearestTarget(now = performance.now()) {
    let nearest = null;
    let nearestRange = Infinity;

    for (const target of state.targets) {
      if (!isTrackedContact(target, now)) {
        continue;
      }

      const { range } = getTargetInfo(target);
      if (range < nearestRange) {
        nearest = target;
        nearestRange = range;
      }
    }

    for (const target of state.falseContacts) {
      if (!isTrackedContact(target, now)) {
        continue;
      }

      const { range } = getTargetInfo(target);
      if (range < nearestRange) {
        nearest = target;
        nearestRange = range;
      }
    }

    return nearest;
  }

  function getLockedTarget() {
    return findContact(state.lockedId);
  }

  function getAngularResolutionRad() {
    return state.controlValues.angularResolution * Math.PI / 180;
  }

  function getDisplayedInfo(target) {
    const info = getTargetInfo(target);
    const step = getAngularResolutionRad();
    const angleRad = step > 0 ? Math.round(info.angleRad / step) * step : info.angleRad;
    const dir = (angleRad * 180 / Math.PI + 360) % 360;
    const dx = Math.cos(angleRad) * info.range;
    const dy = Math.sin(angleRad) * info.range;

    return {
      ...info,
      angleRad,
      dir,
      dx,
      dy
    };
  }

  function radarPos(target) {
    const info = getDisplayedInfo(target);
    const distance = clamp(info.range / state.controlValues.range, 0, 1) * state.radius;

    return {
      x: state.cx + Math.cos(info.angleRad) * distance,
      y: state.cy + Math.sin(info.angleRad) * distance,
      info
    };
  }

  function createTarget(type = "hostile") {
    const distance = rand(160, 900);
    const angle = rand(0, Math.PI * 2);
    const vx = Math.cos(angle + rand(-0.9, 0.9)) * rand(8, 42);
    const vy = Math.sin(angle + rand(-0.9, 0.9)) * rand(8, 42);

    return {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
      type,
      code: `${typeConfig[type].short}-${Math.floor(rand(100, 999))}`,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      vx,
      vy,
      signal: rand(0.45, 1),
      lastPing: performance.now(),
      lastRange: distance
    };
  }

  function createFalseContact(now = performance.now()) {
    const range = rand(state.controlValues.range * 0.16, state.controlValues.range * 0.94);
    const angle = state.sweep + rand(-0.22, 0.22);
    const drift = rand(2, 14);
    const target = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
      type: "falseAlarm",
      code: `${typeConfig.falseAlarm.short}-${Math.floor(rand(100, 999))}`,
      x: Math.cos(angle) * range,
      y: Math.sin(angle) * range,
      vx: Math.cos(angle + rand(-1.2, 1.2)) * drift,
      vy: Math.sin(angle + rand(-1.2, 1.2)) * drift,
      signal: rand(0.3, 0.72),
      lastPing: now,
      lastRange: range,
      expiresAt: now + rand(2200, 5200),
      isFalseAlarm: true
    };
    refreshTargetInfo(target);
    return target;
  }

  function removeContactSprite(contactId) {
    const sprite = state.targetSprites.get(contactId);
    if (sprite) {
      sprite.destroy();
      state.targetSprites.delete(contactId);
    }
  }

  function seedTargets() {
    const types = ["hostile", "resource", "anomaly", "neutral"];
    const now = performance.now();

    for (let index = 0; index < 18; index += 1) {
      const target = createTarget(types[Math.floor(rand(0, types.length))]);
      target.lastPing = now - rand(0, 900);
      refreshTargetInfo(target);
      state.targets.push(target);
    }

    state.lockedId = getNearestTarget(now)?.id || null;
    addLog("PixiJS renderer online. Radar layers cached.");
  }

  async function initPixi() {
    const PIXI = getPixi();
    const rect = els.frame.getBoundingClientRect();
    state.size = Math.floor(Math.min(rect.width, rect.height));

    const app = new PIXI.Application();
    await app.init({
      width: state.size,
      height: state.size,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      powerPreference: "high-performance"
    });

    state.app = app;
    els.mount.appendChild(app.canvas);

    state.layers.bg = new PIXI.Container();
    state.layers.grid = new PIXI.Container();
    state.layers.noise = new PIXI.Container();
    state.layers.targets = new PIXI.Container();
    state.layers.sweep = new PIXI.Container();
    state.layers.lock = new PIXI.Container();
    state.layers.fx = new PIXI.Container();
    state.layers.vignette = new PIXI.Container();
    state.sweepGraphic = new PIXI.Graphics();
    state.lockGraphic = new PIXI.Graphics();
    state.lockText = new PIXI.Text({
      text: "LOCK ON",
      style: { fill: COLORS.danger, fontFamily: "ui-monospace, monospace", fontSize: 10, fontWeight: "700" }
    });
    state.lockText.anchor.set(0.5);
    state.lockText.visible = false;

    for (const layer of [
      state.layers.bg,
      state.layers.grid,
      state.layers.noise,
      state.layers.sweep,
      state.layers.lock,
      state.layers.fx,
      state.layers.vignette
    ]) {
      layer.eventMode = "none";
    }
    state.layers.targets.eventMode = "passive";

    app.stage.addChild(
      state.layers.bg,
      state.layers.grid,
      state.layers.noise,
      state.layers.targets,
      state.layers.sweep,
      state.layers.lock,
      state.layers.fx,
      state.layers.vignette
    );
    state.layers.sweep.addChild(state.sweepGraphic);
    state.layers.lock.addChild(state.lockGraphic, state.lockText);
    app.ticker.add(tickerUpdate);

    resizeRadar();
    seedTargets();
    buildNoisePool();
    syncTargetSprites();
    renderList();
    updateStats();
  }

  function resizeRadar() {
    if (!state.app) {
      return;
    }

    const rect = els.frame.getBoundingClientRect();
    const size = Math.floor(Math.min(rect.width, rect.height));
    state.size = size;
    state.cx = size / 2;
    state.cy = size / 2;
    state.radius = size * 0.45;
    state.app.renderer.resize(size, size);
    drawStaticRadar();
    drawSweepBeam();
    drawVignette();
  }

  function drawStaticRadar() {
    const PIXI = getPixi();
    const { bg, grid } = state.layers;
    destroyChildren(grid);
    destroyChildren(bg);

    const background = new PIXI.Graphics();
    background.circle(state.cx, state.cy, state.radius * 1.04).fill({ color: 0x02070b, alpha: 0.92 });
    background.circle(state.cx, state.cy, state.radius).stroke({ color: COLORS.grid, alpha: 0.42, width: 2 });
    bg.addChild(background);

    const gridGraphics = new PIXI.Graphics();
    for (let index = 1; index <= 5; index += 1) {
      gridGraphics.circle(state.cx, state.cy, state.radius * index / 5).stroke({ color: COLORS.grid, alpha: 0.16, width: 1 });
    }

    for (let index = 0; index < 24; index += 1) {
      const angle = index * Math.PI * 2 / 24;
      const inner = index % 3 === 0 ? 0 : state.radius * 0.16;
      gridGraphics.moveTo(state.cx + Math.cos(angle) * inner, state.cy + Math.sin(angle) * inner);
      gridGraphics.lineTo(state.cx + Math.cos(angle) * state.radius, state.cy + Math.sin(angle) * state.radius);
      gridGraphics.stroke({ color: COLORS.grid, alpha: index % 3 === 0 ? 0.18 : 0.07, width: 1 });
    }

    for (let index = 0; index < 180; index += 1) {
      const angle = index * Math.PI * 2 / 180;
      const len = index % 15 === 0 ? 13 : index % 5 === 0 ? 8 : 4;
      const start = state.radius - len;
      const end = state.radius;
      gridGraphics.moveTo(state.cx + Math.cos(angle) * start, state.cy + Math.sin(angle) * start);
      gridGraphics.lineTo(state.cx + Math.cos(angle) * end, state.cy + Math.sin(angle) * end);
      gridGraphics.stroke({ color: COLORS.grid, alpha: index % 15 === 0 ? 0.25 : 0.12, width: 1 });
    }

    grid.addChild(gridGraphics);

    const labels = [
      ["000", 0, -state.radius - 18],
      ["090", state.radius + 22, 4],
      ["180", 0, state.radius + 22],
      ["270", -state.radius - 22, 4],
      ["030", state.radius * 0.52, -state.radius * 0.86],
      ["060", state.radius * 0.86, -state.radius * 0.52],
      ["120", state.radius * 0.86, state.radius * 0.52],
      ["150", state.radius * 0.52, state.radius * 0.86],
      ["210", -state.radius * 0.52, state.radius * 0.86],
      ["240", -state.radius * 0.86, state.radius * 0.52],
      ["300", -state.radius * 0.86, -state.radius * 0.52],
      ["330", -state.radius * 0.52, -state.radius * 0.86]
    ];

    for (const [text, x, y] of labels) {
      const label = new PIXI.Text({
        text,
        style: { fill: 0xb9ffe6, fontFamily: "ui-monospace, monospace", fontSize: 14 }
      });
      label.alpha = 0.65;
      label.anchor.set(0.5);
      label.position.set(state.cx + x, state.cy + y);
      grid.addChild(label);
    }
  }

  function drawVignette() {
    const PIXI = getPixi();
    const layer = state.layers.vignette;
    destroyChildren(layer);

    const vignette = new PIXI.Graphics();
    vignette.circle(state.cx, state.cy, state.radius * 1.15).fill({ color: 0x000000, alpha: 0.01 });
    vignette.circle(state.cx, state.cy, state.radius * 1.06).stroke({ color: 0x000000, alpha: 0.55, width: state.radius * 0.15 });
    layer.addChild(vignette);
  }

  function drawSweepBeam() {
    const sweep = state.sweepGraphic;
    if (!sweep) {
      return;
    }

    sweep.clear();
    sweep.position.set(state.cx, state.cy);

    for (let index = 0; index < 44; index += 1) {
      const angle = -index * 0.015;
      const alpha = Math.pow(1 - index / 44, 2) * 0.16;
      sweep.moveTo(0, 0);
      sweep.arc(0, 0, state.radius, angle - 0.008, angle + 0.008);
      sweep.closePath();
      sweep.fill({ color: COLORS.safe, alpha });
    }

    sweep.moveTo(0, 0);
    sweep.lineTo(state.radius, 0);
    sweep.stroke({ color: COLORS.safe, alpha: 0.85, width: 2 });
    sweep.rotation = state.sweep;
  }

  function makeBlip(type) {
    const PIXI = getPixi();
    const cfg = typeConfig[type];
    const container = new PIXI.Container();
    const glow = new PIXI.Graphics();
    const body = new PIXI.Graphics();
    glow.circle(0, 0, 9).fill({ color: cfg.color, alpha: 0.12 });

    if (type === "resource") {
      body.rect(-4, -4, 8, 8).fill({ color: cfg.color, alpha: 1 });
    } else if (type === "anomaly") {
      body.poly([0, -7, 7, 0, 0, 7, -7, 0]).fill({ color: cfg.color, alpha: 1 });
    } else if (type === "falseAlarm") {
      body.circle(0, 0, 6).stroke({ color: cfg.color, alpha: 0.95, width: 1.4 });
      body.moveTo(-6, 0);
      body.lineTo(6, 0);
      body.moveTo(0, -6);
      body.lineTo(0, 6);
      body.stroke({ color: cfg.color, alpha: 0.92, width: 1.2 });
    } else if (type === "hostile") {
      body.poly([0, -7, 6, 5, 0, 2, -6, 5]).fill({ color: cfg.color, alpha: 1 });
    } else {
      body.circle(0, 0, 4).fill({ color: cfg.color, alpha: 1 });
    }

    container.addChild(glow, body);
    container.eventMode = "static";
    container.cursor = "crosshair";
    return container;
  }

  function syncTargetSprites() {
    for (const target of state.targets) {
      if (state.targetSprites.has(target.id)) {
        continue;
      }

      const blip = makeBlip(target.type);
      blip.on("pointerdown", () => selectTarget(target.id, "Radar blip lock"));
      state.layers.targets.addChild(blip);
      state.targetSprites.set(target.id, blip);
    }

    for (const target of state.falseContacts) {
      if (state.targetSprites.has(target.id)) {
        continue;
      }

      const blip = makeBlip(target.type);
      blip.on("pointerdown", () => selectTarget(target.id, "Radar blip lock"));
      state.layers.targets.addChild(blip);
      state.targetSprites.set(target.id, blip);
    }
  }

  function buildNoisePool() {
    const PIXI = getPixi();
    const layer = state.layers.noise;
    destroyChildren(layer);
    state.noisePool = [];
    state.noiseActiveCount = 0;
    state.noiseTimer = 0;

    for (let index = 0; index < 140; index += 1) {
      const dot = new PIXI.Sprite(PIXI.Texture.WHITE);
      const size = rand(1, 2);
      dot.width = size;
      dot.height = size;
      dot.tint = Math.random() < 0.85 ? COLORS.safe : COLORS.white;
      dot.alpha = 0;
      layer.addChild(dot);
      state.noisePool.push(dot);
    }
  }

  function getDetectionChance(target, now) {
    const info = getTargetInfo(target);
    const base = state.controlValues.detectionProbability / 100;
    const signalFactor = 0.45 + target.signal * 0.55;
    const rangeFactor = 1 - clamp(info.range / state.controlValues.range, 0, 1) * 0.32;
    const scrambleFactor = now < state.scrambleUntil ? 0.72 : 1;
    return clamp(base * signalFactor * rangeFactor * scrambleFactor, 0.05, 1);
  }

  function updateTargets(dt) {
    const maxRange = state.controlValues.range;

    for (const target of state.targets) {
      target.lastRange = getTargetInfo(target).range;
      target.x += target.vx * dt;
      target.y += target.vy * dt;

      const info = refreshTargetInfo(target);
      if (info.range > maxRange * 1.12 || info.range < 60) {
        const bounce = Math.atan2(info.dy, info.dx) + Math.PI;
        const speed = Math.sqrt(target.vx * target.vx + target.vy * target.vy);
        target.vx = Math.cos(bounce + rand(-0.35, 0.35)) * speed;
        target.vy = Math.sin(bounce + rand(-0.35, 0.35)) * speed;
        refreshTargetInfo(target);
      }
    }
  }

  function updateFalseContacts(dt, now) {
    const baseRate = state.controlValues.falseAlarmRate / 100;
    const noiseFactor = 0.55 + state.controlValues.noise / 55;
    const scrambleFactor = now < state.scrambleUntil ? 2.1 : 1;
    state.falseAlarmCharge += dt * baseRate * noiseFactor * scrambleFactor * 6;

    while (state.falseAlarmCharge >= 1 && state.falseContacts.length < 6) {
      const falseContact = createFalseContact(now);
      state.falseContacts.push(falseContact);
      syncTargetSprites();
      state.falseAlarmCharge -= 1;
      if (Math.random() < 0.45) {
        addLog(`False track detected near ${padDeg(getDisplayedInfo(falseContact).dir)}.`, "warn");
      }
    }

    for (let index = state.falseContacts.length - 1; index >= 0; index -= 1) {
      const target = state.falseContacts[index];
      target.lastRange = getTargetInfo(target).range;
      target.x += target.vx * dt;
      target.y += target.vy * dt;
      refreshTargetInfo(target);

      if (now >= target.expiresAt) {
        if (state.lockedId === target.id) {
          state.lockedId = null;
          state.smoothedHud = null;
          addLog(`False track ${target.code} collapsed.`, "warn");
        }
        removeContactSprite(target.id);
        state.falseContacts.splice(index, 1);
      }
    }
  }

  function updateTargetSprite(target, now) {
    const sprite = state.targetSprites.get(target.id);
    if (!sprite) {
      return;
    }

    const position = radarPos(target);
    const rawInfo = getTargetInfo(target);
    sprite.position.set(position.x, position.y);
    sprite.rotation = position.info.angleRad + Math.PI / 2;

    if (angleDiff(rawInfo.angleRad, state.sweep) < 0.035) {
      const detected = target.isFalseAlarm || Math.random() < getDetectionChance(target, now);
      if (detected) {
        target.lastPing = now;
      }
      if (detected && target.type === "hostile" && rawInfo.range < state.controlValues.range * 0.38 && Math.random() < 0.01) {
        addShockwave(COLORS.danger);
        addLog(`Close hostile contact detected: ${target.code}`, "danger");
      }
    }

    const pingAge = (now - target.lastPing) / 1000;
    if (pingAge > 3.2 && state.lockedId !== target.id) {
      sprite.alpha = 0;
    } else {
      const minAlpha = state.lockedId === target.id ? 0.16 : 0;
      sprite.alpha = clamp(1 - pingAge / 3.2, minAlpha, 1) * target.signal;
    }
    sprite.scale.set(state.lockedId === target.id ? 1.35 : 1);
  }

  function updateTargetSprites(now) {
    for (const target of state.targets) {
      updateTargetSprite(target, now);
    }

    for (const target of state.falseContacts) {
      updateTargetSprite(target, now);
    }
  }

  function updateSweep() {
    state.sweepGraphic.rotation = state.sweep;
  }

  function updateLockMarker(now) {
    const target = getLockedTarget();
    const marker = state.lockGraphic;
    const lockText = state.lockText;
    marker.clear();

    if (!target) {
      lockText.visible = false;
      return;
    }

    const position = radarPos(target);
    const blink = Math.sin(now * 0.012) > -0.25 ? 1 : 0.36;
    const radius = 18 + Math.sin(now * 0.008) * 3;
    marker.alpha = blink;
    marker.rect(position.x - radius, position.y - radius, radius * 2, radius * 2).stroke({
      color: COLORS.danger,
      alpha: 0.9,
      width: 1.5
    });
    marker.circle(position.x, position.y, radius * 1.45).stroke({
      color: COLORS.danger,
      alpha: 0.75,
      width: 1.5
    });
    lockText.visible = true;
    lockText.position.set(position.x, position.y - radius - 12);
    lockText.alpha = blink;
  }

  function addShockwave(color) {
    const PIXI = getPixi();
    const wave = new PIXI.Graphics();
    state.layers.fx.addChild(wave);
    state.shockwaves.push({ g: wave, life: 0, max: 1.15, color });
  }

  function updateShockwaves(dt) {
    for (let index = state.shockwaves.length - 1; index >= 0; index -= 1) {
      const shockwave = state.shockwaves[index];
      shockwave.life += dt;
      const progress = shockwave.life / shockwave.max;
      shockwave.g.clear();
      shockwave.g.circle(state.cx, state.cy, state.radius * progress).stroke({
        color: shockwave.color,
        alpha: 0.38 * (1 - progress),
        width: 2
      });

      if (progress >= 1) {
        shockwave.g.destroy();
        state.shockwaves.splice(index, 1);
      }
    }
  }

  function updateNoise(dt, now) {
    state.noiseTimer += dt;
    if (state.noiseTimer < 1 / 24) {
      return;
    }

    state.noiseTimer = 0;
    const noise = state.controlValues.noise / 100;
    const boosted = now < state.scrambleUntil ? 0.36 : 0;
    const activeCount = Math.floor((noise + boosted) * state.noisePool.length);

    for (let index = 0; index < activeCount; index += 1) {
      const dot = state.noisePool[index];
      if (Math.random() < 0.25) {
        const angle = rand(0, Math.PI * 2);
        const distance = Math.sqrt(Math.random()) * state.radius;
        dot.position.set(state.cx + Math.cos(angle) * distance, state.cy + Math.sin(angle) * distance);
      }
      dot.alpha = rand(0.04, 0.18);
    }

    for (let index = activeCount; index < state.noiseActiveCount; index += 1) {
      state.noisePool[index].alpha = 0;
    }

    state.noiseActiveCount = activeCount;
  }

  function renderList(visibleContacts = collectTrackedContacts(state.trackedContacts, performance.now())) {
    visibleContacts.sort((a, b) => getTargetInfo(a).range - getTargetInfo(b).range);
    ensureTargetCardPool(MAX_TARGET_LIST_ITEMS);

    for (let index = 0; index < targetCardPool.length; index += 1) {
      const card = targetCardPool[index];
      const target = visibleContacts[index];

      if (!target) {
        card.root.hidden = true;
        card.root.dataset.id = "";
        continue;
      }

      const info = getDisplayedInfo(target);
      const locked = state.lockedId === target.id;
      const cfg = typeConfig[target.type];
      card.root.hidden = false;
      card.root.dataset.id = target.id;
      card.root.className = `target-card ${cfg.cssClass || target.type}${locked ? " locked" : ""}`;
      card.name.textContent = `${target.code} / ${cfg.label}`;
      card.meta.textContent = `DIR ${padDeg(info.dir)} / X ${Math.round(info.dx)} / Y ${Math.round(info.dy)}`;
      card.distance.textContent = `${Math.round(info.range)}m`;
    }
  }

  function updateCoordinateHud() {
    const target = getLockedTarget();
    if (!target) {
      els.hudTarget.textContent = "UNKNOWN";
      els.hudRange.textContent = "----";
      els.hudDir.textContent = "---";
      els.hudCoord.textContent = "X ---- / Y ----";
      els.hudStatus.textContent = "NO TARGET";
      els.hudClass.textContent = "-";
      els.hudVector.textContent = "----";
      els.hudSignal.textContent = "----";
      els.lockBadge.textContent = "IDLE";
      return;
    }

    const info = getDisplayedInfo(target);
    if (!state.smoothedHud || state.smoothedHud.id !== target.id) {
      state.smoothedHud = { id: target.id, dx: info.dx, dy: info.dy, range: info.range, dir: info.dir };
    }

    state.smoothedHud.dx = lerp(state.smoothedHud.dx, info.dx, 0.18);
    state.smoothedHud.dy = lerp(state.smoothedHud.dy, info.dy, 0.18);
    state.smoothedHud.range = lerp(state.smoothedHud.range, info.range, 0.18);
    state.smoothedHud.dir = lerp(state.smoothedHud.dir, info.dir, 0.18);

    const cfg = typeConfig[target.type];
    els.hudTarget.textContent = `${cfg.label} / ${target.code}`;
    els.hudRange.textContent = `${Math.round(state.smoothedHud.range)}m`;
    els.hudDir.textContent = padDeg(state.smoothedHud.dir);
    els.hudCoord.textContent = `X ${Math.round(state.smoothedHud.dx)} / Y ${Math.round(state.smoothedHud.dy)}`;
    els.hudStatus.textContent = target.isFalseAlarm ? "FALSE TRACK" : target.signal > 0.45 ? "TRACKING" : "SIGNAL WEAK";
    els.hudClass.textContent = cfg.className;
    els.hudVector.textContent = target.isFalseAlarm ? "UNVERIFIED" : info.vector;
    els.hudSignal.textContent = target.isFalseAlarm ? "AMBIGUOUS" : target.signal > 0.7 ? "STRONG" : target.signal > 0.45 ? "NORMAL" : "WEAK";
    els.lockBadge.textContent = "LOCK";
  }

  function updateStats(visibleContacts = collectTrackedContacts(state.trackedContacts, performance.now())) {
    let hostiles = 0;
    let closeHostiles = 0;
    const closeThreshold = state.controlValues.range * 0.42;

    for (const target of visibleContacts) {
      if (target.type !== "hostile") {
        continue;
      }

      hostiles += 1;
      if (getTargetInfo(target).range < closeThreshold) {
        closeHostiles += 1;
      }
    }

    els.contactCount.textContent = String(visibleContacts.length).padStart(2, "0");
    els.threatLevel.textContent = closeHostiles > 2 ? "HIGH" : hostiles > 4 ? "MED" : "LOW";
    els.threatLevel.style.color = closeHostiles > 2 ? "#ff5d73" : hostiles > 4 ? "#ffd166" : "#5fffd2";
    els.rangeValue.textContent = String(state.controlValues.range);
    els.noiseValue.textContent = String(state.controlValues.noise);
    els.speedText.textContent = `${state.controlValues.speed.toFixed(2)}x`;
    els.rangeText.textContent = `${state.controlValues.range} m`;
    els.noiseText.textContent = `${state.controlValues.noise}%`;
    els.angularResolutionText.textContent = `${state.controlValues.angularResolution.toFixed(1)} deg`;
    els.detectionProbabilityText.textContent = `${state.controlValues.detectionProbability}%`;
    els.falseAlarmRateText.textContent = `${state.controlValues.falseAlarmRate}%`;
    els.clock.textContent = formatClock();
    updateCoordinateHud();
  }

  function selectTarget(id, reason = "Manual lock") {
    const target = findContact(id);
    if (!target) {
      return;
    }

    state.lockedId = id;
    state.smoothedHud = null;
    addLog(`${reason}: ${target.code}`, target.type === "hostile" ? "danger" : "warn");
  }

  function tickerUpdate() {
    const now = performance.now();
    const dt = Math.min((now - state.lastTime) / 1000, 0.04);
    state.lastTime = now;

    state.sweep = (state.sweep + dt * state.controlValues.speed * 1.65) % (Math.PI * 2);
    updateTargets(dt);
    updateFalseContacts(dt, now);
    updateTargetSprites(now);
    updateSweep();
    updateLockMarker(now);
    updateNoise(dt, now);
    updateShockwaves(dt);

    state.listTimer += dt;
    if (state.listTimer > 0.25) {
      const visibleContacts = collectTrackedContacts(state.trackedContacts, now);
      renderList(visibleContacts);
      updateStats(visibleContacts);
      state.listTimer = 0;
    }
  }

  function bindEvents() {
    els.targetList.addEventListener("click", (event) => {
      const card = event.target.closest(".target-card");
      if (card?.dataset.id) {
        selectTarget(card.dataset.id, "Contact feed lock");
      }
    });

    for (const input of [
      els.speed,
      els.range,
      els.noise,
      els.angularResolution,
      els.detectionProbability,
      els.falseAlarmRate
    ]) {
      input.addEventListener("input", () => {
        syncControlValues();
        updateStats();
      });
    }

    els.addHostile.addEventListener("click", () => {
      const target = createTarget("hostile");
      refreshTargetInfo(target);
      state.targets.push(target);
      syncTargetSprites();
      selectTarget(target.id, "New hostile signature");
      addShockwave(COLORS.danger);
    });

    els.addResource.addEventListener("click", () => {
      const target = createTarget("resource");
      refreshTargetInfo(target);
      state.targets.push(target);
      syncTargetSprites();
      addLog("Resource beacon registered.", "warn");
    });

    els.lockNearest.addEventListener("click", () => {
      const nearest = getNearestTarget(performance.now());
      if (nearest) {
        selectTarget(nearest.id, "Nearest target lock");
      }
    });

    els.scramble.addEventListener("click", () => {
      state.scrambleUntil = performance.now() + 4200;
      addShockwave(COLORS.warn);
      addLog("Electromagnetic interference detected. Signal unstable.", "warn");
    });

    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resizeRadar, 120);
    });
  }

  async function init() {
    syncControlValues();
    ensureTargetCardPool(MAX_TARGET_LIST_ITEMS);
    bindEvents();
    await initPixi();
  }

  return {
    init
  };
}
