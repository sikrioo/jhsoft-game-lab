import { getComboMultiplier } from "./comboPolicy.js";

const STAGE_TITLES = {
  lines: "STEP 1 - LINE CHECK",
  counts: "STEP 2 - SYMBOL COUNTS",
  multi: "STEP 3 - MULTI LINE",
  patterns: "STEP 4 - PATTERN CHECK",
  items: "STEP 5 - ITEM CHAIN",
  combo: "STEP 6 - COMBO CHECK",
  events: "STEP 7 - EVENT CHECK",
};

export function evaluateSpin({ grid, state, config }) {
  const context = createEvaluationContext(grid, state, config);

  evaluateLines(context);
  evaluateSymbolCounts(context);
  evaluateMultiLines(context);
  evaluatePatterns(context);
  evaluateItems(context);
  evaluateCombo(context);
  evaluateEvents(context);

  return {
    rowResults: context.rowResults,
    stages: context.stages,
  };
}

function createEvaluationContext(grid, state, config) {
  return {
    grid,
    state,
    config,
    stages: [],
    rowResults: config.paylines.map((payline, paylineIndex) => ({
      row: paylineIndex,
      paylineId: payline.id,
      paylineLabel: payline.label,
      pathClass: payline.pathClass,
      status: "pending",
      message: "--",
      matchedSymbolIds: [],
      matchedPositions: [],
      gain: 0,
      multiplier: 1,
    })),
    lineWins: [],
    symbolCounts: countSymbols(grid),
    totalCoinDelta: 0,
    comboBuffer: 0,
    comboPlan: {
      reset: false,
      delta: 0,
    },
    specials: {
      jackpotRows: [],
      devilRows: [],
    },
  };
}

function evaluateLines(context) {
  const entries = [];
  const comboMultiplier = getComboMultiplier(context.state.combo);

  for (let paylineIndex = 0; paylineIndex < context.config.paylines.length; paylineIndex += 1) {
    const payline = context.config.paylines[paylineIndex];
    const line = payline.positions.map(([column, row]) => context.grid[column][row]);
    const leadRun = getLeadingRun(line, payline.positions);
    const bestRun = getBestContiguousRun(line, payline.positions, context.state.multipliers);
    const allSame = leadRun.count === line.length;
    const leadSymbol = leadRun.symbol;

    if (allSame && leadSymbol.special === "devil") {
      context.specials.devilRows.push(paylineIndex);
      context.rowResults[paylineIndex] = {
        row: paylineIndex,
        paylineId: payline.id,
        paylineLabel: payline.label,
        pathClass: payline.pathClass,
        status: "devil",
        message: "REVERSE JACKPOT ARMED",
        matchedSymbolIds: [leadSymbol.id],
        matchedPositions: leadRun.positions,
        gain: 0,
        multiplier: 1,
      };
      entries.push({
        label: payline.label,
        text: `${leadSymbol.icon} infernal alignment armed.`,
        tone: "loss",
        effect: "arm-devil",
        row: paylineIndex,
        focus: createFocus({
          rows: [paylineIndex],
          positions: leadRun.positions,
          color: context.config.ui.devilFlash,
        }),
      });
      continue;
    }

    if (allSame && leadSymbol.special === "jackpot") {
      context.specials.jackpotRows.push(paylineIndex);
      context.rowResults[paylineIndex] = {
        row: paylineIndex,
        paylineId: payline.id,
        paylineLabel: payline.label,
        pathClass: payline.pathClass,
        status: "jp",
        message: "JACKPOT ARMED",
        matchedSymbolIds: [leadSymbol.id],
        matchedPositions: leadRun.positions,
        gain: 0,
        multiplier: comboMultiplier,
      };
      entries.push({
        label: payline.label,
        text: `${leadSymbol.icon} jackpot alignment armed.`,
        tone: "event",
        effect: "arm-jackpot",
        row: paylineIndex,
        focus: createFocus({
          rows: [paylineIndex],
          positions: leadRun.positions,
          color: context.config.ui.jackpotFlash,
        }),
      });
      continue;
    }

    if (bestRun && bestRun.count >= 3) {
      const rowGain = Math.floor(context.state.multipliers[bestRun.symbol.id] * bestRun.count * 0.85);
      const gained = Math.round(rowGain * comboMultiplier);
      const matchedSymbolIds = [bestRun.symbol.id];
      const matchedPositions = bestRun.positions;

      context.totalCoinDelta += gained;
      context.lineWins.push({
        row: paylineIndex,
        paylineId: payline.id,
        paylineLabel: payline.label,
        pathClass: payline.pathClass,
        gain: gained,
        matchedSymbolIds,
        matchedPositions,
        matchedCount: bestRun.count,
        line,
      });
      context.rowResults[paylineIndex] = {
        row: paylineIndex,
        paylineId: payline.id,
        paylineLabel: payline.label,
        pathClass: payline.pathClass,
        status: payline.resultClass,
        message: `${bestRun.symbol.icon} x${bestRun.count} +${gained}`,
        matchedSymbolIds,
        matchedPositions,
        gain: gained,
        multiplier: comboMultiplier,
      };
      entries.push({
        label: payline.label,
        text: `${bestRun.symbol.icon} forms a ${bestRun.count}-chain -> +${gained}.`,
        tone: "gain",
        effect: "line-win",
        coinDelta: gained,
        row: paylineIndex,
        color: context.config.ui.lineColors[paylineIndex],
        focus: createFocus({
          rows: [paylineIndex],
          positions: matchedPositions,
          symbolIds: matchedSymbolIds,
          color: context.config.ui.lineColors[paylineIndex],
        }),
      });
      continue;
    }

    context.rowResults[paylineIndex] = {
      row: paylineIndex,
      paylineId: payline.id,
      paylineLabel: payline.label,
      pathClass: payline.pathClass,
      status: "lose",
      message: "NO MATCH",
      matchedSymbolIds: [],
      matchedPositions: [],
      gain: 0,
      multiplier: 1,
    };
  }

  if (entries.length === 0) {
    entries.push({
      label: "LINES",
      text: "No paylines connected.",
      tone: "neutral",
      effect: "none",
    });
  }

  context.stages.push(createStage("lines", entries));
}

function evaluateSymbolCounts(context) {
  const entries = [];
  const cherryCount = context.symbolCounts.get("cherry") ?? 0;
  const cloverCount = context.symbolCounts.get("clover") ?? 0;
  const diamondCount = context.symbolCounts.get("diamond") ?? 0;
  const jackpotCount = context.symbolCounts.get("jackpot") ?? 0;
  const devilCount = context.symbolCounts.get("devil") ?? 0;
  const countRules = context.config.countRules;

  if (cherryCount >= countRules.cherry.lowCount) {
    const coinDelta =
      cherryCount >= countRules.cherry.highCount
        ? countRules.cherry.highBonus
        : countRules.cherry.lowBonus;
    context.totalCoinDelta += coinDelta;
    entries.push({
      label: "CHERRY",
      text:
        cherryCount >= countRules.cherry.highCount
          ? `${cherryCount} cherries flood the floor -> +${coinDelta}.`
          : `${cherryCount} cherries sweeten the screen -> +${coinDelta}.`,
      tone: "gain",
      effect: "count-bonus",
      coinDelta,
      color: "#ff7aa8",
      focus: createSymbolFocus(context, "cherry", "#ff7aa8"),
    });
  }

  if (cloverCount >= countRules.clover.min) {
    const coinDelta = cloverCount * countRules.clover.perSymbol;
    context.totalCoinDelta += coinDelta;
    entries.push({
      label: "CLOVER",
      text: `${cloverCount} clovers on screen -> +${coinDelta}.`,
      tone: "gain",
      effect: "count-bonus",
      coinDelta,
      color: "#88d840",
      focus: createSymbolFocus(context, "clover", "#88d840"),
    });
  }

  if (diamondCount >= countRules.diamond.min) {
    const coinDelta = Math.max(
      diamondCount * countRules.diamond.perSymbol,
      Math.round(Math.max(context.totalCoinDelta, countRules.diamond.baseFloor) * countRules.diamond.ratio),
    );
    context.totalCoinDelta += coinDelta;
    entries.push({
      label: "DIAMOND",
      text: `${diamondCount} diamonds refract payout -> +${coinDelta}.`,
      tone: "event",
      effect: "count-bonus",
      coinDelta,
      color: "#40c8ff",
      focus: createSymbolFocus(context, "diamond", "#40c8ff"),
    });
  }

  if (jackpotCount >= countRules.jackpot.min) {
    const coinDelta = jackpotCount * countRules.jackpot.perSymbol;
    context.totalCoinDelta += coinDelta;
    entries.push({
      label: "SEVENS",
      text: `${jackpotCount} seven scatters -> +${coinDelta}.`,
      tone: "gain",
      effect: "count-bonus",
      coinDelta,
      color: "#ffdd40",
      focus: createSymbolFocus(context, "jackpot", "#ffdd40"),
    });
  }

  if (devilCount >= countRules.devil.min) {
    const coinDelta = -Math.min(countRules.devil.cap, devilCount * countRules.devil.perSymbol);
    context.totalCoinDelta += coinDelta;
    entries.push({
      label: "CURSE",
      text: `${devilCount} devil faces leak coins ${coinDelta}.`,
      tone: "loss",
      effect: "count-penalty",
      coinDelta,
      color: "#cc00ff",
      focus: createSymbolFocus(context, "devil", "#cc00ff"),
    });
  }

  if (entries.length === 0) {
    entries.push({
      label: "COUNTS",
      text: "No screen-wide symbol bonus fired.",
      tone: "neutral",
      effect: "none",
    });
  }

  context.stages.push(createStage("counts", entries));
}

function evaluateMultiLines(context) {
  const entries = [];
  const scoringRows = context.lineWins.length + context.specials.jackpotRows.length;

  if (scoringRows === 2) {
    const coinDelta = 18;
    context.totalCoinDelta += coinDelta;
    context.comboBuffer += 2;
    entries.push({
      label: "MULTI",
      text: "2 scoring paylines synchronize -> +18 and combo reserve +2.",
      tone: "event",
      effect: "multi-bonus",
      coinDelta,
      color: "#40c8ff",
      focus: createRowsFocus(context, getScoringRows(context), "#40c8ff"),
    });
  } else if (scoringRows >= 3) {
    const coinDelta = 36;
    context.totalCoinDelta += coinDelta;
    context.comboBuffer += 3;
    entries.push({
      label: "MULTI",
      text: "3 scoring paylines synchronize -> +36 and combo reserve +3.",
      tone: "event",
      effect: "multi-bonus",
      coinDelta,
      color: "#ff8a20",
      focus: createRowsFocus(context, getScoringRows(context), "#ff8a20"),
    });
  } else {
    entries.push({
      label: "MULTI",
      text: "No multi-line bonus this spin.",
      tone: "neutral",
      effect: "none",
    });
  }

  context.stages.push(createStage("multi", entries));
}

function evaluatePatterns(context) {
  const entries = [];
  const stackedColumns = [];
  const stackedPositions = [];

  for (let column = 0; column < context.config.reels.columns; column += 1) {
    const top = context.grid[column][0];
    const middle = context.grid[column][1];
    const bottom = context.grid[column][2];

    if (top.id === middle.id && middle.id === bottom.id) {
      stackedColumns.push(top);
      stackedPositions.push([column, 0], [column, 1], [column, 2]);
    }
  }

  if (stackedColumns.length > 0) {
    const coinDelta = stackedColumns.reduce(
      (sum, symbol) => sum + 12 + Math.floor(context.state.multipliers[symbol.id] * 0.5),
      0,
    );
    context.totalCoinDelta += coinDelta;
    entries.push({
      label: "STACK",
      text: `${stackedColumns.length} stacked columns detonate -> +${coinDelta}.`,
      tone: "gain",
      effect: "pattern-bonus",
      coinDelta,
      color: "#d4a020",
      focus: createFocus({
        positions: stackedPositions,
        color: "#d4a020",
      }),
    });
  }

  let mirrorPairs = 0;
  const mirrorPositions = [];
  for (let row = 0; row < context.config.reels.rows; row += 1) {
    if (context.grid[0][row].id === context.grid[4][row].id) {
      mirrorPairs += 1;
      mirrorPositions.push([0, row], [4, row]);
    }
    if (context.grid[1][row].id === context.grid[3][row].id) {
      mirrorPairs += 1;
      mirrorPositions.push([1, row], [3, row]);
    }
  }

  if (mirrorPairs >= 2) {
    const coinDelta = mirrorPairs * 7;
    context.totalCoinDelta += coinDelta;
    entries.push({
      label: "MIRROR",
      text: `${mirrorPairs} mirrored pairs echo -> +${coinDelta}.`,
      tone: "event",
      effect: "pattern-bonus",
      coinDelta,
      color: "#40c8ff",
      focus: createFocus({
        positions: mirrorPositions,
        color: "#40c8ff",
      }),
    });
  }

  if (entries.length === 0) {
    entries.push({
      label: "PATTERN",
      text: "No board pattern bonus detected.",
      tone: "neutral",
      effect: "none",
    });
  }

  context.stages.push(createStage("patterns", entries));
}

function evaluateItems(context) {
  const entries = [];
  const cloverRows = context.lineWins.filter((lineWin) => lineWin.matchedSymbolIds.includes("clover"));
  const bellRows = context.lineWins.filter((lineWin) => lineWin.matchedSymbolIds.includes("bell"));
  const crownCount = context.symbolCounts.get("crown") ?? 0;

  if (cloverRows.length > 0) {
    const base = cloverRows.reduce((sum, lineWin) => sum + lineWin.gain, 0);
    const coinDelta = Math.max(8, Math.round(base * 0.5));
    context.totalCoinDelta += coinDelta;
    entries.push({
      label: getItemName(context, "lucky-clover"),
      text: `Winning clover paylines bloom -> +${coinDelta}.`,
      tone: "gain",
      effect: "item-bonus",
      coinDelta,
      color: "#88d840",
      focus: mergeFocuses(cloverRows.map((lineWin) =>
        createFocus({
          rows: [lineWin.row],
          positions: lineWin.matchedPositions,
          symbolIds: ["clover"],
          color: "#88d840",
        }))),
    });
  }

  if (bellRows.length > 0) {
    const coinDelta = bellRows.reduce((sum, lineWin) => sum + lineWin.gain, 0);
    context.totalCoinDelta += coinDelta;
    entries.push({
      label: getItemName(context, "golden-bell"),
      text: `Bell payout echoes one extra time -> +${coinDelta}.`,
      tone: "gain",
      effect: "item-bonus",
      coinDelta,
      color: "#ffdd40",
      focus: mergeFocuses(bellRows.map((lineWin) =>
        createFocus({
          rows: [lineWin.row],
          positions: lineWin.matchedPositions,
          symbolIds: ["bell"],
          color: "#ffdd40",
        }))),
    });
  }

  if (crownCount >= 2) {
    const coinDelta = 18;
    context.totalCoinDelta += coinDelta;
    entries.push({
      label: getItemName(context, "crown-reserve"),
      text: `${crownCount} crowns unlock reserve coins -> +18.`,
      tone: "event",
      effect: "item-bonus",
      coinDelta,
      color: "#d4a020",
      focus: createSymbolFocus(context, "crown", "#d4a020"),
    });
  }

  if (entries.length === 0) {
    entries.push({
      label: "ITEMS",
      text: "Active relics stayed dormant.",
      tone: "neutral",
      effect: "none",
    });
  }

  context.stages.push(createStage("items", entries));
}

function evaluateCombo(context) {
  const entries = [];

  if (context.specials.devilRows.length > 0) {
    context.comboPlan = {
      reset: true,
      delta: 0,
    };
    entries.push({
      label: "COMBO",
      text: "Reverse jackpot severs the combo chain.",
      tone: "loss",
      effect: "combo-reset",
      focus: createRowsFocus(context, context.specials.devilRows, context.config.ui.devilFlash),
    });
    context.stages.push(createStage("combo", entries));
    return;
  }

  const baseCombo =
    context.totalCoinDelta > 0
      ? context.lineWins.length >= 2 || context.totalCoinDelta >= 60
        ? 2
        : 1
      : 0;
  const jackpotCombo = context.specials.jackpotRows.length > 0 ? 5 : 0;
  const comboDelta = baseCombo + context.comboBuffer + jackpotCombo;

  if (comboDelta <= 0) {
    context.comboPlan = {
      reset: true,
      delta: 0,
    };
    entries.push({
      label: "COMBO",
      text: "No chain sustain -> combo reset.",
      tone: "loss",
      effect: "combo-reset",
    });
  } else {
    context.comboPlan = {
      reset: false,
      delta: comboDelta,
    };
    entries.push({
      label: "COMBO",
      text: `Reserve +${comboDelta} combo -> ${context.state.combo} to ${context.state.combo + comboDelta}.`,
      tone: "event",
      effect: "combo-gain",
      comboDelta,
      focus: mergeFocuses(context.lineWins.map((lineWin) =>
        createFocus({
          rows: [lineWin.row],
          positions: lineWin.matchedPositions,
          symbolIds: lineWin.matchedSymbolIds,
          color: context.config.ui.comboFloat,
        }))),
    });
  }

  context.stages.push(createStage("combo", entries));
}

function evaluateEvents(context) {
  const entries = [];
  const projectedCombo = context.comboPlan.reset ? 0 : context.state.combo + context.comboPlan.delta;

  if (context.specials.devilRows.length > 0) {
    const penaltyBase = Math.max(0, context.state.coins + context.totalCoinDelta);
    const penalty = Math.max(15, Math.round(penaltyBase * 0.3));
    context.totalCoinDelta -= penalty;
    entries.push({
      label: "EVENT",
      text: `REVERSE JACKPOT consumes ${penalty} coins.`,
      tone: "loss",
      effect: "event-devil",
      coinDelta: -penalty,
      focus: createRowsFocus(context, context.specials.devilRows, context.config.ui.devilFlash),
      overlay: {
        theme: "dv",
        title: "6  6  6  6  6",
        subtitle: "REVERSE JACKPOT",
        delta: penalty,
        isLoss: true,
      },
    });
    context.stages.push(createStage("events", entries));
    return;
  }

  if (context.specials.jackpotRows.length > 0) {
    const jackpotMultiplier = getComboMultiplier(projectedCombo);
    const coinDelta = Math.round(context.state.multipliers.jackpot * 15 * jackpotMultiplier);
    context.totalCoinDelta += coinDelta;
    entries.push({
      label: "EVENT",
      text: `JACKPOT cashout erupts -> +${coinDelta} and +${context.config.rewards.jackpotTickets} tickets.`,
      tone: "gain",
      effect: "event-jackpot",
      coinDelta,
      ticketsDelta: context.config.rewards.jackpotTickets,
      row: context.specials.jackpotRows[0] ?? 1,
      focus: createRowsFocus(context, context.specials.jackpotRows, context.config.ui.jackpotFlash),
      overlay: {
        theme: "gd",
        title: "LUCKY  7  7  7",
        subtitle: "JACKPOT",
        delta: coinDelta,
        isLoss: false,
        bonusText: `+${context.config.rewards.jackpotTickets} TICKETS`,
      },
    });
  }

  if (context.lineWins.length >= 3) {
    const coinDelta = 40;
    context.totalCoinDelta += coinDelta;
    entries.push({
      label: "OVERDRIVE",
      text: "3+ paylines fired together -> +40 overdrive bonus.",
      tone: "event",
      effect: "event-overdrive",
      coinDelta,
      color: "#ff8a20",
      focus: createRowsFocus(context, context.lineWins.map((lineWin) => lineWin.row), "#ff8a20"),
    });
  }

  if (projectedCombo >= 20) {
    const coinDelta = 25;
    context.totalCoinDelta += coinDelta;
    entries.push({
      label: "FEVER",
      text: `Combo ${projectedCombo} enters FEVER MODE -> +25.`,
      tone: "event",
      effect: "event-fever",
      coinDelta,
      color: "#40c8ff",
      focus: mergeFocuses(context.lineWins.map((lineWin) =>
        createFocus({
          rows: [lineWin.row],
          positions: lineWin.matchedPositions,
          symbolIds: lineWin.matchedSymbolIds,
          color: "#40c8ff",
        }))),
    });
  }

  if (entries.length === 0) {
    entries.push({
      label: "EVENT",
      text: "No special event triggered.",
      tone: "neutral",
      effect: "none",
    });
  }

  context.stages.push(createStage("events", entries));
}

function countSymbols(grid) {
  const counts = new Map();

  for (const column of grid) {
    for (const symbol of column) {
      counts.set(symbol.id, (counts.get(symbol.id) ?? 0) + 1);
    }
  }

  return counts;
}

function getItemName(context, itemId) {
  return context.config.items.active.find((item) => item.id === itemId)?.name ?? "ITEM";
}

function createStage(key, entries) {
  return {
    key,
    title: STAGE_TITLES[key],
    entries,
  };
}

function createRowsFocus(context, rows, color) {
  const uniqueRows = [...new Set(rows)].filter((row) => Number.isInteger(row));
  const positions = uniqueRows.flatMap((row) => context.rowResults[row]?.matchedPositions?.length
    ? context.rowResults[row].matchedPositions
    : context.config.paylines[row]?.positions ?? []);
  return createFocus({ rows: uniqueRows, positions, color });
}

function createSymbolFocus(context, symbolId, color) {
  const positions = findSymbolPositions(context.grid, symbolId);
  return createFocus({ positions, symbolIds: [symbolId], color });
}

function getScoringRows(context) {
  return [
    ...context.lineWins.map((lineWin) => lineWin.row),
    ...context.specials.jackpotRows,
  ];
}

function findSymbolPositions(grid, symbolId) {
  const positions = [];

  for (let column = 0; column < grid.length; column += 1) {
    for (let row = 0; row < grid[column].length; row += 1) {
      if (grid[column][row].id === symbolId) {
        positions.push([column, row]);
      }
    }
  }

  return positions;
}

function createFocus({ rows = [], positions = [], symbolIds = [], color = "" }) {
  const uniqueRows = [...new Set(rows)].filter((row) => Number.isInteger(row));
  const uniquePositions = dedupePositions(positions);
  const uniqueColumns = [...new Set(uniquePositions.map(([column]) => column))];

  return {
    rows: uniqueRows,
    positions: uniquePositions,
    columns: uniqueColumns,
    symbolIds: [...new Set(symbolIds)],
    color,
  };
}

function mergeFocuses(focuses) {
  const validFocuses = focuses.filter(Boolean);
  if (validFocuses.length === 0) {
    return null;
  }

  return createFocus({
    rows: validFocuses.flatMap((focus) => focus.rows ?? []),
    positions: validFocuses.flatMap((focus) => focus.positions ?? []),
    symbolIds: validFocuses.flatMap((focus) => focus.symbolIds ?? []),
    color: validFocuses.find((focus) => focus.color)?.color ?? "",
  });
}

function dedupePositions(positions) {
  const seen = new Set();
  const uniquePositions = [];

  for (const [column, row] of positions) {
    const key = `${column}:${row}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniquePositions.push([column, row]);
  }

  return uniquePositions;
}

function getLeadingRun(line, positions) {
  const symbol = line[0];
  const matchedPositions = [positions[0]];

  for (let index = 1; index < line.length; index += 1) {
    if (line[index].id !== symbol.id) {
      break;
    }

    matchedPositions.push(positions[index]);
  }

  return {
    symbol,
    count: matchedPositions.length,
    positions: matchedPositions,
  };
}

function getBestContiguousRun(line, positions, multipliers) {
  let bestRun = null;
  let currentRun = {
    symbol: line[0],
    positions: [positions[0]],
  };

  const commitRun = () => {
    if (currentRun.positions.length < 3) {
      return;
    }

    const candidate = {
      symbol: currentRun.symbol,
      count: currentRun.positions.length,
      positions: [...currentRun.positions],
      score: (multipliers[currentRun.symbol.id] ?? 0) * currentRun.positions.length,
    };

    if (!bestRun) {
      bestRun = candidate;
      return;
    }

    if (candidate.count > bestRun.count) {
      bestRun = candidate;
      return;
    }

    if (candidate.count === bestRun.count && candidate.score > bestRun.score) {
      bestRun = candidate;
    }
  };

  for (let index = 1; index < line.length; index += 1) {
    if (line[index].id === currentRun.symbol.id) {
      currentRun.positions.push(positions[index]);
      continue;
    }

    commitRun();
    currentRun = {
      symbol: line[index],
      positions: [positions[index]],
    };
  }

  commitRun();
  return bestRun;
}
