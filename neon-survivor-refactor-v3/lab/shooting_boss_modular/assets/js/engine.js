(function() {
const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }
  addEventListener("resize", resize);
  resize();

  const TAU = Math.PI * 2;
  const keys = new Set();
  addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
  addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

  const bullets = [];
  const hazards = [];
  const projectiles = [];
  const playerBullets = [];
  const effects = [];
  const texts = [];

  const Utils = {
    clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
    lerp(a, b, t) { return a + (b - a) * t; },
    rand(a, b) { return Math.random() * (b - a) + a; },
    dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); },
    angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); },
    normalize(x, y) {
      const len = Math.hypot(x, y) || 1;
      return { x: x / len, y: y / len };
    },
    angleDelta(a, b) {
      return Math.atan2(Math.sin(a - b), Math.cos(a - b));
    },
    linePointDistance(x1, y1, x2, y2, px, py) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy || 1;
      let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
      t = Utils.clamp(t, 0, 1);
      const cx = x1 + dx * t;
      const cy = y1 + dy * t;
      return Math.hypot(px - cx, py - cy);
    },
    circleLineHit(cx, cy, r, x1, y1, x2, y2, lineWidth) {
      return Utils.linePointDistance(x1, y1, x2, y2, cx, cy) <= r + lineWidth * 0.5;
    },
    pointInFan(px, py, ox, oy, facing, radius, halfAngle) {
      const dx = px - ox;
      const dy = py - oy;
      const d = Math.hypot(dx, dy);
      if (d > radius) return false;
      const a = Math.atan2(dy, dx);
      return Math.abs(Utils.angleDelta(a, facing)) <= halfAngle;
    }
  };

  function drawText(text, x, y, color = "#fff", size = 14, align = "left", alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px sans-serif`;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawGlowCircle(x, y, r, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawBar(x, y, w, h, ratio, fill) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w * Utils.clamp(ratio, 0, 1), h);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  class FloatText {
    constructor(text, x, y, color = "#fff") {
      this.text = text;
      this.x = x;
      this.y = y;
      this.color = color;
      this.life = 0.8;
      this.maxLife = 0.8;
    }
    update(dt) {
      this.life -= dt;
      this.y -= 28 * dt;
      return this.life > 0;
    }
    draw() {
      drawText(this.text, this.x, this.y, this.color, 14, "center", this.life / this.maxLife);
    }
  }

  class Spark {
    constructor(x, y, color = "#ffd166") {
      this.x = x;
      this.y = y;
      this.vx = Utils.rand(-180, 180);
      this.vy = Utils.rand(-180, 180);
      this.life = Utils.rand(0.18, 0.42);
      this.maxLife = this.life;
      this.size = Utils.rand(2, 4);
      this.color = color;
    }
    update(dt) {
      this.life -= dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 0.92;
      this.vy *= 0.92;
      return this.life > 0;
    }
    draw() {
      const t = this.life / this.maxLife;
      ctx.save();
      ctx.globalAlpha = t;
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.size, this.size);
      ctx.restore();
    }
  }

  class RingEffect {
    constructor(x, y, r = 20, color = "#7df9ff", life = 0.45) {
      this.x = x;
      this.y = y;
      this.r = r;
      this.life = life;
      this.maxLife = life;
      this.color = color;
    }
    update(dt) {
      this.life -= dt;
      this.r += 150 * dt;
      return this.life > 0;
    }
    draw() {
      const t = this.life / this.maxLife;
      ctx.save();
      ctx.globalAlpha = t * 0.9;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  class Bullet {
    constructor(x, y, vx, vy, r = 7, color = "#ff7aa2", life = 8, damage = 10) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.r = r;
      this.color = color;
      this.life = life;
      this.damage = damage;
    }
    update(dt, player) {
      this.life -= dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (Utils.dist(this.x, this.y, player.x, player.y) < this.r + player.radius) {
        player.damage(this.damage);
        for (let i = 0; i < 8; i++) effects.push(new Spark(this.x, this.y, this.color));
        return false;
      }
      if (this.x < -50 || this.x > canvas.width + 50 || this.y < -50 || this.y > canvas.height + 50) return false;
      return this.life > 0;
    }
    draw() {
      drawGlowCircle(this.x, this.y, this.r, this.color, 0.9);
      ctx.save();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 2, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  class RotatingBullet extends Bullet {
    constructor(cx, cy, angle, orbitR, radialSpeed, spin, r = 6, color = "#9a7dff") {
      super(cx, cy, 0, 0, r, color, 4.0, 10);
      this.cx = cx;
      this.cy = cy;
      this.angle = angle;
      this.orbitR = orbitR;
      this.radialSpeed = radialSpeed;
      this.spin = spin;
    }
    update(dt, player) {
      this.life -= dt;
      this.angle += this.spin * dt;
      this.orbitR += this.radialSpeed * dt;
      this.x = this.cx + Math.cos(this.angle) * this.orbitR;
      this.y = this.cy + Math.sin(this.angle) * this.orbitR;
      if (Utils.dist(this.x, this.y, player.x, player.y) < this.r + player.radius) {
        player.damage(this.damage);
        return false;
      }
      return this.life > 0;
    }
  }

  class DelayedBlast {
    constructor(x, y, delay = 1.0, radius = 68, color = "#ff8fab", followPlayer = false, followDuration = 0.8) {
      this.x = x;
      this.y = y;
      this.delay = delay;
      this.maxDelay = delay;
      this.radius = radius;
      this.color = color;
      this.followPlayer = followPlayer;
      this.followDuration = followDuration;
      this.exploded = false;
      this.lifeAfter = 0.18;
    }
    update(dt, player) {
      if (!this.exploded) {
        this.delay -= dt;
        if (this.followPlayer && this.delay > this.maxDelay - this.followDuration) {
          this.x = Utils.lerp(this.x, player.x, 0.08);
          this.y = Utils.lerp(this.y, player.y, 0.08);
        }
        if (this.delay <= 0) {
          this.exploded = true;
          for (let i = 0; i < 18; i++) effects.push(new Spark(this.x, this.y, this.color));
          effects.push(new RingEffect(this.x, this.y, 18, this.color, 0.28));
          if (Utils.dist(this.x, this.y, player.x, player.y) < this.radius + player.radius) {
            player.damage(18);
          }
        }
        return true;
      }
      this.lifeAfter -= dt;
      return this.lifeAfter > 0;
    }
    draw() {
      if (!this.exploded) {
        const t = Math.max(0, this.delay / this.maxDelay);
        ctx.save();
        ctx.globalAlpha = 0.25 + (1 - t) * 0.45;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.shadowBlur = 16;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, TAU);
        ctx.stroke();
        ctx.restore();
        drawText((this.delay + 0.05).toFixed(1), this.x, this.y + 4, "#fff", 14, "center");
      } else {
        ctx.save();
        ctx.globalAlpha = this.lifeAfter / 0.18 * 0.35;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  class SafeLaneCurtain {
    constructor({ centerX, centerY, startAngle, laneWidth, color = "#ff6bb5", speed = 180, count = 42, radius = 6 }) {
      const step = TAU / count;
      for (let i = 0; i < count; i++) {
        const a = i * step;
        const diff = Utils.angleDelta(a, startAngle);
        if (Math.abs(diff) < laneWidth * 0.5) continue;
        bullets.push(new Bullet(centerX, centerY, Math.cos(a) * speed, Math.sin(a) * speed, radius, color, 6, 12));
      }
    }
    update() { return false; }
    draw() {}
  }

  class PlayerBullet {
    constructor(x, y, angle, speed = 560, damage = 12, color = "#9efcff") {
      this.x = x;
      this.y = y;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.angle = angle;
      this.radius = 4;
      this.damage = damage;
      this.life = 1.6;
      this.color = color;
    }
    update(dt) {
      this.life -= dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < -40 || this.x > canvas.width + 40 || this.y < -40 || this.y > canvas.height + 40) return false;
      return this.life > 0;
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.fillRect(-2, -7, 4, 14);
      ctx.restore();
    }
  }

  class Player {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = 14;
      this.speed = 280;
      this.hp = 100;
      this.hitFlash = 0;
      this.dashTime = 0;
      this.dashCooldown = 0;
      this.facing = -Math.PI / 2;
      this.fireCooldown = 0;
      this.fireRate = 0.12;
    }
    update(dt) {
      let dx = 0, dy = 0;
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;
      const dir = Utils.normalize(dx, dy);
      if (dx || dy) this.facing = Math.atan2(dir.y, dir.x);

      if ((keys.has("shift") || keys.has(" ")) && this.dashCooldown <= 0) {
        this.dashTime = 0.14;
        this.dashCooldown = 0.6;
        for (let i = 0; i < 10; i++) effects.push(new Spark(this.x, this.y, "#7df9ff"));
      }

      const dashMul = this.dashTime > 0 ? 2.8 : 1;
      this.x += dir.x * this.speed * dashMul * dt;
      this.y += dir.y * this.speed * dashMul * dt;
      this.x = Utils.clamp(this.x, 18, canvas.width - 18);
      this.y = Utils.clamp(this.y, 18, canvas.height - 18);
      this.dashTime = Math.max(0, this.dashTime - dt);
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      this.fireCooldown = Math.max(0, this.fireCooldown - dt);

      const firing = keys.has("j") || keys.has("z") || keys.has("enter");
      if (firing && this.fireCooldown <= 0) this.fire();
    }
    fire() {
      this.fireCooldown = this.fireRate;
      const angle = this.facing;
      const side = { x: -Math.sin(angle), y: Math.cos(angle) };
      const muzzleX = this.x + Math.cos(angle) * 18;
      const muzzleY = this.y + Math.sin(angle) * 18;
      playerBullets.push(new PlayerBullet(muzzleX + side.x * 5, muzzleY + side.y * 5, angle));
      playerBullets.push(new PlayerBullet(muzzleX - side.x * 5, muzzleY - side.y * 5, angle));
      for (let i = 0; i < 2; i++) effects.push(new Spark(muzzleX, muzzleY, "#9efcff"));
    }

    damage(amount, hitCircle = null) {
      if (this.dashTime > 0.02) return;
      this.hp = Math.max(0, this.hp - amount);
      this.hitFlash = 0.18;
      for (let i = 0; i < 8; i++) effects.push(new Spark(this.x, this.y, "#ff7a7a"));
      texts.push(new FloatText(`-${amount}`, this.x, this.y - 18, "#ff8fab"));
    }
    draw() {
      const c = this.hitFlash > 0 ? "#ff6b6b" : "#66f2ff";
      drawGlowCircle(this.x, this.y, this.radius, c, 1);
      const tipX = this.x + Math.cos(this.facing) * 22;
      const tipY = this.y + Math.sin(this.facing) * 22;
      ctx.save();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 4, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.restore();
      if (this.dashTime > 0) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "#7df9ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 10 + (0.14 - this.dashTime) * 100, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }
  }


  class AfterImage {
    constructor(x, y, radius, angle, color, life = 0.15) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.angle = angle;
      this.color = color;
      this.life = life;
      this.maxLife = life;
    }
    update(dt) {
      this.life -= dt;
      return this.life > 0;
    }
    draw() {
      const t = this.life / this.maxLife;
      ctx.save();
      ctx.globalAlpha = t * 0.3;
      ctx.shadowBlur = 16;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + Math.cos(this.angle) * this.radius * 1.2, this.y + Math.sin(this.angle) * this.radius * 1.2);
      ctx.stroke();
      ctx.restore();
    }
  }

  class SlashEffect {
    constructor({ x, y, startAngle, endAngle, color = "#ffffff", life = 0.14, scale = 1 }) {
      this.x = x;
      this.y = y;
      this.startAngle = startAngle;
      this.endAngle = endAngle;
      this.color = color;
      this.life = life;
      this.maxLife = life;
      this.scale = scale;
      this.innerRadius = 20 * scale;
      this.outerRadius = 74 * scale;
    }
    update(dt) {
      this.life -= dt;
      return this.life > 0;
    }
    draw() {
      const t = this.life / this.maxLife;
      const p = 1 - t;
      const innerR = this.innerRadius + p * 10 * this.scale;
      const outerR = this.outerRadius + p * 18 * this.scale;
      const alpha = Math.pow(t, 0.6);
      ctx.save();
      ctx.translate(this.x, this.y);
      const layers = [
        ["#7df9ff", alpha * 0.22, innerR, outerR, this.startAngle, this.endAngle, 24],
        ["#9a7dff", alpha * 0.18, innerR + 4, outerR - 6, this.startAngle + 0.02, this.endAngle - 0.02, 20],
        [this.color, alpha * 0.9, innerR + 6, outerR - 12, this.startAngle + 0.04, this.endAngle - 0.04, 16]
      ];
      for (const [fill, a, inR, outR, sa, ea, blur] of layers) {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.shadowBlur = blur;
        ctx.shadowColor = fill;
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(0, 0, outR, sa, ea, false);
        ctx.arc(0, 0, inR, ea, sa, true);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, (innerR + outerR) * 0.5, this.startAngle + 0.05, this.endAngle - 0.05, false);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    }
  }

  class PhaseShiftRing extends RingEffect {
    constructor(x, y, color) {
      super(x, y, 28, color, 0.8);
    }
    update(dt) {
      this.life -= dt;
      this.r += 110 * dt / 0.8;
      return this.life > 0;
    }
    draw() {
      const t = this.life / this.maxLife;
      const p = 1 - t;
      ctx.save();
      ctx.globalAlpha = t * 0.85;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 6 - p * 3;
      ctx.shadowBlur = 26;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 28 + p * 110, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  class TelegraphLine {
    constructor(x1, y1, x2, y2, life = 0.35, color = "#9a7dff") {
      this.x1 = x1;
      this.y1 = y1;
      this.x2 = x2;
      this.y2 = y2;
      this.life = life;
      this.maxLife = life;
      this.color = color;
    }
    update(dt) {
      this.life -= dt;
      return this.life > 0;
    }
    draw() {
      const t = this.life / this.maxLife;
      ctx.save();
      ctx.globalAlpha = 0.18 + t * 0.6;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.shadowBlur = 16;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.moveTo(this.x1, this.y1);
      ctx.lineTo(this.x2, this.y2);
      ctx.stroke();
      ctx.restore();
    }
  }

  class WaveProjectile {
    constructor(x, y, angle, opts = {}) {
      this.x = x;
      this.y = y;
      this.angle = angle;
      this.speed = opts.speed ?? 420;
      this.radius = opts.radius ?? 16;
      this.life = opts.life ?? 1.2;
      this.maxLife = this.life;
      this.damage = opts.damage ?? 14;
      this.color = opts.color ?? "#7df9ff";
      this.hit = false;
    }
    update(dt, player) {
      this.life -= dt;
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt;
      if (!this.hit && Utils.dist(this.x, this.y, player.x, player.y) <= this.radius + player.radius) {
        this.hit = true;
        player.damage(this.damage);
        for (let i = 0; i < 12; i++) effects.push(new Spark(player.x, player.y, this.color));
      }
      return this.life > 0 && this.x > -80 && this.x < canvas.width + 80 && this.y > -80 && this.y < canvas.height + 80;
    }
    draw() {
      const t = this.life / this.maxLife;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.globalAlpha = Math.max(0.28, t);
      ctx.shadowBlur = 24;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color === "#ff6bd6" ? "rgba(255,107,214,0.35)" : "rgba(125,249,255,0.35)";
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.quadraticCurveTo(0, 16, -24, 0);
      ctx.quadraticCurveTo(0, -16, 30, 0);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(26, 0);
      ctx.lineTo(-20, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  class SummonMinion {
    constructor(boss, type = "shooter", x = boss.x, y = boss.y) {
      this.boss = boss;
      this.type = type;
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.angle = 0;
      this.alive = true;
      this.fireTimer = Utils.rand(0.2, 0.8);
      this.lifeTimer = 0;
      if (type === "shooter") {
        this.radius = 14;
        this.hp = 34;
        this.color = "#ffb347";
      } else if (type === "chaser") {
        this.radius = 13;
        this.hp = 28;
        this.color = "#7df9ff";
      } else {
        this.radius = 12;
        this.hp = 22;
        this.color = "#ff6b8a";
      }
      this.maxHp = this.hp;
    }

    damage(amount) {
      this.hp = Math.max(0, this.hp - amount);
      texts.push(new FloatText(`-${amount}`, this.x, this.y - 14, "#ffd166"));
      for (let i = 0; i < 6; i++) effects.push(new Spark(this.x, this.y, this.color));
      if (this.hp <= 0) {
        this.alive = false;
        effects.push(new RingEffect(this.x, this.y, 12, this.color, 0.22));
      }
    }

    update(dt, player) {
      this.lifeTimer += dt;
      const ang = Utils.angleTo(this.x, this.y, player.x, player.y);
      this.angle = ang;
      if (this.type === "shooter") {
        const desiredX = this.boss.x + Math.cos(this.lifeTimer * 1.2 + (this.x % 7)) * 90;
        const desiredY = this.boss.y + 90 + Math.sin(this.lifeTimer * 1.6 + (this.y % 5)) * 30;
        this.x = Utils.lerp(this.x, desiredX, dt * 1.4);
        this.y = Utils.lerp(this.y, desiredY, dt * 1.4);
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
          this.fireTimer = 1.0 + Utils.rand(0, 0.35);
          bullets.push(new Bullet(this.x, this.y, Math.cos(ang) * 220, Math.sin(ang) * 220, 5, this.color, 4.5, 8));
        }
      } else if (this.type === "chaser") {
        const speed = 135;
        this.vx = Math.cos(ang) * speed;
        this.vy = Math.sin(ang) * speed;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      } else if (this.type === "bomber") {
        const speed = 180;
        this.vx = Math.cos(ang) * speed;
        this.vy = Math.sin(ang) * speed;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (Utils.dist(this.x, this.y, player.x, player.y) < this.radius + player.radius + 14) {
          hazards.push(new DelayedBlast(this.x, this.y, 0.15, 44, this.color, false));
          this.alive = false;
        }
      }

      if (Utils.dist(this.x, this.y, player.x, player.y) < this.radius + player.radius) {
        player.damage(this.type === "bomber" ? 14 : 10);
        if (this.type === "bomber") {
          hazards.push(new DelayedBlast(this.x, this.y, 0.1, 40, this.color, false));
          this.alive = false;
        } else {
          this.alive = false;
        }
      }

      this.x = Utils.clamp(this.x, 18, canvas.width - 18);
      this.y = Utils.clamp(this.y, 18, canvas.height - 18);
      return this.alive;
    }

    draw() {
      drawGlowCircle(this.x, this.y, this.radius, this.color, 0.9);
      ctx.save();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 3, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + Math.cos(this.angle) * this.radius, this.y + Math.sin(this.angle) * this.radius);
      ctx.stroke();
      ctx.restore();
      drawBar(this.x - this.radius, this.y - this.radius - 10, this.radius * 2, 4, this.hp / this.maxHp, this.color);
    }
  }

  const PatternLibrary = {
    single(runtime) {
      const tuning = getBossTuning(runtime).single || { speed: 260, radius: 7, damage: 10, color: "#ff9e7a" };
      const player = runtime.player;
      const angle = Utils.angleTo(runtime.x, runtime.y, player.x, player.y);
      bullets.push(new Bullet(runtime.x, runtime.y, Math.cos(angle) * tuning.speed, Math.sin(angle) * tuning.speed, tuning.radius, tuning.color, 5, tuning.damage));
      runtime.stateText = "단일 탄";
    },

    radial(runtime, options = {}) {
      const count = options.count ?? 10;
      const speed = options.speed ?? 140;
      const color = options.color ?? "#9a7dff";
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU;
        bullets.push(new Bullet(runtime.x, runtime.y, Math.cos(a) * speed, Math.sin(a) * speed, 7, color, 6, 10));
      }
      runtime.stateText = "원형 확산";
    },

    danger(runtime) {
      const player = runtime.player;
      const tuning = getBossTuning(runtime).danger || { delay: 1.0, radius: 72, color: "#ff8fab" };
      hazards.push(new DelayedBlast(player.x, player.y, tuning.delay, tuning.radius, tuning.color, false));
      runtime.stateText = "위험지대";
    },

    trackingZone(runtime) {
      const player = runtime.player;
      const tuning = getBossTuning(runtime).trackingZone || { delay: 1.1, radius: 64, color: "#ffb347", followPlayer: true, followDuration: 0.8 };
      hazards.push(new DelayedBlast(player.x, player.y, tuning.delay, tuning.radius, tuning.color, tuning.followPlayer, tuning.followDuration));
      runtime.stateText = "추적 위험지대";
    },

    rotating(runtime) {
      const tuning = getBossTuning(runtime).rotating || { count: 14, orbitR: 10, radialSpeed: 65, spin: 1.9, radius: 6, color: "#9a7dff", damage: 10, life: 4.0 };
      const base = performance.now() / 1000;
      for (let i = 0; i < tuning.count; i++) {
        const bullet = new RotatingBullet(runtime.x, runtime.y, base + (i / tuning.count) * TAU, tuning.orbitR, tuning.radialSpeed, tuning.spin, tuning.radius, tuning.color);
        bullet.damage = tuning.damage;
        bullet.life = tuning.life;
        bullet.maxLife = tuning.life;
        bullets.push(bullet);
      }
      runtime.stateText = "회전 탄막";
    },

    safeLane(runtime, options = {}) {
      const player = runtime.player;
      let angle = Utils.angleTo(runtime.x, runtime.y, player.x, player.y);
      if (options.randomize) angle += Utils.rand(-1.2, 1.2);
      hazards.push(new SafeLaneCurtain({
        centerX: runtime.x,
        centerY: runtime.y,
        startAngle: angle,
        laneWidth: options.randomize ? 0.52 : 0.68,
        color: options.randomize ? "#ff6bb5" : "#7df9ff",
        speed: options.randomize ? 220 : 190,
        count: options.randomize ? 56 : 46,
        radius: options.randomize ? 6 : 7
      }));
      runtime.stateText = options.randomize ? "랜덤 안전지대" : "안전지대 탄막";
    },

    doubleRing(runtime) {
      const tuning = getBossTuning(runtime).doubleRing || {};
      const outer = tuning.outerCount ?? 18;
      const inner = tuning.innerCount ?? 12;
      for (let i = 0; i < outer; i++) {
        const a = (i / outer) * TAU;
        bullets.push(new Bullet(runtime.x, runtime.y, Math.cos(a) * (tuning.outerSpeed ?? 120), Math.sin(a) * (tuning.outerSpeed ?? 120), tuning.outerRadius ?? 7, tuning.outerColor ?? "#ffb347", 6, tuning.outerDamage ?? 10));
      }
      for (let i = 0; i < inner; i++) {
        const a = (i / inner) * TAU + Math.PI / inner;
        bullets.push(new Bullet(runtime.x, runtime.y, Math.cos(a) * (tuning.innerSpeed ?? 260), Math.sin(a) * (tuning.innerSpeed ?? 260), tuning.innerRadius ?? 6, tuning.innerColor ?? "#ff6bb5", 4.8, tuning.innerDamage ?? 12));
      }
      runtime.stateText = "이중 탄막";
    },

    teleportBlast(runtime) {
      const player = runtime.player;
      const tuning = getBossTuning(runtime).teleportBlast || { distanceMin: 110, distanceMax: 160, delay: 0.45, radius: 88, color: "#ff6bb5" };
      const a = Utils.rand(0, TAU);
      const r = Utils.rand(tuning.distanceMin, tuning.distanceMax);
      runtime.x = Utils.clamp(player.x + Math.cos(a) * r, 80, canvas.width - 80);
      runtime.y = Utils.clamp(player.y + Math.sin(a) * r, 80, canvas.height * 0.6);
      for (let i = 0; i < 14; i++) effects.push(new Spark(runtime.x, runtime.y, tuning.color));
      effects.push(new RingEffect(runtime.x, runtime.y, 14, tuning.color, 0.24));
      hazards.push(new DelayedBlast(runtime.x, runtime.y, tuning.delay, tuning.radius, tuning.color, false));
      runtime.stateText = "텔포 폭발";
    },

    summonWave(runtime) {
      runtime.spawnMinionWave();
      runtime.stateText = "미니언 소환";
    }
  };

  const BossTunings = {
    basic: {
      phases: {
        1: {
          cooldownMin: 1.0,
          cooldownMax: 1.35,
          single: { speed: 260, radius: 7, damage: 10, color: "#ff9e7a" },
          danger: { delay: 1.0, radius: 72, damage: 18, color: "#ff8fab" },
          radial: { count: 10, speed: 135, radius: 7, damage: 10, color: "#9a7dff" }
        }
      }
    },
    advanced: {
      phases: {
        1: {
          cooldown: 0.95,
          rotating: { count: 14, orbitR: 10, radialSpeed: 65, spin: 1.9, radius: 6, color: "#9a7dff", damage: 10, life: 4.0 },
          trackingZone: { delay: 1.1, radius: 64, color: "#ffb347", followPlayer: true, followDuration: 0.8 },
          safeLane: { randomize: false, laneWidth: 0.68, color: "#7df9ff", speed: 190, count: 46, radius: 7 }
        },
        2: {
          cooldown: 0.78,
          doubleRing: {
            outerCount: 18, outerSpeed: 120, outerRadius: 7, outerDamage: 10, outerColor: "#ffb347",
            innerCount: 12, innerSpeed: 260, innerRadius: 6, innerDamage: 12, innerColor: "#ff6bb5"
          },
          safeLaneRandom: { randomize: true, laneWidth: 0.52, color: "#ff6bb5", speed: 220, count: 56, radius: 6 },
          teleportBlast: { distanceMin: 110, distanceMax: 160, delay: 0.45, radius: 88, color: "#ff6bb5" }
        }
      }
    },
    summoner: {
      id: "summoner",
      label: "소환사형",
      code: "SUMM-S",
      runtimeClass: "summoner",
      radius: 30,
      maxHp: 360,
      phases: [
        {
          threshold: 1,
          cooldown: () => 0.9,
          actions: [
            { name: "summonWave", weight: 4.2, minInterval: 1.0, condition: (rt) => rt.minions.length < (rt.tuning.summon?.maxMinions ?? 3) },
            { name: "single", weight: 1.8, minInterval: 0.2, condition: () => true },
            { name: "danger", weight: 1.5, minInterval: 0.9, condition: (rt) => distanceToPlayer(rt) < 240 }
          ]
        },
        {
          threshold: 0.5,
          cooldown: () => 0.72,
          actions: [
            { name: "summonWave", weight: 5.0, minInterval: 0.8, condition: (rt) => rt.minions.length < (rt.tuning.summon?.maxMinions ?? 4) },
            { name: "single", weight: 2.0, minInterval: 0.18, condition: () => true },
            { name: "trackingZone", weight: 1.8, minInterval: 1.0, condition: (rt) => distanceToPlayer(rt) < 260 }
          ]
        }
      ],
      colors(runtime) {
        const inv = runtime.isInvulnerable?.();
        if (runtime.phase === 1) return { body: inv ? "#d8dcff" : "#8a91ff", glow: inv ? "#a2a8ff" : "#6e78ff" };
        return { body: inv ? "#ffd8f6" : "#ff8be4", glow: inv ? "#ff6bd6" : "#d85cf0" };
      },
      panel(runtime) {
        const inv = runtime.isInvulnerable?.() ? "ON" : "OFF";
        return [
          `소환사형: 미니언 우선 처리 유도 (${inv})`,
          `- 현재 미니언 수: ${runtime.minions.length}`,
          "- 미니언 생존 중 본체 무적",
          "- Shooter: 원거리 견제 / Chaser: 추적 압박",
          "- Bomber: 근접 자폭으로 공간 강제",
          "- 전멸시키면 본체가 다시 취약해짐"
        ];
      }
    },

split: {
      id: "split",
      label: "분열형",
      code: "GEMINI",
      mode: "split",
      radius: 38,
      maxHp: 420,
      phases: [
        { threshold: 1 },
        { threshold: 0.5 }
      ],
      colors(runtime) {
        if (runtime.phase === 1) return { body: "#ffd166", glow: "#ffb347" };
        return { body: "#7df9ff", glow: "#ff6bb5" };
      },
      panel(runtime) {
        if (runtime.phase === 1) {
          return [
            "분열형 Phase 1: 단일 코어로 화면 제어",
            "- 원형탄 / 추적 위험지대 / 안전지대 탄막",
            "- 중앙 고정에 가까운 안정적 탄막 패턴",
            "- 체력 50% 이하에서 둘로 분열",
            "- 분열 전의 학습 페이즈"
          ];
        }
        return [
          "분열형 Phase 2: 역할이 다른 2개체 협공",
          "- 청색 코어: 단일탄 / 확산탄 / 안전지대 탄막",
          "- 적색 코어: 측면 이동 후 돌진 폭발 압박",
          "- 두 개체 쿨다운을 어긋나게 배치",
          "- 한쪽 격파 시 남은 개체가 폭주",
          "- 분열 직후 짧은 무적으로 전개 안정화"
        ];
      }
    },

    knight: {
      phases: {
        1: {
          moveSpeed: 118,
          attackDamage: 20,
          desiredRange: 150,
          attackRange: 185,
          strafeBias: 0.65,
          telegraphColor: "#9a7dff",
          bodyColor: "#7a5cff",
          glow: "#9a7dff",
          chargeJitterFrequency: 60,
          chargeJitterAmplitude: 2.2,
          afterImageInterval: 0.028,
          berserkDuration: 1.0,
          durations: {
            approachMin: 0.45,
            approachMax: 0.85,
            strafeMin: 0.5,
            strafeMax: 0.95,
            chargeDefault: 0.32,
            chargeWave: 0.46,
            chargeCrossRush: 0.22,
            recoveryDefault: 0.34,
            recoveryWave: 0.42,
            recoveryBurst: 0.16
          },
          wave: { speed: 420, damage: 14, radius: 16, life: 1.2, color: "#7df9ff" },
          burstWave: { speed: 500, damage: 16, radius: 15, life: 1.05, color: "#9a7dff" }
        },
        2: {
          moveSpeed: 152,
          attackDamage: 24,
          desiredRange: 170,
          attackRange: 230,
          strafeBias: 0.85,
          telegraphColor: "#ff6bd6",
          bodyColor: "#ff5abf",
          glow: "#ff6bd6",
          chargeJitterFrequency: 90,
          chargeJitterAmplitude: 3.2,
          afterImageInterval: 0.02,
          berserkDuration: 1.0,
          durations: {
            approachMin: 0.3,
            approachMax: 0.6,
            strafeMin: 0.35,
            strafeMax: 0.7,
            chargeDefault: 0.22,
            chargeWave: 0.3,
            chargeCrossRush: 0.22,
            recoveryDefault: 0.22,
            recoveryWave: 0.22,
            recoveryBurst: 0.16
          },
          wave: { speed: 520, damage: 18, radius: 16, life: 1.2, color: "#ff6bd6" },
          burstWave: { speed: 500, damage: 16, radius: 15, life: 1.05, color: "#ff6bd6" }
        }
      }
    },
    summoner: {
      phases: {
        1: {
          cooldown: 0.9,
          single: { speed: 250, radius: 6, damage: 8, color: "#ff9e7a" },
          danger: { delay: 0.9, radius: 62, damage: 16, color: "#ff8fab" },
          summon: { maxMinions: 3, waveSize: 2, invulnerableColor: "#a2a8ff" }
        },
        2: {
          cooldown: 0.72,
          single: { speed: 280, radius: 6, damage: 10, color: "#ffd166" },
          trackingZone: { delay: 0.9, radius: 58, color: "#ffb347", followPlayer: true, followDuration: 0.65 },
          summon: { maxMinions: 4, waveSize: 3, invulnerableColor: "#ff6bd6" }
        }
      }
    }
  };

  function resolveValue(value, runtime) {
    return typeof value === "function" ? value(runtime) : value;
  }

  function getBossTuning(runtime) {
    return BossTunings[runtime.type]?.phases?.[runtime.phase] || {};
  }

  function distanceToPlayer(runtime) {
    return Utils.dist(runtime.x, runtime.y, runtime.player.x, runtime.player.y);
  }

  function countActiveThreats() {
    return bullets.length + hazards.length + projectiles.length;
  }

  function chooseWeighted(items) {
    if (!items.length) return null;
    const total = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
    if (total <= 0) return items[0] ?? null;
    let roll = Math.random() * total;
    for (const item of items) {
      roll -= item.weight ?? 1;
      if (roll <= 0) return item;
    }
    return items[items.length - 1] ?? null;
  }

  function chooseBossAction(runtime, phaseData) {
    const actions = phaseData.actions || [];
    if (!actions.length && phaseData.patternOrder?.length) {
      const pattern = phaseData.patternOrder[runtime.loopCursor % phaseData.patternOrder.length];
      runtime.loopCursor++;
      return pattern;
    }

    runtime.actionHistory ??= {};
    const now = performance.now() / 1000;
    const candidates = actions.filter((action) => {
      const okCondition = action.condition ? action.condition(runtime) : true;
      const lastUsedAt = runtime.actionHistory[action.name] ?? -Infinity;
      const minInterval = action.minInterval ?? 0;
      return okCondition && now - lastUsedAt >= minInterval;
    });

    const selected = chooseWeighted(candidates.length ? candidates : actions);
    if (!selected) return null;
    runtime.actionHistory[selected.name] = now;
    return selected;
  }

  const KnightPatternRules = {
    1: [
      { name: "FORWARD_SLASH", weight: 3.0, condition: (rt, d) => d > 165 },
      { name: "WAVE_SLASH", weight: 2.0, condition: (rt, d) => d > 165 },
      { name: "LEFT_STEP_SLASH", weight: 1.3, condition: (rt, d) => d <= 165 },
      { name: "RIGHT_STEP_SLASH", weight: 1.3, condition: (rt, d) => d <= 165 },
      { name: "BACK_STEP_SLASH", weight: 1.0, condition: (rt, d) => d <= 165 },
      { name: "FORWARD_SLASH", weight: 1.8, condition: (rt, d) => d <= 165 },
      { name: "WAVE_SLASH", weight: 1.4, condition: (rt, d) => d <= 165 }
    ],
    2: [
      { name: "BURST_WAVE", weight: 2.4, condition: (rt, d) => d > 190 },
      { name: "CROSS_RUSH", weight: 2.8, condition: (rt, d) => d > 190 },
      { name: "CROSS_RUSH", weight: 2.5, condition: (rt, d) => d <= 190 },
      { name: "BURST_WAVE", weight: 2.0, condition: (rt, d) => d <= 190 },
      { name: "LEFT_STEP_SLASH", weight: 1.2, condition: (rt, d) => d <= 190 },
      { name: "RIGHT_STEP_SLASH", weight: 1.2, condition: (rt, d) => d <= 190 },
      { name: "FORWARD_SLASH", weight: 1.0, condition: (rt, d) => d <= 190 }
    ]
  };

  window.ShootingGameCore = {
    canvas, ctx, TAU, keys, bullets, hazards, projectiles, playerBullets, effects, texts,
    Utils, drawText, drawGlowCircle, FloatText, Spark, RingEffect, Bullet, RotatingBullet, DelayedBlast, SafeLaneCurtain, PlayerBullet, Player,
    AfterImage, SlashEffect, PhaseShiftRing, TelegraphLine, WaveProjectile, SummonMinion,
    PatternLibrary, BossTunings, KnightPatternRules, getBossTuning, resolveValue, chooseWeighted, distanceToPlayer, countActiveThreats, chooseBossAction
  };
})();
