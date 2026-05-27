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
    this.currentSpinWinTotal = 0;
    this.currentSpinNetDelta = 0;
    this.currentPatternRevealCount = 0;
    refreshSymbolWeights(this.state, this.config);
    this.pickSymbol = createSymbolPicker(() => getWeightedSymbolPool(this.config, this.state));
  }

  init() {
    this.state.grid = buildSpinGrid(this.config, this.pickSymbol);
    this.view.buildReels(this.state.grid, this.pickSymbol);
    this.view.renderManager(this.config);
    this.refreshWeightUi();
    this.view.renderCombo(describeCombo(this.state.combo));
    this.view.renderState(this.state, this.config);
    this.view.resetSpinWin();
    this.view.setManagerDialogue(this.buildManagerDialogue("intro"));
    this.view.bindActions({
      onSpin: () => this.handleSpin(),
      onDeposit: () => this.handleDeposit(),
      onNext: () => this.handleNextDeadline(),
      onManagerTopic: (topicId) => this.handleManagerTopic(topicId),
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
    this.currentSpinWinTotal = 0;
    this.currentSpinNetDelta = 0;
    this.currentPatternRevealCount = 0;
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
    this.view.showFloatingNumber(`PAID ${amount}`, this.config.ui.depositFloat, "ambient");
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

  handleManagerTopic(topicId) {
    this.view.setManagerDialogue(this.buildManagerDialogue(topicId), topicId);
  }

  async resolveSpinOutcome(outcome) {
    const machineMetrics = this.view.getMachineMetrics();

    for (const stage of outcome.stages) {
      const patternWins = stage.entries.filter((entry) => entry.effect === "pattern-win");
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

      if (stage.key === "patterns" && patternWins.length > 0) {
        this.view.finalizePatternWinHighlights(patternWins);
      }
    }

    await this.view.showFinalSummary(this.buildSpinSummary(outcome));
    await this.flushSpinSettlement();
    this.view.hideResolvedPaylines();
  }

  async applyChainEntry(entry, machineMetrics) {
    switch (entry.effect) {
      case "pattern-win":
        this.view.revealPatternWin(entry, this.currentPatternRevealCount);
        this.currentPatternRevealCount += 1;
        this.emitPatternReward(entry.focus?.positions ?? [], entry.color);
        if (entry.patternMultiplier >= 7) {
          this.fx.flash(entry.color ?? this.config.ui.gainFloat, entry.patternMultiplier >= 10 ? 0.42 : 0.26, 0.06);
        }
        this.view.playImpact(this.getImpactLevelForCoinDelta(entry.coinDelta));
        await this.applyCoinDelta(entry.coinDelta);
        return;

      case "combo-gain":
        updateCombo(this.state, entry.comboDelta);
        this.view.popComboValue();
        {
          const comboView = describeCombo(this.state.combo);
          this.view.renderCombo(comboView);
          this.refreshWeightUi();
          this.view.playImpact(this.getImpactLevelForCombo(comboView, entry.comboDelta));
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
        this.view.playImpact("light");
        return;

      case "combo-hold":
        this.view.renderCombo(describeCombo(this.state.combo));
        this.refreshWeightUi();
        return;

      case "event-jackpot":
        this.state.tickets += entry.ticketsDelta ?? 0;
        this.view.markAllReels("jp");
        this.fx.flash(this.config.ui.jackpotFlash, 0.9, 0.04);
        this.view.playImpact("heavy");
        this.playJackpotFx(machineMetrics, entry.row ?? 1);
        this.view.showOverlay(entry.overlay);
        await this.applyCoinDelta(entry.coinDelta);
        return;

      case "event-devil":
        this.view.markAllReels("devil");
        this.fx.flash(this.config.ui.devilFlash, 0.9, 0.04);
        this.fx.tint(this.config.ui.devilTint, 2000);
        this.view.showNoise();
        this.view.playImpact("heavy");
        if (entry.overlay) {
          this.view.showOverlay(entry.overlay);
        }
        if (entry.coinDelta) {
          await this.applyCoinDelta(entry.coinDelta);
        }
        return;

      default:
        return;
    }
  }

  primeHudCue(entry) {
    if (entry.effect === "pattern-win" && entry.focus?.positions?.length && entry.color) {
      const center = this.view.getFocusCenter(entry.focus.positions);
      this.fx.emitBurst(center.x, center.y, 12, entry.color);
    }
  }

  emitPatternReward(positions, color) {
    const center = this.view.getFocusCenter(positions);
    this.fx.emitBurst(center.x, center.y, 18, color);
  }

  playJackpotFx(machineMetrics, row = 1) {
    const centerX = machineMetrics.paylineCenters?.[row]?.x ?? machineMetrics.centerX;
    const centerY = machineMetrics.paylineCenters?.[row]?.y ?? machineMetrics.rowCenters?.[1] ?? 0;
    this.fx.emitBurst(centerX, centerY, 80, this.config.ui.jackpotBurst);
    this.fx.emitStarBurst(centerX, centerY, 30, this.config.ui.jackpotStars);
  }

  async applyCoinDelta(delta) {
    if (!delta) {
      return;
    }

    this.currentSpinNetDelta += delta;
    this.state.coins = Math.max(0, this.state.coins + delta);

    if (delta > 0) {
      this.currentSpinWinTotal += delta;
      this.view.updateSpinWin(this.currentSpinWinTotal, delta);
    }
  }

  formatDelta(delta) {
    return `${delta >= 0 ? "+" : ""}${delta}`;
  }

  async flushSpinSettlement() {
    const netDelta = this.currentSpinNetDelta;
    const from = this.state.coinDisplay;
    const to = this.state.coins;

    if (!netDelta) {
      this.view.renderState(this.state, this.config);
      return;
    }

    await this.view.playSpinWinCollect(netDelta > 0);
    this.view.showCoinDeltaHud(netDelta);
    this.view.playImpact(this.getImpactLevelForCoinDelta(netDelta));
    this.state.coinDisplay = to;

    await this.view.animateCoinCounter(
      from,
      to,
      Math.min(1100, 320 + Math.abs(netDelta) * 16),
      netDelta < 0,
      () => this.view.renderState(this.state, this.config),
    );

    this.currentSpinNetDelta = 0;
  }

  getImpactLevelForCoinDelta(delta = 0) {
    const amount = Math.abs(delta);
    if (amount >= 100) {
      return "heavy";
    }
    if (amount >= 35) {
      return "medium";
    }
    return "light";
  }

  getImpactLevelForCombo(comboView, comboDelta = 0) {
    if (comboView.multiplier >= 3 || comboView.combo >= 20 || comboDelta >= 5) {
      return "heavy";
    }
    if (comboView.multiplier >= 2 || comboView.combo >= 10 || comboDelta >= 3) {
      return "medium";
    }
    return "light";
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

    if (stats.hasLoss && stats.hasEvent) {
      return {
        tone: "loss",
        headline: "VOIDED SPIN",
        detail: `${stats.eventName || "DEVIL"} overrode the board before normal pattern rewards could cash out.`,
      };
    }

    if (stats.hasEvent) {
      return {
        tone: "event",
        headline: `+${stats.coinDelta} COINS`,
        detail: `${stats.eventName || "EVENT"} interrupted the pattern board. ${stats.comboDelta > 0 ? `Combo shifted by ${stats.comboDelta}.` : "Payout resolved outside the normal win chain."}`,
      };
    }

    if (stats.coinDelta > 0) {
      return {
        tone: "gain",
        headline: `+${stats.coinDelta} COINS`,
        detail: `${stats.comboDelta > 0 ? `Combo advanced by ${stats.comboDelta}. ` : ""}Pattern payout resolved from bet x symbol x pattern.`,
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

  buildManagerDialogue(topicId) {
    switch (topicId) {
      case "patterns":
        return {
          title: "PATTERNS",
          text: "This floor pays for shapes, not line chains. Read the board as a 3x5 field. Match the shape, then resolve the payout as bet x symbol x pattern. Open any card below and I will show you the silhouette the room recognizes.",
          guide: {
            kind: "pattern",
            eyebrow: "ALICE NOTES",
            intro: "Pick a pattern and I will show you what the room recognizes. The silhouette stays hidden until you ask for it.",
            cards: this.config.patternGuide,
          },
        };
      case "symbols":
        return {
          title: "SYMBOLS",
          text: "Cherry and Lemon pay x2. Clover and Bell pay x3. Diamond and Treasure pay x5. Seven pays x7. The symbol sets the base appetite. The pattern decides how severely the house indulges it.",
          guide: {
            kind: "symbol",
            eyebrow: "ALICE NOTES",
            intro: "Start with the mark itself. Open a symbol and I will show you its face, its payout tier, and whether it feeds you or erases you.",
            cards: this.config.symbolGuide,
          },
        };
      case "devil":
        return {
          title: "DEVIL",
          text: "DEVIL does not participate in normal symbol multiplication. If a registered devil pattern forms, 666 voids the spin before ordinary rewards are paid. Efficient, isn't it?",
        };
      case "combo":
        return {
          title: "COMBO",
          text: "Combo still exists, but not inside the payout formula. It tracks momentum only. For now, your coins come from bet x symbol x pattern. Nothing else is permitted to flatter you.",
        };
      case "odds":
        return {
          title: "ODDS",
          text: "Weights control appearance rate. Symbol and pattern multipliers control value after the shape is complete. Probability and worth are separate appetites. Do not confuse them.",
        };
      case "jackpot":
        return {
          title: "JACKPOT",
          text: "If the full 3x5 board becomes one non-devil symbol, Jackpot pays x10 on top of that symbol. A full screen of Sevens is not subtle. It is merely expensive.",
        };
      case "intro":
      default:
        return {
          title: "ALICE",
          text: "Ask precisely and I will explain the floor. I am here to guide your odds, not protect your future.",
        };
    }
  }
}
