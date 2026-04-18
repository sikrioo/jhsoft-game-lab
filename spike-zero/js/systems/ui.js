window.UI = (() => {
  const $score = document.getElementById("score");
  const $stage = document.getElementById("stage");
  const $stageTime = document.getElementById("stageTime");
  const $wave = document.getElementById("wave");
  const $level = document.getElementById("level");
  const $xp = document.getElementById("xp");
  const $hp = document.getElementById("hp");
  const $mp = document.getElementById("mp");
  const $speed = document.getElementById("speed");
  const $shield = document.getElementById("shield");
  const $atk = document.getElementById("atk");
  const $def = document.getElementById("def");
  const $fireRate = document.getElementById("fireRate");
  const $shots = document.getElementById("shots");
  const $pierce = document.getElementById("pierce");
  const $combo = document.getElementById("combo");
  const $weaponName = document.getElementById("weaponName");
  const $weaponLevel = document.getElementById("weaponLevel");

  const overlayRoot = document.getElementById("overlayRoot");
  const startCard = document.getElementById("startCard");
  const upgradeCard = document.getElementById("upgradeCard");
  const gameOverCard = document.getElementById("gameOverCard");
  const stageClearCard = document.getElementById("stageClearCard");
  const stageClearLabel = document.getElementById("stageClearLabel");
  const nextStageBtn = document.getElementById("btnNextStage");
  const upgradeGrid = document.getElementById("upgradeGrid");
  const finalScoreEl = document.getElementById("finalScore");
  const warningOverlay = document.getElementById("warningOverlay");
  const activeSlotEls = [...document.querySelectorAll(".activeSlot")];
  const weaponRadioEls = [...document.querySelectorAll("input[name='weaponType']")];
  const practiceTypeEls = [...document.querySelectorAll("input[name='practiceType']")];
  const weaponHud = document.getElementById("weaponHud");
  const bossSelect = document.getElementById("bossSelect");
  const spawnBossBtn = document.getElementById("btnSpawnBoss");
  const stageSelect = document.getElementById("stageSelect");
  const stageDurationInput = document.getElementById("stageDurationInput");
  const applyStageTestBtn = document.getElementById("btnApplyStageTest");
  const stageTestPanel = document.getElementById("stageTestPanel");
  const bossHud = document.getElementById("bossHud");
  const bossHudName = document.getElementById("bossHudName");
  const bossHudMeta = document.getElementById("bossHudMeta");
  const bossHudFill = document.getElementById("bossHudFill");
  const skillMapPanel = document.getElementById("skillMapPanel");
  const skillMapTitle = document.getElementById("skillMapTitle");
  const skillMapList = document.getElementById("skillMapList");
  const closeSkillMapBtn = document.getElementById("btnCloseSkillMap");
  const dialogueOverlay = document.getElementById("dialogueOverlay");
  const dialogueLog = document.getElementById("dialogueLog");
  const CONTROLLER_NAME = "Rhea";
  let skillMapState = null;
  let pendingStageClearResolve = null;

  function getUpgradeTypeMeta(upgrade){
    const type = upgrade && upgrade.upgradeType ? upgrade.upgradeType : "passive";
    if (type === "weapon") return { label: "WEAPON", className: "weapon" };
    if (type === "active") return { label: "ACTIVE", className: "active" };
    return { label: "PASSIVE", className: "passive" };
  }

  function formatStageTime(frames = 0) {
    const totalSeconds = Math.max(0, Math.ceil(frames / 60));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function hudUpdate() {
    const S = GameState;
    const P = S.progression;
    const weaponDef = WEAPON_DEFINITIONS[S.weaponState.current];
    $score.textContent = String(Math.floor(P.score));
    $stage.textContent = String(P.stage || 1);
    $stageTime.textContent = S.stats.practice && S.stats.practiceMode === "boss"
      ? "TEST"
      : formatStageTime(P.stageTime);
    $wave.textContent = String(P.wave);
    $level.textContent = String(P.level);
    $xp.textContent = `${Math.floor(P.xp)} / ${Math.floor(P.xpToNext)}`;
    $hp.textContent = String(Math.max(0, Math.floor(S.stats.hp)));
    $mp.textContent = `${Math.floor(S.stats.mp)} / ${Math.floor(S.stats.mpMax)}`;
    $speed.textContent = (Math.round(S.stats.speed * 10) / 10).toFixed(1);
    $shield.textContent = S.stats.shieldMax > 0
      ? `${Math.max(0, Math.floor(S.stats.shield))} / ${Math.floor(S.stats.shieldMax)}`
      : "-";
    $atk.textContent = String(S.stats.bulletDamage);
    $def.textContent = String(S.stats.defense);
    $fireRate.textContent = String(Math.round(S.stats.fireRate));
    $shots.textContent = S.weaponState.current === "machinegun"
      ? String(Math.min(5, Math.max(1, S.stats.bulletCount)))
      : S.weaponState.current === "shotgun"
        ? String(4 + Math.min(6, S.stats.bulletCount * 2))
        : "1";
    $pierce.textContent = String(S.stats.bulletPierce);
    $combo.textContent = "x" + P.combo.toFixed(1).replace(/\.0$/,"");
    $weaponName.textContent = weaponDef ? weaponDef.name : "-";
    $weaponLevel.textContent = "Type Shift";
    for (const radio of weaponRadioEls) radio.checked = radio.value === S.weaponState.current;
    weaponHud.style.display = S.stats.practice ? "block" : "none";
    const isBossTest = S.stats.practice && S.stats.practiceMode === "boss";
    const isStageTest = S.stats.practice && S.stats.practiceMode === "stage";
    if (stageTestPanel) stageTestPanel.style.display = isStageTest ? "block" : "none";
    if (bossSelect && window.BossSystem) {
      bossSelect.value = BossSystem.getPracticeBossId();
    }
    if (stageSelect) stageSelect.value = String(S.practiceStageId || 1);
    if (stageDurationInput) stageDurationInput.value = String(Math.max(10, Math.floor(S.practiceStageDurationSec || 180)));
    for (const radio of practiceTypeEls) radio.checked = radio.value === (S.stats.practiceMode || "boss");
    if (spawnBossBtn) {
      spawnBossBtn.disabled = !isBossTest;
      spawnBossBtn.style.display = isBossTest ? "block" : "none";
    }
    if (bossSelect) bossSelect.style.display = isBossTest ? "block" : "none";
    const bossLabel = document.querySelector("label[for='bossSelect']");
    if (bossLabel) bossLabel.style.display = isBossTest ? "block" : "none";
    renderBossHud();
    renderActiveSlots();
  }

  function populateBossOptions() {
    if (!bossSelect || !window.BossSystem) return;
    const selected = BossSystem.getPracticeBossId();
    bossSelect.innerHTML = "";
    for (const boss of BossSystem.getDefinitions()) {
      const option = document.createElement("option");
      option.value = boss.id;
      option.textContent = boss.name;
      if (boss.id === selected) option.selected = true;
      bossSelect.appendChild(option);
    }
  }

  function renderActiveSlots(){
    for (const el of activeSlotEls){
      const slot = GameState.activeSkillState.slots.find(item => item.key === el.dataset.key);
      const skill = slot ? ActiveSkillSystem.getSlotSkill(slot) : null;
      const nameEl = el.querySelector(".slotName");
      const typeEl = el.querySelector(".slotType");
      const costEl = el.querySelector(".slotCost");
      const cdEl = el.querySelector(".slotCd");

      if (!slot || !skill){
        nameEl.textContent = "Empty";
        typeEl.textContent = "-";
        costEl.textContent = "0 MP";
        cdEl.textContent = "READY";
        el.classList.remove("cooldown");
        el.classList.remove("noMp");
        continue;
      }

      nameEl.textContent = skill.name;
      typeEl.textContent = skill.type.toUpperCase();
      costEl.textContent = `${skill.mpCost} MP`;
      cdEl.textContent = slot.cooldown > 0 ? `${(slot.cooldown / 60).toFixed(1)}s` : "READY";
      el.classList.toggle("cooldown", slot.cooldown > 0);
      el.classList.toggle("noMp", GameState.stats.mp < skill.mpCost);
    }
  }

  function closeSkillMapPanel(){
    skillMapState = null;
    if (!skillMapPanel) return;
    skillMapPanel.hidden = true;
    skillMapList.innerHTML = "";
  }

  function renderSkillMapPanel(){
    if (!skillMapPanel || !skillMapState) return;
    const slot = GameState.activeSkillState.slots.find(item => item.key === skillMapState.slotKey);
    if (!slot) {
      closeSkillMapPanel();
      return;
    }

    const currentSkill = ActiveSkillSystem.getSlotSkill(slot);
    const assignableSkills = ActiveSkillSystem.getAssignableSkills(slot.key);
    skillMapTitle.textContent = currentSkill
      ? `${slot.label} Slot · ${currentSkill.name}`
      : `${slot.label} Slot · Empty`;
    skillMapList.innerHTML = "";

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "skillMapOption clear";
    clearBtn.innerHTML = `<div class="skillMapOptionTitle">Unequip</div><div class="skillMapOptionMeta">${currentSkill ? `${currentSkill.name} removed from ${slot.label}` : `Slot ${slot.label} is already empty`}</div>`;
    clearBtn.onclick = () => {
      ActiveSkillSystem.clearSlot(slot.key);
      closeSkillMapPanel();
    };
    skillMapList.appendChild(clearBtn);

    if (!assignableSkills.length) {
      const empty = document.createElement("div");
      empty.className = "skillMapOption empty";
      empty.innerHTML = `<div class="skillMapOptionTitle">No Unmapped Skills</div><div class="skillMapOptionMeta">New active skills will auto-fill empty slots in Q > E > R order.</div>`;
      skillMapList.appendChild(empty);
    } else {
      for (const skill of assignableSkills) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "skillMapOption";
        btn.innerHTML = `<div class="skillMapOptionTitle">${skill.name}</div><div class="skillMapOptionMeta">${skill.type.toUpperCase()} | ${skill.mpCost} MP | ${skill.desc}</div>`;
        btn.onclick = () => {
          ActiveSkillSystem.assignSkillToSlot(slot.key, skill.id);
          closeSkillMapPanel();
        };
        skillMapList.appendChild(btn);
      }
    }

    skillMapPanel.hidden = false;
  }

  function openSkillMapPanel(slotKey){
    skillMapState = { slotKey };
    renderSkillMapPanel();
  }

  function renderBossHud() {
    if (!bossHud || !window.BossSystem) return;
    const boss = BossSystem.getActiveBoss();
    if (!boss) {
      bossHud.classList.remove("visible");
      bossHudName.textContent = "-";
      bossHudMeta.textContent = "No Active Boss";
      bossHudFill.style.width = "0%";
      return;
    }
    const ratio = boss.maxHp > 0 ? Math.max(0, boss.hp / boss.maxHp) : 0;
    const phaseLabel = boss.phase ? `Phase ${boss.phase}` : "Boss";
    let extra = "";
    if (boss.bossId === "summoner" && boss.minions) {
      extra = boss.minions.length > 0 ? ` | Shielded by ${boss.minions.length}` : " | Core Exposed";
    } else if (boss.bossId === "split" && boss.children) {
      extra = ` | Cores ${boss.children.length}`;
    } else if (boss.bossId === "knight" && boss.state) {
      extra = ` | ${boss.state}`;
    } else if (boss.bossId === "advanced" && boss.currentAction) {
      extra = ` | ${boss.currentAction}`;
    }
    bossHud.classList.add("visible");
    bossHudName.textContent = boss.displayName || boss.name || boss.bossId || "Boss";
    bossHudMeta.textContent = `${phaseLabel} | HP ${Math.ceil(Math.max(0, boss.hp))} / ${Math.ceil(boss.maxHp)}${extra}`;
    bossHudFill.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
  }

  function flashActiveSlot(key, reason="cast"){
    const el = activeSlotEls.find(item => item.dataset.key === key);
    if (!el) return;
    const className = reason === "mp" ? "noMp" : "cast";
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), 160);
  }

  function showCard(which) {
    if (which !== "clear") pendingStageClearResolve = null;
    startCard.style.display = which === "start" ? "block" : "none";
    upgradeCard.style.display = which === "upgrade" ? "block" : "none";
    gameOverCard.style.display = which === "over" ? "block" : "none";
    if (stageClearCard) stageClearCard.style.display = which === "clear" ? "block" : "none";
    overlayRoot.style.display = which ? "flex" : "none";
  }

  function showGameOver() {
    finalScoreEl.textContent = String(Math.floor(GameState.progression.score));
    showCard("over");
  }

  function triggerBossWarning(duration = 2800, pulseDuration = 700) {
    if (!warningOverlay) return;
    warningOverlay.style.display = "flex";
    warningOverlay.animate(
      [
        { opacity: 0.18, transform: "scale(0.98)" },
        { opacity: 1, transform: "scale(1)" , offset: 0.28 },
        { opacity: 0.42, transform: "scale(1.01)", offset: 0.62 },
        { opacity: 1, transform: "scale(1)" , offset: 0.82 },
        { opacity: 0.2, transform: "scale(0.99)" }
      ],
      {
        duration: pulseDuration,
        easing: "ease-in-out",
        iterations: Math.max(1, Math.round(duration / pulseDuration))
      }
    );
    setTimeout(() => {
      warningOverlay.style.display = "none";
    }, duration + 40);
  }

  function playBossWarning(duration = 2800, pulseMs = 700) {
    triggerBossWarning(duration, pulseMs);
    if (window.SoundSystem) {
      const pulseCount = Math.max(1, Math.ceil(duration / pulseMs));
      for (let i = 0; i < pulseCount; i++) {
        setTimeout(() => {
          SoundSystem.play("boss_alarm", { cooldownMs: 0 });
        }, i * pulseMs);
      }
    }
    return new Promise((resolve) => setTimeout(resolve, duration + 80));
  }

  function resolveStageClear() {
    if (!pendingStageClearResolve) return;
    const resolve = pendingStageClearResolve;
    pendingStageClearResolve = null;
    showCard(null);
    resolve();
  }

  function showStageClear(stage = 1) {
    if (stageClearLabel) stageClearLabel.textContent = `Stage ${stage} secured.`;
    if (pendingStageClearResolve) resolveStageClear();
    showCard("clear");
    if (window.SoundSystem) SoundSystem.play("stage_clear");
    return new Promise((resolve) => {
      pendingStageClearResolve = resolve;
    });
  }

  function openDialogueOverlay() {
    if (!dialogueOverlay || !dialogueLog) return;
    dialogueOverlay.hidden = false;
    dialogueOverlay.classList.add("visible");
  }

  function createDialogueCard(line) {
    if (!dialogueLog) return null;
    openDialogueOverlay();
    const isController = !line || line.speaker !== "player";
    const card = document.createElement("div");
    card.className = `dialogueCard ${isController ? "controller" : "player"} typing`;

    if (isController) {
      const avatar = document.createElement("img");
      avatar.className = "dialogueAvatar";
      avatar.src = "./resources/avatar-controller.png";
      avatar.alt = CONTROLLER_NAME;
      card.appendChild(avatar);
    } else {
      const stub = document.createElement("div");
      stub.className = "dialogueStub";
      stub.textContent = "P";
      card.appendChild(stub);
    }

    const bubble = document.createElement("div");
    bubble.className = "dialogueBubble";

    const name = document.createElement("div");
    name.className = "dialogueName";
    name.textContent = isController ? CONTROLLER_NAME : "Player";

    const text = document.createElement("div");
    text.className = "dialogueText";

    bubble.appendChild(name);
    bubble.appendChild(text);
    card.appendChild(bubble);
    dialogueLog.appendChild(card);

    while (dialogueLog.children.length > 8) {
      dialogueLog.removeChild(dialogueLog.firstElementChild);
    }
    return { card, text };
  }

  function showDialogueLine(entry, text = "") {
    if (!entry || !entry.text) return;
    entry.text.textContent = text;
    entry.card.classList.add("typing");
  }

  function closeDialogueOverlay() {
    if (!dialogueOverlay) return;
    dialogueOverlay.classList.remove("visible");
    dialogueOverlay.hidden = true;
  }

  function commitDialogueLine(entry) {
    if (!entry || !entry.card) return;
    entry.card.classList.remove("typing");
  }

  function resetDialogueLog() {
    if (!dialogueLog) return;
    dialogueLog.innerHTML = "";
    closeDialogueOverlay();
  }

  function renderUpgradeChoices(choices, onPick) {
    upgradeGrid.innerHTML = "";
    for (const choice of choices) {
      const typeMeta = getUpgradeTypeMeta(choice);
      const el = document.createElement("div");
      el.className = `upgrade ${typeMeta.className}`;
      el.innerHTML = `<div class="upgradeType">${typeMeta.label}</div><h3>${choice.name}</h3><p>${choice.desc}</p>`;
      const playHover = () => {
        if (window.SoundSystem) SoundSystem.play("ui_hover");
      };
      el.onmouseenter = playHover;
      el.onpointerenter = playHover;
      el.onclick = () => {
        if (window.SoundSystem) SoundSystem.play("upgrade_pick");
        onPick(choice);
      };
      upgradeGrid.appendChild(el);
    }
  }

  function bindButtons({ onStart, onPracticeBoss, onPracticeStage, onRetry, onBack, onBossChange, onSpawnBoss, onPracticeTypeChange, onApplyStageTest }) {
    document.getElementById("btnStart").onclick = onStart;
    document.getElementById("btnPracticeBoss").onclick = onPracticeBoss;
    document.getElementById("btnPracticeStage").onclick = onPracticeStage;
    document.getElementById("btnRetry").onclick = onRetry;
    document.getElementById("btnBack").onclick = onBack;
    if (nextStageBtn) nextStageBtn.onclick = resolveStageClear;
    if (bossSelect) bossSelect.onchange = () => onBossChange && onBossChange(bossSelect.value);
    if (spawnBossBtn) spawnBossBtn.onclick = () => onSpawnBoss && onSpawnBoss();
    if (applyStageTestBtn) applyStageTestBtn.onclick = () => onApplyStageTest && onApplyStageTest({
      stageId: Number(stageSelect && stageSelect.value) || 1,
      durationSec: Number(stageDurationInput && stageDurationInput.value) || 180
    });
    for (const radio of practiceTypeEls){
      radio.onchange = () => {
        if (radio.checked && onPracticeTypeChange) onPracticeTypeChange(radio.value);
      };
    }
    if (closeSkillMapBtn) closeSkillMapBtn.onclick = closeSkillMapPanel;
    if (skillMapPanel) {
      skillMapPanel.onclick = (e) => {
        if (e.target === skillMapPanel) closeSkillMapPanel();
      };
    }
    for (const slotEl of activeSlotEls){
      const nameBtn = slotEl.querySelector(".slotNameBtn");
      if (nameBtn) {
        nameBtn.onclick = () => openSkillMapPanel(slotEl.dataset.key);
      }
    }
    for (const radio of weaponRadioEls){
      radio.onchange = () => {
        if (radio.checked) CombatSystem.setWeaponType(radio.value);
      };
    }
  }

  return {
    hudUpdate,
    showCard,
    showGameOver,
    triggerBossWarning,
    playBossWarning,
    showStageClear,
    openDialogueOverlay,
    createDialogueCard,
    showDialogueLine,
    commitDialogueLine,
    closeDialogueOverlay,
    resetDialogueLog,
    renderUpgradeChoices,
    openSkillMapPanel,
    closeSkillMapPanel,
    bindButtons,
    flashActiveSlot,
    populateBossOptions
  };
})();
