window.ActiveSkillSystem = (() => {
  function getDefinition(skillId){
    return ACTIVE_SKILL_DEFINITIONS.find(skill => skill.id === skillId) || null;
  }

  function getSlotByKey(code){
    return GameState.activeSkillState.slots.find(slot => slot.key === code) || null;
  }

  function getSlotSkill(slot){
    return slot && slot.skillId ? getDefinition(slot.skillId) : null;
  }

  function assignStartingLoadout(){
    const slots = GameState.activeSkillState.slots;
    const loadout = (GAME_BALANCE.TEST && GAME_BALANCE.TEST.STARTING_ACTIVE_SKILLS) || [];
    for (let i=0; i<slots.length; i++){
      slots[i].skillId = loadout[i] || null;
      slots[i].cooldown = 0;
      slots[i].autoCast = false;
    }
  }

  function canUseSlot(slot){
    if (!slot) return { ok:false, reason:"invalid" };
    const skill = getSlotSkill(slot);
    if (!skill) return { ok:false, reason:"empty" };
    if (slot.cooldown > 0) return { ok:false, reason:"cooldown", skill };
    if (GameState.stats.mp < skill.mpCost) return { ok:false, reason:"mp", skill };
    if (GameState.progression.waveState !== "running") return { ok:false, reason:"paused", skill };
    return { ok:true, skill };
  }

  function tryUseSlotByKey(code){
    return tryUseSlot(getSlotByKey(code));
  }

  function tryUseSlot(slot){
    const check = canUseSlot(slot);
    if (!check.ok){
      if (slot && check.reason === "mp") UI.flashActiveSlot(slot.key, "mp");
      return false;
    }

    const { skill } = check;
    let casted = false;
    if (skill.id === "decoy_drone") casted = castDecoyDrone(skill);
    if (skill.id === "boost") casted = castBoost(skill);
    if (skill.id === "afterburner") casted = castAfterburner(skill);
    if (!casted) return false;

    GameState.stats.mp = Math.max(0, GameState.stats.mp - skill.mpCost);
    slot.cooldown = skill.cooldown;
    UI.flashActiveSlot(slot.key, "cast");
    return true;
  }

  function castDecoyDrone(skill){
    const S = GameState;
    const angle = Math.atan2(S.mouse.y - S.player.spr.y, S.mouse.x - S.player.spr.x);
    const spawnX = S.player.spr.x + Math.cos(angle) * 40;
    const spawnY = S.player.spr.y + Math.sin(angle) * 40;

    const c = new PIXI.Container();
    const body = new PIXI.Graphics();
    body.beginFill(0x10162a, 1);
    body.lineStyle(2, 0xffd27a, 0.95);
    body.drawPolygon([ 0,-11, 9,8, 0,4, -9,8 ]);
    body.endFill();

    const core = new PIXI.Graphics();
    core.beginFill(0xffd27a, 0.9);
    core.drawCircle(0, 1, 3);
    core.endFill();

    c.addChild(body, core);
    c.x = spawnX;
    c.y = spawnY;
    c.rotation = angle + Math.PI / 2;
    S.uiLayer.addChild(c);

    S.decoys.push({
      spr: c,
      x: spawnX,
      y: spawnY,
      r: 12,
      hp: skill.effectData.hp,
      life: skill.duration,
      angle
    });

    Effects.emitParticle(spawnX, spawnY, 0xffd27a, 16, 1.1);
    Effects.emitPulse(spawnX, spawnY, 0xffd27a, 48, 14);
    return true;
  }

  function castBoost(skill){
    const S = GameState;
    const p = S.player;
    const angle = Math.atan2(S.mouse.y - p.spr.y, S.mouse.x - p.spr.x);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    p.vx += dx * skill.effectData.speed;
    p.vy += dy * skill.effectData.speed;
    p.inv = Math.max(p.inv, skill.effectData.invulnerability);
    S.activeSkillState.boostT = Math.max(S.activeSkillState.boostT, skill.duration);

    const backX = p.spr.x - dx * 18;
    const backY = p.spr.y - dy * 18;
    Effects.emitParticle(backX, backY, 0x8be9ff, 7, 0.75);
    return true;
  }

  function castAfterburner(skill){
    const S = GameState;
    S.activeSkillState.afterburnerT = Math.max(S.activeSkillState.afterburnerT, skill.duration);
    Effects.emitParticle(S.player.spr.x, S.player.spr.y, 0xff7a47, 20, 1.5);
    Effects.emitPulse(S.player.spr.x, S.player.spr.y, 0xff7a47, 92, 18);
    return true;
  }

  function updateDecoys(dt){
    const S = GameState;
    for (let i=S.decoys.length-1; i>=0; i--){
      const d = S.decoys[i];
      d.life -= dt;
      d.spr.rotation += 0.02 * dt;
      d.spr.alpha = 0.78 + Math.sin(performance.now() / 180 + i) * 0.18;
      if (d.life <= 0 || d.hp <= 0){
        Effects.emitParticle(d.x, d.y, 0xffd27a, 14, 1.0);
        S.uiLayer.removeChild(d.spr);
        S.decoys.splice(i, 1);
      }
    }
  }

  function update(dt){
    const S = GameState;
    for (const slot of S.activeSkillState.slots){
      if (slot.cooldown > 0) slot.cooldown = Math.max(0, slot.cooldown - dt);
    }

    if (S.activeSkillState.boostT > 0){
      S.activeSkillState.boostT = Math.max(0, S.activeSkillState.boostT - dt);
      if ((performance.now() | 0) % 3 === 0){
        const ang = S.player.spr.rotation - Math.PI / 2;
        const p = Effects.makeTrailSprite(
          S.player.spr.x - Math.cos(ang) * 16 + Helpers.rand(-2, 2),
          S.player.spr.y - Math.sin(ang) * 16 + Helpers.rand(-2, 2),
          0x8be9ff,
          Helpers.rand(0.12, 0.2),
          0.18
        );
        S.fx.addChild(p);
        S.particles.push({
          spr:p,
          x:p.x,
          y:p.y,
          vx:Helpers.rand(-0.3, 0.3) - Math.cos(ang) * 0.6,
          vy:Helpers.rand(-0.3, 0.3) - Math.sin(ang) * 0.6,
          life:10,
          drag:0.84
        });
      }
    }

    if (S.activeSkillState.afterburnerT > 0){
      S.activeSkillState.afterburnerT = Math.max(0, S.activeSkillState.afterburnerT - dt);
      if ((performance.now() | 0) % 3 === 0){
        const p = Effects.makeTrailSprite(S.player.spr.x, S.player.spr.y + 14, 0xff7a47, Helpers.rand(0.25, 0.45), 0.28);
        S.fx.addChild(p);
        S.particles.push({ spr:p, x:p.x, y:p.y, vx:Helpers.rand(-0.6, 0.6), vy:Helpers.rand(0.8, 2.2), life:14, drag:0.88 });
      }
    }

    updateDecoys(dt);
  }

  return {
    getDefinition,
    getSlotSkill,
    assignStartingLoadout,
    tryUseSlotByKey,
    update
  };
})();
