export class SlotMachineView {
  constructor(config) {
    this.config = config;
    this.root = document.getElementById("wrap");
    this.refs = {
      comboBar: document.getElementById("cbar"),
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
      spinButton: document.getElementById("bspin"),
      leverButton: document.getElementById("blever"),
      depositButton: document.getElementById("bdeposit"),
      nextButton: document.getElementById("bnext"),
      legend: document.getElementById("symrow"),
      itemPanel: document.getElementById("itempanel"),
      chainPanel: document.getElementById("chainpanel"),
      chainLog: document.getElementById("chainlog"),
      chainToggle: document.getElementById("bchaintoggle"),
      chainToggleState: document.getElementById("chaintogglestate"),
    };
    this.reelTracks = [];
    this.reelWraps = [];
    this.createHudLayer();
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

  bindActions(actions) {
    this.refs.spinButton.addEventListener("click", actions.onSpin);
    this.refs.leverButton.addEventListener("click", actions.onSpin);
    this.refs.depositButton.addEventListener("click", actions.onDeposit);
    this.refs.nextButton.addEventListener("click", actions.onNext);
    this.refs.chainToggle.addEventListener("click", () => this.toggleChainPanel());
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
        cell.textContent = symbol.icon;

        if (rowIndex >= 0 && rowIndex < this.config.reels.rows) {
          cell.dataset.symbolId = initialGrid[column][rowIndex].id;
          cell.textContent = initialGrid[column][rowIndex].icon;
        } else {
          cell.dataset.symbolId = symbol.id;
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

    for (const symbol of config.symbols) {
      const card = document.createElement("div");
      card.className = "sc2";

      const multiplierValue = state.multipliers[symbol.id];
      const valueText =
        symbol.special === "devil"
          ? "CURSE"
          : this.formatMultiplier(multiplierValue);
      const multiplierClass =
        symbol.special === "devil"
          ? "m curse"
          : `m ${this.getMultiplierTierClass(multiplierValue)}`;

      card.innerHTML = `<div class="e">${symbol.icon}</div><div class="${multiplierClass}">${valueText}</div>`;
      this.refs.legend.appendChild(card);
    }
  }

  renderItems(config) {
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

  renderCombo(comboView) {
    this.refs.comboBar.className = `cbar${comboView.className ? ` ${comboView.className}` : ""}`;
    this.refs.comboValue.textContent = String(comboView.combo);
    this.refs.comboMultiplier.textContent = comboView.combo >= 3 ? this.formatMultiplier(comboView.multiplier) : "";
    this.refs.comboMultiplier.className = comboView.combo >= 3
      ? `cb-mult ${this.getMultiplierTierClass(comboView.multiplier)}`
      : "cb-mult";
    this.refs.comboFill.style.width = `${comboView.percent}%`;
    this.refs.comboFill.style.background =
      comboView.combo >= 20
        ? "#ff40ff"
        : comboView.combo >= 10
          ? "#40c8ff"
          : comboView.combo >= 5
            ? "#d4a020"
            : "#6a5828";
    this.refs.comboText.textContent = comboView.bonusText;
    this.renderComboFrame(comboView.combo);
  }

  popComboValue() {
    this.refs.comboValue.classList.remove("pop");
    void this.refs.comboValue.offsetWidth;
    this.refs.comboValue.classList.add("pop");
  }

  renderState(state, config) {
    const deadline = config.deadlines[state.deadlineIndex];
    this.refs.coinValue.textContent = String(state.coinDisplay);
    this.refs.ticketValue.textContent = String(state.tickets);
    this.refs.deadlineValue.textContent = String(deadline);
    this.refs.paidValue.textContent = String(state.paid);

    const percentage = Math.min(100, Math.round((state.paid / deadline) * 100));
    this.refs.paymentFill.style.width = `${percentage}%`;
    this.refs.paymentFill.style.background =
      percentage >= 100 ? "#30b060" : percentage >= 60 ? "#d4a020" : "#c05020";
    this.refs.paymentText.textContent = `${percentage}%`;
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
    this.resetPaylines();
    this.resetResultRows();
    this.resetChainLog();
    this.clearHud();
  }

  renderGlobalResult(message, className) {
    for (let row = 0; row < this.config.reels.rows; row += 1) {
      this.renderResultRow(row, message, className);
    }
  }

  renderOutcome(outcome, grid) {
    for (const rowResult of outcome.rowResults) {
      if (rowResult.status === "pending") {
        continue;
      }

      if (rowResult.status === "lose") {
        this.setPayline(rowResult.row, "lose");
        this.setPaylineLabel(rowResult.row, "lost");
        this.renderResultRow(rowResult.row, rowResult.message, "lose");
        continue;
      }

      if (rowResult.status === "devil") {
        this.setPayline(rowResult.row, "devil");
        this.setPaylineLabel(rowResult.row, "devil");
        this.renderResultRow(rowResult.row, rowResult.message, "devil");
        continue;
      }

      if (rowResult.status === "jp") {
        this.setPayline(rowResult.row, "win0");
        this.setPaylineLabel(rowResult.row, "win0");
        this.renderResultRow(rowResult.row, rowResult.message, "jp");
        continue;
      }

      this.setPayline(rowResult.row, rowResult.status);
      this.setPaylineLabel(rowResult.row, rowResult.status);
      this.renderResultRow(rowResult.row, rowResult.message, rowResult.status);
      this.highlightMatchingColumns(rowResult.row, rowResult.matchedSymbolIds, grid);
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

  showFloatingNumber(text, color) {
    const element = document.createElement("div");
    element.className = "fn";
    element.textContent = text;
    element.style.color = color;
    element.style.textShadow = `0 0 12px ${color}`;
    element.style.left = `${60 + Math.random() * 230}px`;
    element.style.top = `${120 + Math.random() * 80}px`;
    this.root.appendChild(element);

    window.setTimeout(() => element.remove(), 1400);
  }

  shakeMachine() {
    this.root.classList.remove("shk");
    void this.root.offsetWidth;
    this.root.classList.add("shk");
    window.setTimeout(() => this.root.classList.remove("shk"), 380);
  }

  showNoise(duration = 1800) {
    const noise = document.createElement("div");
    noise.className = "crt-noise";
    this.root.appendChild(noise);
    window.setTimeout(() => noise.remove(), duration);
  }

  getMachineMetrics() {
    const machineRect = this.refs.reelMachine.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();

    return {
      centerX: machineRect.left - rootRect.left + machineRect.width / 2,
      rowCenters: [0, 1, 2].map(
        (row) => machineRect.top - rootRect.top + this.config.reels.rowHeight * (row + 0.5) + 10,
      ),
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
        cell.textContent = symbol.icon;
        cell.dataset.symbolId = symbol.id;
        cell.className = `rs ${this.getRowClass(rowIndex)}`;
        return;
      }

      const filler = pickSymbol();
      cell.textContent = filler.icon;
      cell.dataset.symbolId = filler.id;
      cell.className = "rs buffer";
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
            cell.textContent = symbol.icon;
            cell.dataset.symbolId = symbol.id;
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
      wrap.classList.remove("hit-r0", "hit-r1", "hit-r2", "jp", "devil");
    }
  }

  resetPaylines() {
    for (let row = 0; row < this.config.reels.rows; row += 1) {
      this.setPayline(row, "idle");
      this.setPaylineLabel(row, "lost");
    }
  }

  resetResultRows() {
    for (let row = 0; row < this.config.reels.rows; row += 1) {
      this.renderResultRow(row, "--", "");
    }
  }

  resetChainLog() {
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
    section.appendChild(row);
    this.refs.chainLog.scrollTop = this.refs.chainLog.scrollHeight;
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
    const beam = document.createElement("div");
    beam.className = "hud-row-beam";
    beam.style.top = `${this.getMachineMetrics().rowCenters[row]}px`;
    beam.style.setProperty("--beam-color", color);
    beam.style.setProperty("--beam-soft", `${color}22`);
    beam.style.setProperty("--beam-core", `${color}44`);
    this.hudRefs.beams.appendChild(beam);
    window.setTimeout(() => beam.remove(), 700);
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
    if (entry.effect === "item-bonus") {
      return "RELIC TRIGGER";
    }
    if (entry.effect === "pattern-bonus") {
      return "PATTERN READ";
    }
    if (entry.effect === "multi-bonus") {
      return "MULTI WIN";
    }
    if (entry.effect === "count-bonus" || entry.effect === "count-penalty") {
      return "SCREEN COUNT";
    }
    if (entry.effect === "line-win") {
      return "PAYLINE HIT";
    }
    if (entry.effect === "arm-jackpot") {
      return "JACKPOT LOCK";
    }
    if (entry.effect === "arm-devil") {
      return "CURSE LOCK";
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
    rowElement.className = `res-row${className ? ` ${className}` : ""}`;
    textElement.textContent = message;
  }

  setPayline(row, className) {
    const line = document.getElementById(`pll${row}`);
    line.className = `pl-line row${row} ${className}`;
  }

  setPaylineLabel(row, className) {
    const label = document.getElementById(`pl${row}`);
    label.className = `pl-label ${className}`;
  }

  highlightMatchingColumns(row, matchedSymbolIds, grid) {
    for (let column = 0; column < this.config.reels.columns; column += 1) {
      if (matchedSymbolIds.includes(grid[column][row].id)) {
        this.reelWraps[column].classList.add(`hit-r${row}`);
      }
    }
  }

  markAllReels(className) {
    for (const wrap of this.reelWraps) {
      wrap.classList.add(className);
    }
  }
}
