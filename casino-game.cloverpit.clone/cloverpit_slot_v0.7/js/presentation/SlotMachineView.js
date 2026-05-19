export class SlotMachineView {
  constructor(config) {
    this.config = config;
    this.root = document.getElementById("wrap");
    this.refs = {
      comboBar: document.getElementById("cbar"),
      spinWinPanel: document.getElementById("spinwin"),
      spinWinValue: document.getElementById("spinwinval"),
      comboValue: document.getElementById("cb-val"),
      comboMultiplier: document.getElementById("cb-mult"),
      comboFill: document.getElementById("cb-fill"),
      comboText: document.getElementById("cb-txt"),
      coinValue: document.getElementById("vc"),
      ticketValue: document.getElementById("vt"),
      deadlineValue: document.getElementById("vd"),
      paidValue: document.getElementById("vp"),
      paymentFill: document.getElementById("dlf"),
      paymentText: document.getElementById("dlpct"),
      reels: document.getElementById("reels"),
      reelMachine: document.getElementById("rm"),
      paylineLabels: document.getElementById("paylinelabels"),
      paylineLines: document.getElementById("paylinelines"),
      resultPanel: document.getElementById("resultpanel"),
      spinButton: document.getElementById("bspin"),
      leverButton: document.getElementById("blever"),
      depositButton: document.getElementById("bdeposit"),
      nextButton: document.getElementById("bnext"),
      aliceToggle: document.getElementById("balice"),
      aliceToggleState: document.getElementById("alicetogglestate"),
      managerPanel: document.getElementById("managerpanel"),
      managerPortrait: document.getElementById("managerportrait"),
      managerName: document.getElementById("managername"),
      managerRole: document.getElementById("managerrole"),
      managerTitle: document.getElementById("managertitle"),
      managerText: document.getElementById("managertext"),
      managerGuide: document.getElementById("managerguide"),
      managerChoices: document.getElementById("managerchoices"),
      managerOverlay: document.getElementById("manageroverlay"),
      managerOverlayPortrait: document.getElementById("manageroverlayportrait"),
      managerOverlayTitle: document.getElementById("manageroverlaytitle"),
      managerOverlayText: document.getElementById("manageroverlaytext"),
      managerOverlayGuide: document.getElementById("manageroverlayguide"),
      managerOverlayChoices: document.getElementById("manageroverlaychoices"),
      legend: document.getElementById("symrow"),
      weightNotes: document.getElementById("weightnotes"),
      itemPanel: document.getElementById("itempanel"),
      chainPanel: document.getElementById("chainpanel"),
      chainLog: document.getElementById("chainlog"),
      chainToggle: document.getElementById("bchaintoggle"),
      chainToggleState: document.getElementById("chaintogglestate"),
    };
    this.refs.coinCard = this.refs.coinValue?.closest(".sc");
    this.reelTracks = [];
    this.reelWraps = [];
    this.previewClearTimer = null;
      this.activeChainEntry = null;
      this.currentManagerGuide = null;
      this.activeManagerGuideCardId = "";
      this.impactTimers = new Set();
    this.createHudLayer();
    this.createPaylineDisplay();
    this.resetChainLog();
  }

  createHudLayer() {
    this.hudLayer = document.createElement("div");
    this.hudLayer.className = "hud-layer";
    this.hudLayer.innerHTML = `
      <div class="hud-beam-zone"></div>
      <div class="hud-banner-zone"></div>
      <div class="hud-toast-zone"></div>
      <div class="hud-combo-zone"></div>
      <div class="hud-summary-zone"></div>
    `;
    this.root.appendChild(this.hudLayer);
    this.hudRefs = {
      beams: this.hudLayer.querySelector(".hud-beam-zone"),
      banners: this.hudLayer.querySelector(".hud-banner-zone"),
      toasts: this.hudLayer.querySelector(".hud-toast-zone"),
      combos: this.hudLayer.querySelector(".hud-combo-zone"),
      summaries: this.hudLayer.querySelector(".hud-summary-zone"),
    };
  }

  createPaylineDisplay() {
    this.refs.paylineLabels.innerHTML = "";
    this.refs.resultPanel.innerHTML = "";
    this.refs.paylineLines.innerHTML = "";
  }

  bindActions(actions) {
    this.refs.spinButton.addEventListener("click", actions.onSpin);
    this.refs.leverButton.addEventListener("click", actions.onSpin);
    this.refs.depositButton.addEventListener("click", actions.onDeposit);
    this.refs.nextButton.addEventListener("click", actions.onNext);
    this.refs.chainToggle.addEventListener("click", () => this.toggleChainPanel());
      this.refs.aliceToggle?.addEventListener("click", () => this.toggleManagerOverlay());
      const handleManagerChoice = (event) => {
        const button = event.target.closest("[data-topic-id]");
        if (!button) {
          return;
      }

      actions.onManagerTopic?.(button.dataset.topicId);
      };
      this.refs.managerChoices?.addEventListener("click", handleManagerChoice);
      this.refs.managerOverlayChoices?.addEventListener("click", handleManagerChoice);
      const handleGuideSelection = (event) => {
        const button = event.target.closest("[data-guide-card-select]");
        if (!button) {
          return;
        }

        this.setActiveManagerGuideCard(button.dataset.guideCardSelect);
      };
      this.refs.managerGuide?.addEventListener("click", handleGuideSelection);
      this.refs.managerOverlayGuide?.addEventListener("click", handleGuideSelection);
    }

  buildReels(initialGrid, pickSymbol) {
    this.refs.reels.innerHTML = "";
    this.reelTracks = [];
    this.reelWraps = [];

    const stripLength = this.config.reels.rows + this.config.reels.extraRows * 2;

    for (let column = 0; column < this.config.reels.columns; column += 1) {
      const wrap = document.createElement("div");
      wrap.className = "rw";
      wrap.id = `rw${column}`;

      const track = document.createElement("div");
      track.className = "rt";
      track.id = `rt${column}`;

      for (let index = 0; index < stripLength; index += 1) {
        const symbol = pickSymbol();
        const rowIndex = index - this.config.reels.extraRows;
        const cell = document.createElement("div");
        cell.className = `rs ${this.getRowClass(rowIndex)}`;
        this.paintSymbolCell(cell, symbol, rowIndex);

        if (rowIndex >= 0 && rowIndex < this.config.reels.rows) {
          this.paintSymbolCell(cell, initialGrid[column][rowIndex], rowIndex);
        }

        track.appendChild(cell);
      }

      track.style.transform = `translateY(-${this.config.reels.extraRows * this.config.reels.rowHeight}px)`;
      wrap.appendChild(track);
      this.refs.reels.appendChild(wrap);
      this.reelTracks.push(track);
      this.reelWraps.push(wrap);
    }
  }

  renderLegend(config, state) {
    this.refs.legend.innerHTML = "";
    const totalWeight = config.symbols.reduce(
      (sum, symbol) => sum + (state.symbolWeights?.[symbol.id] ?? symbol.baseWeight ?? symbol.weight ?? 1),
      0,
    );

    for (const symbol of config.symbols) {
      const card = document.createElement("div");
      card.className = "sc2";

      const multiplierValue = state.multipliers[symbol.id];
      const currentWeight = state.symbolWeights?.[symbol.id] ?? symbol.baseWeight ?? symbol.weight ?? 1;
      const baseWeight = symbol.baseWeight ?? symbol.weight ?? 1;
      const weightDelta = currentWeight - baseWeight;
      const valueText =
        symbol.special === "devil"
          ? "CURSE"
          : this.formatMultiplier(multiplierValue);
      const multiplierClass =
        symbol.special === "devil"
          ? "m curse"
          : `m ${this.getMultiplierTierClass(multiplierValue)}`;
      const weightClass = weightDelta > 0 ? "sw boosted" : "sw";
      const oddsPercent = Math.round((currentWeight / totalWeight) * 100);
      const deltaText = weightDelta !== 0 ? `<span>${weightDelta > 0 ? `+${weightDelta}` : weightDelta}W</span>` : "";
      const oddsText = `ODDS ${oddsPercent}%`;

      card.innerHTML = `<div class="e">${this.getSymbolMarkup(symbol, "legend")}</div><div class="${multiplierClass}">${valueText}</div><div class="${weightClass}">${oddsText}${deltaText}</div>`;
      this.refs.legend.appendChild(card);
    }
  }

  renderWeightNotes(notes) {
    if (!this.refs.weightNotes) {
      return;
    }

    if (!notes.length) {
      this.refs.weightNotes.innerHTML = `<div class="weight-note idle">BASE ODDS STABLE</div>`;
      return;
    }

    this.refs.weightNotes.innerHTML = notes
      .map(
        (note) => `<div class="weight-note"><span class="weight-source">${note.source}</span><span class="weight-text">${note.text}</span></div>`,
      )
      .join("");
  }

  renderItems(config) {
    if (!this.refs.itemPanel || this.refs.itemPanel.hidden) {
      return;
    }

    this.refs.itemPanel.innerHTML = "";

    for (const item of config.items.active) {
      const chip = document.createElement("div");
      chip.className = "item-chip";
      chip.innerHTML = `<div class="item-top">
        <span class="item-tag">RELIC</span>
        <span class="item-name">${item.name}</span>
      </div>
      <div class="item-desc">${item.summary}</div>`;
      this.refs.itemPanel.appendChild(chip);
    }
  }

  renderManager(config) {
    if (!this.refs.managerPanel) {
      return;
    }

    this.refs.managerName.textContent = config.manager?.name ?? "ALICE";
    this.refs.managerRole.textContent = config.manager?.descriptor ?? "";
    if (this.refs.managerPortrait && config.manager?.avatarPath) {
      this.refs.managerPortrait.src = config.manager.avatarPath;
    }
    if (this.refs.managerOverlayPortrait && config.manager?.avatarPath) {
      this.refs.managerOverlayPortrait.src = config.manager.avatarPath;
    }

    const topicMarkup = (config.manager?.topics ?? [])
      .map(
        (topic) => `<button class="manager-chip" type="button" data-topic-id="${topic.id}">${topic.label}</button>`,
      )
      .join("");

    this.refs.managerChoices.innerHTML = topicMarkup;
    if (this.refs.managerOverlayChoices) {
      this.refs.managerOverlayChoices.innerHTML = topicMarkup;
    }
  }

  setManagerDialogue(dialogue, activeTopicId = "") {
    if (!this.refs.managerText || !this.refs.managerTitle) {
      return;
    }

    this.refs.managerTitle.textContent = dialogue.title ?? "ALICE";
    this.refs.managerText.textContent = dialogue.text ?? "";
    this.refs.managerText.classList.remove("pop");
    void this.refs.managerText.offsetWidth;
    this.refs.managerText.classList.add("pop");

    if (this.refs.managerOverlayTitle) {
      this.refs.managerOverlayTitle.textContent = dialogue.title ?? "ALICE";
    }
    if (this.refs.managerOverlayText) {
      this.refs.managerOverlayText.textContent = dialogue.text ?? "";
      this.refs.managerOverlayText.classList.remove("pop");
      void this.refs.managerOverlayText.offsetWidth;
      this.refs.managerOverlayText.classList.add("pop");
    }

    this.renderManagerGuide(dialogue.guide ?? null);

    this.syncManagerTopicState(this.refs.managerChoices, activeTopicId);
    this.syncManagerTopicState(this.refs.managerOverlayChoices, activeTopicId);
  }

  renderManagerGuide(guide = null) {
    const cards = guide?.cards ?? [];
    const kind = guide?.kind ?? "pattern";
    this.currentManagerGuide = cards.length ? guide : null;

    const activeCard = cards.find((card) => card.id === this.activeManagerGuideCardId) ?? cards[0] ?? null;
    if (activeCard) {
      this.activeManagerGuideCardId = activeCard.id;
    }

    const markup = activeCard
      ? `<div class="pattern-guide-intro">
          <span class="pattern-guide-intro-eyebrow">${guide?.eyebrow ?? "ALICE NOTES"}</span>
          <p>${guide?.intro ?? ""}</p>
        </div>
        <div class="manager-guide-rail" role="tablist" aria-label="${guide?.kind ?? "guide"} guide">
          ${cards.map((card) => this.getManagerGuideChipMarkup(card, activeCard.id)).join("")}
        </div>
        <div class="manager-guide-stage">
          ${this.getManagerGuideCardMarkup(activeCard, kind)}
        </div>`
      : "";

    if (this.refs.managerGuide) {
      this.refs.managerGuide.innerHTML = markup;
      this.refs.managerGuide.classList.toggle("is-visible", cards.length > 0);
    }

    if (this.refs.managerOverlayGuide) {
      this.refs.managerOverlayGuide.innerHTML = markup;
      this.refs.managerOverlayGuide.classList.toggle("is-visible", cards.length > 0);
    }
  }

  setActiveManagerGuideCard(cardId) {
    if (!this.currentManagerGuide?.cards?.some((card) => card.id === cardId)) {
      return;
    }

    this.activeManagerGuideCardId = cardId;
    this.renderManagerGuide(this.currentManagerGuide);
  }

  syncManagerTopicState(container, activeTopicId) {
    for (const chip of container?.querySelectorAll(".manager-chip") ?? []) {
      chip.classList.toggle("active", chip.dataset.topicId === activeTopicId);
    }
  }

  toggleManagerOverlay(forceVisible) {
    if (!this.refs.managerOverlay) {
      return;
    }

    const shouldShow = typeof forceVisible === "boolean"
      ? forceVisible
      : this.refs.managerOverlay.classList.contains("is-hidden");

    this.refs.managerOverlay.classList.toggle("is-hidden", !shouldShow);
    this.refs.aliceToggle?.setAttribute("aria-expanded", shouldShow ? "true" : "false");
    if (this.refs.aliceToggleState) {
      this.refs.aliceToggleState.textContent = shouldShow ? "CLOSE" : "TALK";
    }
  }

  renderCombo(comboView) {
    this.refs.comboBar.className = `cbar${comboView.className ? ` ${comboView.className}` : ""}`;
    this.refs.comboValue.textContent = String(comboView.combo);
    this.refs.comboMultiplier.textContent = comboView.combo >= 3 ? this.formatMultiplier(comboView.multiplier) : "";
    this.refs.comboMultiplier.className = comboView.combo >= 3
      ? `cb-mult ${this.getMultiplierTierClass(comboView.multiplier)}`
      : "cb-mult";
    if (this.refs.comboFill) {
      this.refs.comboFill.style.width = `${comboView.percent}%`;
      this.refs.comboFill.style.background =
        comboView.combo >= 20
          ? "#ff40ff"
          : comboView.combo >= 10
            ? "#40c8ff"
            : comboView.combo >= 5
              ? "#d4a020"
              : "#6a5828";
    }
    if (this.refs.comboText) {
      this.refs.comboText.textContent = comboView.bonusText;
    }
    this.renderComboFrame(comboView.combo);
  }

  popComboValue() {
    this.refs.comboValue.classList.remove("pop");
    void this.refs.comboValue.offsetWidth;
    this.refs.comboValue.classList.add("pop");
  }

  resetSpinWin() {
    if (!this.refs.spinWinValue) {
      return;
    }

    this.refs.spinWinPanel?.classList.remove("active");
    this.refs.spinWinValue.classList.remove("pop");
    this.refs.spinWinValue.textContent = "+0";
  }

  updateSpinWin(total, delta = 0) {
    if (!this.refs.spinWinValue) {
      return;
    }

    this.refs.spinWinValue.textContent = total > 0 ? `+${total}` : "+0";
    this.refs.spinWinPanel?.classList.toggle("active", total > 0);

    if (delta > 0) {
      this.refs.spinWinValue.classList.remove("pop");
      void this.refs.spinWinValue.offsetWidth;
      this.refs.spinWinValue.classList.add("pop");
    }
  }

  playSpinWinCollect(isGain = true) {
    const spinWinPanel = this.refs.spinWinPanel;
    const coinCard = this.refs.coinCard;

    if (!spinWinPanel && !coinCard) {
      return Promise.resolve();
    }

    spinWinPanel?.classList.remove("banking", "banking-loss");
    coinCard?.classList.remove("coin-collect", "coin-collect-loss");
    void this.root.offsetWidth;

    spinWinPanel?.classList.add(isGain ? "banking" : "banking-loss");
    coinCard?.classList.add(isGain ? "coin-collect" : "coin-collect-loss");

    return new Promise((resolve) => {
      window.setTimeout(() => {
        spinWinPanel?.classList.remove("banking", "banking-loss");
        coinCard?.classList.remove("coin-collect", "coin-collect-loss");
        resolve();
      }, 620);
    });
  }

  renderState(state, config) {
    const deadline = config.deadlines[state.deadlineIndex];
    this.refs.coinValue.textContent = String(state.coinDisplay);
    if (this.refs.ticketValue) {
      this.refs.ticketValue.textContent = String(state.tickets);
    }
    if (this.refs.deadlineValue) {
      this.refs.deadlineValue.textContent = String(deadline);
    }
    if (this.refs.paidValue) {
      this.refs.paidValue.textContent = String(state.paid);
    }

    const percentage = Math.min(100, Math.round((state.paid / deadline) * 100));
    if (this.refs.paymentFill) {
      this.refs.paymentFill.style.width = `${percentage}%`;
      this.refs.paymentFill.style.background =
        percentage >= 100 ? "#30b060" : percentage >= 60 ? "#d4a020" : "#c05020";
    }
    if (this.refs.paymentText) {
      this.refs.paymentText.textContent = `${percentage}%`;
    }
  }

  setSpinEnabled(enabled) {
    this.refs.spinButton.disabled = !enabled;
    this.refs.leverButton.disabled = !enabled;
  }

  playLeverPull() {
    return new Promise((resolve) => {
      this.refs.leverButton.classList.remove("is-pulling");
      void this.refs.leverButton.offsetWidth;
      this.refs.leverButton.classList.add("is-pulling");
      window.setTimeout(() => {
        this.refs.leverButton.classList.remove("is-pulling");
        resolve();
      }, 620);
    });
  }

  clearOutcome() {
    this.clearHitClasses();
    this.clearPreviewFocus();
    this.resetPaylines();
    this.resetResultRows();
    this.resetChainLog();
    this.resetSpinWin();
    this.clearHud();
  }

  renderGlobalResult(message, className) {
    this.renderSpinResults([{ tag: "INFO", message, className }]);
  }

  renderOutcome(outcome) {
    this.renderSpinResults(outcome.summaryRows ?? []);

    if (outcome.devilTriggered) {
      this.markAllReels("devil");
      const devilEntry = outcome.stages
        .flatMap((stage) => stage.entries)
        .find((entry) => entry.effect === "event-devil");

      for (const [column, row] of devilEntry?.focus?.positions ?? []) {
        const cell = this.getVisibleCell(column, row);
        cell?.classList.add("cell-hit", "cell-tone-0");
      }
      return;
    }

    for (const [index, win] of (outcome.wins ?? []).entries()) {
      this.highlightMatchedPositions(index % 10, win.positions);
    }
  }

  animateSpin(finalGrid, pickSymbol, onReelStop) {
    const tasks = this.reelTracks.map((_, column) =>
      this.animateReel(
        column,
        this.config.reels.stopDurations[column],
        finalGrid[column],
        pickSymbol,
        onReelStop,
      ),
    );

    return Promise.all(tasks);
  }

  animateCoinCounter(from, to, duration, isDown = false, onDone = () => {}) {
    const element = this.refs.coinValue;
    element.className = `scv${isDown ? " cdn" : " cup"}`;
    const start = performance.now();

    return new Promise((resolve) => {
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = isDown ? progress : 1 - (1 - progress) ** 3;
        element.textContent = String(Math.round(from + (to - from) * eased));

        if (progress < 1) {
          requestAnimationFrame(step);
          return;
        }

        element.textContent = String(to);
        element.className = "scv";
        onDone();
        resolve();
      };

      requestAnimationFrame(step);
    });
  }

  showOverlay({ theme, title, subtitle, delta, isLoss, bonusText = "" }) {
    const overlay = document.createElement("div");
    overlay.className = "jpov";
    const sign = isLoss ? "-" : "+";

    overlay.innerHTML = `<div class="jpbox ${theme}">
      <div class="jpt">${title}</div>
      <div class="jps">${subtitle}</div>
      <div class="jp-counter ${isLoss ? "dn" : "up"}" id="jpc">+0</div>
      <div class="jps" id="jps2"></div>
      <div class="jph">[ TAP TO CONTINUE ]</div>
    </div>`;

    this.root.appendChild(overlay);

    const counter = overlay.querySelector("#jpc");
    const bonus = overlay.querySelector("#jps2");
    const duration = isLoss ? 900 : 1800;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = isLoss ? progress : 1 - (1 - progress) ** 2.5;
      counter.textContent = `${sign}${Math.round(delta * eased).toLocaleString()}`;

      if (progress < 1) {
        requestAnimationFrame(step);
        return;
      }

      counter.textContent = `${sign}${delta.toLocaleString()}`;
      bonus.textContent = bonusText;
    };

    requestAnimationFrame(step);
    overlay.addEventListener("click", () => overlay.remove(), { once: true });
  }

  showFloatingNumber(text, color, placement = "center") {
    const element = document.createElement("div");
    element.className = `fn ${placement === "ambient" ? "fn-ambient" : "fn-center"}`;
    element.textContent = text;
    element.style.color = color;
    element.style.textShadow = `0 0 12px ${color}`;

    if (placement === "ambient") {
      element.style.left = `${60 + Math.random() * 230}px`;
      element.style.top = `${120 + Math.random() * 80}px`;
    }

    this.root.appendChild(element);

    window.setTimeout(() => element.remove(), 1400);
  }

  showCoinDeltaHud(delta) {
    if (!this.refs.coinCard || !delta) {
      return;
    }

    const chip = document.createElement("div");
    chip.className = `coin-delta-hud ${delta > 0 ? "up" : "down"}`;
    chip.textContent = `${delta > 0 ? "+" : ""}${delta} COIN`;
    chip.style.setProperty("--coin-delta-color", delta > 0 ? "#d8ff3e" : "#ff6b8d");
    this.refs.coinCard.appendChild(chip);
    window.setTimeout(() => chip.remove(), 1350);
  }

  playImpact(level = "light") {
    const intensity = this.normalizeImpactLevel(level);
    const rootClass = `shk-${intensity}`;
    const machineClass = `impact-${intensity}`;
    const flashClass = `camflash-${intensity}`;
    const durations = {
      light: 280,
      medium: 420,
      heavy: 620,
    };

    this.root.classList.remove("shk-light", "shk-medium", "shk-heavy", "camflash-light", "camflash-medium", "camflash-heavy");
    this.refs.reelMachine.classList.remove("impact-light", "impact-medium", "impact-heavy");
    void this.root.offsetWidth;

    this.root.classList.add(rootClass, flashClass);
    this.refs.reelMachine.classList.add(machineClass);

    const clearTimer = window.setTimeout(() => {
      this.root.classList.remove(rootClass, flashClass);
      this.refs.reelMachine.classList.remove(machineClass);
      this.impactTimers.delete(clearTimer);
    }, durations[intensity]);

    this.impactTimers.add(clearTimer);
  }

  shakeMachine(level = "light") {
    this.playImpact(level);
  }

  showNoise(duration = 1800) {
    const noise = document.createElement("div");
    noise.className = "crt-noise";
    this.root.appendChild(noise);
    window.setTimeout(() => noise.remove(), duration);
  }

  getMachineMetrics() {
    const rootRect = this.root.getBoundingClientRect();
    const machineRect = this.refs.reelMachine.getBoundingClientRect();
    const machineTop = machineRect.top - rootRect.top;

    return {
      centerX: machineRect.left - rootRect.left + machineRect.width / 2,
      rowCenters: [0, 1, 2].map(
        (row) => machineTop + this.config.reels.rowHeight * (row + 0.5) + 10,
      ),
      paylineCenters: this.config.paylines.map((payline) => {
        const pointTotal = payline.positions.reduce(
          (sum, [column, row]) => {
            const reelRect = this.reelWraps[column].getBoundingClientRect();
            return {
              x: sum.x + (reelRect.left - rootRect.left + reelRect.width / 2),
              y: sum.y + machineTop + this.config.reels.rowHeight * (row + 0.5) + 10,
            };
          },
          { x: 0, y: 0 },
        );

        return {
          x: pointTotal.x / payline.positions.length,
          y: pointTotal.y / payline.positions.length,
        };
      }),
    };
  }

  getReelCenter(column) {
    const reelRect = this.reelWraps[column].getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();

    return {
      x: reelRect.left - rootRect.left + reelRect.width / 2,
      y: reelRect.top - rootRect.top + reelRect.height / 2,
    };
  }

  getFocusCenter(positions = []) {
    if (!positions.length) {
      const machineRect = this.refs.reelMachine.getBoundingClientRect();
      const rootRect = this.root.getBoundingClientRect();
      return {
        x: machineRect.left - rootRect.left + machineRect.width / 2,
        y: machineRect.top - rootRect.top + machineRect.height / 2,
      };
    }

    const rootRect = this.root.getBoundingClientRect();
    const pointTotal = positions.reduce((sum, [column, row]) => {
      const reelRect = this.reelWraps[column].getBoundingClientRect();
      return {
        x: sum.x + (reelRect.left - rootRect.left + reelRect.width / 2),
        y: sum.y + (reelRect.top - rootRect.top + this.config.reels.rowHeight * (row + 0.5)),
      };
    }, { x: 0, y: 0 });

    return {
      x: pointTotal.x / positions.length,
      y: pointTotal.y / positions.length,
    };
  }

  getRowClass(rowIndex) {
    if (rowIndex >= 0 && rowIndex < this.config.reels.rows) {
      return this.config.reels.rowClasses[rowIndex];
    }

    return "buffer";
  }

  setColumnSymbols(column, symbols, pickSymbol) {
    const cells = this.reelTracks[column].querySelectorAll(".rs");

    cells.forEach((cell, index) => {
      const rowIndex = index - this.config.reels.extraRows;
      if (rowIndex >= 0 && rowIndex < this.config.reels.rows) {
        const symbol = symbols[rowIndex];
        cell.className = `rs ${this.getRowClass(rowIndex)}`;
        this.paintSymbolCell(cell, symbol, rowIndex);
        return;
      }

      const filler = pickSymbol();
      cell.className = "rs buffer";
      this.paintSymbolCell(cell, filler, rowIndex);
    });

    this.reelTracks[column].style.transform = `translateY(-${this.config.reels.extraRows * this.config.reels.rowHeight}px)`;
  }

  animateReel(column, stopAt, finalSymbols, pickSymbol, onReelStop) {
    return new Promise((resolve) => {
      const track = this.reelTracks[column];
      const cells = track.querySelectorAll(".rs");
      let velocity = 0;
      const maxVelocity = this.config.reels.rowHeight * 0.038;
      let elapsed = 0;
      let lastTimestamp = null;
      let phase = "accel";
      let swapTimer = 0;
      const stripLength = this.config.reels.rows + this.config.reels.extraRows * 2;
      let virtualY = this.config.reels.extraRows * this.config.reels.rowHeight;

      const frame = (timestamp) => {
        if (!lastTimestamp) {
          lastTimestamp = timestamp;
        }

        const delta = Math.min(timestamp - lastTimestamp, 50);
        lastTimestamp = timestamp;
        elapsed += delta;

        if (phase === "accel" && velocity >= maxVelocity) {
          phase = "cruise";
        }
        if (phase === "cruise" && elapsed >= stopAt) {
          phase = "decel";
        }

        if (phase === "accel") {
          velocity = Math.min(velocity + 0.0028 * delta, maxVelocity);
        } else if (phase === "decel") {
          velocity = Math.max(velocity - 0.006 * delta, 0);
        }

        virtualY += velocity * delta;
        track.style.transform = `translateY(-${virtualY % (stripLength * this.config.reels.rowHeight)}px)`;

        swapTimer += delta;
        if (swapTimer > 55 && phase !== "decel") {
          swapTimer = 0;
          cells.forEach((cell) => {
            const symbol = pickSymbol();
            this.paintSymbolCell(cell, symbol, -1);
          });
        }

        if (phase === "decel" && velocity <= 0) {
          this.setColumnSymbols(column, finalSymbols, pickSymbol);
          const wrap = this.reelWraps[column];
          wrap.classList.add("thud");
          window.setTimeout(() => wrap.classList.remove("thud"), 160);
          onReelStop(column, this.getReelCenter(column));
          resolve();
          return;
        }

        requestAnimationFrame(frame);
      };

      requestAnimationFrame(frame);
    });
  }

  renderComboFrame(combo) {
    this.refs.reelMachine.className = "rm";

    if (combo >= 20) {
      this.refs.reelMachine.classList.add("combo20");
    } else if (combo >= 10) {
      this.refs.reelMachine.classList.add("combo10");
    } else if (combo >= 5) {
      this.refs.reelMachine.classList.add("combo5");
    }
  }

  clearHitClasses() {
    for (const wrap of this.reelWraps) {
      wrap.classList.remove("hit-r0", "hit-r1", "hit-r2", "jp", "devil", "preview-focus");
      wrap.style.removeProperty("--preview-glow");
    }

    const toneClasses = Array.from({ length: this.getPaylineCount() }, (_, index) => `cell-tone-${index}`);
    for (const cell of this.refs.reels.querySelectorAll(".rs")) {
      cell.classList.remove("cell-hit", "preview-focus", ...toneClasses);
      cell.style.removeProperty("--preview-glow");
    }

    for (let row = 0; row < this.getPaylineCount(); row += 1) {
      document.getElementById(`pll${row}`)?.classList.remove("pulse");
    }
  }

  resetPaylines() {
    for (let row = 0; row < this.getPaylineCount(); row += 1) {
      this.setPayline(row, "idle");
      this.setPaylineLabel(row, "lost");
    }
  }

  hideResolvedPaylines() {
    for (let row = 0; row < this.getPaylineCount(); row += 1) {
      this.setPayline(row, "idle");
      this.setPaylineLabel(row, "lost");
      document.getElementById(`pll${row}`)?.classList.remove("pulse");
    }
  }

  resetResultRows() {
    this.refs.resultPanel.innerHTML = "";
  }

  resetChainLog() {
    this.clearPreviewFocus();
    this.refs.chainLog.innerHTML = `<div class="chain-empty">CHAIN ENGINE STANDBY</div>`;
  }

  toggleChainPanel(forceExpanded) {
    const shouldExpand = typeof forceExpanded === "boolean"
      ? forceExpanded
      : this.refs.chainPanel.classList.contains("collapsed");

    this.refs.chainPanel.classList.toggle("collapsed", !shouldExpand);
    this.refs.chainToggle.setAttribute("aria-expanded", shouldExpand ? "true" : "false");
    this.refs.chainToggleState.textContent = shouldExpand ? "CLOSE" : "OPEN";
  }

  clearHud() {
    this.hudRefs.beams.innerHTML = "";
    this.hudRefs.banners.innerHTML = "";
    this.hudRefs.toasts.innerHTML = "";
    this.hudRefs.combos.innerHTML = "";
    this.hudRefs.summaries.innerHTML = "";
  }

  appendChainStage(stage) {
    const placeholder = this.refs.chainLog.querySelector(".chain-empty");
    if (placeholder) {
      placeholder.remove();
    }

    const section = document.createElement("section");
    section.className = "chain-stage";
    section.dataset.stageKey = stage.key;
    section.innerHTML = `<div class="chain-stage-title">${stage.title}</div>`;
    this.refs.chainLog.appendChild(section);
    this.refs.chainLog.scrollTop = this.refs.chainLog.scrollHeight;
  }

  showStageBanner(stage) {
    return new Promise((resolve) => {
      const tone = this.getStageTone(stage);
      const banner = document.createElement("div");
      banner.className = `hud-banner tone-${tone}`;
      banner.innerHTML = `
        <div class="hud-kicker">CHAIN STEP</div>
        <div class="hud-title">${stage.title}</div>
      `;
      this.hudRefs.banners.appendChild(banner);
      window.setTimeout(() => {
        banner.remove();
        resolve();
      }, 720);
    });
  }

  appendChainEntry(stageKey, entry) {
    const section = this.refs.chainLog.querySelector(`[data-stage-key="${stageKey}"]`);
    if (!section) {
      return;
    }

    const row = document.createElement("div");
    row.className = `chain-entry ${entry.tone ?? "neutral"}`;
    row.innerHTML = `<span class="chain-label">${entry.label}</span><span class="chain-text">${entry.text}</span>`;

    if (entry.focus && (entry.focus.rows?.length || entry.focus.positions?.length || entry.focus.columns?.length)) {
      row.classList.add("is-actionable");
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.setAttribute("aria-label", `${entry.label} related reels preview`);
      row.addEventListener("click", () => this.previewChainFocus(entry.focus, row));
      row.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        this.previewChainFocus(entry.focus, row);
      });
    }

    section.appendChild(row);
    this.refs.chainLog.scrollTop = this.refs.chainLog.scrollHeight;
  }

  previewChainFocus(focus, entryElement = null) {
    if (!focus) {
      return;
    }

    this.clearPreviewFocus();
    this.refs.reelMachine.classList.add("preview-mode");

    const previewColor = focus.color || "#49e6ff";

    if (entryElement) {
      entryElement.classList.add("active");
      entryElement.style.setProperty("--preview-glow", previewColor);
      this.activeChainEntry = entryElement;
    }

    for (const [column, row] of focus.positions ?? []) {
      const cell = this.getVisibleCell(column, row);
      if (!cell) {
        continue;
      }
      cell.classList.add("preview-focus");
      cell.style.setProperty("--preview-glow", previewColor);
    }

    for (const paylineIndex of focus.rows ?? []) {
      const line = document.getElementById(`pll${paylineIndex}`);
      const label = document.getElementById(`pl${paylineIndex}`);

      if (line) {
        line.classList.add("preview-focus");
        line.style.setProperty("--preview-stroke", previewColor);
      }

      if (label) {
        label.classList.add("preview-focus");
        label.style.setProperty("--preview-stroke", previewColor);
      }
    }

    this.previewClearTimer = window.setTimeout(() => this.clearPreviewFocus(), 1800);
  }

  clearPreviewFocus() {
    if (this.previewClearTimer) {
      window.clearTimeout(this.previewClearTimer);
      this.previewClearTimer = null;
    }

    this.refs.reelMachine.classList.remove("preview-mode");

    if (this.activeChainEntry) {
      this.activeChainEntry.classList.remove("active");
      this.activeChainEntry.style.removeProperty("--preview-glow");
      this.activeChainEntry = null;
    }

    for (const wrap of this.reelWraps) {
      wrap.classList.remove("preview-focus");
      wrap.style.removeProperty("--preview-glow");
    }

    for (const cell of this.refs.reels.querySelectorAll(".rs.preview-focus")) {
      cell.classList.remove("preview-focus");
      cell.style.removeProperty("--preview-glow");
    }

    for (let row = 0; row < this.getPaylineCount(); row += 1) {
      const line = document.getElementById(`pll${row}`);
      const label = document.getElementById(`pl${row}`);
      line?.classList.remove("preview-focus");
      line?.style.removeProperty("--preview-stroke");
      label?.classList.remove("preview-focus");
      label?.style.removeProperty("--preview-stroke");
    }
  }

  showHudCallout(entry) {
    if (entry.effect === "none") {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const tone = entry.tone ?? "neutral";
      const callout = document.createElement("div");
      callout.className = `hud-toast tone-${tone}`;
      callout.innerHTML = `
        <div class="hud-row">
          <div class="hud-copy">
            <div class="hud-label">${entry.label}</div>
            <div class="hud-main">${this.getHudHeadline(entry)}</div>
            <div class="hud-sub">${entry.text}</div>
          </div>
          <div class="hud-delta">${this.getHudDelta(entry)}</div>
        </div>
      `;
      this.hudRefs.toasts.appendChild(callout);
      window.setTimeout(() => {
        callout.remove();
        resolve();
      }, 920);
    });
  }

  showRowSpotlight(row, color) {
    const rootRect = this.root.getBoundingClientRect();
    const machineWrap = this.refs.reelMachine.closest(".machine-wrap") ?? this.refs.reelMachine;
    const machineWrapRect = machineWrap.getBoundingClientRect();
    const beam = document.createElement("div");
    beam.className = "hud-row-beam";
    beam.style.top = `${this.getMachineMetrics().rowCenters[row]}px`;
    beam.style.left = `${machineWrapRect.left - rootRect.left}px`;
    beam.style.width = `${machineWrapRect.width}px`;
    beam.style.setProperty("--beam-color", color);
    beam.style.setProperty("--beam-soft", `${color}22`);
    beam.style.setProperty("--beam-core", `${color}44`);
    this.hudRefs.beams.appendChild(beam);
    window.setTimeout(() => beam.remove(), 700);
  }

  pulsePayline(paylineIndex) {
    const line = document.getElementById(`pll${paylineIndex}`);
    if (!line) {
      return;
    }

    line.classList.remove("pulse");
    void line.getBoundingClientRect();
    line.classList.add("pulse");
    window.setTimeout(() => line.classList.remove("pulse"), 700);
  }

  showFinalSummary(summary) {
    return new Promise((resolve) => {
      const box = document.createElement("div");
      box.className = `hud-summary tone-${summary.tone}`;
      box.innerHTML = `
        <div class="hud-label">FINAL CHAIN</div>
        <div class="hud-main">${summary.headline}</div>
        <div class="hud-sub">${summary.detail}</div>
      `;
      this.hudRefs.summaries.appendChild(box);
      window.setTimeout(() => {
        box.remove();
        resolve();
      }, 1350);
    });
  }

  showComboBurst(comboView, comboGain) {
    return new Promise((resolve) => {
      const burst = document.createElement("div");
      burst.className = `hud-combo-burst ${this.getComboBurstTierClass(comboView.multiplier)}`;
      burst.innerHTML = `
        <div class="hud-combo-tag">COMBO SURGE</div>
        <div class="hud-combo-main">${this.formatMultiplier(comboView.multiplier)}</div>
        <div class="hud-combo-count">COMBO ${comboView.combo}</div>
        <div class="hud-combo-note">${comboView.bonusText} - +${comboGain} combo chain</div>
      `;
      this.hudRefs.combos.appendChild(burst);
      window.setTimeout(() => {
        burst.remove();
        resolve();
      }, 1050);
    });
  }

  getHudHeadline(entry) {
    if (entry.effect === "combo-gain") {
      return "COMBO SURGE";
    }
    if (entry.effect === "combo-reset") {
      return "CHAIN BROKEN";
    }
    if (entry.effect?.startsWith("event-")) {
      return "SPECIAL EVENT";
    }
    if (entry.effect === "pattern-win") {
      if (entry.patternMultiplier >= 10) {
        return `${entry.symbolName} JACKPOT`;
      }
      if (entry.patternMultiplier >= 7) {
        return `${entry.patternName} PATTERN`;
      }
      return `${entry.symbolName} ${entry.patternLabel}`;
    }
    return "CHAIN STEP";
  }

  getHudDelta(entry) {
    if (typeof entry.coinDelta === "number" && entry.coinDelta !== 0) {
      return `${entry.coinDelta > 0 ? "+" : ""}${entry.coinDelta}`;
    }
    if (typeof entry.comboDelta === "number" && entry.comboDelta !== 0) {
      return `+${entry.comboDelta}C`;
    }
    if (typeof entry.ticketsDelta === "number" && entry.ticketsDelta !== 0) {
      return `+${entry.ticketsDelta}T`;
    }
    if (entry.effect === "combo-reset") {
      return "0";
    }
    return "!";
  }

  getStageTone(stage) {
    if (stage.entries.some((entry) => entry.tone === "loss")) {
      return "loss";
    }
    if (stage.entries.some((entry) => entry.tone === "event")) {
      return "event";
    }
    if (stage.entries.some((entry) => entry.tone === "gain")) {
      return "gain";
    }
    return "gain";
  }

  getComboBurstTierClass(multiplier) {
    if (multiplier >= 3) {
      return "tier-god";
    }
    if (multiplier >= 2) {
      return "tier-legend";
    }
    if (multiplier >= 1.5) {
      return "tier-hot";
    }
    if (multiplier >= 1.2) {
      return "tier-warm";
    }
    return "tier-base";
  }

  formatMultiplier(value) {
    return `X ${value}`;
  }

  normalizeImpactLevel(level) {
    if (level === "heavy" || level === "medium") {
      return level;
    }
    return "light";
  }

  getMultiplierTierClass(value) {
    if (value >= 40) {
      return "mult-god";
    }
    if (value >= 20) {
      return "mult-legend";
    }
    if (value >= 10) {
      return "mult-hot";
    }
    if (value >= 5) {
      return "mult-warm";
    }
    return "mult-base";
  }

  renderResultRow(row, message, className) {
    const rowElement = document.getElementById(`rrow${row}`);
    const textElement = document.getElementById(`rtxt${row}`);
    if (!rowElement || !textElement) {
      return;
    }
    rowElement.className = `res-row${className ? ` ${className}` : ""}`;
    textElement.textContent = message;
  }

  renderSpinResults(rows) {
    this.refs.resultPanel.innerHTML = "";

    const sourceRows = rows.length
      ? rows
      : [{ tag: "MISS", message: "NO PATTERN WIN", className: "lose" }];

    for (const row of sourceRows) {
      const rowElement = document.createElement("div");
      rowElement.className = `res-row${row.className ? ` ${row.className}` : ""}`;
      rowElement.innerHTML = `<span class="rr-tag">${row.tag}</span><span>${row.message}</span>`;
      this.refs.resultPanel.appendChild(rowElement);
    }
  }

  setPayline(row, className, positions = null) {
    const line = document.getElementById(`pll${row}`);
    const payline = this.config.paylines[row];
    if (!line || !payline) {
      return;
    }

    const activePositions = positions?.length ? positions : payline.positions;

    line.setAttribute("class", `pl-line ${payline.pathClass} ${className}`);
    line.setAttribute("points", this.getPolylinePointsFromPositions(activePositions));
  }

  setPaylineLabel(row, className) {
    const label = document.getElementById(`pl${row}`);
    if (!label) {
      return;
    }
    label.className = `pl-label ${className}`;
  }

  highlightMatchedPositions(paylineIndex, positions) {
    for (const [column, row] of positions) {
      const cell = this.getVisibleCell(column, row);
      if (!cell) {
        continue;
      }

      cell.classList.add("cell-hit", `cell-tone-${paylineIndex}`);
    }
  }

  markAllReels(className) {
    for (const wrap of this.reelWraps) {
      wrap.classList.add(className);
    }
  }

  getPaylineCount() {
    return Math.max(this.config.paylines.length, this.config.ui.lineColors.length);
  }

  getVisibleCell(column, row) {
    return this.reelTracks[column]?.querySelector(`.rs.${this.config.reels.rowClasses[row]}`);
  }

  getPaylineWinClass(paylineIndex) {
    return this.config.paylines[paylineIndex]?.resultClass ?? "win0";
  }

  getPaylinePolylinePoints(payline) {
    return this.getPolylinePointsFromPositions(payline.positions);
  }

  getManagerGuideCardMarkup(card, kind = "pattern") {
    return kind === "symbol"
      ? this.getSymbolGuideMarkup(card)
      : this.getPatternGuideMarkup(card);
  }

  getManagerGuideChipMarkup(card, activeId) {
    return `<button
        class="manager-guide-chip${card.id === activeId ? " active" : ""}"
        type="button"
        data-guide-card-select="${card.id}"
        role="tab"
        aria-selected="${card.id === activeId ? "true" : "false"}"
      >${card.name}</button>`;
  }

  getPatternGuideMarkup(pattern) {
    const cells = pattern.grid
      .map((row, rowIndex) =>
        row.split("").map((cell, columnIndex) =>
          `<span class="pattern-mini-cell${cell === "1" ? " is-on" : ""}" data-row="${rowIndex}" data-col="${columnIndex}"></span>`,
        ).join(""),
      )
      .join("");

    return `<details class="pattern-guide-card" open>
        <summary class="pattern-guide-summary">
          <span class="pattern-guide-top">
            <span class="pattern-guide-name">${pattern.name}</span>
            <span class="pattern-guide-mult">x${pattern.multiplier.toFixed(1)}</span>
          </span>
          <span class="pattern-guide-desc">${pattern.description}</span>
        </summary>
        <div class="pattern-guide-body">
          <div class="pattern-mini-grid">${cells}</div>
        </div>
      </details>`;
  }

  getSymbolGuideMarkup(symbol) {
    const multiplierLabel = symbol.multiplierLabel
      ?? `x${Number.isInteger(symbol.multiplier) ? symbol.multiplier : Number(symbol.multiplier).toFixed(1)}`;

    return `<details class="pattern-guide-card symbol-guide-card" open>
        <summary class="pattern-guide-summary">
          <span class="pattern-guide-top">
            <span class="pattern-guide-name">${symbol.name}</span>
            <span class="pattern-guide-mult">${multiplierLabel}</span>
          </span>
          <span class="pattern-guide-desc">${symbol.description}</span>
        </summary>
        <div class="pattern-guide-body symbol-guide-body">
          <div class="symbol-guide-mark">
            <span class="symbol-badge symbol-${symbol.id} symbol-guide">
              <span class="symbol-mark" aria-hidden="true">${this.getSymbolMarkSvg(symbol.id)}</span>
              <span class="symbol-code">${symbol.icon}</span>
            </span>
          </div>
        </div>
      </details>`;
  }

  paintSymbolCell(cell, symbol, rowIndex) {
    cell.dataset.symbolId = symbol.id;
    cell.dataset.symbolFamily = symbol.family ?? "";
    cell.dataset.symbolVariant = rowIndex >= 0 && rowIndex < this.config.reels.rows ? "reel" : "buffer";
    cell.innerHTML = this.getSymbolMarkup(symbol, "reel");
  }

  getSymbolMarkup(symbol, variant = "reel") {
    return `<span class="symbol-badge symbol-${symbol.id} symbol-${variant}">
      <span class="symbol-mark" aria-hidden="true">${this.getSymbolMarkSvg(symbol.id)}</span>
      <span class="symbol-code">${symbol.icon}</span>
    </span>`;
  }

  getSymbolMarkSvg(symbolId) {
    const marks = {
      cherry: `
        <svg viewBox="0 0 32 32" fill="none">
          <circle cx="11" cy="20" r="5.5" class="glyph-fill"/>
          <circle cx="21" cy="20" r="5.5" class="glyph-fill"/>
          <path d="M16 11C14 8 12 6 8 5" class="glyph-stroke"/>
          <path d="M16 11C18 8 21 6 24 7" class="glyph-stroke"/>
          <path d="M15 8C17 6 20 5 23 6" class="glyph-leaf"/>
        </svg>`,
      lemon: `
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M7 16C7 11 11 8 16 8C21 8 25 11 25 16C25 21 21 24 16 24C11 24 7 21 7 16Z" class="glyph-fill"/>
          <path d="M10 13C12 11 20 11 22 13" class="glyph-stroke"/>
          <path d="M16 8C18 6 21 5 24 6" class="glyph-leaf"/>
        </svg>`,
      diamond: `
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M10 10H22L26 15L16 25L6 15L10 10Z" class="glyph-fill"/>
          <path d="M10 10L16 25L22 10M6 15H26" class="glyph-stroke"/>
        </svg>`,
      clover: `
        <svg viewBox="0 0 32 32" fill="none">
          <circle cx="12" cy="11" r="4.5" class="glyph-fill"/>
          <circle cx="20" cy="11" r="4.5" class="glyph-fill"/>
          <circle cx="12" cy="19" r="4.5" class="glyph-fill"/>
          <circle cx="20" cy="19" r="4.5" class="glyph-fill"/>
          <path d="M16 19V26C16 27 15 27 14 26" class="glyph-stroke"/>
        </svg>`,
      treasure: `
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M8 13L11 9H21L24 13V23H8V13Z" class="glyph-fill"/>
          <path d="M8 13H24M12 17H20M16 13V23" class="glyph-stroke"/>
          <path d="M12 9L14 6H18L20 9" class="glyph-leaf"/>
        </svg>`,
      bell: `
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M10 22V16C10 12 12 9 16 9C20 9 22 12 22 16V22H10Z" class="glyph-fill"/>
          <path d="M8 22H24M14 25H18M16 9V7" class="glyph-stroke"/>
          <circle cx="16" cy="23" r="1.8" class="glyph-leaf"/>
        </svg>`,
      devil: `
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M11 11L9 7L13 8M21 11L23 7L19 8" class="glyph-stroke"/>
          <path d="M10 12C10 9 12 8 16 8C20 8 22 9 22 12V19C22 22 20 24 16 24C12 24 10 22 10 19V12Z" class="glyph-fill"/>
          <path d="M13 17H14M18 17H19M13 20C15 22 17 22 19 20" class="glyph-stroke"/>
        </svg>`,
      jackpot: `
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M8 9H25V12L18 24H13.8L20.4 13.6H8V9Z" class="glyph-fill"/>
          <path d="M8 9H25V12L18 24H13.8L20.4 13.6H8V9Z" class="glyph-stroke"/>
          <path d="M23.5 5.5L24.5 8.2L27.5 8.4L25.1 10.1L25.9 12.8L23.5 11.3L21.1 12.8L21.9 10.1L19.5 8.4L22.5 8.2L23.5 5.5Z" class="glyph-leaf"/>
          <circle cx="9.5" cy="21.5" r="1.6" class="glyph-leaf"/>
        </svg>`,
    };

    return marks[symbolId] ?? marks.jackpot;
  }

  getPolylinePointsFromPositions(positions) {
    return positions
      .map(([column, row]) => {
        const x = ((column + 0.5) / this.config.reels.columns) * 100;
        const y = ((row + 0.5) / this.config.reels.rows) * 100;
        return `${x},${y}`;
      })
      .join(" ");
  }
}
