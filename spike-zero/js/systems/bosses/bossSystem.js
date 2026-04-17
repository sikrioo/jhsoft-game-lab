/**
 * BossSystem.js
 * 보스 스폰 관리, 상태 조회, 아레나 제어 담당 메인 모듈
 *
 * 의존 모듈 (로드 순서):
 *   1. BossVisuals.js
 *   2. BossBullets.js
 *   3. BossScheduler.js
 *   4. BossSystem.js  (이 파일)
 *
 * 보스 정의(BOSS_DEFINITIONS)는 외부에서 window.BOSS_DEFINITIONS 로 주입
 */
window.BossSystem = (() => {
  const PRACTICE_DEFAULT = "basic";

  // ─── 정의 조회 ────────────────────────────────────────────────────────────

  function getDefinitions() {
    return Object.values(window.BOSS_DEFINITIONS || {});
  }

  function getDefinition(id) {
    return (window.BOSS_DEFINITIONS || {})[id] || null;
  }

  // ─── 연습 보스 선택 ────────────────────────────────────────────────────────

  function getPracticeBossId() {
    const S = GameState;
    if (!S.practiceBossId || !getDefinition(S.practiceBossId)) {
      S.practiceBossId = PRACTICE_DEFAULT;
    }
    return S.practiceBossId;
  }

  function setPracticeBossId(id) {
    if (!getDefinition(id)) return false;
    GameState.practiceBossId = id;
    return true;
  }

  // ─── 활성 보스 조회 ────────────────────────────────────────────────────────

  function hasActiveBoss() {
    return GameState.enemies.some((e) => e && e.isBoss && e.hp > 0);
  }

  function getActiveBoss() {
    return GameState.enemies.find((e) => e && e.isBoss && e.hp > 0) || null;
  }

  // ─── 웨이브 판단 ────────────────────────────────────────────────────────────

  function isBossWave(wave = GameState.progression.wave) {
    if (GameState.progression && GameState.progression.stageDuration > 0) return false;
    return !GameState.stats.practice && wave > 0 && wave % 5 === 0;
  }

  function getWaveBossId(wave = GameState.progression.wave) {
    const order = ["basic", "advanced", "knight", "split", "summoner"];
    const index = Math.max(0, Math.floor(wave / 5) - 1) % order.length;
    return order[index];
  }

  function getStageBossId(stage = GameState.progression.stage || 1) {
    const order = ["basic", "advanced", "knight", "split", "summoner"];
    const index = Math.max(0, stage - 1) % order.length;
    return order[index];
  }

  // ─── 스폰 억제 판단 ────────────────────────────────────────────────────────

  function shouldSuppressPracticeSpawns() {
    return !!GameState.stats.practice;
  }

  function shouldSuppressEnemySpawns() {
    const stageBossActive = !GameState.stats.practice && GameState.progression.stageState === "boss";
    return shouldSuppressPracticeSpawns() || hasActiveBoss() || stageBossActive || isBossWave();
  }

  // ─── 아레나 클리어 ─────────────────────────────────────────────────────────

  function clearCurrentArena() {
    const S = GameState;

    for (const enemy of [...S.enemies]) {
      // BossScheduler를 가진 보스의 pendingActions 정리
      if (enemy.scheduler) enemy.scheduler.clear();
      if (enemy.destroyVisuals) enemy.destroyVisuals();
      else if (enemy.spr && enemy.spr.parent) enemy.spr.parent.removeChild(enemy.spr);
    }
    S.enemies.length = 0;

    for (const bullet of S.enemyBullets) {
      if (bullet.spr && bullet.spr.parent) bullet.spr.parent.removeChild(bullet.spr);
    }
    S.enemyBullets.length = 0;

    S.progression.waveAlive    = 0;
    S.progression.spawnedCount = 0;
  }

  // ─── 보스 공통 베이스 ──────────────────────────────────────────────────────

  /**
   * 모든 보스가 공유하는 기본 프로퍼티/메서드 생성
   * @param {object} def      - BOSS_DEFINITIONS 항목
   * @param {object} options  - contactDamage, collisionPush 오버라이드
   * @returns {object} boss
   */
  function createBaseBoss(def, options = {}) {
    const root = new PIXI.Container();
    root.x = GameState.app.renderer.width * 0.5;
    root.y = 120;
    GameState.uiLayer.addChild(root);

    const boss = {
      type:        "enemy",
      tier:        "boss",
      isBoss:      true,
      bossId:      def.id,
      displayName: def.name,
      spr:         root,
      x:           root.x,
      y:           root.y,
      r:           def.radius,
      hp:          def.maxHp,
      maxHp:       def.maxHp,
      scoreBase:   def.scoreBase,
      xp:          def.xp,
      glowColor:   def.glowColor,
      hitT:        0,
      slowT:       0,
      slowMul:     1,
      contactDamage:  options.contactDamage  || 12,
      collisionPush:  options.collisionPush  || 6.5,

      destroyVisuals() {
        if (boss.spr && boss.spr.parent) boss.spr.parent.removeChild(boss.spr);
      },

      getHitCircles() {
        return [{ x: boss.x, y: boss.y, radius: boss.r }];
      },

      takeDamage(damage) {
        boss.hp = Math.max(0, boss.hp - damage);
        return true;
      },

      onDefeat() {
        Effects.emitPulse(boss.x, boss.y, boss.glowColor, 110, 20);
        Effects.emitParticle(boss.x, boss.y, boss.glowColor, 32, 1.8);
      },

      onPlayerCollide({ player, hitCircle, dx, dy }) {
        return EnemySystem.hitPlayerWithEnemyDamage(
          boss.contactDamage,
          boss.glowColor,
          dx, dy,
          {
            invFrames:      32,
            push:           boss.collisionPush,
            particleCount:  18,
            particlePower:  1.3,
            pulseRadius:    hitCircle.radius + player.r + 10,
            pulseLife:      12
          }
        );
      }
    };

    return boss;
  }

  // ─── 보스 팩토리 ──────────────────────────────────────────────────────────

  function createBasicBoss() {
    const def  = getDefinition("basic");
    const boss = createBaseBoss(def, { contactDamage: 14, collisionPush: 7.2 });

    boss.core       = BossVisuals.buildFrame({ radius: def.radius, code: def.code, bodyColor: 0x79ffbf, glowColor: 0x48ffc5 });
    boss.hpBar      = BossVisuals.attachHpBar(boss.spr, 180);
    boss.fireCd     = 24;
    boss.patternIndex = 0;
    boss.orbitT     = 0;
    boss.pendingBlast = null;
    boss.spr.addChild(boss.core);

    function triggerAreaBlast(blast) {
      if (!blast) return;
      Effects.emitPulse(blast.x, blast.y, blast.color, blast.radius, 14);
      Effects.emitParticle(blast.x, blast.y, blast.color, 18, 1.15);
      const player = GameState.player;
      const rr = blast.radius + player.r;
      if (Helpers.dist2(blast.x, blast.y, player.spr.x, player.spr.y) <= rr * rr) {
        const ang = Math.atan2(player.spr.y - blast.y, player.spr.x - blast.x);
        EnemySystem.hitPlayerWithEnemyDamage(blast.damage, blast.color, Math.cos(ang), Math.sin(ang), {
          invFrames: 22,
          push: 5.2,
          particleCount: 14,
          particlePower: 1.0,
          pulseRadius: blast.radius * 0.65,
          pulseLife: 10
        });
      }
    }

    boss.updateBoss = (dt) => {
      const w = GameState.app.renderer.width;
      boss.orbitT += dt * 0.012;
      boss.x = Helpers.lerp(boss.x, w * 0.5 + Math.cos(boss.orbitT) * 150, 0.05 * dt);
      boss.y = Helpers.lerp(boss.y, 118 + Math.sin(boss.orbitT * 2) * 28,  0.05 * dt);
      boss.spr.x = boss.x;
      boss.spr.y = boss.y;

      boss.fireCd -= dt;

      // 발사 예고
      if (boss.fireCd <= 14 && boss.fireCd + dt > 14) {
        const pattern = boss.patternIndex % 3;
        if (pattern === 0) {
          const aim = Math.atan2(GameState.player.spr.y - boss.y, GameState.player.spr.x - boss.x);
          Effects.emitLineTelegraph(boss.x, boss.y, boss.x + Math.cos(aim) * 220, boss.y + Math.sin(aim) * 220, 0x79ffbf, 14, 6);
        } else if (pattern === 1) {
          Effects.emitGroundTelegraph(boss.x, boss.y, boss.hp <= boss.maxHp * 0.5 ? 86 : 70, 0xffd166, 14);
        } else {
          const player = GameState.player;
          const radius = boss.hp <= boss.maxHp * 0.5 ? 76 : 62;
          const tx = Helpers.clamp(player.spr.x + player.vx * 5, 44, GameState.app.renderer.width - 44);
          const ty = Helpers.clamp(player.spr.y + player.vy * 5, 64, GameState.app.renderer.height - 44);
          boss.pendingBlast = { x: tx, y: ty, radius, damage: boss.hp <= boss.maxHp * 0.5 ? 12 : 10, color: 0xff6b6b };
          Effects.emitGroundTelegraph(tx, ty, radius, 0xff6b6b, 14);
        }
      }

      if (boss.fireCd <= 0) {
        const pattern = boss.patternIndex % 3;
        if (pattern === 0) {
          const aim = Math.atan2(GameState.player.spr.y - boss.y, GameState.player.spr.x - boss.x);
          for (let i = -2; i <= 2; i++) {
            GameState.enemyBullets.push(BossBullets.make(boss.x, boss.y + 16, aim + i * 0.16, {
              color: 0x79ffbf, speed: 6.6, damage: 8, radius: 8
            }));
          }
          boss.fireCd = 34;
        } else if (pattern === 1) {
          const isEnraged = boss.hp <= boss.maxHp * 0.5;
          const count  = isEnraged ? 14 : 10;
          const speed  = isEnraged ? 5.8 : 5.0;
          const spin   = performance.now() * 0.0025;
          BossBullets.radialBurst(boss.x, boss.y, count, speed, 0xffd166, 7, spin, 7);
          boss.fireCd  = isEnraged ? 48 : 58;
        } else {
          triggerAreaBlast(boss.pendingBlast);
          boss.pendingBlast = null;
          boss.fireCd = boss.hp <= boss.maxHp * 0.5 ? 44 : 52;
        }
        boss.patternIndex += 1;
      }

      BossVisuals.redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, boss.hp <= boss.maxHp * 0.4 ? 0xff9b8d : 0x79ffbf);
      BossVisuals.setFrameValue(boss.core, boss.hp);
      boss.core.scale.set(1 + Math.sin(performance.now() * 0.01) * 0.03);
    };

    return boss;
  }

  // ───────────────────────────────────────────────────────────────────────────

  function createAdvancedBoss() {
    const def  = getDefinition("advanced");
    const boss = createBaseBoss(def, { contactDamage: 15, collisionPush: 7.6 });

    boss.phase            = 1;
    boss.phaseShiftPlayed = false;
    boss.core             = BossVisuals.buildFrame({ radius: def.radius, code: def.code, bodyColor: 0x7a5cff, glowColor: 0x9a7dff });
    boss.hpBar            = BossVisuals.attachHpBar(boss.spr, 200);
    boss.orbitT           = Math.random() * Math.PI * 2;
    boss.aiCd             = 28;
    boss.attackIndex      = 0;
    boss.currentAction    = "IDLE";
    boss.scheduler        = BossScheduler.create();   // ← 공용 스케줄러 사용
    boss.spr.addChild(boss.core);

    // 패턴 함수들
    function radialBurst(x, y, count, speed, color, damage, angleOffset = 0, radius = 7) {
      BossBullets.radialBurst(x, y, count, speed, color, damage, angleOffset, radius);
    }

    function trackingZone() {
      const player = GameState.player;
      const tx = player.spr.x;
      const ty = player.spr.y;
      boss.currentAction = "TRACKING";
      Effects.emitGroundTelegraph(tx, ty, boss.phase === 1 ? 54 : 64, 0xffb347, 16);
      boss.scheduler.schedule(16, () => {
        radialBurst(tx, ty, boss.phase === 1 ? 10 : 14, boss.phase === 1 ? 5.0 : 5.8, 0xffb347, 8, performance.now() * 0.002);
        Effects.emitPulse(tx, ty, 0xffb347, boss.phase === 1 ? 48 : 62, 12);
      });
    }

    function rotatingBurst() {
      boss.currentAction = "ROTATING";
      Effects.emitGroundTelegraph(boss.x, boss.y, 68, 0x9a7dff, 12);
      boss.scheduler.schedule(12, () => {
        radialBurst(boss.x, boss.y, 14, 5.2, 0x9a7dff, 8, boss.orbitT * 0.8);
      });
    }

    function doubleRing() {
      boss.currentAction = "DOUBLE";
      Effects.emitGroundTelegraph(boss.x, boss.y, 76, 0xff6bb5, 12);
      boss.scheduler.schedule(12, () => radialBurst(boss.x, boss.y, 10, 4.7, 0xff8fab, 8, performance.now() * 0.002));
      boss.scheduler.schedule(26, () => radialBurst(boss.x, boss.y, 14, 5.5, 0xff6bb5, 9, performance.now() * 0.003));
    }

    function teleportBlast() {
      const player = GameState.player;
      const preX   = player.spr.x;
      const preY   = player.spr.y;
      boss.currentAction = "TELEPORT";
      Effects.emitGroundTelegraph(preX, preY, 72, 0xff6bb5, 14);
      boss.scheduler.schedule(14, () => {
        const angle = Math.atan2(player.spr.y - boss.y, player.spr.x - boss.x) + Math.PI / 2;
        boss.x = Helpers.clamp(player.spr.x + Math.cos(angle) * 250, 42, GameState.app.renderer.width - 42);
        boss.y = Helpers.clamp(player.spr.y + Math.sin(angle) * 156,  54, GameState.app.renderer.height * 0.52);
        boss.spr.x = boss.x;
        boss.spr.y = boss.y;
        Effects.emitPulse(boss.x, boss.y, 0xff6bb5, 62, 10);
        radialBurst(boss.x, boss.y, 10, 5.0, 0xff6bb5, 8, performance.now() * 0.0025);
      });
    }

    function checkPhaseTransition() {
      if (boss.hp <= boss.maxHp * 0.5) boss.phase = 2;
      if (boss.phase === 2 && !boss.phaseShiftPlayed) {
        boss.phaseShiftPlayed = true;
        Effects.emitPulse(boss.x, boss.y, 0xff6bb5, 90, 18);
        Effects.emitParticle(boss.x, boss.y, 0xff8fab, 20, 1.5);
        boss.aiCd = Math.min(boss.aiCd, 22);
      }
    }

    boss.updateBoss = (dt) => {
      boss.scheduler.update(dt);
      checkPhaseTransition();

      if (boss.phase === 1) {
        boss.orbitT += dt * 0.014;
        const targetX = GameState.app.renderer.width * 0.5 + Math.cos(boss.orbitT) * 110;
        const targetY = 112 + Math.sin(boss.orbitT * 2) * 24;
        boss.x = Helpers.lerp(boss.x, targetX, 0.06 * dt);
        boss.y = Helpers.lerp(boss.y, targetY, 0.06 * dt);
      } else {
        const player  = GameState.player;
        boss.orbitT  += dt * 0.01;
        const desired = Math.atan2(player.spr.y - boss.y, player.spr.x - boss.x) + Math.PI / 2;
        const targetX = player.spr.x + Math.cos(desired) * 290;
        const targetY = Helpers.clamp(player.spr.y + Math.sin(desired) * 172, 88, GameState.app.renderer.height * 0.48);
        boss.x = Helpers.lerp(boss.x, targetX, 0.03 * dt);
        boss.y = Helpers.lerp(boss.y, targetY, 0.03 * dt);
      }
      boss.spr.x = boss.x;
      boss.spr.y = boss.y;

      boss.aiCd -= dt;
      if (boss.aiCd <= 0) {
        if (boss.phase === 1) {
          const actions = [rotatingBurst, trackingZone, () => BossBullets.safeLaneBurst(boss.x, boss.y, { randomize: false, onSchedule: boss.scheduler.schedule })];
          actions[boss.attackIndex % actions.length]();
          boss.aiCd = boss.attackIndex % 3 === 0 ? 34 : 30;
        } else {
          const actions = [doubleRing, () => BossBullets.safeLaneBurst(boss.x, boss.y, { randomize: true, onSchedule: boss.scheduler.schedule }), teleportBlast];
          actions[boss.attackIndex % actions.length]();
          boss.aiCd = boss.attackIndex % 3 === 0 ? 44 : 40;
        }
        boss.attackIndex += 1;
      }

      boss.core.alpha = boss.currentAction === "TELEPORT" ? 0.82 : 1;
      boss.core.scale.set(1 + Math.sin(performance.now() * 0.012) * 0.03);
      BossVisuals.setFrameValue(boss.core, boss.hp);
      BossVisuals.redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, boss.phase === 1 ? 0x9a7dff : 0xff8fab);
    };

    boss.onDefeat = () => {
      Effects.emitPulse(boss.x, boss.y, 0xffffff, 150, 24);
      Effects.emitParticle(boss.x, boss.y, 0x9a7dff, 22, 1.5);
      Effects.emitParticle(boss.x, boss.y, 0xff8fab, 24, 1.8);
    };

    return boss;
  }

  // ───────────────────────────────────────────────────────────────────────────

  function createSplitBoss() {
    const def  = getDefinition("split");
    const boss = createBaseBoss(def, { contactDamage: 16, collisionPush: 8.2 });

    boss.phase  = 1;
    boss.core   = BossVisuals.buildFrame({ radius: def.radius, code: def.code, bodyColor: 0xffd166, glowColor: 0xffb347 });
    boss.hpBar  = BossVisuals.attachHpBar(boss.spr, 200);
    boss.aiCd   = 26;
    boss.phaseT = 0;
    boss.children = [];
    boss.spr.addChild(boss.core);

    function makeChild(role, offsetX, offsetY) {
      const isBlue = role === "blue";
      const child  = {
        role,
        x: boss.x + offsetX,
        y: boss.y + offsetY,
        targetX: boss.x + offsetX,
        targetY: boss.y + offsetY,
        r:      22,
        hp:     def.maxHp * 0.25,
        maxHp:  def.maxHp * 0.25,
        dashCd: isBlue ? 0 : 58,
        fireCd: isBlue ? 32 : 0,
        pulse:  Math.random() * Math.PI * 2,
        dashTelegraphShown: false,
        state: isBlue ? "ORBIT" : "APPROACH",
        stateTime: 0,
        stateDuration: isBlue ? 0 : 18,
        lockAngle: 0,
        attackPattern: "FORWARD_SLASH",
        attackSide: 1,
        attackFxPlayed: false,
        afterSlash: 0,
        frame: BossVisuals.buildFrame({
          radius:    22,
          code:      isBlue ? "B" : "R",
          bodyColor: isBlue ? 0x7df9ff : 0xff8fab,
          glowColor: isBlue ? 0x54d6ff : 0xff5f90
        }),
        hpBar:     null,
        glowColor: isBlue ? 0x54d6ff : 0xff5f90
      };
      child.hpBar = BossVisuals.attachMiniHpBar(child.frame, 34, -31);
      boss.spr.addChild(child.frame);
      return child;
    }

    function enterSplitPhase() {
      if (boss.phase === 2) return;
      boss.phase      = 2;
      boss.core.visible = false;
      boss.children   = [
        makeChild("blue", -120,  18),
        makeChild("red",   120, -14)
      ];
      Effects.emitPulse(boss.x, boss.y, 0xffd166, 90, 16);
      Effects.emitParticle(boss.x, boss.y, 0xff8fab, 16, 1.3);
      Effects.emitParticle(boss.x, boss.y, 0x7df9ff, 16, 1.3);
      boss.hp = boss.children.reduce((sum, c) => sum + c.hp, 0);
    }

    function removeDeadChildren() {
      boss.children = boss.children.filter((child) => {
        if (child.hp > 0) return true;
        if (child.frame && child.frame.parent) child.frame.parent.removeChild(child.frame);
        return false;
      });
    }

    function setRedState(child, next, duration) {
      child.state = next;
      child.stateTime = 0;
      child.stateDuration = duration;
      child.attackFxPlayed = false;
      if (next !== "CHARGE") child.dashTelegraphShown = false;
    }

    function chooseRedAttackPattern(child, distToPlayer) {
      if (distToPlayer > 170) return "FORWARD_SLASH";
      child.attackSide *= -1;
      return child.attackSide > 0 ? "LEFT_STEP_SLASH" : "RIGHT_STEP_SLASH";
    }

    function getRedSlashAngles(child) {
      if (child.attackPattern === "LEFT_STEP_SLASH") return { start: child.lockAngle - Math.PI * 1.05, end: child.lockAngle - Math.PI * 0.12 };
      if (child.attackPattern === "RIGHT_STEP_SLASH") return { start: child.lockAngle + Math.PI * 0.12, end: child.lockAngle + Math.PI * 1.05 };
      return { start: child.lockAngle - Math.PI * 0.75, end: child.lockAngle + Math.PI * 0.15 };
    }

    function updateRedKnightChild(child, dt, player, alone) {
      child.stateTime += dt;
      const angleToPlayer = Math.atan2(player.spr.y - child.y, player.spr.x - child.x);
      const distToPlayer = Math.hypot(player.spr.x - child.x, player.spr.y - child.y) || 1;
      const moveSpeed = alone ? 4.0 : 3.1;
      const targetDist = alone ? 136 : 154;
      const dashDistance = alone ? 220 : 190;

      if (child.state === "APPROACH") {
        if (distToPlayer > targetDist) {
          child.x += Math.cos(angleToPlayer) * moveSpeed * dt;
          child.y += Math.sin(angleToPlayer) * moveSpeed * dt;
        } else {
          child.x -= Math.cos(angleToPlayer) * moveSpeed * 0.22 * dt;
          child.y -= Math.sin(angleToPlayer) * moveSpeed * 0.22 * dt;
        }
        if (child.stateTime >= child.stateDuration || distToPlayer < targetDist + 10) setRedState(child, "STRAFE", alone ? 12 : 16);
      } else if (child.state === "STRAFE") {
        const side = Math.sin(performance.now() * 0.004 + child.pulse) > 0 ? 1 : -1;
        child.x += Math.cos(angleToPlayer + Math.PI / 2 * side) * moveSpeed * 0.75 * dt;
        child.y += Math.sin(angleToPlayer + Math.PI / 2 * side) * moveSpeed * 0.75 * dt;
        if (child.stateTime >= child.stateDuration) {
          child.lockAngle = angleToPlayer;
          child.attackPattern = chooseRedAttackPattern(child, distToPlayer);
          setRedState(child, "CHARGE", alone ? 9 : 12);
        }
      } else if (child.state === "CHARGE") {
        child.lockAngle = angleToPlayer;
        if (!child.dashTelegraphShown) {
          Effects.emitLineTelegraph(child.x, child.y, child.x + Math.cos(child.lockAngle) * dashDistance, child.y + Math.sin(child.lockAngle) * dashDistance, 0xff5f90, alone ? 10 : 12, 6);
          child.dashTelegraphShown = true;
        }
        if (child.stateTime >= child.stateDuration) setRedState(child, "ATTACK", alone ? 7 : 9);
      } else if (child.state === "ATTACK") {
        const attackProgress = Math.min(1, child.stateTime / Math.max(0.001, child.stateDuration));
        const stepDistance = dashDistance / Math.max(1, child.stateDuration);
        child.x += Math.cos(child.lockAngle) * stepDistance * dt;
        child.y += Math.sin(child.lockAngle) * stepDistance * dt;
        if (!child.attackFxPlayed && attackProgress >= 0.72) {
          child.attackFxPlayed = true;
          const slash = getRedSlashAngles(child);
          const arcX = child.x + Math.cos(child.lockAngle) * 34;
          const arcY = child.y + Math.sin(child.lockAngle) * 34;
          Effects.emitSlashArc(arcX, arcY, slash.start, slash.end, 0xffffff, 7, alone ? 52 : 46, 8);
          Effects.emitSlashArc(arcX - Math.cos(child.lockAngle) * 7, arcY - Math.sin(child.lockAngle) * 7, slash.start + 0.05, slash.end - 0.05, 0xff5f90, 6, alone ? 46 : 40, 5);
        }
        if (child.afterSlash <= 0) {
          child.afterSlash = alone ? 5 : 6;
          BossBullets.aimSpread(child.x, child.y, alone ? 1 : 0, {
            color: 0xff8fab,
            speed: alone ? 5.8 : 5.0,
            damage: alone ? 9 : 7,
            radius: 6
          });
        } else {
          child.afterSlash -= dt;
        }
        if (child.stateTime >= child.stateDuration) {
          child.afterSlash = 0;
          setRedState(child, "RECOVERY", alone ? 10 : 12);
        }
      } else if (child.state === "RECOVERY") {
        child.x -= Math.cos(angleToPlayer) * moveSpeed * 0.45 * dt;
        child.y -= Math.sin(angleToPlayer) * moveSpeed * 0.45 * dt;
        if (child.stateTime >= child.stateDuration) setRedState(child, "APPROACH", alone ? 18 : 22);
      }
    }

    boss.getHitCircles = () => {
      if (boss.phase === 1) return [{ x: boss.x, y: boss.y, radius: boss.r }];
      return boss.children.map((child) => ({ x: child.x, y: child.y, radius: child.r, child }));
    };

    boss.takeDamage = (damage, ctx = {}) => {
      if (boss.phase === 1) {
        boss.hp = Math.max(0, boss.hp - damage);
        if (boss.hp <= boss.maxHp * 0.5) enterSplitPhase();
        return true;
      }
      const target = (ctx.hitCircle && ctx.hitCircle.child) ? ctx.hitCircle.child : boss.children[0];
      if (!target) return false;
      target.hp = Math.max(0, target.hp - damage);
      removeDeadChildren();
      boss.hp = boss.children.reduce((sum, c) => sum + c.hp, 0);
      return true;
    };

    boss.updateBoss = (dt) => {
      const player = GameState.player;
      boss.phaseT += dt * 0.015;

      if (boss.phase === 1) {
        boss.x = Helpers.lerp(boss.x, GameState.app.renderer.width * 0.5 + Math.cos(boss.phaseT) * 90, 0.045 * dt);
        boss.y = Helpers.lerp(boss.y, 110 + Math.sin(boss.phaseT * 2) * 24, 0.045 * dt);
        boss.spr.x = boss.x;
        boss.spr.y = boss.y;

        boss.aiCd -= dt;
        const useRadial = (((performance.now() / 220) | 0) % 2) === 0;

        if (boss.aiCd <= 10 && boss.aiCd + dt > 10) {
          if (useRadial) {
            Effects.emitGroundTelegraph(boss.x, boss.y, 80, 0xffd166, 10);
          } else {
            const aim = Math.atan2(player.spr.y - boss.y, player.spr.x - boss.x);
            Effects.emitLineTelegraph(boss.x, boss.y, boss.x + Math.cos(aim) * 220, boss.y + Math.sin(aim) * 220, 0xff8fab, 10, 6);
          }
        }
        if (boss.aiCd <= 0) {
          if (useRadial) {
            BossBullets.radialBurst(boss.x, boss.y, 12, 5.4, 0xffd166, 8, boss.phaseT * 0.8, 7);
            boss.aiCd = 54;
          } else {
            BossBullets.aimSpread(boss.x, boss.y, 1, { color: 0xff8fab, speed: 6.4, damage: 9, radius: 8 });
            boss.aiCd = 32;
          }
        }
      } else {
        // 2페이즈: 자식 유닛 업데이트
        for (const child of boss.children) {
          child.pulse += dt * 0.018;

          if (child.role === "blue") {
            child.targetX = GameState.app.renderer.width * 0.36 + Math.cos(child.pulse) * 70;
            child.targetY = 148 + Math.sin(child.pulse * 2) * 30;
            child.x = Helpers.lerp(child.x, child.targetX, 0.06 * dt);
            child.y = Helpers.lerp(child.y, child.targetY, 0.06 * dt);

            child.fireCd -= dt;
            const alone = boss.children.length === 1;
            if (child.fireCd <= 10 && child.fireCd + dt > 10) {
              Effects.emitGroundTelegraph(child.x, child.y, alone ? 68 : 52, 0x7df9ff, 10);
            }
            if (child.fireCd <= 0) {
              BossBullets.radialBurst(child.x, child.y, alone ? 14 : 9, alone ? 6.4 : 5.5, 0x7df9ff, 8, child.pulse, 7);
              child.fireCd = alone ? 34 : 52;
            }
          } else {
            // red: 대시 추적
            updateRedKnightChild(child, dt, player, boss.children.length === 1);
          }

          child.frame.x = child.x - boss.x;
          child.frame.y = child.y - boss.y;
          BossVisuals.redrawMiniHpBar(child.hpBar, child.hp / child.maxHp, child.role === "blue" ? 0x7df9ff : 0xff8fab);
          BossVisuals.setFrameValue(child.frame, child.hp);
        }

        if (boss.children.length > 0) {
          boss.x = boss.children.reduce((sum, c) => sum + c.x, 0) / boss.children.length;
          boss.y = boss.children.reduce((sum, c) => sum + c.y, 0) / boss.children.length;
          boss.spr.x = boss.x;
          boss.spr.y = boss.y;
        }
      }

      BossVisuals.redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, boss.phase === 1 ? 0xffd166 : 0xff8fab);
      if (boss.core.visible) BossVisuals.setFrameValue(boss.core, boss.hp);
    };

    boss.onDefeat = () => {
      for (const child of boss.children) {
        Effects.emitParticle(child.x, child.y, child.glowColor, 16, 1.2);
      }
      Effects.emitPulse(boss.x, boss.y, 0xffffff, 120, 20);
      Effects.emitParticle(boss.x, boss.y, 0xffd166, 26, 1.8);
    };

    return boss;
  }

  // ───────────────────────────────────────────────────────────────────────────

  function createSummonerBoss() {
    const def  = getDefinition("summoner");
    const boss = createBaseBoss(def, { contactDamage: 13, collisionPush: 6.2 });

    boss.phase  = 1;
    boss.core   = BossVisuals.buildFrame({ radius: def.radius, code: def.code, bodyColor: 0x8a91ff, glowColor: 0x6e78ff });
    boss.hpBar  = BossVisuals.attachHpBar(boss.spr, 190);
    boss.spr.addChild(boss.core);
    boss.orbitT = Math.random() * Math.PI * 2;
    boss.aiCd   = 24;
    boss.minions = [];
    boss.totalSummons = 0;
    boss.maxSummons = 5;
    boss.phase2SummonBonusApplied = false;

    function createMinion(role, angle) {
      const isShooter = role === "shooter";
      const minion = {
        role,
        x:      boss.x + Math.cos(angle) * 52,
        y:      boss.y + Math.sin(angle) * 32,
        orbit:  angle,
        distX:  isShooter ? 76 : 58,
        distY:  isShooter ? 42 : 30,
        r:      isShooter ? 15 : 17,
        hp:     isShooter ? 18 : 24,
        maxHp:  isShooter ? 18 : 24,
        fireCd: isShooter ? 28 : 0,
        dashCd: isShooter ? 0  : 46,
        dashTelegraphShown: false,
        frame: BossVisuals.buildFrame({
          radius:    isShooter ? 15 : 17,
          code:      isShooter ? "S" : "C",
          bodyColor: isShooter ? 0xd8dcff : 0xff8be4,
          glowColor: isShooter ? 0xa2a8ff : 0xd85cf0
        }),
        hpBar:     null,
        glowColor: isShooter ? 0xa2a8ff : 0xd85cf0
      };
      minion.hpBar = BossVisuals.attachMiniHpBar(minion.frame, 28, -24);
      boss.spr.addChild(minion.frame);
      return minion;
    }

    function pruneMinions() {
      boss.minions = boss.minions.filter((minion) => {
        if (minion.hp > 0) return true;
        if (minion.frame && minion.frame.parent) minion.frame.parent.removeChild(minion.frame);
        return false;
      });
    }

    function spawnWave() {
      const limit = boss.phase === 1 ? 2 : 3;
      if (boss.minions.length >= limit || boss.totalSummons >= boss.maxSummons) return false;
      const missing = Math.min(limit - boss.minions.length, boss.maxSummons - boss.totalSummons);
      const roles   = boss.phase === 1 ? ["shooter", "chaser"] : ["shooter", "chaser", "shooter"];
      for (let i = 0; i < missing; i++) {
        const role  = roles[(boss.minions.length + i) % roles.length];
        const angle = boss.orbitT + (Math.PI * 2 * (i + 1)) / (missing + 1);
        boss.minions.push(createMinion(role, angle));
        boss.totalSummons += 1;
      }
      Effects.emitPulse(boss.x, boss.y, boss.phase === 1 ? 0xa2a8ff : 0xff6bd6, 64, 12);
      Effects.emitParticle(boss.x, boss.y, boss.phase === 1 ? 0xa2a8ff : 0xff6bd6, 16, 1.1);
      return true;
    }

    function checkPhaseTransition() {
      if (boss.hp <= boss.maxHp * 0.5) boss.phase = 2;
      if (boss.phase === 2 && !boss.phase2SummonBonusApplied) {
        boss.phase2SummonBonusApplied = true;
        boss.maxSummons += 2;
      }
    }

    function fireShooterLaser(minion, aim) {
      const color = boss.phase === 1 ? 0xd8dcff : 0xffd6fa;
      const speed = boss.phase === 1 ? 8.8 : 9.8;
      const damage = boss.phase === 1 ? 6 : 7;
      const spacing = 18;
      for (let i = 0; i < 4; i++) {
        const ox = Math.cos(aim) * spacing * i;
        const oy = Math.sin(aim) * spacing * i;
        GameState.enemyBullets.push(BossBullets.make(minion.x + ox, minion.y + oy, aim, {
          color,
          speed: speed + i * 0.2,
          damage,
          radius: 7 + (i > 1 ? 1 : 0),
          life: 90,
          scaleX: 1.2,
          scaleY: 1.45
        }));
      }
      Effects.emitPulse(minion.x, minion.y, color, 24, 8);
    }

    boss.getHitCircles = () => {
      const circles = [{ x: boss.x, y: boss.y, radius: boss.r, bossCore: true }];
      for (const minion of boss.minions) {
        circles.push({ x: minion.x, y: minion.y, radius: minion.r, minion });
      }
      return circles;
    };

    boss.takeDamage = (damage, ctx = {}) => {
      if (ctx.hitCircle && ctx.hitCircle.minion) {
        ctx.hitCircle.minion.hp = Math.max(0, ctx.hitCircle.minion.hp - damage);
        pruneMinions();
        checkPhaseTransition(); // ← 미니언 피격시에도 페이즈 체크는 boss.hp 기준으로만
        return true;
      }
      if (boss.minions.length > 0) return false; // 미니언 살아있으면 코어 무적
      boss.hp = Math.max(0, boss.hp - damage);
      checkPhaseTransition();
      return true;
    };

    boss.onDefeat = () => {
      for (const minion of boss.minions) {
        Effects.emitParticle(minion.x, minion.y, minion.glowColor, 12, 1.0);
      }
      Effects.emitPulse(boss.x, boss.y, 0xffffff, 120, 20);
      Effects.emitParticle(boss.x, boss.y, 0xa2a8ff, 30, 1.7);
      Effects.emitParticle(boss.x, boss.y, 0xff6bd6, 18, 1.3);
    };

    boss.updateBoss = (dt) => {
      const player = GameState.player;
      boss.orbitT += dt * (boss.phase === 1 ? 0.011 : 0.016);

      const targetX = GameState.app.renderer.width * 0.5 + Math.cos(boss.orbitT) * (boss.phase === 1 ? 84 : 132);
      const targetY = 110 + Math.sin(boss.orbitT * 2) * (boss.phase === 1 ? 20 : 30);
      boss.x = Helpers.lerp(boss.x, targetX, 0.05 * dt);
      boss.y = Helpers.lerp(boss.y, targetY, 0.05 * dt);
      boss.spr.x = boss.x;
      boss.spr.y = boss.y;

      boss.aiCd -= dt;
      if (boss.aiCd <= 14 && boss.aiCd + dt > 14) {
        if (boss.minions.length < (boss.phase === 1 ? 2 : 3) && boss.totalSummons < boss.maxSummons) {
          Effects.emitGroundTelegraph(boss.x, boss.y, boss.phase === 1 ? 56 : 68, boss.phase === 1 ? 0xa2a8ff : 0xff6bd6, 14);
        } else {
          const aim = Math.atan2(player.spr.y - boss.y, player.spr.x - boss.x);
          Effects.emitLineTelegraph(boss.x, boss.y, boss.x + Math.cos(aim) * (boss.phase === 1 ? 420 : 520), boss.y + Math.sin(aim) * (boss.phase === 1 ? 420 : 520), boss.phase === 1 ? 0xa2a8ff : 0xff6bd6, 14, 6);
        }
      }
      if (boss.aiCd <= 0) {
        const didSummon = spawnWave();
        if (!didSummon) {
          const shotCount = boss.phase === 1 ? 3 : 5;
          BossBullets.aimSpread(boss.x, boss.y, Math.floor(shotCount / 2), {
            color:  boss.phase === 1 ? 0xa2a8ff : 0xff6bd6,
            speed:  boss.phase === 1 ? 7.8 : 8.6,
            damage: boss.phase === 1 ? 8   : 9,
            radius: 8,
            life: boss.phase === 1 ? 210 : 240
          });
        }
        boss.aiCd = didSummon ? (boss.phase === 1 ? 72 : 58) : (boss.phase === 1 ? 34 : 28);
      }

      // 미니언 업데이트
      for (const minion of boss.minions) {
        minion.orbit += dt * (minion.role === "shooter" ? 0.02 : 0.028);
        const orbitX  = Math.cos(minion.orbit) * minion.distX;
        const orbitY  = Math.sin(minion.orbit * 1.3) * minion.distY;

        if (minion.role === "shooter") {
          minion.x = boss.x + orbitX;
          minion.y = boss.y + orbitY;
          minion.fireCd -= dt;
          if (minion.fireCd <= 10 && minion.fireCd + dt > 10) {
            const aim = Math.atan2(player.spr.y - minion.y, player.spr.x - minion.x);
            Effects.emitLineTelegraph(minion.x, minion.y, minion.x + Math.cos(aim) * 240, minion.y + Math.sin(aim) * 240, boss.phase === 1 ? 0xd8dcff : 0xffd6fa, 10, 5);
          }
          if (minion.fireCd <= 0) {
            const aim = Math.atan2(player.spr.y - minion.y, player.spr.x - minion.x);
            fireShooterLaser(minion, aim);
            minion.fireCd = boss.phase === 1 ? 32 : 24;
          }
        } else {
          // chaser 미니언
          minion.dashCd -= dt;
          if (!minion.dashTelegraphShown && minion.dashCd <= 12) {
            const angle = Math.atan2(player.spr.y - minion.y, player.spr.x - minion.x);
            Effects.emitLineTelegraph(minion.x, minion.y, minion.x + Math.cos(angle) * 140, minion.y + Math.sin(angle) * 140, 0xd85cf0, 12, 5);
            minion.dashTelegraphShown = true;
          }
          if (minion.dashCd <= 0) {
            const angle = Math.atan2(player.spr.y - minion.y, player.spr.x - minion.x);
            minion.x += Math.cos(angle) * (boss.phase === 1 ? 46 : 70);
            minion.y += Math.sin(angle) * (boss.phase === 1 ? 46 : 70);
            Effects.emitPulse(minion.x, minion.y, 0xd85cf0, 28, 8);
            minion.dashCd = boss.phase === 1 ? 38 : 28;
            minion.dashTelegraphShown = false;
          } else {
            minion.x = boss.x + orbitX * 0.8 + Math.cos(minion.orbit * 2.2) * 24;
            minion.y = boss.y + orbitY * 0.8 + Math.sin(minion.orbit * 1.7) * 18;
          }
        }

        minion.frame.x     = minion.x - boss.x;
        minion.frame.y     = minion.y - boss.y;
        minion.frame.alpha = minion.hp / minion.maxHp;
        BossVisuals.redrawMiniHpBar(minion.hpBar, minion.hp / minion.maxHp, minion.role === "shooter" ? 0xd8dcff : 0xff8be4);
        BossVisuals.setFrameValue(minion.frame, minion.hp);
      }

      boss.core.alpha = boss.minions.length > 0 ? 0.58 : 1;
      boss.core.scale.set(1 + Math.sin(performance.now() * 0.01) * 0.03);
      BossVisuals.redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, boss.phase === 1 ? 0x8a91ff : 0xff8be4);
      BossVisuals.setFrameValue(boss.core, boss.hp);
    };

    return boss;
  }

  // ───────────────────────────────────────────────────────────────────────────

  function createKnightBoss() {
    const def  = getDefinition("knight");
    const boss = createBaseBoss(def, { contactDamage: 18, collisionPush: 8.8 });

    boss.phase   = 1;
    boss.core    = BossVisuals.buildFrame({ radius: def.radius, code: def.code, bodyColor: 0x7a5cff, glowColor: 0x9a7dff });
    boss.blade   = new PIXI.Graphics();
    boss.hpBar   = BossVisuals.attachHpBar(boss.spr, 190);
    boss.spr.addChild(boss.core, boss.blade);

    boss.state              = "APPROACH";
    boss.stateTime          = 0;
    boss.stateDuration      = 34;
    boss.lockAngle          = 0;
    boss.attackPattern      = "FORWARD_SLASH";
    boss.attackSide         = 1;
    boss.afterSlash         = 0;
    boss.attackFxPlayed     = false;
    boss.dashTelegraphShown = false;

    function setState(next, duration) {
      boss.state              = next;
      boss.stateTime          = 0;
      boss.stateDuration      = duration;
      boss.attackFxPlayed     = false;
      if (next !== "CHARGE") boss.dashTelegraphShown = false;
    }

    function chooseAttackPattern(distToPlayer) {
      if (distToPlayer > (boss.phase === 1 ? 165 : 185)) return "FORWARD_SLASH";
      boss.attackSide *= -1;
      return boss.attackSide > 0 ? "LEFT_STEP_SLASH" : "RIGHT_STEP_SLASH";
    }

    function getSlashAngles() {
      if (boss.attackPattern === "LEFT_STEP_SLASH")  return { start: boss.lockAngle - Math.PI * 1.05, end: boss.lockAngle - Math.PI * 0.12 };
      if (boss.attackPattern === "RIGHT_STEP_SLASH") return { start: boss.lockAngle + Math.PI * 0.12, end: boss.lockAngle + Math.PI * 1.05 };
      return { start: boss.lockAngle - Math.PI * 0.75, end: boss.lockAngle + Math.PI * 0.15 };
    }

    function drawBlade() {
      boss.blade.clear();
      if (!(boss.state === "CHARGE" || boss.state === "ATTACK")) return;

      const facing  = boss.lockAngle || 0;
      let bladeLen  = boss.state === "CHARGE" ? 28 + Math.sin(boss.stateTime * 0.4) * 6 : 48;
      if (boss.phase === 2) bladeLen += 6;

      let bladeAngle = boss.state === "CHARGE"
        ? facing + 0.55
        : facing - 0.2 + Math.sin(boss.stateTime * 0.5) * 0.28;
      if (boss.attackPattern === "LEFT_STEP_SLASH") {
        bladeAngle = boss.state === "CHARGE" ? facing - 0.9 : facing - 0.95 + Math.sin(boss.stateTime * 0.55) * 0.16;
      } else if (boss.attackPattern === "RIGHT_STEP_SLASH") {
        bladeAngle = boss.state === "CHARGE" ? facing + 0.9 : facing + 0.95 - Math.sin(boss.stateTime * 0.55) * 0.16;
      }

      const bladeX1 = Math.cos(bladeAngle) * 10;
      const bladeY1 = Math.sin(bladeAngle) * 10;
      const bladeX2 = bladeX1 + Math.cos(bladeAngle) * bladeLen;
      const bladeY2 = bladeY1 + Math.sin(bladeAngle) * bladeLen;
      const glowColor = boss.phase === 1 ? 0x7df9ff : 0xff8be4;

      boss.blade.lineStyle(10, glowColor, 0.22); boss.blade.moveTo(bladeX1, bladeY1); boss.blade.lineTo(bladeX2, bladeY2);
      boss.blade.lineStyle(6,  glowColor, 0.92); boss.blade.moveTo(bladeX1, bladeY1); boss.blade.lineTo(bladeX2, bladeY2);
      boss.blade.lineStyle(2,  0xffffff,  0.96); boss.blade.moveTo(bladeX1, bladeY1); boss.blade.lineTo(bladeX2, bladeY2);
      boss.blade.beginFill(0xffffff, 0.95);
      boss.blade.drawCircle(bladeX2, bladeY2, 3);
      boss.blade.endFill();
    }

    boss.updateBoss = (dt) => {
      const player = GameState.player;
      boss.stateTime += dt;
      if (boss.hp <= boss.maxHp * 0.5) boss.phase = 2;

      const angleToPlayer = Math.atan2(player.spr.y - boss.y, player.spr.x - boss.x);
      const distToPlayer  = Math.hypot(player.spr.x - boss.x, player.spr.y - boss.y) || 1;
      const moveSpeed     = boss.phase === 1 ? 3.2 : 4.1;

      if (boss.state === "APPROACH") {
        const targetDist = boss.phase === 1 ? 170 : 145;
        if (distToPlayer > targetDist) {
          boss.x += Math.cos(angleToPlayer) * moveSpeed * dt;
          boss.y += Math.sin(angleToPlayer) * moveSpeed * dt;
        } else {
          boss.x -= Math.cos(angleToPlayer) * moveSpeed * 0.22 * dt;
          boss.y -= Math.sin(angleToPlayer) * moveSpeed * 0.22 * dt;
        }
        if (boss.stateTime >= boss.stateDuration || distToPlayer < targetDist + 20) {
          setState("STRAFE", boss.phase === 1 ? 24 : 18);
        }

      } else if (boss.state === "STRAFE") {
        const side = Math.sin(performance.now() * 0.004) > 0 ? 1 : -1;
        boss.x += Math.cos(angleToPlayer + Math.PI / 2 * side) * moveSpeed * 0.85 * dt;
        boss.y += Math.sin(angleToPlayer + Math.PI / 2 * side) * moveSpeed * 0.85 * dt;
        if (boss.stateTime >= boss.stateDuration) {
          boss.lockAngle    = angleToPlayer;
          boss.attackPattern = chooseAttackPattern(distToPlayer);
          setState("CHARGE", boss.phase === 1 ? 14 : 10);
        }

      } else if (boss.state === "CHARGE") {
        boss.lockAngle = angleToPlayer;
        if (!boss.dashTelegraphShown) {
          Effects.emitLineTelegraph(boss.x, boss.y, boss.x + Math.cos(boss.lockAngle) * 240, boss.y + Math.sin(boss.lockAngle) * 240, boss.phase === 1 ? 0x7df9ff : 0xff8be4, boss.phase === 1 ? 14 : 10, 7);
          boss.dashTelegraphShown = true;
        }
        if (boss.stateTime >= boss.stateDuration) setState("ATTACK", boss.phase === 1 ? 10 : 8);

      } else if (boss.state === "ATTACK") {
        boss.x += Math.cos(boss.lockAngle) * (boss.phase === 1 ? 16 : 20) * dt;
        boss.y += Math.sin(boss.lockAngle) * (boss.phase === 1 ? 16 : 20) * dt;

        if (!boss.attackFxPlayed) {
          boss.attackFxPlayed = true;
          const arcRadius = boss.phase === 1 ? 60 : 68;
          const accent    = boss.phase === 1 ? 0x7df9ff : 0xff8be4;
          const slash     = getSlashAngles();
          const arcX = boss.x + Math.cos(boss.lockAngle) * 32;
          const arcY = boss.y + Math.sin(boss.lockAngle) * 32;
          Effects.emitSlashArc(arcX, arcY, slash.start, slash.end, 0xffffff, 9, arcRadius, 8);
          Effects.emitSlashArc(arcX - Math.cos(boss.lockAngle) * 8, arcY - Math.sin(boss.lockAngle) * 8, slash.start + 0.06, slash.end - 0.06, accent, 8, arcRadius - 6, 5);
        }

        // 슬래시 탄환: afterSlash가 0 이하일 때만 1회 발사 후 쿨 설정
        if (boss.afterSlash <= 0) {
          boss.afterSlash = boss.phase === 1 ? 4 : 3;
          const spread = boss.phase === 1 ? 1 : 3;
          BossBullets.aimSpread(boss.x, boss.y, spread, {
            color:  boss.phase === 1 ? 0x7df9ff : 0xff8be4,
            speed:  boss.phase === 1 ? 5.6 : 6.4,
            damage: boss.phase === 1 ? 8   : 10,
            radius: 7
          });
          Effects.emitPulse(boss.x, boss.y, boss.phase === 1 ? 0x7df9ff : 0xff8be4, boss.phase === 1 ? 34 : 42, 8);
        } else {
          boss.afterSlash -= dt;
        }

        if (boss.stateTime >= boss.stateDuration) {
          boss.afterSlash = 0;
          setState("RECOVERY", boss.phase === 1 ? 16 : 12);
        }

      } else if (boss.state === "RECOVERY") {
        boss.x -= Math.cos(angleToPlayer) * moveSpeed * 0.55 * dt;
        boss.y -= Math.sin(angleToPlayer) * moveSpeed * 0.55 * dt;
        if (boss.stateTime >= boss.stateDuration) setState("APPROACH", boss.phase === 1 ? 28 : 20);
      }

      boss.x = Helpers.clamp(boss.x, 28, GameState.app.renderer.width - 28);
      boss.y = Helpers.clamp(boss.y, 44, GameState.app.renderer.height - 40);
      boss.spr.x = boss.x;
      boss.spr.y = boss.y;

      const glowColor = boss.state === "ATTACK" || boss.state === "CHARGE"
        ? (boss.phase === 1 ? 0x7df9ff : 0xff9be8)
        : (boss.phase === 1 ? 0x9a7dff : 0xff6bd6);

      boss.core.codeText.text = def.code;
      BossVisuals.redrawHpBar(boss.hpBar, boss.hp / boss.maxHp, glowColor);
      BossVisuals.setFrameValue(boss.core, boss.hp);
      boss.core.scale.set(1 + Math.sin(performance.now() * 0.02) * 0.02);
      boss.core.alpha = boss.state === "RECOVERY" ? 0.82 : 1;
      drawBlade();
    };

    boss.onDefeat = () => {
      Effects.emitPulse(boss.x, boss.y, 0xffffff, 140, 22);
      Effects.emitParticle(boss.x, boss.y, 0x9a7dff, 28, 1.8);
      Effects.emitParticle(boss.x, boss.y, 0xff8be4, 24, 1.5);
    };

    return boss;
  }

  // ─── 팩토리 레지스트리 ─────────────────────────────────────────────────────

  const factories = {
    basic:    createBasicBoss,
    advanced: createAdvancedBoss,
    knight:   createKnightBoss,
    split:    createSplitBoss,
    summoner: createSummonerBoss
  };

  // ─── 스폰 API ──────────────────────────────────────────────────────────────

  function spawnBoss(id, options = {}) {
    const factory = factories[id];
    if (!factory) return null;
    if (options.replaceExisting !== false) clearCurrentArena();
    const boss = factory();
    GameState.enemies.push(boss);
    GameState.progression.waveAlive    = 1;
    GameState.progression.spawnedCount = 1;
    UI.triggerBossWarning();
    UI.hudUpdate();
    return boss;
  }

  function spawnSelectedPracticeBoss() {
    if (!GameState.stats.practice) return null;
    return spawnBoss(getPracticeBossId(), { replaceExisting: true });
  }

  function spawnWaveBoss(wave = GameState.progression.wave) {
    return spawnBoss(getWaveBossId(wave), { replaceExisting: false });
  }

  function spawnStageBoss(stage = GameState.progression.stage || 1) {
    return spawnBoss(getStageBossId(stage), { replaceExisting: true });
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  return {
    getActiveBoss,
    getDefinitions,
    getDefinition,
    getPracticeBossId,
    setPracticeBossId,
    hasActiveBoss,
    isBossWave,
    getWaveBossId,
    getStageBossId,
    shouldSuppressPracticeSpawns,
    shouldSuppressEnemySpawns,
    spawnBoss,
    spawnSelectedPracticeBoss,
    spawnWaveBoss,
    spawnStageBoss
  };
})();
