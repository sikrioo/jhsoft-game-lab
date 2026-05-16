import { createInitialGameState } from "../domain/entities/createInitialGameState.js";
import { describeCombo, updateCombo } from "../domain/services/comboPolicy.js";
import { advanceDeadline, depositCoins } from "../domain/services/progressionService.js";
import { evaluateSpin } from "../domain/services/spinEvaluator.js";
import { getWeightedSymbolPool, refreshSymbolWeights } from "../domain/services/symbolWeightService.js";
import { buildSpinGrid, createSymbolPicker } from "../domain/services/spinFactory.js";
import { sleep } from "../shared/utils/core.js";

export class SlotGameApp {
  constructor({ config, view, fx }) {
    this.config = config;
    this.view = view;
    this.fx = fx;
    this.state = createInitialGameState(config);
    refreshSymbolWeights(this.state, this.config);
    this.pickSymbol = createSymbolPicker(() => getWeightedSymbolPool(this.config, this.state));
  }

  init() {
    this.state.grid = buildSpinGrid(this.config, this.pickSymbol);
    this.view.buildReels(this.state.grid, this.pickSymbol);
    this.view.renderItems(this.config);
    this.refreshWeightUi();
    this.view.renderCombo(describeCombo(this.state.combo));
    this.view.renderState(this.state, this.config);
    this.view.bindActions({
      onSpin: () => this.handleSpin(),
      onDeposit: () => this.handleDeposit(),
      onNext: () => this.handleNextDeadline(),
    });

    this.fx.resize();
    this.fx.start();
    window.addEventListener("resize", () => this.fx.resize());
  }

  async handleSpin() {
    if (this.state.spinning) {
      return;
    }

    if (this.state.coins < this.config.costs.spin) {
      this.view.renderGlobalResult("NOT ENOUGH COINS", "bad");
      return;
    }

    this.state.spinning = true;
    this.state.coins -= this.config.costs.spin;
    this.state.coinDisplay = this.state.coins;
    this.view.setSpinEnabled(false);
    this.view.clearOutcome();
    this.view.renderState(this.state, this.config);
    await this.view.playLeverPull();

    const finalGrid = buildSpinGrid(this.config, this.pickSymbol);

    await this.view.animateSpin(finalGrid, this.pickSymbol, (_column, center) => {
      this.fx.resize();
      this.fx.emitBurst(center.x, center.y, 5, this.config.ui.neutralBurst);
    });

    await sleep(100);

    const outcome = evaluateSpin({
      grid: finalGrid,
      state: this.state,
      config: this.config,
    });

    this.state.grid = finalGrid;
    this.view.renderOutcome(outcome);
    await this.resolveSpinOutcome(outcome);

    this.state.spinning = false;
    this.view.setSpinEnabled(true);
  }

  handleDeposit() {
    const { amount } = depositCoins(this.state, this.config);
    if (amount <= 0) {
      return;
    }

    this.fx.resize();
    this.fx.emitBurst(this.fx.canvas.width / 2, this.fx.canvas.height * 0.5, 20, this.config.ui.depositBurst);
    this.view.showFloatingNumber(`PAID ${amount}`, this.config.ui.depositFloat);
    this.view.renderState(this.state, this.config);
  }

  handleNextDeadline() {
    const result = advanceDeadline(this.state, this.config);

    if (result.status === "gameover") {
      this.fx.flash(this.config.ui.lossFlash, 0.8, 0.04);
      this.view.showOverlay({
        theme: "bd",
        title: "GAME OVER",
        subtitle: "",
        delta: result.shortfall,
        isLoss: true,
      });
      this.view.renderState(this.state, this.config);
      this.refreshWeightUi();
      return;
    }

    this.refreshWeightUi();
    this.view.renderState(this.state, this.config);
  }

  async resolveSpinOutcome(outcome) {
    const machineMetrics = this.view.getMachineMetrics();

    for (const stage of outcome.stages) {
      this.view.appendChainStage(stage);

      for (const entry of stage.entries) {
        this.view.appendChainEntry(stage.key, entry);
        this.primeHudCue(entry);
        const comboBurstPromise =
          entry.effect === "combo-gain"
            ? Promise.resolve()
            : this.view.showHudCallout(entry);
        await Promise.all([
          comboBurstPromise,
          this.applyChainEntry(entry, machineMetrics),
        ]);
        await sleep(entry.effect === "none" ? 50 : 120);
      }
    }

    await this.view.showFinalSummary(this.buildSpinSummary(outcome));
    this.view.renderState(this.state, this.config);
  }

  async applyChainEntry(entry, machineMetrics) {
    switch (entry.effect) {
      case "line-win":
        this.emitRowReward(machineMetrics, entry.row, entry.color, entry.coinDelta);
        await this.applyCoinDelta(entry.coinDelta);
        return;

      case "arm-jackpot":
        this.fx.flash(this.config.ui.jackpotFlash, 0.35, 0.08);
        return;

      case "arm-devil":
        this.fx.flash(this.config.ui.devilFlash, 0.35, 0.08);
        return;

      case "count-bonus":
      case "multi-bonus":
      case "pattern-bonus":
      case "item-bonus":
        this.view.showFloatingNumber(this.formatDelta(entry.coinDelta), entry.color ?? this.config.ui.gainFloat);
        this.fx.flash(entry.color ?? this.config.ui.gainFloat, 0.2, 0.08);
        await this.applyCoinDelta(entry.coinDelta);
        return;

      case "count-penalty":
        this.fx.flash(this.config.ui.lossFlash, 0.25, 0.08);
        await this.applyCoinDelta(entry.coinDelta);
        return;

      case "combo-gain":
        updateCombo(this.state, entry.comboDelta);
        this.view.popComboValue();
        {
          const comboView = describeCombo(this.state.combo);
          this.view.renderCombo(comboView);
          this.refreshWeightUi();
          await this.view.showComboBurst(comboView, entry.comboDelta);
        }
        this.view.showFloatingNumber(`COMBO +${entry.comboDelta}`, this.config.ui.comboFloat);
        this.fx.flash(this.config.ui.comboFloat, 0.28, 0.07);
        return;

      case "combo-reset":
        updateCombo(this.state, "reset");
        this.view.renderCombo(describeCombo(this.state.combo));
        this.refreshWeightUi();
        this.fx.flash(this.config.ui.lossFlash, 0.24, 0.08);
        return;

      case "event-jackpot":
        this.state.tickets += entry.ticketsDelta ?? 0;
        this.view.markAllReels("jp");
        this.fx.flash(this.config.ui.jackpotFlash, 0.9, 0.04);
        this.playJackpotFx(machineMetrics, entry.row ?? 1);
        this.view.showOverlay(entry.overlay);
        await this.applyCoinDelta(entry.coinDelta);
        return;

      case "event-devil":
        this.view.markAllReels("devil");
        this.fx.flash(this.config.ui.devilFlash, 0.9, 0.04);
        this.fx.tint(this.config.ui.devilTint, 2000);
        this.view.showNoise();
        this.view.showOverlay(entry.overlay);
        await this.applyCoinDelta(entry.coinDelta);
        return;

      case "event-overdrive":
        this.fx.flash(this.config.ui.overdriveFlash, 0.45, 0.05);
        this.view.shakeMachine();
        this.view.showFloatingNumber(this.formatDelta(entry.coinDelta), this.config.ui.overdriveFlash);
        await this.applyCoinDelta(entry.coinDelta);
        return;

      case "event-fever":
        this.fx.flash(this.config.ui.feverFlash, 0.35, 0.05);
        this.view.showFloatingNumber(this.formatDelta(entry.coinDelta), this.config.ui.feverFlash);
        await this.applyCoinDelta(entry.coinDelta);
        return;

      default:
        return;
    }
  }

  primeHudCue(entry) {
    if (typeof entry.row === "number") {
      this.view.pulsePayline(entry.row);
    }

    if (typeof entry.row === "number" && entry.color && entry.row < this.config.reels.rows) {
      this.view.showRowSpotlight(entry.row, entry.color);
    }

    if (entry.effect === "arm-jackpot" && (entry.row ?? 99) < this.config.reels.rows) {
      this.view.showRowSpotlight(entry.row ?? 1, this.config.ui.jackpotFlash);
    }

    if (entry.effect === "arm-devil" && (entry.row ?? 99) < this.config.reels.rows) {
      this.view.showRowSpotlight(entry.row ?? 1, this.config.ui.devilFlash);
    }

    if (entry.effect === "event-overdrive") {
      this.view.showRowSpotlight(1, this.config.ui.overdriveFlash);
    }
  }

  emitRowReward(machineMetrics, row, color, gain) {
    const paylineCenter = machineMetrics.paylineCenters?.[row];
    const effectX = paylineCenter?.x ?? machineMetrics.centerX;
    const effectY = paylineCenter?.y ?? machineMetrics.rowCenters[Math.min(row, this.config.reels.rows - 1)] ?? machineMetrics.rowCenters[1];

    this.fx.emitBurst(effectX, effectY, 18, color);
    if (gain >= 50) {
      this.fx.emitStarBurst(effectX, effectY, 8, color);
    }
  }

  playJackpotFx(machineMetrics, row) {
    const paylineCenter = machineMetrics.paylineCenters?.[row];
    const centerX = paylineCenter?.x ?? machineMetrics.centerX;
    const rowCenter = paylineCenter?.y ?? machineMetrics.rowCenters[Math.min(row, this.config.reels.rows - 1)] ?? machineMetrics.rowCenters[1];

    for (let index = 0; index < 10; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 70;
      window.setTimeout(() => {
        this.fx.emitLightning(
          centerX,
          rowCenter,
          centerX + Math.cos(angle) * distance,
          rowCenter + Math.sin(angle) * distance,
          "#ff8040",
        );
      }, index * 35);
    }

    window.setTimeout(() => {
      this.fx.flash(this.config.ui.jackpotBurst, 0.5, 0.03);
      this.fx.emitBurst(centerX, rowCenter, 100, this.config.ui.jackpotBurst);
      this.fx.emitStarBurst(centerX, rowCenter, 50, this.config.ui.jackpotStars);
    }, 200);
  }

  async applyCoinDelta(delta) {
    if (!delta) {
      this.view.renderState(this.state, this.config);
      return;
    }

    const from = this.state.coinDisplay;
    this.state.coins = Math.max(0, this.state.coins + delta);
    this.state.coinDisplay = this.state.coins;

    await this.view.animateCoinCounter(
      from,
      this.state.coinDisplay,
      Math.min(900, 260 + Math.abs(delta) * 18),
      delta < 0,
      () => this.view.renderState(this.state, this.config),
    );
  }

  formatDelta(delta) {
    return `${delta >= 0 ? "+" : ""}${delta}`;
  }

  buildSpinSummary(outcome) {
    const stats = {
      coinDelta: 0,
      ticketsDelta: 0,
      comboDelta: 0,
      hasLoss: false,
      hasEvent: false,
      eventName: "",
    };

    for (const stage of outcome.stages) {
      for (const entry of stage.entries) {
        if (typeof entry.coinDelta === "number") {
          stats.coinDelta += entry.coinDelta;
        }
        if (typeof entry.ticketsDelta === "number") {
          stats.ticketsDelta += entry.ticketsDelta;
        }
        if (typeof entry.comboDelta === "number") {
          stats.comboDelta += entry.comboDelta;
        }
        if (entry.tone === "loss") {
          stats.hasLoss = true;
        }
        if (entry.effect?.startsWith("event-")) {
          stats.hasEvent = true;
          stats.eventName = entry.label;
        }
      }
    }

    if (stats.coinDelta < 0) {
      return {
        tone: "loss",
        headline: `${stats.coinDelta} COINS`,
        detail: `Chain collapsed. ${stats.eventName || "Loss event"} forced the payout negative.`,
      };
    }

    if (stats.hasEvent) {
      return {
        tone: "event",
        headline: `+${stats.coinDelta} COINS`,
        detail: `${stats.eventName || "EVENT"} fired with ${stats.ticketsDelta > 0 ? `+${stats.ticketsDelta} tickets and ` : ""}${stats.comboDelta > 0 ? `combo +${stats.comboDelta}.` : "chain overflow."}`,
      };
    }

    if (stats.coinDelta > 0) {
      return {
        tone: "gain",
        headline: `+${stats.coinDelta} COINS`,
        detail: `${stats.comboDelta > 0 ? `Combo advanced by ${stats.comboDelta}. ` : ""}Every bonus step stacked into the final payout.`,
      };
    }

    return {
      tone: stats.hasLoss ? "loss" : "gain",
      headline: "NO PAYOUT",
      detail: "This spin produced no lasting reward chain.",
    };
  }

  refreshWeightUi() {
    const weightState = refreshSymbolWeights(this.state, this.config);
    this.view.renderLegend(this.config, this.state);
    this.view.renderWeightNotes(weightState.notes);
    return weightState;
  }
}
