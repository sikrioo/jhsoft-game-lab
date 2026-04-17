(function() {
  const { canvas, ctx, TAU, bullets, hazards, projectiles, effects, texts, Utils, drawText, drawGlowCircle, FloatText, Spark, RingEffect, Bullet, DelayedBlast, SafeLaneCurtain, AfterImage, SlashEffect, PhaseShiftRing, TelegraphLine, WaveProjectile, SummonMinion, PatternLibrary, KnightPatternRules, getBossTuning, resolveValue, chooseWeighted, distanceToPlayer, chooseBossAction } = window.ShootingGameCore;
  const { BossRegistry } = window.ShootingBossRegistry;

  class BaseBossRuntime {
    constructor(type, player, startPhase = "auto") {
      this.player = player;
      this.setDefinition(type, startPhase);
    }

    setDefinition(type, startPhase = "auto") {
      const definition = BossRegistry[type];
      if (!definition) throw new Error(`Unknown boss type: ${type}`);
      this.definition = definition;
      this.type = definition.id;
      this.x = canvas.width * 0.5;
      this.y = canvas.height * 0.24;
      this.radius = definition.radius;
      this.maxHp = definition.maxHp;
      this.hp = this.maxHp;
      this.phase = 1;
      this.stateText = "IDLE";
      this.minions = [];
      this.invulnerable = false;
      this.currentPhaseData = this.getPhaseData();
      this.applyStartPhase(startPhase);
    }

    get tuning() {
      return getBossTuning(this);
    }

    getPhaseData() {
      let selected = this.definition.phases[0];
      const ratio = this.hp / this.maxHp;
      for (const phase of this.definition.phases) {
        if (ratio <= phase.threshold) selected = phase;
      }
      return selected;
    }

    applyStartPhase(startPhase = "auto") {
      if (startPhase === "auto") return;
      const phaseIndex = Math.max(1, Math.min(Number(startPhase) || 1, this.definition.phases.length));
      const phaseData = this.definition.phases[phaseIndex - 1];
      this.phase = phaseIndex;
      this.currentPhaseData = phaseData;
      this.hp = this.maxHp * phaseData.threshold;
      this.onStartPhaseApplied?.(phaseIndex, phaseData);
      this.stateText = `TEST START P${phaseIndex}`;
    }

    syncPhase() {
      const previousPhase = this.phase;
      const nextPhaseData = this.getPhaseData();
      const nextPhase = this.definition.phases.indexOf(nextPhaseData) + 1;
      if (nextPhase !== previousPhase) {
        this.phase = nextPhase;
        this.currentPhaseData = nextPhaseData;
        this.onPhaseChanged?.(previousPhase, nextPhase, nextPhaseData);
      } else {
        this.currentPhaseData = nextPhaseData;
      }
    }

    forcePhase2() {
      if (this.definition.phases.length < 2 || this.phase !== 1) return;
      this.hp = this.maxHp * this.definition.phases[1].threshold;
      this.syncPhase();
    }

    update(dt) {
      this.syncPhase();
      this.updateBoss(dt);
      this.updateMinions(dt);
      this.syncInvulnerability();
    }

    syncInvulnerability() {
      this.invulnerable = this.minions.length > 0;
    }

    isInvulnerable() {
      return !!this.invulnerable;
    }

    damage(amount) {
      if (this.isInvulnerable()) {
        texts.push(new FloatText("IMMUNE", this.x, this.y - this.radius - 12, "#a2a8ff"));
        effects.push(new RingEffect(this.x, this.y, this.radius + 4, "#a2a8ff", 0.16));
        return false;
      }
      this.hp = Math.max(0, this.hp - amount);
      texts.push(new FloatText(`-${amount}`, this.x, this.y - this.radius - 12, "#ffd166"));
      for (let i = 0; i < 8; i++) effects.push(new Spark(this.x, this.y, "#ffd166"));
      return true;
    }

    updateMinions(dt) {
      for (let i = this.minions.length - 1; i >= 0; i--) {
        if (!this.minions[i].update(dt, this.player)) this.minions.splice(i, 1);
      }
    }

    drawMinions() {
      for (const minion of this.minions) minion.draw();
    }

    updateBoss(dt) {}

    drawBaseBody({ drawX = this.x, drawY = this.y, body, glow, code }) {
      drawGlowCircle(drawX, drawY, this.radius, glow, 0.92);
      ctx.save();
      ctx.strokeStyle = body;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 22;
      ctx.shadowColor = glow;
      ctx.beginPath();
      ctx.arc(drawX, drawY, this.radius + 4, 0, TAU);
      ctx.stroke();
      const c = this.radius * 0.65;
      ctx.beginPath();
      ctx.moveTo(drawX - c, drawY);
      ctx.lineTo(drawX + c, drawY);
      ctx.moveTo(drawX, drawY - c);
      ctx.lineTo(drawX, drawY + c);
      ctx.stroke();
      ctx.restore();
      drawText(code ?? this.definition.code, drawX, drawY + 5, "#fff", 13, "center");
      if (this.isInvulnerable()) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = this.type === "summoner" && this.phase === 2 ? "#ff6bd6" : "#a2a8ff";
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(drawX, drawY, this.radius + 14, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  class PatternBossRuntime extends BaseBossRuntime {
    constructor(type, player, startPhase = "auto") {
      super(type, player, startPhase);
      this.phaseTransition = 0;
      this.aiTimer = 0;
      this.loopCursor = 0;
      this.actionHistory = {};
    }

    onStartPhaseApplied() {
      this.phaseTransition = 0;
      this.aiTimer = 0;
      this.loopCursor = 0;
      this.actionHistory = {};
    }

    onPhaseChanged(prevPhase, nextPhase) {
      this.loopCursor = 0;
      this.actionHistory = {};
      this.definition.onPhaseEnter?.(this, nextPhase, prevPhase);
    }

    updateBoss(dt) {
      this.definition.movement?.(this, dt);
      this.aiTimer -= dt;

      if (this.phaseTransition > 0) {
        this.phaseTransition -= dt;
        this.definition.duringPhaseTransition?.(this, dt);
        return;
      }

      if (this.aiTimer > 0) return;

      const phaseData = this.currentPhaseData;
      this.aiTimer = resolveValue(phaseData.cooldown, this);
      const action = chooseBossAction(this, phaseData);
      if (!action) return;
      const fn = PatternLibrary[action.name];
      if (fn) fn(this, action.options || {});
    }

    draw() {
      const colors = this.definition.colors(this);
      this.drawBaseBody({ body: colors.body, glow: colors.glow, code: this.definition.code });
      if (this.phaseTransition > 0) {
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(performance.now() / 100) * 0.2;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 16, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  class SummonerBossRuntime extends PatternBossRuntime {
    constructor(type, player, startPhase = "auto") {
      super(type, player, startPhase);
      this.orbitTime = 0;
      this.invulnerable = false;
    }

    spawnMinionWave() {
      const summonTuning = this.tuning.summon || { maxMinions: 3, waveSize: 2 };
      const available = Math.max(0, summonTuning.maxMinions - this.minions.length);
      const waveSize = Math.min(summonTuning.waveSize, available);
      if (waveSize <= 0) return;
      const patterns = this.phase === 1 ? ["shooter", "chaser"] : ["shooter", "chaser", "bomber"];
      for (let i = 0; i < waveSize; i++) {
        const a = (i / Math.max(1, waveSize)) * TAU + this.orbitTime;
        const spawnX = this.x + Math.cos(a) * 46;
        const spawnY = this.y + Math.sin(a) * 24;
        const type = patterns[(this.minions.length + i) % patterns.length];
        this.minions.push(new SummonMinion(this, type, spawnX, spawnY));
        effects.push(new RingEffect(spawnX, spawnY, 10, this.phase === 1 ? "#a2a8ff" : "#ff6bd6", 0.24));
        for (let j = 0; j < 8; j++) effects.push(new Spark(spawnX, spawnY, this.phase === 1 ? "#a2a8ff" : "#ff6bd6"));
      }
    }

    syncInvulnerability() {
      this.invulnerable = this.minions.length > 0;
    }

    updateBoss(dt) {
      this.orbitTime += dt * 0.8;
      const tx = canvas.width * 0.5 + Math.cos(this.orbitTime) * (this.phase === 1 ? 80 : 120);
      const ty = canvas.height * 0.2 + Math.sin(this.orbitTime * 2) * (this.phase === 1 ? 24 : 34);
      this.x = Utils.lerp(this.x, tx, dt * 1.1);
      this.y = Utils.lerp(this.y, ty, dt * 1.1);
      super.updateBoss(dt);
    }
  }

  class StateMachineBossRuntime extends BaseBossRuntime {
    constructor(type, player, startPhase = "auto") {
      super(type, player, startPhase);
      this.state = "APPROACH";
      this.stateTime = 0;
      this.stateDuration = 0.6;
    }

    setState(next) {
      this.state = next;
      this.stateTime = 0;
      this.stateText = next;
    }

    updateBoss(dt) {
      this.stateTime += dt;
      this.updateStateMachine(dt);
    }

    updateStateMachine(dt) {}
  }

  class KnightBossRuntime extends StateMachineBossRuntime {
    constructor(type, player, startPhase = "auto") {
      super(type, player, startPhase);
      this.x = canvas.width * 0.5;
      this.y = canvas.height * 0.25;
      this.state = "APPROACH";
      this.stateTime = 0;
      this.stateDuration = 0.6;
      this.angle = 0;
      this.lockedAngle = 0;
      this.strafeDir = 1;
      this.chargeJitter = 0;
      this.hitApplied = false;
      this.attackSpawned = false;
      this.afterImageTimer = 0;
      this.attackPattern = "FORWARD_SLASH";
      this.attackStartX = this.x;
      this.attackStartY = this.y;
      this.attackEndX = this.x;
      this.attackEndY = this.y;
      this.comboStep = 0;
    }

    onStartPhaseApplied(phaseIndex) {
      if (phaseIndex === 2) {
        this.state = "BERSERK";
        this.stateTime = 0;
        this.stateDuration = this.tuning.berserkDuration || 1.0;
        this.stateText = "TEST START P2";
      }
    }

    onPhaseChanged(prevPhase, nextPhase) {
      if (nextPhase === 2) {
        this.state = "BERSERK";
        this.stateTime = 0;
        this.stateDuration = this.tuning.berserkDuration || 1.0;
        this.chargeJitter = 0;
        this.comboStep = 0;
        this.stateText = "BERSERK";
        effects.push(new PhaseShiftRing(this.x, this.y, this.tuning.glow));
        for (let i = 0; i < 26; i++) effects.push(new Spark(this.x, this.y, this.tuning.glow));
      }
    }

    pickPattern() {
      const d = distanceToPlayer(this);
      const rules = KnightPatternRules[this.phase] || [];
      const candidates = rules.filter((rule) => rule.condition ? rule.condition(this, d) : true);
      const selected = chooseWeighted(candidates);
      return selected?.name || "FORWARD_SLASH";
    }

    getAttackVector(pattern, facing) {
      const forward = { x: Math.cos(facing), y: Math.sin(facing) };
      const left = { x: -forward.y, y: forward.x };
      const right = { x: forward.y, y: -forward.x };
      switch (pattern) {
        case "LEFT_STEP_SLASH": return { x: left.x * 130 + forward.x * 34, y: left.y * 130 + forward.y * 34, duration: this.phase === 1 ? 0.18 : 0.15 };
        case "RIGHT_STEP_SLASH": return { x: right.x * 130 + forward.x * 34, y: right.y * 130 + forward.y * 34, duration: this.phase === 1 ? 0.18 : 0.15 };
        case "BACK_STEP_SLASH": return { x: -forward.x * 100, y: -forward.y * 100, duration: 0.2 };
        case "FORWARD_SLASH": return { x: forward.x * (this.phase === 1 ? 165 : 190), y: forward.y * (this.phase === 1 ? 165 : 190), duration: this.phase === 1 ? 0.16 : 0.13 };
        case "CROSS_RUSH": {
          const side = this.comboStep % 2 === 0 ? left : right;
          return { x: forward.x * 120 + side.x * 110, y: forward.y * 120 + side.y * 110, duration: 0.12 };
        }
        default: return { x: 0, y: 0, duration: this.phase === 1 ? 0.22 : 0.18 };
      }
    }

    setState(next) {
      super.setState(next);
      const d = this.tuning.durations || {};
      const player = this.player;
      if (next === "APPROACH") {
        this.stateDuration = Utils.rand(d.approachMin, d.approachMax);
      } else if (next === "STRAFE") {
        this.stateDuration = Utils.rand(d.strafeMin, d.strafeMax);
        this.strafeDir = Math.random() < 0.5 ? -1 : 1;
      } else if (next === "CHARGE") {
        this.lockedAngle = Utils.angleTo(this.x, this.y, player.x, player.y);
        this.attackPattern = this.pickPattern();
        if (this.attackPattern === "WAVE_SLASH") this.stateDuration = d.chargeWave;
        else if (this.attackPattern === "BURST_WAVE") this.stateDuration = d.chargeWave;
        else if (this.attackPattern === "CROSS_RUSH") this.stateDuration = d.chargeCrossRush;
        else this.stateDuration = d.chargeDefault;
        this.chargeJitter = 0;
        const len = (this.attackPattern === "WAVE_SLASH" || this.attackPattern === "BURST_WAVE") ? 220 : 180;
        effects.push(new TelegraphLine(this.x, this.y, this.x + Math.cos(this.lockedAngle) * len, this.y + Math.sin(this.lockedAngle) * len, this.stateDuration, this.tuning.telegraphColor));
      } else if (next === "ATTACK") {
        this.hitApplied = false;
        this.attackSpawned = false;
        this.afterImageTimer = 0;
        this.attackStartX = this.x;
        this.attackStartY = this.y;
        const v = this.getAttackVector(this.attackPattern, this.lockedAngle);
        this.attackEndX = this.x + v.x;
        this.attackEndY = this.y + v.y;
        this.stateDuration = v.duration;
      } else if (next === "RECOVERY") {
        if (this.phase === 2 && this.attackPattern === "CROSS_RUSH" && this.comboStep < 1) {
          this.comboStep += 1;
          this.setState("CHARGE");
          return;
        }
        this.comboStep = 0;
        if (this.attackPattern === "WAVE_SLASH") this.stateDuration = d.recoveryWave;
        else if (this.attackPattern === "BURST_WAVE") this.stateDuration = d.recoveryBurst;
        else this.stateDuration = d.recoveryDefault;
      } else if (next === "BERSERK") {
        this.stateDuration = this.tuning.berserkDuration || 1.0;
      }
    }

    spawnAttackEffect() {
      const cx = this.x + Math.cos(this.lockedAngle) * 18;
      const cy = this.y + Math.sin(this.lockedAngle) * 18;
      const accent = this.phase === 1 ? "#7df9ff" : this.tuning.glow;
      let startAngle = this.lockedAngle - Math.PI * 0.75;
      let endAngle = this.lockedAngle + Math.PI * 0.15;
      if (this.attackPattern === "LEFT_STEP_SLASH") {
        startAngle = this.lockedAngle - Math.PI * 1.05;
        endAngle = this.lockedAngle - Math.PI * 0.12;
      } else if (this.attackPattern === "RIGHT_STEP_SLASH") {
        startAngle = this.lockedAngle + Math.PI * 0.12;
        endAngle = this.lockedAngle + Math.PI * 1.05;
      } else if (this.attackPattern === "BACK_STEP_SLASH") {
        startAngle = this.lockedAngle - Math.PI * 0.65;
        endAngle = this.lockedAngle + Math.PI * 0.30;
      } else if (this.attackPattern === "WAVE_SLASH" || this.attackPattern === "BURST_WAVE") {
        startAngle = this.lockedAngle - Math.PI * 0.6;
        endAngle = this.lockedAngle + Math.PI * 0.22;
      } else if (this.attackPattern === "CROSS_RUSH") {
        startAngle = this.lockedAngle - Math.PI * 0.9;
        endAngle = this.lockedAngle + Math.PI * 0.9;
      }
      effects.push(new SlashEffect({ x: cx, y: cy, startAngle, endAngle, color: "#ffffff", life: 0.14, scale: this.attackPattern === "CROSS_RUSH" ? 1.15 : 1 }));
      effects.push(new SlashEffect({ x: cx - Math.cos(this.lockedAngle) * 8, y: cy - Math.sin(this.lockedAngle) * 8, startAngle: startAngle + 0.06, endAngle: endAngle - 0.06, color: accent, life: 0.10, scale: 0.8 }));
    }

    updateStateMachine(dt) {
      this.angle = Utils.angleTo(this.x, this.y, this.player.x, this.player.y);
      if (this.state === "APPROACH") this.updateApproach(dt);
      else if (this.state === "STRAFE") this.updateStrafe(dt);
      else if (this.state === "CHARGE") this.updateCharge(dt);
      else if (this.state === "ATTACK") this.updateAttack(dt);
      else if (this.state === "RECOVERY") this.updateRecovery(dt);
      else if (this.state === "BERSERK") this.updateBerserk(dt);
      this.x = Utils.clamp(this.x, 24, canvas.width - 24);
      this.y = Utils.clamp(this.y, 24, canvas.height - 24);
    }

    updateApproach(dt) {
      const d = distanceToPlayer(this);
      const angle = Utils.angleTo(this.x, this.y, this.player.x, this.player.y);
      const forward = { x: Math.cos(angle), y: Math.sin(angle) };
      if (d > this.tuning.desiredRange) {
        this.x += forward.x * this.tuning.moveSpeed * dt;
        this.y += forward.y * this.tuning.moveSpeed * dt;
      } else if (d < this.tuning.desiredRange - 25) {
        this.x -= forward.x * this.tuning.moveSpeed * 0.45 * dt;
        this.y -= forward.y * this.tuning.moveSpeed * 0.45 * dt;
      }
      if (d <= this.tuning.attackRange && this.stateTime > 0.24) {
        this.setState(Math.random() < this.tuning.strafeBias ? "STRAFE" : "CHARGE");
        return;
      }
      if (this.stateTime >= this.stateDuration) this.setState("STRAFE");
    }

    updateStrafe(dt) {
      const toPlayer = Utils.angleTo(this.x, this.y, this.player.x, this.player.y);
      const d = distanceToPlayer(this);
      const forward = { x: Math.cos(toPlayer), y: Math.sin(toPlayer) };
      const side = { x: -forward.y * this.strafeDir, y: forward.x * this.strafeDir };
      let vx = side.x * this.tuning.moveSpeed * (this.phase === 1 ? 0.95 : 1.15);
      let vy = side.y * this.tuning.moveSpeed * (this.phase === 1 ? 0.95 : 1.15);
      if (d > this.tuning.desiredRange + 20) { vx += forward.x * this.tuning.moveSpeed * 0.6; vy += forward.y * this.tuning.moveSpeed * 0.6; }
      else if (d < this.tuning.desiredRange - 30) { vx -= forward.x * this.tuning.moveSpeed * 0.45; vy -= forward.y * this.tuning.moveSpeed * 0.45; }
      this.x += vx * dt;
      this.y += vy * dt;
      if (this.phase === 2 && this.stateTime > this.stateDuration * 0.35 && Math.random() < 0.018) this.strafeDir *= -1;
      if (d <= this.tuning.attackRange && this.stateTime >= this.stateDuration * (this.phase === 1 ? 0.45 : 0.28)) { this.setState("CHARGE"); return; }
      if (this.stateTime >= this.stateDuration) this.setState("APPROACH");
    }

    updateCharge(dt) {
      this.chargeJitter = Math.sin(this.stateTime * this.tuning.chargeJitterFrequency) * this.tuning.chargeJitterAmplitude;
      if (this.attackPattern !== "WAVE_SLASH" && this.attackPattern !== "BURST_WAVE") {
        const drift = Utils.angleTo(this.x, this.y, this.player.x, this.player.y);
        this.lockedAngle = Utils.lerp(this.lockedAngle, drift, this.phase === 1 ? 0.09 : 0.18);
      }
      if (this.stateTime >= this.stateDuration) this.setState("ATTACK");
    }

    updateBerserk(dt) {
      this.chargeJitter = Math.sin(this.stateTime * 120) * 4.0;
      if (this.stateTime >= this.stateDuration * 0.55 && this.stateTime - dt < this.stateDuration * 0.55) {
        for (let i = 0; i < 3; i++) {
          const a = this.angle + (i - 1) * 0.24;
          projectiles.push(new WaveProjectile(this.x + Math.cos(a) * 42, this.y + Math.sin(a) * 42, a, { speed: 360, color: this.tuning.glow, damage: 10, radius: 14, life: 1.1 }));
        }
      }
      if (this.stateTime >= this.stateDuration) this.setState("CHARGE");
    }

    updateAttack(dt) {
      const t = Utils.clamp(this.stateTime / this.stateDuration, 0, 1);
      const prevX = this.x;
      const prevY = this.y;
      if (this.attackPattern !== "WAVE_SLASH" && this.attackPattern !== "BURST_WAVE") {
        this.x = Utils.lerp(this.attackStartX, this.attackEndX, t);
        this.y = Utils.lerp(this.attackStartY, this.attackEndY, t);
        this.afterImageTimer -= dt;
        if (this.afterImageTimer <= 0) {
          this.afterImageTimer = this.tuning.afterImageInterval;
          effects.push(new AfterImage(this.x, this.y, this.radius, this.lockedAngle, this.phase === 1 ? "#7df9ff" : this.tuning.glow));
        }
      }
      if (!this.attackSpawned && t >= (this.phase === 1 ? 0.22 : 0.16)) {
        this.attackSpawned = true;
        this.spawnAttackEffect();
        if (this.attackPattern === "WAVE_SLASH") {
          const wave = this.tuning.wave;
          const sx = this.x + Math.cos(this.lockedAngle) * 54;
          const sy = this.y + Math.sin(this.lockedAngle) * 54;
          projectiles.push(new WaveProjectile(sx, sy, this.lockedAngle, wave));
        } else if (this.attackPattern === "BURST_WAVE") {
          const burst = this.tuning.burstWave;
          for (let i = -1; i <= 1; i++) {
            const a = this.lockedAngle + i * 0.24;
            const sx = this.x + Math.cos(a) * 54;
            const sy = this.y + Math.sin(a) * 54;
            projectiles.push(new WaveProjectile(sx, sy, a, burst));
          }
        }
      }
      if (!this.hitApplied) {
        let hit = false;
        if (this.attackPattern === "WAVE_SLASH" || this.attackPattern === "BURST_WAVE") {
          hit = Utils.pointInFan(this.player.x, this.player.y, this.x, this.y, this.lockedAngle, 72 + this.player.radius, Math.PI * 0.35);
        } else if (this.attackPattern === "BACK_STEP_SLASH") {
          hit = Utils.pointInFan(this.player.x, this.player.y, this.x, this.y, this.lockedAngle, 96 + this.player.radius, Math.PI * 0.55);
        } else if (this.attackPattern === "CROSS_RUSH") {
          hit = Utils.circleLineHit(this.player.x, this.player.y, this.player.radius, prevX, prevY, this.x, this.y, this.radius * 2.1);
          hit = hit || Utils.pointInFan(this.player.x, this.player.y, this.x, this.y, this.lockedAngle, 102 + this.player.radius, Math.PI * 0.62);
        } else {
          hit = Utils.circleLineHit(this.player.x, this.player.y, this.player.radius, prevX, prevY, this.x, this.y, this.radius * 1.7);
          hit = hit || Utils.pointInFan(this.player.x, this.player.y, this.x, this.y, this.lockedAngle, 84 + this.player.radius, Math.PI * 0.45);
        }
        if (hit) {
          this.hitApplied = true;
          this.player.damage(this.tuning.attackDamage + (this.attackPattern === "CROSS_RUSH" ? 2 : 0));
          for (let i = 0; i < 12; i++) effects.push(new Spark(this.player.x, this.player.y, this.phase === 1 ? "#ffd166" : this.tuning.glow));
        }
      }
      if (t >= 1) this.setState("RECOVERY");
    }

    updateRecovery(dt) {
      const d = distanceToPlayer(this);
      const ang = Utils.angleTo(this.x, this.y, this.player.x, this.player.y);
      if (d < (this.phase === 1 ? 105 : 130)) {
        this.x -= Math.cos(ang) * this.tuning.moveSpeed * (this.phase === 1 ? 0.55 : 0.4) * dt;
        this.y -= Math.sin(ang) * this.tuning.moveSpeed * (this.phase === 1 ? 0.55 : 0.4) * dt;
      }
      if (this.stateTime >= this.stateDuration) this.setState(d < this.tuning.attackRange ? "STRAFE" : "APPROACH");
    }

    drawBlade(drawX, drawY, facing) {
      let bladeLen = this.state === "CHARGE" ? 28 + Math.sin(this.stateTime * 30) * 6 : 46;
      if (this.phase === 2) bladeLen += 6;
      let bladeAngle = facing + 0.65;
      if (this.attackPattern === "LEFT_STEP_SLASH") bladeAngle = facing - 1.0;
      else if (this.attackPattern === "RIGHT_STEP_SLASH") bladeAngle = facing + 1.0;
      else if (this.attackPattern === "BACK_STEP_SLASH") bladeAngle = facing + Math.sin(this.stateTime * 24) * 0.85;
      else if (this.attackPattern === "FORWARD_SLASH") bladeAngle = facing - 0.25 + Math.sin(this.stateTime * 18) * 0.22;
      else if (this.attackPattern === "WAVE_SLASH" || this.attackPattern === "BURST_WAVE") bladeAngle = facing - 0.95 + Math.min(1, this.stateTime / Math.max(0.001, this.stateDuration)) * 1.2;
      else if (this.attackPattern === "CROSS_RUSH") bladeAngle = facing + Math.sin(this.stateTime * 28) * 1.3;
      const bladeX1 = drawX + Math.cos(bladeAngle) * 10;
      const bladeY1 = drawY + Math.sin(bladeAngle) * 10;
      const bladeX2 = bladeX1 + Math.cos(bladeAngle) * bladeLen;
      const bladeY2 = bladeY1 + Math.sin(bladeAngle) * bladeLen;
      const glowColor = this.phase === 1 ? "#7df9ff" : this.tuning.glow;
      ctx.save();
      ctx.shadowBlur = 22;
      ctx.shadowColor = glowColor;
      ctx.strokeStyle = this.phase === 1 ? "rgba(125,249,255,0.45)" : "rgba(255,107,214,0.45)";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(bladeX1, bladeY1);
      ctx.lineTo(bladeX2, bladeY2);
      ctx.stroke();
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(bladeX1, bladeY1);
      ctx.lineTo(bladeX2, bladeY2);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bladeX1, bladeY1);
      ctx.lineTo(bladeX2, bladeY2);
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = "#ffffff";
      ctx.arc(bladeX2, bladeY2, 3, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    draw() {
      const drawX = (this.state === "CHARGE" || this.state === "BERSERK") ? this.x + this.chargeJitter : this.x;
      const drawY = this.y;
      let bodyColor = this.tuning.bodyColor;
      let glow = this.tuning.glow;
      if (this.state === "CHARGE") {
        bodyColor = this.phase === 1 ? "#00f0ff" : "#ff8be4";
        glow = this.phase === 1 ? "#00f0ff" : "#ff6bd6";
      } else if (this.state === "ATTACK") {
        bodyColor = "#ffffff";
        glow = this.phase === 1 ? "#7df9ff" : "#ff9be8";
      } else if (this.state === "RECOVERY") {
        bodyColor = this.phase === 1 ? "#6c6f88" : "#8b5b7b";
        glow = this.phase === 1 ? "#8f96c9" : "#c97bb0";
      } else if (this.state === "BERSERK") {
        bodyColor = "#ffffff";
        glow = this.tuning.glow;
      }
      drawGlowCircle(drawX, drawY, this.radius, glow, 0.95);
      ctx.save();
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = glow;
      ctx.beginPath();
      ctx.arc(drawX, drawY, this.radius + 3, 0, TAU);
      ctx.stroke();
      ctx.restore();
      const facing = (this.state === "CHARGE" || this.state === "ATTACK" || this.state === "BERSERK") ? this.lockedAngle : this.angle;
      ctx.save();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(drawX, drawY);
      ctx.lineTo(drawX + Math.cos(facing) * this.radius * 1.3, drawY + Math.sin(facing) * this.radius * 1.3);
      ctx.stroke();
      ctx.restore();
      if (this.state === "CHARGE" || this.state === "ATTACK" || this.state === "BERSERK") this.drawBlade(drawX, drawY, facing);
      drawText(this.definition.code, drawX, drawY + 5, "#fff", 12, "center");
    }
  }

class SplitBossRuntime {
    constructor(type, player, startPhase = "auto") {
      this.player = player;
      this.definition = BossRegistry[type];
      this.type = type;
      this.phase = 1;
      this.maxHp = this.definition.maxHp;
      this.hp = this.maxHp;
      this.radius = this.definition.radius;
      this.x = canvas.width * 0.5;
      this.y = canvas.height * 0.22;
      this.aiTimer = 0;
      this.loopCursor = 0;
      this.stateText = "코어 제어";
      this.splitTransition = 0;
      this.splitInvuln = 0;
      this.children = [];
      this.applyStartPhase(startPhase);
    }

    applyStartPhase(startPhase = "auto") {
      if (startPhase === "2") {
        this.enterSplitPhase(true);
        this.stateText = "TEST START P2";
      }
    }

    forcePhase2() {
      if (this.phase === 1) {
        this.hp = this.maxHp * 0.5;
        this.enterSplitPhase(false);
      }
    }

    createChild(role, tx, ty) {
      const isBlue = role === "blue";
      return {
        role,
        label: isBlue ? "BLUE" : "RED",
        x: this.x,
        y: this.y,
        startX: this.x,
        startY: this.y,
        targetX: tx,
        targetY: ty,
        radius: 24,
        maxHp: this.maxHp * 0.25,
        hp: this.maxHp * 0.25,
        aiTimer: isBlue ? 0.4 : 0.85,
        loopCursor: 0,
        pulse: Utils.rand(0, 10),
        angle: 0,
        dashTime: 0,
        dashCooldown: 0,
        dashVX: 0,
        dashVY: 0,
        afterImageTimer: 0,
        dead: false,
        deathFxPlayed: false,
        enrage: false,
        enragePulse: 0
      };
    }

    enterSplitPhase(isTestStart = false) {
      this.phase = 2;
      this.splitTransition = isTestStart ? 0 : 0.95;
      this.splitInvuln = isTestStart ? 0.18 : 0.55;
      this.stateText = isTestStart ? "분열형 테스트 시작" : "SPLIT SHIFT";
      this.children = [
        this.createChild("blue", this.x - 132, this.y + 24),
        this.createChild("red", this.x + 132, this.y - 16)
      ];
      if (isTestStart) {
        for (const child of this.children) {
          child.x = child.targetX;
          child.y = child.targetY;
        }
      }
      for (let i = 0; i < 34; i++) effects.push(new Spark(this.x, this.y, i % 2 ? "#7df9ff" : "#ff6bb5"));
      effects.push(new PhaseShiftRing(this.x, this.y, "#7df9ff"));
      effects.push(new PhaseShiftRing(this.x, this.y, "#ff6bb5"));
      texts.push(new FloatText("SPLIT", this.x, this.y - 54, "#ffffff"));
      this.syncAggregateState();
    }

    damage(amount, hitCircle = null) {
      if (this.phase === 1) {
        this.hp = Math.max(0, this.hp - amount);
        return;
      }
      if (this.splitInvuln > 0) return;
      const alive = this.children.filter(child => child.hp > 0 && !child.dead);
      if (!alive.length) return;
      const target = hitCircle
        ? alive.find((child) => Math.hypot(child.x - hitCircle.x, child.y - hitCircle.y) < 1) || alive.reduce((best, child) => child.hp < best.hp ? child : best, alive[0])
        : alive.reduce((best, child) => child.hp < best.hp ? child : best, alive[0]);
      target.hp = Math.max(0, target.hp - amount);
      if (target.hp <= 0) this.handleChildDefeat(target);
      this.syncAggregateState();
    }

    handleChildDefeat(child) {
      if (child.dead) return;
      child.dead = true;
      child.hp = 0;
      child.dashTime = 0;
      for (let i = 0; i < 18; i++) effects.push(new Spark(child.x, child.y, child.role === "blue" ? "#7df9ff" : "#ff6bb5"));
      effects.push(new RingEffect(child.x, child.y, 16, child.role === "blue" ? "#7df9ff" : "#ff6bb5", 0.35));
      texts.push(new FloatText(child.role === "blue" ? "BLUE DOWN" : "RED DOWN", child.x, child.y - 22, "#ffffff"));
      const survivor = this.children.find(other => other !== child && other.hp > 0 && !other.dead);
      if (survivor) {
        survivor.enrage = true;
        survivor.enragePulse = 1.6;
        survivor.aiTimer = Math.min(survivor.aiTimer, 0.18);
        survivor.dashCooldown = Math.min(survivor.dashCooldown, 0.3);
        survivor.maxHp = Math.max(survivor.maxHp, survivor.hp);
        texts.push(new FloatText("ENRAGE", survivor.x, survivor.y - 26, survivor.role === "blue" ? "#7df9ff" : "#ff8fab"));
        for (let i = 0; i < 10; i++) effects.push(new Spark(survivor.x, survivor.y, survivor.role === "blue" ? "#7df9ff" : "#ff6bb5"));
        this.stateText = survivor.role === "blue" ? "청색 각성" : "적색 폭주";
      } else {
        this.stateText = "분열체 격파";
      }
    }

    syncAggregateState() {
      if (this.phase === 1) return;
      this.hp = this.children.reduce((sum, child) => sum + Math.max(0, child.hp), 0);
      if (!this.children.some(child => child.hp > 0 && !child.dead)) {
        this.children.length = 0;
        this.hp = 0;
        this.stateText = "분열체 격파";
      }
    }

    moveCore(dt) {
      const orbit = performance.now() / 1000 * 0.45;
      const tx = canvas.width * 0.5 + Math.cos(orbit) * 42;
      const ty = canvas.height * 0.22 + Math.sin(orbit * 1.7) * 16;
      this.x = Utils.lerp(this.x, tx, dt * 1.1);
      this.y = Utils.lerp(this.y, ty, dt * 1.1);
    }

    updatePhase1(dt) {
      this.moveCore(dt);
      this.aiTimer -= dt;
      if (this.hp <= this.maxHp * 0.5) {
        this.enterSplitPhase(false);
        return;
      }
      if (this.aiTimer > 0) return;
      const loop = [
        () => PatternLibrary.radial(this, { count: 12, speed: 145, color: "#ffd166" }),
        () => PatternLibrary.trackingZone(this),
        () => PatternLibrary.safeLane(this, { randomize: false }),
        () => PatternLibrary.single(this)
      ];
      this.aiTimer = 0.9 + Utils.rand(0.0, 0.18);
      loop[this.loopCursor % loop.length]();
      this.loopCursor++;
      if (this.stateText === "원형 확산") this.stateText = "코어 확산";
      if (this.stateText === "추적 위험지대") this.stateText = "코어 추적지대";
    }

    updateBlue(child, dt) {
      child.pulse += dt * (child.enrage ? 1.25 : 1);
      child.enragePulse = Math.max(0, child.enragePulse - dt);
      const tx = canvas.width * 0.34 + Math.cos(child.pulse * 1.8) * (child.enrage ? 112 : 90);
      const ty = canvas.height * 0.27 + Math.sin(child.pulse * 2.4) * (child.enrage ? 42 : 34);
      child.x = Utils.lerp(child.x, tx, dt * (child.enrage ? 2.0 : 1.6));
      child.y = Utils.lerp(child.y, ty, dt * (child.enrage ? 2.0 : 1.6));
      child.aiTimer -= dt;
      if (child.aiTimer > 0 || child.hp <= 0 || child.dead) return;
      const patterns = [
        () => {
          const a = Utils.angleTo(child.x, child.y, this.player.x, this.player.y);
          const speed = child.enrage ? 330 : 280;
          bullets.push(new Bullet(child.x, child.y, Math.cos(a) * speed, Math.sin(a) * speed, 7, "#7df9ff", 5, child.enrage ? 12 : 10));
          this.stateText = child.enrage ? "청색 각성 저격" : "청색 단일탄";
        },
        () => {
          const count = child.enrage ? 14 : 10;
          const speed = child.enrage ? 165 : 135;
          for (let i = 0; i < count; i++) {
            const a = i / count * TAU + child.pulse * 0.22;
            bullets.push(new Bullet(child.x, child.y, Math.cos(a) * speed, Math.sin(a) * speed, 6, "#7df9ff", 5, child.enrage ? 10 : 9));
          }
          this.stateText = child.enrage ? "청색 각성 확산" : "청색 확산탄";
        },
        () => {
          const laneAngle = Utils.angleTo(child.x, child.y, this.player.x, this.player.y);
          new SafeLaneCurtain({
            centerX: child.x,
            centerY: child.y,
            startAngle: laneAngle,
            laneWidth: child.enrage ? 0.44 : 0.58,
            color: "#7df9ff",
            speed: child.enrage ? 220 : 185,
            count: child.enrage ? 42 : 34,
            radius: 6
          });
          this.stateText = child.enrage ? "청색 각성 안전지대" : "청색 안전지대";
        }
      ];
      patterns[child.loopCursor % patterns.length]();
      child.loopCursor++;
      child.aiTimer = child.enrage ? 0.68 : 0.95;
    }

    updateRed(child, dt) {
      child.pulse += dt * (child.enrage ? 1.25 : 1);
      child.enragePulse = Math.max(0, child.enragePulse - dt);
      child.dashCooldown = Math.max(0, child.dashCooldown - dt);
      if (child.dashTime > 0) {
        child.dashTime -= dt;
        child.afterImageTimer -= dt;
        child.x += child.dashVX * dt;
        child.y += child.dashVY * dt;
        if (child.afterImageTimer <= 0) {
          child.afterImageTimer = child.enrage ? 0.018 : 0.028;
          effects.push(new AfterImage(child.x, child.y, child.radius, Math.atan2(child.dashVY, child.dashVX), "#ff6bb5", 0.1));
        }
        if (Utils.dist(child.x, child.y, this.player.x, this.player.y) < child.radius + this.player.radius + 8) {
          this.player.damage(child.enrage ? 20 : 16);
        }
        if (child.dashTime <= 0) {
          effects.push(new RingEffect(child.x, child.y, 16, "#ff6bb5", 0.24));
          hazards.push(new DelayedBlast(child.x, child.y, child.enrage ? 0.22 : 0.32, child.enrage ? 86 : 74, "#ff6bb5", false));
          this.stateText = child.enrage ? "적색 폭주 충돌" : "적색 돌진 폭발";
        }
        return;
      }

      const side = Math.sin(child.pulse * 1.4) > 0 ? 1 : -1;
      const desired = Utils.angleTo(child.x, child.y, this.player.x, this.player.y) + side * Math.PI * (child.enrage ? 0.36 : 0.45);
      const tx = this.player.x + Math.cos(desired) * (child.enrage ? 150 : 170);
      const ty = Utils.clamp(this.player.y + Math.sin(desired) * (child.enrage ? 80 : 95), 80, canvas.height * 0.7);
      child.x = Utils.lerp(child.x, tx, dt * (child.enrage ? 2.4 : 1.9));
      child.y = Utils.lerp(child.y, ty, dt * (child.enrage ? 2.4 : 1.9));

      child.aiTimer -= dt;
      if (child.aiTimer <= 0 && child.dashCooldown <= 0) {
        const a = Utils.angleTo(child.x, child.y, this.player.x, this.player.y);
        const dashSpeed = child.enrage ? 660 : 520;
        child.dashVX = Math.cos(a) * dashSpeed;
        child.dashVY = Math.sin(a) * dashSpeed;
        child.dashTime = child.enrage ? 0.24 : 0.2;
        child.dashCooldown = child.enrage ? 0.72 : 1.15;
        child.aiTimer = child.enrage ? 0.82 : 1.3;
        child.afterImageTimer = 0;
        for (let i = 0; i < 8; i++) effects.push(new Spark(child.x, child.y, "#ff6bb5"));
        effects.push(new TelegraphLine(child.x, child.y, child.x + Math.cos(a) * (child.enrage ? 240 : 180), child.y + Math.sin(a) * (child.enrage ? 240 : 180), child.enrage ? 0.16 : 0.22, "#ff6bb5"));
        this.stateText = child.enrage ? "적색 폭주 돌진" : "적색 돌진";
      } else if (child.aiTimer <= 0) {
        hazards.push(new DelayedBlast(this.player.x, this.player.y, child.enrage ? 0.5 : 0.7, child.enrage ? 64 : 56, "#ff8fab", true, child.enrage ? 0.52 : 0.45));
        child.aiTimer = child.enrage ? 0.6 : 0.8;
        this.stateText = child.enrage ? "적색 폭주 추적지대" : "적색 추적지대";
      }
    }

    updateTransition(dt) {
      if (this.splitTransition <= 0) return false;
      this.splitTransition = Math.max(0, this.splitTransition - dt);
      const total = 0.95;
      const t = 1 - this.splitTransition / total;
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) * 0.5;
      for (const child of this.children) {
        child.x = Utils.lerp(child.startX, child.targetX, eased);
        child.y = Utils.lerp(child.startY, child.targetY, eased);
      }
      return true;
    }

    updatePhase2(dt) {
      this.splitInvuln = Math.max(0, this.splitInvuln - dt);
      if (this.updateTransition(dt)) return;
      for (const child of this.children) {
        if (child.hp <= 0 || child.dead) continue;
        if (child.role === "blue") this.updateBlue(child, dt);
        else this.updateRed(child, dt);
      }
      this.syncAggregateState();
      const alive = this.children.filter(child => child.hp > 0 && !child.dead);
      if (alive.length) {
        this.x = alive.reduce((sum, child) => sum + child.x, 0) / alive.length;
        this.y = alive.reduce((sum, child) => sum + child.y, 0) / alive.length;
      }
    }

    getHitCircles() {
      if (this.phase === 1) return [{ x: this.x, y: this.y, radius: this.radius }];
      return this.children
        .filter((child) => child.hp > 0 && !child.dead)
        .map((child) => ({ x: child.x, y: child.y, radius: child.radius }));
    }

    update(dt) {
      if (this.phase === 1) this.updatePhase1(dt);
      else this.updatePhase2(dt);
    }

    drawCore(x, y, radius, body, glow, code, alpha = 0.92) {
      drawGlowCircle(x, y, radius, glow, alpha);
      ctx.save();
      ctx.strokeStyle = body;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 20;
      ctx.shadowColor = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, TAU);
      ctx.stroke();
      const c = radius * 0.62;
      ctx.beginPath();
      ctx.moveTo(x - c, y);
      ctx.lineTo(x + c, y);
      ctx.moveTo(x, y - c);
      ctx.lineTo(x, y + c);
      ctx.stroke();
      ctx.restore();
      drawText(code, x, y + 4, "#fff", 12, "center");
    }

    draw() {
      if (this.phase === 1) {
        this.drawCore(this.x, this.y, this.radius, "#ffd166", "#ffb347", this.definition.code);
        return;
      }
      if (this.splitTransition > 0) {
        const glowAlpha = 0.5 + Math.sin(performance.now() / 70) * 0.12;
        this.drawCore(this.x, this.y, 30, "#ffffff", "#ffd166", "S", glowAlpha);
      }
      for (const child of this.children) {
        if (child.hp <= 0 && child.dead) continue;
        const body = child.role === "blue" ? "#7df9ff" : "#ff8fab";
        const glow = child.role === "blue" ? "#7df9ff" : "#ff6bb5";
        const flicker = child.enragePulse > 0 ? 0.72 + Math.sin(performance.now() / 45) * 0.18 : 0.92;
        this.drawCore(child.x, child.y, child.radius + (child.enragePulse > 0 ? 2 : 0), body, glow, child.role === "blue" ? "B" : "R", flicker);
        const ratio = child.hp / child.maxHp;
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(child.x - 26, child.y - 42, 52, 6);
        ctx.fillStyle = glow;
        ctx.fillRect(child.x - 26, child.y - 42, 52 * ratio, 6);
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(child.x - 26, child.y - 42, 52, 6);
        ctx.restore();
        if (child.enragePulse > 0) {
          ctx.save();
          ctx.globalAlpha = 0.35 + Math.sin(performance.now() / 60) * 0.12;
          ctx.strokeStyle = glow;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(child.x, child.y, child.radius + 14 + Math.sin(performance.now() / 80) * 4, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
      }
      if (this.splitInvuln > 0) {
        drawText("분열 직후 잠깐 무적", this.x, this.y - 52, "#ffffff", 12, "center", 0.85);
      }
    }
  }

  window.ShootingBossRuntime = {
    BaseBossRuntime,
    PatternBossRuntime,
    SummonerBossRuntime,
    StateMachineBossRuntime,
    KnightBossRuntime,
    SplitBossRuntime,
  };
})();
