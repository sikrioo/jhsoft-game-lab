(function() {
  const { canvas, ctx, bullets, hazards, projectiles, playerBullets, effects, texts, Utils, drawText, Player } = window.ShootingGameCore;
  const { BossRegistry, createBoss } = window.ShootingBosses;

const bossSelect = document.getElementById("bossSelect");
  const phaseSelect = document.getElementById("phaseSelect");
  const applySelectionBtn = document.getElementById("applySelection");
  const resetSelectionBtn = document.getElementById("resetSelection");

  let player;
  let boss;
  let selectedBossType = "basic";
  let selectedStartPhase = "auto";

  function getPhaseOptions(type) {
    const definition = BossRegistry[type];
    const options = [{ value: "auto", label: "Auto" }];
    for (let i = 1; i <= definition.phases.length; i++) {
      options.push({ value: String(i), label: `Phase ${i}` });
    }
    return options;
  }

  function syncPhaseSelect(type, selectedValue = "auto") {
    const options = getPhaseOptions(type);
    phaseSelect.innerHTML = options.map(option => `<option value="${option.value}">${option.label}</option>`).join("");
    phaseSelect.value = options.some(option => option.value === selectedValue) ? selectedValue : "auto";
  }

  function populateBossSelect() {
    const entries = Object.values(BossRegistry);
    bossSelect.innerHTML = entries.map(entry => `<option value="${entry.id}">${entry.label} (${entry.code})</option>`).join("");
    bossSelect.value = selectedBossType;
    syncPhaseSelect(selectedBossType, selectedStartPhase);
  }

  function resetGame(type = selectedBossType, startPhase = selectedStartPhase) {
    selectedBossType = type;
    selectedStartPhase = startPhase;
    bullets.length = 0;
    hazards.length = 0;
    projectiles.length = 0;
    playerBullets.length = 0;
    effects.length = 0;
    texts.length = 0;
    player = new Player(canvas.width * 0.5, canvas.height * 0.82);
    boss = createBoss(type, player, startPhase);
    bossSelect.value = selectedBossType;
    syncPhaseSelect(selectedBossType, selectedStartPhase);
  }

  bossSelect.addEventListener("change", () => {
    selectedBossType = bossSelect.value;
    syncPhaseSelect(selectedBossType, phaseSelect.value);
  });

  applySelectionBtn.addEventListener("click", () => {
    resetGame(bossSelect.value, phaseSelect.value);
  });

  resetSelectionBtn.addEventListener("click", () => {
    resetGame(selectedBossType, selectedStartPhase);
  });

  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "1") resetGame("basic");
    if (k === "2") resetGame("advanced");
    if (k === "3") resetGame("knight");
    if (k === "4") resetGame("summoner");
    if (k === "5") resetGame("split");
    if (k === "p" && boss && typeof boss.forcePhase2 === "function") boss.forcePhase2();
    if (k === "r") resetGame(selectedBossType);
    if (k === "h" && boss) {
      boss.hp = Math.max(0, boss.hp - boss.maxHp * 0.1);
      texts.push(new FloatText("Boss HP -10%", boss.x, boss.y - 46, "#ffd166"));
    }
  });

  function updateList(arr, dt, extra) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const alive = extra ? arr[i].update(dt, extra) : arr[i].update(dt);
      if (!alive) arr.splice(i, 1);
    }
  }

  function drawArena() {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = boss && boss.type === "knight" && boss.phase === 2 ? "#4d2347" : boss && boss.type === "summoner" ? "#3a2d72" : boss && boss.type === "split" && boss.phase === 2 ? "#3b2f5f" : "#2b3e72";
    ctx.lineWidth = 1;
    const grid = 40;
    for (let x = 0; x < canvas.width; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
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

  function drawPanel() {
    drawBar(20, 20, 240, 18, player.hp / 100, "#66f2ff");
    drawText("Player HP", 20, 14, "#fff", 14);

    const bossColors = boss.definition.colors(boss);
    drawBar(20, 50, 240, 18, boss.hp / boss.maxHp, bossColors.glow);
    drawText("Boss HP", 20, 44, "#fff", 14);

    drawText(`Boss Type: ${boss.definition.label}`, 20, 92, "#fff", 14);
    drawText(`Phase: ${boss.phase}`, 20, 114, "#fff", 14);
    drawText(`Current Pattern: ${boss.stateText}`, 20, 136, "#fff", 14);
    drawText(`Minions: ${boss.minions?.length || 0}`, 20, 158, boss.isInvulnerable?.() ? "#a2a8ff" : "#dce7ff", 14);

    ctx.save();
    ctx.fillStyle = "rgba(4,8,20,0.62)";
    ctx.fillRect(canvas.width - 420, 18, 400, 258);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.strokeRect(canvas.width - 420, 18, 400, 258);
    ctx.restore();

    drawText("패턴 / AI 설명", canvas.width - 398, 44, "#fff", 16);
    const lines = boss.definition.panel(boss);
    for (let i = 0; i < lines.length; i++) {
      drawText(lines[i], canvas.width - 398, 76 + i * 28, "#dce7ff", 14);
    }

    drawText("구조: PatternLibrary + BossTunings + Base/Pattern/StateMachine/Split Runtime", canvas.width - 398, 232, "#9ecbff", 13);
    drawText("조건형 AI + 데이터 기반 보스 튜닝 테스트", canvas.width - 398, 254, "#9ecbff", 13);

    drawText("우측 상단 패널에서 보스 / 시작 페이즈 선택 가능", 20, canvas.height - 118, "#9ecbff", 13);
    drawText("이동: WASD / 방향키", 20, canvas.height - 96, "#fff", 14);
    drawText("대시: Shift 또는 Space", 20, canvas.height - 74, "#fff", 14);
    drawText("발사: J / Z / Enter", 20, canvas.height - 52, "#fff", 14);
    drawText("1: 기본형  2: 강화형  3: 기사형  4: 소환사형  5: 분열형  P: 2페이즈  H: 보스HP -10%  R: 리셋", 20, canvas.height - 30, "#fff", 14);
  }

  function handlePlayerBulletCollisions() {
    for (let i = playerBullets.length - 1; i >= 0; i--) {
      const shot = playerBullets[i];
      let hit = false;
      for (let j = boss.minions.length - 1; j >= 0; j--) {
        const minion = boss.minions[j];
        if (Utils.dist(shot.x, shot.y, minion.x, minion.y) <= shot.radius + minion.radius) {
          minion.damage(shot.damage);
          playerBullets.splice(i, 1);
          hit = true;
          break;
        }
      }
      if (hit) continue;

      const hitCircles = typeof boss.getHitCircles === "function"
        ? boss.getHitCircles()
        : [{ x: boss.x, y: boss.y, radius: boss.radius }];

      for (const circle of hitCircles) {
        if (Utils.dist(shot.x, shot.y, circle.x, circle.y) <= shot.radius + circle.radius) {
          boss.damage(shot.damage, circle);
          playerBullets.splice(i, 1);
          hit = true;
          break;
        }
      }
    }
  }

  populateBossSelect();
  resetGame("basic", "auto");

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;

    player.update(dt);
    boss.update(dt);
    updateList(bullets, dt, player);
    updateList(hazards, dt, player);
    updateList(projectiles, dt, player);
    updateList(playerBullets, dt);
    handlePlayerBulletCollisions();
    updateList(effects, dt);
    updateList(texts, dt);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawArena();
    for (const h of hazards) h.draw();
    for (const b of bullets) b.draw();
    for (const p of projectiles) p.draw();
    for (const pb of playerBullets) pb.draw();
    for (const e of effects) e.draw();
    if (boss.drawMinions) boss.drawMinions();
    boss.draw();
    player.draw();
    for (const t of texts) t.draw();
    drawPanel();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
