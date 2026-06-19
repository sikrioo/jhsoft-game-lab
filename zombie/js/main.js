const WORLD = {
  width: 2880,
  height: 1680,
  activeTop: 320,
  activeBottom: 1510,
  margin: 90,
};

const SEPARATION_RADIUS = 72;
const SEPARATION_RADIUS_SQ = SEPARATION_RADIUS * SEPARATION_RADIUS;
const WANDER_ARRIVAL_RADIUS_SQ = 28 * 28;
const BEACON_CONTACT_RADIUS_SQ = 112 * 112;
const BEACON_ATTACK_RADIUS_SQ = 132 * 132;
const SHOCKWAVE_RADIUS = 188;
const SHOCKWAVE_RADIUS_SQ = SHOCKWAVE_RADIUS * SHOCKWAVE_RADIUS;
const SPATIAL_CELL_SIZE = 96;

const ZOMBIE_SPECS = [
  {
    key: "z1",
    folder: "Zombie_1",
    scale: 1.1,
    speed: 60,
    hearing: 620,
    hp: 90,
    tint: 0xffffff,
    frames: { idle: 6, walk: 10, attack: 5, hurt: 4, dead: 5 },
  },
  {
    key: "z2",
    folder: "Zombie_2",
    scale: 1.08,
    speed: 58,
    hearing: 580,
    hp: 92,
    tint: 0xf0ffe1,
    frames: { idle: 6, walk: 10, attack: 5, hurt: 4, dead: 5 },
  },
  {
    key: "z3",
    folder: "Zombie_3",
    scale: 1.12,
    speed: 57,
    hearing: 640,
    hp: 94,
    tint: 0xfff6ea,
    frames: { idle: 6, walk: 10, attack: 4, hurt: 4, dead: 5 },
  },
  {
    key: "z4",
    folder: "Zombie_4",
    scale: 1.14,
    speed: 64,
    hearing: 680,
    hp: 98,
    tint: 0xffffff,
    frames: { idle: 7, walk: 12, attack: 10, hurt: 4, dead: 5 },
  },
];

const UI = {
  boot: document.getElementById("boot-state"),
  population: document.getElementById("population-count"),
  alerted: document.getElementById("alert-count"),
  beacon: document.getElementById("beacon-countdown"),
  camera: document.getElementById("camera-state"),
  fps: document.getElementById("fps-count"),
  directorState: document.getElementById("director-state"),
  directorDetail: document.getElementById("director-detail"),
  toast: document.getElementById("toast"),
};

let toastTimer = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomRange(min, max) {
  return Phaser.Math.FloatBetween(min, max);
}

function showToast(message, tone = "calm") {
  UI.toast.textContent = message;
  UI.toast.dataset.tone = tone;
  UI.toast.classList.add("visible");
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    UI.toast.classList.remove("visible");
  }, 2100);
}

class ZombieSandboxScene extends Phaser.Scene {
  constructor() {
    super("ZombieSandboxScene");
    this.zombies = [];
    this.obstacles = [];
    this.fogDrifters = [];
    this.sparkGlows = [];
    this.shockwaves = [];
    this.lastShockwaveAt = 0;
    this.nextHudUpdateAt = 0;
    this.directorPaused = false;
    this.directorMode = "ROAMING";
    this.cameraMode = "DRIFT";
    this.zombieGrid = new Map();
    this.gridStride = Math.ceil(WORLD.width / SPATIAL_CELL_SIZE) + 2;
    this.frameStats = {
      alive: 0,
      alerted: 0,
      attackers: 0,
      wandering: 0,
    };
    this.cameraRig = { x: WORLD.width * 0.5, y: WORLD.height * 0.58, manualTimer: 0 };
    this.zoomMin = 0.4;
    this.zoomMax = 1.35;
    this.targetZoom = 0.58;
  }

  preload() {
    UI.boot.textContent = "Streaming zombie sheets...";

    this.load.setPath("./assets/craftpix-net-503404-free-urban-zombie-sprite-sheet-pixel-art-pack");
    for (const spec of ZOMBIE_SPECS) {
      this.load.spritesheet(`${spec.key}-idle-sheet`, `${spec.folder}/Idle.png`, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`${spec.key}-walk-sheet`, `${spec.folder}/Walk.png`, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`${spec.key}-attack-sheet`, `${spec.folder}/Attack.png`, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`${spec.key}-hurt-sheet`, `${spec.folder}/Hurt.png`, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`${spec.key}-dead-sheet`, `${spec.folder}/Dead.png`, { frameWidth: 128, frameHeight: 128 });
    }

    this.load.on("progress", (value) => {
      UI.boot.textContent = `Loading world ${(value * 100).toFixed(0)}%`;
    });
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBackgroundColor("#02060b");
    this.cameras.main.fadeIn(350, 0, 0, 0);

    UI.boot.textContent = "Create step: textures";
    this.createTextures();
    UI.boot.textContent = "Create step: backdrops";
    this.createBackdrops();
    UI.boot.textContent = "Create step: ground";
    this.createGround();
    UI.boot.textContent = "Create step: props";
    this.createProps();
    UI.boot.textContent = "Create step: animations";
    this.createAnimations();
    UI.boot.textContent = "Create step: beacon";
    this.createBeacon();
    UI.boot.textContent = "Create step: input";
    this.createInput();
    UI.boot.textContent = "Create step: zombies";
    this.spawnZombies(30);
    UI.boot.textContent = "Create step: camera";
    this.setupCamera();

    UI.boot.textContent = "World online. Left click for a beacon, right click for a shockwave.";
    this.updateHud(0, true);
    showToast("Noise beacon ready. Left click anywhere in the playfield.", "calm");
  }

  update(time, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05);

    this.handleHotkeys();
    this.updateCamera(dt);
    this.updateBackdrops(time, dt);
    this.updateShockwaves(dt);

    if (!this.directorPaused) {
      this.updateBeacon(time, dt);
      this.updateZombies(time, dt);
      this.directorMode = this.computeDirectorMode();
    } else {
      this.directorMode = "PAUSED";
    }

    if (time >= this.nextHudUpdateAt) {
      this.nextHudUpdateAt = time + 140;
      this.updateHud(deltaMs);
    }
  }

  createTextures() {
    this.makeCanvasTexture("sky-gradient", 1600, 900, (ctx, width, height) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#183242");
      gradient.addColorStop(0.42, "#111c26");
      gradient.addColorStop(1, "#091017");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const moonGlow = ctx.createRadialGradient(width * 0.8, height * 0.2, 5, width * 0.8, height * 0.2, 150);
      moonGlow.addColorStop(0, "rgba(255, 220, 166, 0.92)");
      moonGlow.addColorStop(0.35, "rgba(255, 190, 110, 0.24)");
      moonGlow.addColorStop(1, "rgba(255, 170, 84, 0)");
      ctx.fillStyle = moonGlow;
      ctx.fillRect(0, 0, width, height);
    });

    this.makeCanvasTexture("glow-disc", 256, 256, (ctx, width, height) => {
      const gradient = ctx.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, width * 0.5);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.22, "rgba(255,255,255,0.72)");
      gradient.addColorStop(0.48, "rgba(255,255,255,0.24)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    });

    this.makeCanvasTexture("fog-blob", 512, 256, (ctx, width, height) => {
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 5; i += 1) {
        const x = randomRange(width * 0.18, width * 0.82);
        const y = randomRange(height * 0.35, height * 0.72);
        const radius = randomRange(48, 92);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, "rgba(214, 241, 225, 0.18)");
        gradient.addColorStop(0.4, "rgba(163, 209, 183, 0.12)");
        gradient.addColorStop(1, "rgba(140, 188, 164, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    this.makeCanvasTexture("shadow-ellipse", 220, 80, (ctx, width, height) => {
      const gradient = ctx.createRadialGradient(width * 0.5, height * 0.5, 8, width * 0.5, height * 0.5, width * 0.45);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.62)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    });

    this.makeCanvasTexture("wreck-car", 240, 120, (ctx) => {
      ctx.fillStyle = "#2d3438";
      ctx.fillRect(16, 44, 206, 44);
      ctx.fillStyle = "#46535a";
      ctx.fillRect(34, 26, 128, 32);
      ctx.fillRect(168, 34, 34, 24);
      ctx.fillStyle = "#1b2124";
      ctx.fillRect(44, 34, 48, 18);
      ctx.fillRect(98, 34, 48, 18);
      ctx.fillStyle = "#0c0f11";
      ctx.beginPath();
      ctx.arc(58, 90, 21, 0, Math.PI * 2);
      ctx.arc(182, 90, 21, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#101417";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(24, 54);
      ctx.lineTo(214, 54);
      ctx.moveTo(86, 28);
      ctx.lineTo(150, 56);
      ctx.moveTo(106, 84);
      ctx.lineTo(145, 84);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 180, 104, 0.24)";
      ctx.fillRect(18, 54, 10, 8);
      ctx.fillRect(210, 54, 10, 8);
      ctx.fillStyle = "rgba(142, 60, 38, 0.32)";
      ctx.fillRect(92, 72, 80, 8);
    });

    this.makeCanvasTexture("dumpster", 150, 118, (ctx) => {
      ctx.fillStyle = "#1b2a2e";
      ctx.fillRect(12, 24, 126, 72);
      ctx.fillStyle = "#425f57";
      ctx.fillRect(16, 30, 118, 58);
      ctx.fillStyle = "#243236";
      ctx.fillRect(12, 16, 126, 14);
      ctx.fillStyle = "#111617";
      ctx.fillRect(32, 96, 18, 12);
      ctx.fillRect(100, 96, 18, 12);
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(44, 42);
      ctx.lineTo(106, 42);
      ctx.moveTo(40, 60);
      ctx.lineTo(112, 60);
      ctx.stroke();
    });

    this.makeCanvasTexture("barrier", 180, 86, (ctx) => {
      ctx.fillStyle = "#25282a";
      ctx.fillRect(16, 30, 148, 26);
      ctx.fillStyle = "#ffc061";
      ctx.fillRect(18, 34, 144, 8);
      ctx.fillStyle = "#3b4248";
      ctx.fillRect(28, 18, 16, 54);
      ctx.fillRect(136, 18, 16, 54);
      ctx.fillStyle = "#111417";
      ctx.fillRect(18, 42, 144, 8);
    });

    this.makeCanvasTexture("barrel", 100, 124, (ctx) => {
      ctx.fillStyle = "#3d2d29";
      ctx.fillRect(30, 18, 40, 84);
      ctx.fillStyle = "#734236";
      ctx.fillRect(26, 28, 48, 12);
      ctx.fillRect(26, 74, 48, 12);
      ctx.fillStyle = "#231917";
      ctx.fillRect(30, 18, 40, 6);
      ctx.fillRect(30, 96, 40, 6);
      ctx.fillStyle = "rgba(255, 178, 72, 0.28)";
      ctx.beginPath();
      ctx.arc(50, 26, 12, 0, Math.PI * 2);
      ctx.fill();
    });

    this.makeCanvasTexture("lamp-post", 70, 300, (ctx) => {
      ctx.fillStyle = "#131a1f";
      ctx.fillRect(30, 24, 10, 236);
      ctx.fillRect(18, 248, 34, 22);
      ctx.fillRect(12, 260, 46, 18);
      ctx.fillStyle = "#212e34";
      ctx.fillRect(26, 20, 18, 22);
      ctx.fillRect(12, 36, 46, 8);
    });
  }

  makeCanvasTexture(key, width, height, drawFn) {
    const texture = this.textures.createCanvas(key, width, height);
    const ctx = texture.getContext();
    drawFn(ctx, width, height);
    texture.refresh();
    return texture;
  }

  createBackdrops() {
    this.add.image(WORLD.width * 0.5, WORLD.height * 0.32, "sky-gradient")
      .setDisplaySize(WORLD.width + 840, WORLD.height + 440)
      .setScrollFactor(0.08)
      .setDepth(-4000);

    const farSkyline = this.add.container(0, 420).setScrollFactor(0.16).setDepth(-3200);
    const nearSkyline = this.add.container(0, 520).setScrollFactor(0.24).setDepth(-2600);

    this.populateSkyline(farSkyline, 28, { minW: 110, maxW: 220, minH: 180, maxH: 360, palette: [0x10161b, 0x121b23, 0x162028] });
    this.populateSkyline(nearSkyline, 22, { minW: 140, maxW: 250, minH: 240, maxH: 460, palette: [0x171f26, 0x1a242e, 0x202d36] });

    const moonGlow = this.add.image(WORLD.width * 0.83, 240, "glow-disc")
      .setScale(1.6)
      .setTint(0xffbe70)
      .setAlpha(0.24)
      .setScrollFactor(0.08)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-3400);
    this.tweens.add({
      targets: moonGlow,
      alpha: { from: 0.14, to: 0.24 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    this.fogDrifters = [];
    for (let i = 0; i < 8; i += 1) {
      const fog = this.add.image(
        randomRange(0, WORLD.width),
        randomRange(WORLD.activeTop + 80, WORLD.activeBottom - 60),
        "fog-blob",
      )
        .setScale(randomRange(0.7, 1.3))
        .setAlpha(randomRange(0.1, 0.2))
        .setScrollFactor(randomRange(0.85, 0.96))
        .setDepth(randomRange(-600, 260));
      this.fogDrifters.push({
        sprite: fog,
        originX: fog.x,
        originY: fog.y,
        phase: randomRange(0, Math.PI * 2),
        driftX: randomRange(24, 120),
        driftY: randomRange(8, 34),
        speed: randomRange(0.09, 0.2),
      });
    }
  }

  populateSkyline(container, count, config) {
    let cursorX = -60;
    for (let i = 0; i < count; i += 1) {
      const width = randomRange(config.minW, config.maxW);
      const height = randomRange(config.minH, config.maxH);
      const color = Phaser.Utils.Array.GetRandom(config.palette);
      const building = this.add.rectangle(cursorX + width * 0.5, 0, width, height, color)
        .setOrigin(0.5, 1);
      container.add(building);

      const windows = this.add.graphics();
      windows.fillStyle(0xffd48e, 0.16);
      const cols = Math.max(2, Math.floor(width / 28));
      const rows = Math.max(3, Math.floor(height / 34));
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          if (Math.random() > 0.26) continue;
          const w = randomRange(8, 12);
          const h = randomRange(10, 14);
          windows.fillRoundedRect(
            cursorX + 16 + col * 24,
            -height + 18 + row * 28,
            w,
            h,
            2,
          );
        }
      }
      container.add(windows);
      cursorX += width * 0.78;
    }
  }

  createGround() {
    const g = this.add.graphics().setDepth(-1200);

    g.fillStyle(0x10171d, 1);
    g.fillRect(0, 0, WORLD.width, WORLD.height);

    g.fillStyle(0x16252c, 1);
    g.fillRect(0, WORLD.activeTop, WORLD.width, 196);
    g.fillRect(0, WORLD.activeBottom - 126, WORLD.width, 166);

    g.fillStyle(0x1a242b, 1);
    g.fillRect(0, WORLD.activeTop + 120, WORLD.width, WORLD.activeBottom - WORLD.activeTop - 190);

    g.fillStyle(0x131f27, 1);
    g.fillRect(0, WORLD.activeTop + 256, WORLD.width, 278);

    g.lineStyle(5, 0x6d7f84, 0.46);
    for (let x = 180; x < WORLD.width - 160; x += 280) {
      g.lineBetween(x, WORLD.activeTop + 390, x + 120, WORLD.activeTop + 390);
    }

    g.fillStyle(0xd6b670, 0.28);
    for (let x = 220; x < WORLD.width - 180; x += 540) {
      for (let i = 0; i < 7; i += 1) {
        g.fillRect(x + i * 18, WORLD.activeTop + 48, 12, 72);
      }
    }

    g.fillStyle(0x27414c, 0.42);
    for (let i = 0; i < 34; i += 1) {
      g.fillEllipse(
        randomRange(70, WORLD.width - 70),
        randomRange(WORLD.activeTop + 180, WORLD.activeBottom - 40),
        randomRange(40, 120),
        randomRange(18, 42),
      );
    }

    g.lineStyle(2, 0x334047, 0.72);
    for (let i = 0; i < 90; i += 1) {
      const startX = randomRange(0, WORLD.width);
      const startY = randomRange(WORLD.activeTop + 12, WORLD.activeBottom - 12);
      g.beginPath();
      g.moveTo(startX, startY);
      g.lineTo(startX + randomRange(-40, 40), startY + randomRange(-12, 16));
      g.lineTo(startX + randomRange(-80, 80), startY + randomRange(-18, 28));
      g.strokePath();
    }
  }

  createProps() {
    this.blockerGroup = this.physics.add.staticGroup();
    const propLayout = [
      { type: "lamp", x: 220, y: 480 },
      { type: "car", x: 410, y: 746, tint: 0x7a3636 },
      { type: "barrier", x: 720, y: 664 },
      { type: "dumpster", x: 890, y: 962 },
      { type: "lamp", x: 1080, y: 474 },
      { type: "car", x: 1220, y: 1164, tint: 0x4d6770 },
      { type: "barrel", x: 1420, y: 886 },
      { type: "barrier", x: 1560, y: 1278 },
      { type: "car", x: 1770, y: 780, tint: 0x58644b },
      { type: "dumpster", x: 1980, y: 1050 },
      { type: "lamp", x: 2160, y: 470 },
      { type: "barrel", x: 2280, y: 636 },
      { type: "barrier", x: 2460, y: 934 },
      { type: "car", x: 2580, y: 1264, tint: 0x6d5a3d },
      { type: "dumpster", x: 2680, y: 710 },
    ];

    for (const prop of propLayout) {
      this.addProp(prop);
    }
  }

  addProp(prop) {
    const definitions = {
      car: {
        texture: "wreck-car",
        displayWidth: 232,
        displayHeight: 120,
        bodyWidth: 150,
        bodyHeight: 44,
        bodyOffsetY: 16,
        avoidRadius: 126,
        shadowScale: 1.05,
      },
      dumpster: {
        texture: "dumpster",
        displayWidth: 140,
        displayHeight: 112,
        bodyWidth: 102,
        bodyHeight: 44,
        bodyOffsetY: 16,
        avoidRadius: 90,
        shadowScale: 0.76,
      },
      barrier: {
        texture: "barrier",
        displayWidth: 156,
        displayHeight: 76,
        bodyWidth: 124,
        bodyHeight: 24,
        bodyOffsetY: 18,
        avoidRadius: 82,
        shadowScale: 0.78,
      },
      barrel: {
        texture: "barrel",
        displayWidth: 82,
        displayHeight: 112,
        bodyWidth: 34,
        bodyHeight: 26,
        bodyOffsetY: 22,
        avoidRadius: 52,
        shadowScale: 0.48,
      },
      lamp: {
        texture: "lamp-post",
        displayWidth: 44,
        displayHeight: 248,
        bodyWidth: 22,
        bodyHeight: 26,
        bodyOffsetY: 112,
        avoidRadius: 46,
        shadowScale: 0.42,
      },
    };

    const def = definitions[prop.type];
    const shadow = this.add.image(prop.x, prop.y + 18, "shadow-ellipse")
      .setScale(def.shadowScale, def.shadowScale * 0.42)
      .setAlpha(0.24)
      .setDepth(prop.y - 18);

    const sprite = this.add.image(prop.x, prop.y, def.texture)
      .setDisplaySize(def.displayWidth, def.displayHeight)
      .setDepth(prop.y + 2);

    if (prop.tint) sprite.setTint(prop.tint);

    if (prop.type === "lamp") {
      const glow = this.add.image(prop.x, prop.y - 92, "glow-disc")
        .setTint(0xffc772)
        .setScale(0.84)
        .setAlpha(0.18)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(prop.y - 180);
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.12, to: 0.23 },
        duration: randomRange(1400, 2200),
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }

    if (prop.type === "barrel") {
      const ember = this.add.image(prop.x, prop.y - 38, "glow-disc")
        .setTint(0xff8a42)
        .setScale(0.32)
        .setAlpha(0.24)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(prop.y - 56);
      this.sparkGlows.push({
        sprite: ember,
        originX: ember.x,
        originY: ember.y,
        phase: randomRange(0, Math.PI * 2),
      });
    }

    const blockerY = prop.y + def.bodyOffsetY;
    const blocker = this.add.rectangle(prop.x, blockerY, def.bodyWidth, def.bodyHeight, 0xff0000, 0);
    this.physics.add.existing(blocker, true);
    this.blockerGroup.add(blocker);

    this.obstacles.push({
      x: prop.x,
      y: blockerY,
      halfW: def.bodyWidth * 0.5,
      halfH: def.bodyHeight * 0.5,
      avoidRadius: def.avoidRadius,
    });
  }

  createAnimations() {
    const animationConfig = [
      { suffix: "idle", sheet: "idle-sheet", frameKey: "idle", frameRate: 6, repeat: -1 },
      { suffix: "walk", sheet: "walk-sheet", frameKey: "walk", frameRate: 9, repeat: -1 },
      { suffix: "attack", sheet: "attack-sheet", frameKey: "attack", frameRate: 11, repeat: 0 },
      { suffix: "hurt", sheet: "hurt-sheet", frameKey: "hurt", frameRate: 12, repeat: 0 },
      { suffix: "dead", sheet: "dead-sheet", frameKey: "dead", frameRate: 9, repeat: 0 },
    ];

    for (const spec of ZOMBIE_SPECS) {
      for (const anim of animationConfig) {
        const key = `${spec.key}-${anim.suffix}`;
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(`${spec.key}-${anim.sheet}`, {
            start: 0,
            end: spec.frames[anim.frameKey] - 1,
          }),
          frameRate: anim.frameRate,
          repeat: anim.repeat,
        });
      }
    }
  }

  createBeacon() {
    const glow = this.add.image(0, 0, "glow-disc")
      .setTint(0x7effb7)
      .setScale(0.82)
      .setAlpha(0.36)
      .setBlendMode(Phaser.BlendModes.ADD);
    const ringA = this.add.image(0, 0, "glow-disc")
      .setTint(0x8dfad5)
      .setScale(0.18)
      .setAlpha(0.38)
      .setBlendMode(Phaser.BlendModes.ADD);
    const ringB = this.add.image(0, 0, "glow-disc")
      .setTint(0xe5fff2)
      .setScale(0.28)
      .setAlpha(0.26)
      .setBlendMode(Phaser.BlendModes.ADD);
    const marker = this.add.circle(0, 0, 8, 0xd4ff8d, 0.9);
    const text = this.add.text(0, -68, "NOISE", {
      fontFamily: "Trebuchet MS, Gill Sans, sans-serif",
      fontSize: "18px",
      color: "#efffe5",
      stroke: "#08110f",
      strokeThickness: 5,
      letterSpacing: 3,
    }).setOrigin(0.5, 0.5);

    this.beacon = {
      active: false,
      ttl: 0,
      eventId: 0,
      container: this.add.container(0, 0, [glow, ringA, ringB, marker, text]).setVisible(false).setDepth(9999),
      glow,
      ringA,
      ringB,
      marker,
      text,
    };
  }

  createInput() {
    this.input.mouse.disableContextMenu();
    this.cameraKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      zoomIn: Phaser.Input.Keyboard.KeyCodes.E,
      zoomOut: Phaser.Input.Keyboard.KeyCodes.Q,
      clear: Phaser.Input.Keyboard.KeyCodes.R,
      pause: Phaser.Input.Keyboard.KeyCodes.SPACE,
      focus: Phaser.Input.Keyboard.KeyCodes.F,
    });
    this.cursorKeys = this.input.keyboard.createCursorKeys();

    this.input.on("pointerdown", (pointer) => {
      if (pointer.rightButtonDown()) {
        this.triggerShockwave(pointer.worldX, pointer.worldY);
        return;
      }

      if (pointer.leftButtonDown()) {
        this.deployBeacon(pointer.worldX, pointer.worldY);
      }
    });

    this.input.on("wheel", (_pointer, _gameObjects, _deltaX, deltaY) => {
      this.targetZoom = clamp(this.targetZoom - Math.sign(deltaY) * 0.06, this.zoomMin, this.zoomMax);
      this.cameraRig.manualTimer = 2.2;
    });
  }

  setupCamera() {
    this.zoomMin = clamp(Math.max(window.innerWidth / WORLD.width, window.innerHeight / WORLD.height), 0.34, 0.62);
    this.zoomMax = clamp(this.zoomMin * 2.35, 0.76, 1.46);
    this.targetZoom = clamp(this.zoomMin * 1.28, this.zoomMin, this.zoomMax);
    this.cameras.main.setZoom(this.targetZoom);
    this.cameras.main.centerOn(this.cameraRig.x, this.cameraRig.y);
  }

  spawnZombies(count) {
    this.zombieGroup = this.physics.add.group();

    for (let i = 0; i < count; i += 1) {
      const spec = ZOMBIE_SPECS[i % ZOMBIE_SPECS.length];
      const spawn = this.findOpenPoint();
      const shadow = this.add.image(spawn.x, spawn.y + 28, "shadow-ellipse")
        .setScale(0.44 * spec.scale, 0.22 * spec.scale)
        .setAlpha(0.34)
        .setDepth(spawn.y + 6);
      const sprite = this.physics.add.sprite(spawn.x, spawn.y, `${spec.key}-idle-sheet`, 0)
        .setOrigin(0.5, 0.82)
        .setScale(spec.scale)
        .setTint(spec.tint)
        .setDepth(spawn.y + 34);
      sprite.body.setSize(28, 20);
      sprite.body.setOffset(50, 96);
      sprite.body.setAllowGravity(false);
      sprite.body.setMaxVelocity(96, 82);
      sprite.body.setCollideWorldBounds(true);
      sprite.body.useDamping = false;
      sprite.play(`${spec.key}-idle`, true);

      this.zombieGroup.add(sprite);

      const hearing = spec.hearing + randomRange(-40, 50);
      const zombie = {
        id: i + 1,
        spec,
        sprite,
        shadow,
        hpMax: spec.hp,
        hp: spec.hp,
        speed: spec.speed + randomRange(-4, 5),
        hearing,
        hearingSq: hearing * hearing,
        state: "idle",
        action: null,
        actionTimer: 0,
        corpseTimer: 0,
        stateTimer: randomRange(0.2, 1.3),
        targetX: spawn.x,
        targetY: spawn.y,
        memoryTimer: 0,
        attackCooldown: randomRange(0.4, 1.4),
        beaconTicket: 0,
        alerted: false,
        seed: randomRange(0, Math.PI * 2),
        steerBlend: randomRange(0.1, 0.2),
        attackDrift: randomRange(-22, 22),
        separationVec: { x: 0, y: 0 },
        avoidanceVec: { x: 0, y: 0 },
        lastSpriteDepth: (spawn.y | 0) + 40,
        lastShadowDepth: (spawn.y | 0) + 6,
        lastShadowScaleX: -1,
        lastShadowScaleY: -1,
        lastShadowAlpha: -1,
        cellX: 0,
        cellY: 0,
      };

      this.zombies.push(zombie);
    }

    this.physics.add.collider(this.zombieGroup, this.blockerGroup);
  }

  handleHotkeys() {
    if (Phaser.Input.Keyboard.JustDown(this.cameraKeys.pause)) {
      this.directorPaused = !this.directorPaused;
      showToast(this.directorPaused ? "Director paused." : "Director resumed.", this.directorPaused ? "impact" : "calm");
    }

    if (Phaser.Input.Keyboard.JustDown(this.cameraKeys.clear)) {
      this.clearBeacon();
    }

    if (Phaser.Input.Keyboard.JustDown(this.cameraKeys.focus)) {
      this.cameraRig.manualTimer = 0;
      showToast("Camera drift focus restored.", "alert");
    }

    const zoomStep = 0.016;
    if (this.cameraKeys.zoomIn.isDown) this.targetZoom = clamp(this.targetZoom + zoomStep, this.zoomMin, this.zoomMax);
    if (this.cameraKeys.zoomOut.isDown) this.targetZoom = clamp(this.targetZoom - zoomStep, this.zoomMin, this.zoomMax);
  }

  updateCamera(dt) {
    const horizontal =
      (this.cameraKeys.right.isDown ? 1 : 0) -
      (this.cameraKeys.left.isDown ? 1 : 0) +
      (this.cursorKeys.right.isDown ? 1 : 0) -
      (this.cursorKeys.left.isDown ? 1 : 0);
    const vertical =
      (this.cameraKeys.down.isDown ? 1 : 0) -
      (this.cameraKeys.up.isDown ? 1 : 0) +
      (this.cursorKeys.down.isDown ? 1 : 0) -
      (this.cursorKeys.up.isDown ? 1 : 0);

    if (horizontal !== 0 || vertical !== 0) {
      const panSpeed = 640 / this.cameras.main.zoom;
      this.cameraRig.x += horizontal * panSpeed * dt;
      this.cameraRig.y += vertical * panSpeed * 0.78 * dt;
      this.cameraRig.manualTimer = 2.3;
      this.cameraMode = "MANUAL";
    } else if (this.cameraRig.manualTimer > 0) {
      this.cameraRig.manualTimer = Math.max(0, this.cameraRig.manualTimer - dt);
      this.cameraMode = "MANUAL";
    } else {
      const interest = this.getInterestPoint();
      this.cameraRig.x = Phaser.Math.Linear(this.cameraRig.x, interest.x, 0.06);
      this.cameraRig.y = Phaser.Math.Linear(this.cameraRig.y, interest.y, 0.06);
      this.cameraMode = "DRIFT";
    }

    const camera = this.cameras.main;
    camera.setZoom(Phaser.Math.Linear(camera.zoom, this.targetZoom, 0.12));

    const halfW = camera.width * 0.5 / camera.zoom;
    const halfH = camera.height * 0.5 / camera.zoom;
    this.cameraRig.x = clamp(this.cameraRig.x, halfW, WORLD.width - halfW);
    this.cameraRig.y = clamp(this.cameraRig.y, halfH, WORLD.height - halfH);
    camera.centerOn(this.cameraRig.x, this.cameraRig.y);
  }

  getInterestPoint() {
    let totalWeight = 0;
    let sumX = 0;
    let sumY = 0;

    for (const zombie of this.zombies) {
      if (zombie.state === "dead") continue;
      const movingWeight = zombie.state === "investigate" || zombie.state === "attack" ? 1.65 : 1;
      totalWeight += movingWeight;
      sumX += zombie.sprite.x * movingWeight;
      sumY += zombie.sprite.y * movingWeight;
    }

    if (this.beacon.active) {
      totalWeight += 7;
      sumX += this.beacon.container.x * 7;
      sumY += this.beacon.container.y * 7;
    }

    if (totalWeight <= 0) {
      return { x: WORLD.width * 0.5, y: WORLD.height * 0.5 };
    }

    return {
      x: sumX / totalWeight,
      y: sumY / totalWeight,
    };
  }

  updateBackdrops(time, dt) {
    for (const fog of this.fogDrifters) {
      fog.sprite.x = fog.originX + Math.cos(time * 0.0002 * fog.speed + fog.phase) * fog.driftX;
      fog.sprite.y = fog.originY + Math.sin(time * 0.00017 * fog.speed + fog.phase) * fog.driftY;
    }

    for (const spark of this.sparkGlows) {
      spark.sprite.y = spark.originY + Math.sin(time * 0.005 + spark.phase) * 4;
      spark.sprite.alpha = 0.18 + (Math.sin(time * 0.008 + spark.phase) + 1) * 0.08;
      spark.sprite.scale = 0.28 + (Math.sin(time * 0.006 + spark.phase) + 1) * 0.02;
    }
  }

  deployBeacon(x, y) {
    this.beacon.active = true;
    this.beacon.ttl = 8.6;
    this.beacon.eventId += 1;
    this.beacon.container.setVisible(true).setPosition(
      clamp(x, WORLD.margin, WORLD.width - WORLD.margin),
      clamp(y, WORLD.activeTop + 20, WORLD.activeBottom - 20),
    );
    this.beacon.container.setDepth(this.beacon.container.y + 120);
    showToast("Noise beacon deployed. Nearby zombies are converging.", "alert");
  }

  clearBeacon(silent = false) {
    if (!this.beacon.active) return;
    this.beacon.active = false;
    this.beacon.ttl = 0;
    this.beacon.container.setVisible(false);
    if (!silent) showToast("Noise beacon cleared.", "calm");
  }

  updateBeacon(time, dt) {
    if (!this.beacon.active) return;

    this.beacon.ttl -= dt;
    if (this.beacon.ttl <= 0) {
      this.clearBeacon(true);
      return;
    }

    const pulseA = (time * 0.0015) % 1;
    const pulseB = ((time * 0.0015) + 0.45) % 1;
    this.beacon.glow.alpha = 0.18 + (Math.sin(time * 0.012) + 1) * 0.12;
    this.beacon.ringA.setScale(0.18 + pulseA * 1.2);
    this.beacon.ringB.setScale(0.28 + pulseB * 1.3);
    this.beacon.ringA.alpha = clamp(0.34 - pulseA * 0.26, 0.04, 0.38);
    this.beacon.ringB.alpha = clamp(0.28 - pulseB * 0.22, 0.03, 0.32);
    this.beacon.text.y = -68 + Math.sin(time * 0.008) * 5;
  }

  triggerShockwave(x, y) {
    const now = this.time.now;
    if (now - this.lastShockwaveAt < 280) return;
    this.lastShockwaveAt = now;

    const shockX = clamp(x, WORLD.margin, WORLD.width - WORLD.margin);
    const shockY = clamp(y, WORLD.activeTop + 20, WORLD.activeBottom - 20);

    const flash = this.add.image(shockX, shockY, "glow-disc")
      .setTint(0xffb766)
      .setAlpha(0.34)
      .setScale(0.18)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(shockY + 140);

    this.shockwaves.push({
      sprite: flash,
      x: shockX,
      y: shockY,
      radius: SHOCKWAVE_RADIUS,
      life: 0.34,
      maxLife: 0.34,
    });

    let hits = 0;
    for (const zombie of this.zombies) {
      if (zombie.state === "dead") continue;
      const dx = shockX - zombie.sprite.x;
      const dy = shockY - zombie.sprite.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > SHOCKWAVE_RADIUS_SQ) continue;
      const dist = Math.sqrt(distSq);
      const damage = dist < 94 ? 120 : Phaser.Math.Linear(88, 34, dist / SHOCKWAVE_RADIUS);
      this.damageZombie(zombie, damage, shockX, shockY);
      hits += 1;
    }

    showToast(
      hits > 0 ? `Shockwave connected with ${hits} zombie${hits === 1 ? "" : "s"}.` : "Shockwave dissipated without contact.",
      "impact",
    );
  }

  updateShockwaves(dt) {
    if (this.shockwaves.length === 0) return;

    for (let i = this.shockwaves.length - 1; i >= 0; i -= 1) {
      const wave = this.shockwaves[i];
      wave.life -= dt;
      const progress = 1 - wave.life / wave.maxLife;
      wave.sprite.setScale(0.18 + progress * 1.6);
      wave.sprite.setAlpha(clamp(0.38 - progress * 0.38, 0, 0.38));
      if (wave.life <= 0) {
        wave.sprite.destroy();
        this.shockwaves.splice(i, 1);
      }
    }
  }

  updateZombies(time, dt) {
    const stats = this.frameStats;
    stats.alive = 0;
    stats.alerted = 0;
    stats.attackers = 0;
    stats.wandering = 0;

    this.rebuildZombieGrid();

    const beaconActive = this.beacon.active;
    const beaconX = beaconActive ? this.beacon.container.x : 0;
    const beaconY = beaconActive ? this.beacon.container.y : 0;

    for (const zombie of this.zombies) {
      zombie.attackCooldown = Math.max(0, zombie.attackCooldown - dt);
      if (zombie.state !== "dead") {
        this.evaluateStimulus(zombie, dt, beaconActive, beaconX, beaconY);
      }

      if (zombie.action) {
        this.updateActionState(zombie, dt);
      } else if (zombie.state !== "dead") {
        this.updateFreeState(zombie, time, dt, beaconActive, beaconX, beaconY);
      } else {
        this.updateCorpse(zombie, dt);
      }

      if (zombie.state !== "dead") {
        stats.alive += 1;
        const engaged = zombie.alerted || zombie.state === "attack" || zombie.state === "investigate" || zombie.action === "attack";
        if (engaged) stats.alerted += 1;
        if (zombie.state === "attack" || zombie.action === "attack") stats.attackers += 1;
        if (zombie.state === "wander") stats.wandering += 1;
      }

      this.syncZombieRender(zombie);
    }
  }

  rebuildZombieGrid() {
    this.zombieGrid.clear();

    for (const zombie of this.zombies) {
      if (zombie.state === "dead") continue;

      const cellX = Math.floor(zombie.sprite.x / SPATIAL_CELL_SIZE);
      const cellY = Math.floor(zombie.sprite.y / SPATIAL_CELL_SIZE);
      const key = cellX + cellY * this.gridStride;
      let bucket = this.zombieGrid.get(key);

      zombie.cellX = cellX;
      zombie.cellY = cellY;

      if (!bucket) {
        bucket = [];
        this.zombieGrid.set(key, bucket);
      }

      bucket.push(zombie);
    }
  }

  evaluateStimulus(zombie, dt, beaconActive, beaconX, beaconY) {
    zombie.memoryTimer = Math.max(0, zombie.memoryTimer - dt);
    zombie.alerted = false;

    if (!beaconActive) {
      if (zombie.state === "investigate" && zombie.memoryTimer <= 0) {
        zombie.state = "idle";
        zombie.stateTimer = randomRange(0.3, 0.9);
      }
      return;
    }

    const dx = beaconX - zombie.sprite.x;
    const dy = beaconY - zombie.sprite.y;
    const distSq = dx * dx + dy * dy;

    if (distSq <= zombie.hearingSq) {
      zombie.alerted = true;
      zombie.memoryTimer = 1.45;
      if (zombie.beaconTicket !== this.beacon.eventId || zombie.state !== "attack") {
        zombie.state = "investigate";
        zombie.beaconTicket = this.beacon.eventId;
        this.assignBeaconTarget(zombie);
      }
    } else if (zombie.state === "investigate" && zombie.memoryTimer <= 0) {
      zombie.state = "idle";
      zombie.stateTimer = randomRange(0.4, 1.1);
    }
  }

  assignBeaconTarget(zombie) {
    zombie.targetX = clamp(this.beacon.container.x + randomRange(-88, 88), WORLD.margin, WORLD.width - WORLD.margin);
    zombie.targetY = clamp(this.beacon.container.y + randomRange(-64, 64), WORLD.activeTop + 26, WORLD.activeBottom - 26);
    zombie.stateTimer = randomRange(1.1, 2.2);
  }

  updateActionState(zombie, dt) {
    zombie.actionTimer -= dt;

    if (zombie.action === "hurt") {
      zombie.sprite.body.velocity.scale(0.9);
      if (zombie.actionTimer <= 0) {
        zombie.action = null;
        zombie.state = this.beacon.active ? "investigate" : "idle";
        zombie.stateTimer = randomRange(0.2, 0.8);
      }
      return;
    }

    if (zombie.action === "attack") {
      zombie.sprite.setVelocity(zombie.sprite.body.velocity.x * 0.82, zombie.sprite.body.velocity.y * 0.82);
      if (zombie.actionTimer <= 0) {
        zombie.action = null;
        zombie.state = this.beacon.active ? "attack" : "idle";
        zombie.stateTimer = randomRange(0.15, 0.4);
      }
      return;
    }

    if (zombie.action === "dead-intro") {
      zombie.sprite.setVelocity(0, 0);
      if (zombie.actionTimer <= 0) {
        zombie.action = null;
        zombie.corpseTimer = randomRange(6.5, 11.5);
        zombie.sprite.setFrame(zombie.spec.frames.dead - 1);
      }
    }
  }

  updateFreeState(zombie, time, dt, beaconActive, beaconX, beaconY) {
    zombie.stateTimer -= dt;

    if (zombie.state === "attack") {
      zombie.sprite.setVelocity(zombie.sprite.body.velocity.x * 0.76, zombie.sprite.body.velocity.y * 0.76);
      let distSq = Number.POSITIVE_INFINITY;
      if (beaconActive) {
        const dx = beaconX - zombie.sprite.x;
        const dy = beaconY - zombie.sprite.y;
        distSq = dx * dx + dy * dy;
      }

      if (!beaconActive || distSq > BEACON_ATTACK_RADIUS_SQ) {
        zombie.state = beaconActive ? "investigate" : "idle";
        zombie.stateTimer = randomRange(0.2, 0.8);
      } else if (zombie.attackCooldown <= 0) {
        zombie.action = "attack";
        zombie.actionTimer = 0.48 + zombie.spec.frames.attack * 0.035;
        zombie.attackCooldown = randomRange(0.85, 1.65);
        zombie.sprite.play(`${zombie.spec.key}-attack`, true);
      } else if (!zombie.sprite.anims.currentAnim || zombie.sprite.anims.currentAnim.key !== `${zombie.spec.key}-idle`) {
        zombie.sprite.play(`${zombie.spec.key}-idle`, true);
      }
      return;
    }

    if (zombie.state === "idle") {
      zombie.sprite.setVelocity(zombie.sprite.body.velocity.x * 0.82, zombie.sprite.body.velocity.y * 0.82);
      if (zombie.stateTimer <= 0) {
        if (beaconActive && zombie.memoryTimer > 0) {
          zombie.state = "investigate";
          this.assignBeaconTarget(zombie);
        } else {
          this.assignWanderTarget(zombie);
          zombie.state = "wander";
        }
      } else if (!zombie.sprite.anims.currentAnim || zombie.sprite.anims.currentAnim.key !== `${zombie.spec.key}-idle`) {
        zombie.sprite.play(`${zombie.spec.key}-idle`, true);
      }
      return;
    }

    if (zombie.state === "investigate") {
      const dx = beaconX - zombie.sprite.x;
      const dy = beaconY - zombie.sprite.y;
      const distSq = dx * dx + dy * dy;
      if (beaconActive && distSq < BEACON_CONTACT_RADIUS_SQ) {
        zombie.state = "attack";
        zombie.stateTimer = randomRange(0.2, 0.45);
        zombie.sprite.setVelocity(zombie.sprite.body.velocity.x * 0.72, zombie.sprite.body.velocity.y * 0.72);
        return;
      }
    }

    if (zombie.state === "wander" || zombie.state === "investigate") {
      const targetDx = zombie.targetX - zombie.sprite.x;
      const targetDy = zombie.targetY - zombie.sprite.y;
      const arrived = targetDx * targetDx + targetDy * targetDy < WANDER_ARRIVAL_RADIUS_SQ;
      if (arrived || zombie.stateTimer <= 0) {
        if (zombie.state === "investigate" && beaconActive) {
          this.assignBeaconTarget(zombie);
        } else {
          zombie.state = "idle";
          zombie.stateTimer = randomRange(0.35, 1.25);
        }
      } else {
        const intensity = zombie.state === "investigate" ? 1.1 : 1;
        this.steerZombie(zombie, zombie.targetX, zombie.targetY, intensity, time, dt);
      }
    }
  }

  assignWanderTarget(zombie) {
    let nextX = zombie.sprite.x;
    let nextY = zombie.sprite.y;
    let attempts = 0;

    while (attempts < 18) {
      attempts += 1;
      nextX = clamp(zombie.sprite.x + randomRange(-260, 260), WORLD.margin, WORLD.width - WORLD.margin);
      nextY = clamp(zombie.sprite.y + randomRange(-170, 170), WORLD.activeTop + 20, WORLD.activeBottom - 20);
      if (this.isPointOpen(nextX, nextY, 32)) break;
    }

    zombie.targetX = nextX;
    zombie.targetY = nextY;
    zombie.stateTimer = randomRange(1.8, 4.6);
  }

  steerZombie(zombie, tx, ty, intensity, time, dt) {
    const sprite = zombie.sprite;
    let toTargetX = tx - sprite.x;
    let toTargetY = ty - sprite.y;
    const distanceSq = toTargetX * toTargetX + toTargetY * toTargetY;
    const inverseDistance = distanceSq > 1 ? 1 / Math.sqrt(distanceSq) : 1;
    toTargetX *= inverseDistance;
    toTargetY *= inverseDistance;

    const separation = this.computeSeparation(zombie);
    const avoidance = this.computeObstacleAvoidance(zombie);
    const wanderWobbleX = Math.cos(time * 0.0014 + zombie.seed) * 8;
    const wanderWobbleY = Math.sin(time * 0.0018 + zombie.seed * 0.7) * 6;

    const desiredX = toTargetX * zombie.speed * intensity + separation.x + avoidance.x + wanderWobbleX;
    const desiredY = toTargetY * zombie.speed * intensity + separation.y + avoidance.y + wanderWobbleY;

    const blend = zombie.steerBlend + dt * 0.4;
    sprite.body.velocity.x = Phaser.Math.Linear(sprite.body.velocity.x, desiredX, blend);
    sprite.body.velocity.y = Phaser.Math.Linear(sprite.body.velocity.y, desiredY, blend);

    if (!sprite.anims.currentAnim || sprite.anims.currentAnim.key !== `${zombie.spec.key}-walk`) {
      sprite.play(`${zombie.spec.key}-walk`, true);
    }
  }

  computeSeparation(zombie) {
    const force = zombie.separationVec;
    force.x = 0;
    force.y = 0;

    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const key = zombie.cellX + offsetX + (zombie.cellY + offsetY) * this.gridStride;
        const bucket = this.zombieGrid.get(key);
        if (!bucket) continue;

        for (const other of bucket) {
          if (other === zombie || other.state === "dead") continue;
          const dx = zombie.sprite.x - other.sprite.x;
          const dy = zombie.sprite.y - other.sprite.y;
          const distSq = dx * dx + dy * dy;
          if (distSq <= 0 || distSq > SEPARATION_RADIUS_SQ) continue;

          const dist = Math.sqrt(distSq);
          const factor = (SEPARATION_RADIUS - dist) / SEPARATION_RADIUS;
          force.x += (dx / dist) * factor * 24;
          force.y += (dy / dist) * factor * 18;
        }
      }
    }

    return force;
  }

  computeObstacleAvoidance(zombie) {
    const avoid = zombie.avoidanceVec;
    avoid.x = 0;
    avoid.y = 0;

    for (const obstacle of this.obstacles) {
      const dx = zombie.sprite.x - obstacle.x;
      const dy = zombie.sprite.y - obstacle.y;
      const px = Math.max(Math.abs(dx) - obstacle.halfW, 0);
      const py = Math.max(Math.abs(dy) - obstacle.halfH, 0);
      const edgeDistance = Math.sqrt(px * px + py * py);

      if (edgeDistance > obstacle.avoidRadius) continue;

      const centerDistance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const weight = (obstacle.avoidRadius - edgeDistance) / obstacle.avoidRadius;
      avoid.x += (dx / centerDistance) * weight * 32;
      avoid.y += (dy / centerDistance) * weight * 24;
    }

    const edgeMargin = 74;
    if (zombie.sprite.x < edgeMargin) avoid.x += (edgeMargin - zombie.sprite.x) * 0.7;
    if (zombie.sprite.x > WORLD.width - edgeMargin) avoid.x -= (zombie.sprite.x - (WORLD.width - edgeMargin)) * 0.7;
    if (zombie.sprite.y < WORLD.activeTop + edgeMargin) avoid.y += (WORLD.activeTop + edgeMargin - zombie.sprite.y) * 0.58;
    if (zombie.sprite.y > WORLD.activeBottom - edgeMargin) avoid.y -= (zombie.sprite.y - (WORLD.activeBottom - edgeMargin)) * 0.58;

    return avoid;
  }

  damageZombie(zombie, damage, sourceX, sourceY) {
    if (zombie.state === "dead") return;

    zombie.hp -= damage;
    const angle = Phaser.Math.Angle.Between(sourceX, sourceY, zombie.sprite.x, zombie.sprite.y);
    const knockback = damage >= zombie.hpMax ? 68 : 42;

    if (zombie.hp <= 0) {
      zombie.hp = 0;
      zombie.state = "dead";
      zombie.action = "dead-intro";
      zombie.actionTimer = 0.48 + zombie.spec.frames.dead * 0.03;
      zombie.sprite.body.enable = false;
      zombie.sprite.play(`${zombie.spec.key}-dead`, true);
      zombie.sprite.setFlipX(Math.cos(angle) < 0);
      zombie.shadow.setAlpha(0.16);
      this.spawnImpactGlow(zombie.sprite.x, zombie.sprite.y + 6, 0xff784a, 0.28);
      return;
    }

    zombie.action = "hurt";
    zombie.actionTimer = 0.34;
    zombie.state = "idle";
    zombie.stateTimer = randomRange(0.25, 0.7);
    zombie.sprite.play(`${zombie.spec.key}-hurt`, true);
    zombie.sprite.body.velocity.x = Math.cos(angle) * knockback;
    zombie.sprite.body.velocity.y = Math.sin(angle) * knockback * 0.7;
    this.spawnImpactGlow(zombie.sprite.x, zombie.sprite.y + 12, 0xffcc83, 0.18);
  }

  spawnImpactGlow(x, y, tint, alpha) {
    const glow = this.add.image(x, y, "glow-disc")
      .setTint(tint)
      .setScale(0.14)
      .setAlpha(alpha)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 100);

    this.tweens.add({
      targets: glow,
      scale: 0.46,
      alpha: 0,
      duration: 260,
      ease: "Quad.Out",
      onComplete: () => glow.destroy(),
    });
  }

  updateCorpse(zombie, dt) {
    zombie.corpseTimer -= dt;
    if (zombie.corpseTimer <= 1.2) {
      zombie.sprite.alpha = clamp(zombie.corpseTimer / 1.2, 0, 1);
      zombie.shadow.alpha = 0.16 * clamp(zombie.corpseTimer / 1.2, 0, 1);
    }

    if (zombie.corpseTimer > 0) return;
    this.respawnZombie(zombie);
  }

  respawnZombie(zombie) {
    const spawn = this.findOpenPoint();
    zombie.hp = zombie.hpMax;
    zombie.state = "idle";
    zombie.action = null;
    zombie.stateTimer = randomRange(0.25, 1);
    zombie.memoryTimer = 0;
    zombie.attackCooldown = randomRange(0.4, 1.4);
    zombie.targetX = spawn.x;
    zombie.targetY = spawn.y;
    zombie.sprite.body.enable = true;
    zombie.sprite.setPosition(spawn.x, spawn.y);
    zombie.sprite.setVelocity(0, 0);
    zombie.sprite.setAlpha(0);
    zombie.sprite.play(`${zombie.spec.key}-idle`, true);
    zombie.shadow.setPosition(spawn.x, spawn.y + 28).setAlpha(0);

    this.tweens.add({
      targets: [zombie.sprite, zombie.shadow],
      alpha: 1,
      duration: 420,
      ease: "Quad.Out",
    });

    this.spawnImpactGlow(spawn.x, spawn.y + 8, 0x8fffb6, 0.18);
  }

  syncZombieRender(zombie) {
    const sprite = zombie.sprite;
    const shadow = zombie.shadow;
    const velocity = sprite.body.velocity;
    if (velocity.x < -4 && !sprite.flipX) sprite.setFlipX(true);
    if (velocity.x > 4 && sprite.flipX) sprite.setFlipX(false);

    const speed = Math.abs(velocity.x) + Math.abs(velocity.y);
    shadow.x = sprite.x;
    shadow.y = sprite.y + 28;

    const shadowScaleX = (0.44 + speed * 0.0008) * zombie.spec.scale;
    const shadowScaleY = (0.22 + speed * 0.0003) * zombie.spec.scale;
    if (
      Math.abs(shadowScaleX - zombie.lastShadowScaleX) > 0.008 ||
      Math.abs(shadowScaleY - zombie.lastShadowScaleY) > 0.008
    ) {
      shadow.setScale(shadowScaleX, shadowScaleY);
      zombie.lastShadowScaleX = shadowScaleX;
      zombie.lastShadowScaleY = shadowScaleY;
    }

    if (zombie.state !== "dead" && sprite.alpha >= 0.98) {
      const shadowAlpha = 0.22 + Math.min(speed, 80) * 0.0012;
      if (Math.abs(shadowAlpha - zombie.lastShadowAlpha) > 0.01) {
        shadow.setAlpha(shadowAlpha);
        zombie.lastShadowAlpha = shadowAlpha;
      }
    }

    const spriteDepth = (sprite.y | 0) + 40;
    const shadowDepth = (sprite.y | 0) + 6;
    if (spriteDepth !== zombie.lastSpriteDepth) {
      sprite.setDepth(spriteDepth);
      zombie.lastSpriteDepth = spriteDepth;
    }
    if (shadowDepth !== zombie.lastShadowDepth) {
      shadow.setDepth(shadowDepth);
      zombie.lastShadowDepth = shadowDepth;
    }

    if (zombie.state !== "dead" && !zombie.action) {
      if (speed > 12 && zombie.state !== "attack") {
        if (!sprite.anims.currentAnim || sprite.anims.currentAnim.key !== `${zombie.spec.key}-walk`) {
          sprite.play(`${zombie.spec.key}-walk`, true);
        }
      } else if (!sprite.anims.currentAnim || sprite.anims.currentAnim.key !== `${zombie.spec.key}-idle`) {
        sprite.play(`${zombie.spec.key}-idle`, true);
      }
    }

  }

  computeDirectorMode() {
    const { attackers, alerted, wandering } = this.frameStats;
    if (this.beacon.active) {
      return attackers > 5 ? "LURCHING" : "INVESTIGATE";
    }

    if (alerted > 0) return "RESTLESS";
    if (attackers > 0) return "RESTLESS";
    if (wandering > 16) return "ROAMING";
    return "RESTLESS";
  }

  updateHud(deltaMs, force = false) {
    const { alive, alerted } = this.frameStats;

    UI.population.textContent = String(alive);
    UI.alerted.textContent = String(alerted);
    UI.beacon.textContent = this.beacon.active ? `${this.beacon.ttl.toFixed(1)}s` : "offline";
    UI.camera.textContent = `${this.cameraMode.toLowerCase()} ${Math.round(this.cameras.main.zoom * 100)}%`;
    UI.fps.textContent = deltaMs > 0 ? String(Math.round(1000 / deltaMs)) : UI.fps.textContent;
    UI.directorState.textContent = this.directorMode;

    if (this.directorPaused) {
      UI.directorDetail.textContent = "The director is paused. Camera controls still work.";
      return;
    }

    if (this.beacon.active) {
      UI.directorDetail.textContent = "Noise beacon active. Nearby zombies are clustering around the signal.";
    } else if (alerted > 0) {
      UI.directorDetail.textContent = "Residual agitation remains after the last disturbance.";
    } else {
      UI.directorDetail.textContent = "No active beacon. The horde is shambling freely.";
    }

    if (force) {
      UI.fps.textContent = "60";
    }
  }

  isPointOpen(x, y, padding = 0) {
    if (
      x < WORLD.margin + padding ||
      x > WORLD.width - WORLD.margin - padding ||
      y < WORLD.activeTop + padding ||
      y > WORLD.activeBottom - padding
    ) {
      return false;
    }

    for (const obstacle of this.obstacles) {
      const dx = Math.abs(x - obstacle.x);
      const dy = Math.abs(y - obstacle.y);
      if (dx < obstacle.halfW + padding + 14 && dy < obstacle.halfH + padding + 14) {
        return false;
      }
    }

    return true;
  }

  findOpenPoint() {
    let x = WORLD.width * 0.5;
    let y = WORLD.height * 0.5;

    for (let attempts = 0; attempts < 60; attempts += 1) {
      x = randomRange(WORLD.margin, WORLD.width - WORLD.margin);
      y = randomRange(WORLD.activeTop + 30, WORLD.activeBottom - 30);
      if (!this.isPointOpen(x, y, 18)) continue;

      let clearFromZombies = true;
      for (const zombie of this.zombies) {
        const dx = x - zombie.sprite.x;
        const dy = y - zombie.sprite.y;
        if (dx * dx + dy * dy < 80 * 80) {
          clearFromZombies = false;
          break;
        }
      }
      if (clearFromZombies) return { x, y };
    }

    return { x, y };
  }
}

let game;

try {
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game-container",
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#020508",
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 0 },
        debug: false,
      },
    },
    scene: [ZombieSandboxScene],
  });
} catch (error) {
  UI.boot.textContent = `Boot error: ${error.message}`;
  throw error;
}

window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
  const scene = game.scene.keys.ZombieSandboxScene;
  if (scene) {
    scene.setupCamera();
  }
});
