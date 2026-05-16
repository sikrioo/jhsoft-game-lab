import { clamp } from "../../shared/utils/core.js";

const MIN_WEIGHT = 1;

const ITEM_WEIGHT_RULES = {
  "lucky-clover": {
    source: "Lucky Clover",
    modifiers: [{ symbolId: "clover", delta: 4 }],
  },
  "golden-bell": {
    source: "Golden Bell",
    modifiers: [{ symbolId: "bell", delta: 2 }],
  },
  "crown-reserve": {
    source: "Crown Reserve",
    modifiers: [{ symbolId: "crown", delta: 2 }],
  },
};

export function refreshSymbolWeights(state, config) {
  const previousWeights = state.symbolWeights ?? {};
  const nextWeights = createBaseWeightMap(config.symbols);
  const notes = [];

  applyItemModifiers(nextWeights, config, notes);
  applyRoundModifier(nextWeights, config.symbols, state.deadlineIndex, notes);
  applyComboModifier(nextWeights, config.symbols, state.combo, notes);

  state.symbolWeights = nextWeights;
  state.weightNotes = notes;

  return {
    weights: nextWeights,
    notes,
    changes: buildWeightChanges(config.symbols, previousWeights, nextWeights),
  };
}

export function getWeightedSymbolPool(config, state) {
  return config.symbols.map((symbol) => ({
    ...symbol,
    currentWeight: state.symbolWeights?.[symbol.id] ?? getBaseWeight(symbol),
  }));
}

function createBaseWeightMap(symbols) {
  return Object.fromEntries(
    symbols.map((symbol) => [symbol.id, getBaseWeight(symbol)]),
  );
}

function applyItemModifiers(weights, config, notes) {
  for (const item of config.items.active) {
    const rule = ITEM_WEIGHT_RULES[item.id];
    if (!rule) {
      continue;
    }

    for (const modifier of rule.modifiers) {
      modifyWeight(weights, modifier.symbolId, modifier.delta);
    }

    notes.push({
      source: rule.source,
      text: formatModifierText(config.symbols, rule.modifiers),
    });
  }
}

function applyRoundModifier(weights, symbols, deadlineIndex, notes) {
  if (deadlineIndex <= 0) {
    return;
  }

  const rareBoost = deadlineIndex;
  const chaosBoost = Math.max(0, deadlineIndex - 1);
  const modifiers = [
    { symbolId: "diamond", delta: rareBoost },
    { symbolId: "crown", delta: rareBoost },
    { symbolId: "bell", delta: rareBoost },
    { symbolId: "jackpot", delta: Math.max(1, chaosBoost) },
    { symbolId: "devil", delta: chaosBoost + Math.floor(deadlineIndex / 2) },
  ].filter((modifier) => modifier.delta > 0);

  for (const modifier of modifiers) {
    modifyWeight(weights, modifier.symbolId, modifier.delta);
  }

  notes.push({
    source: "Deadline Pressure",
    text: formatModifierText(symbols, modifiers),
  });
}

function applyComboModifier(weights, symbols, combo, notes) {
  if (combo < 10) {
    return;
  }

  const modifiers = [
    { symbolId: "clover", delta: combo >= 20 ? 4 : 2 },
    { symbolId: "diamond", delta: combo >= 20 ? 3 : 2 },
    { symbolId: "jackpot", delta: combo >= 20 ? 2 : 1 },
    { symbolId: "devil", delta: combo >= 20 ? 1 : 0 },
  ].filter((modifier) => modifier.delta > 0);

  for (const modifier of modifiers) {
    modifyWeight(weights, modifier.symbolId, modifier.delta);
  }

  notes.push({
    source: combo >= 20 ? "Fever Mode" : "Combo Heat",
    text: formatModifierText(symbols, modifiers),
  });
}

function modifyWeight(weights, symbolId, delta) {
  weights[symbolId] = clamp((weights[symbolId] ?? MIN_WEIGHT) + delta, MIN_WEIGHT, 999);
}

function buildWeightChanges(symbols, previousWeights, nextWeights) {
  return symbols
    .map((symbol) => {
      const before = previousWeights[symbol.id];
      const after = nextWeights[symbol.id];
      const delta = after - (before ?? getBaseWeight(symbol));

      return {
        symbolId: symbol.id,
        before: before ?? getBaseWeight(symbol),
        after,
        delta,
      };
    })
    .filter((entry) => entry.delta !== 0);
}

function getBaseWeight(symbol) {
  return clamp(symbol.baseWeight ?? symbol.weight ?? MIN_WEIGHT, MIN_WEIGHT, 999);
}

function formatModifierText(symbols, modifiers) {
  return modifiers
    .map(({ symbolId, delta }) => `${getSymbolName(symbols, symbolId)} ${delta > 0 ? "+" : ""}${delta}`)
    .join(" / ");
}

function getSymbolName(symbols, symbolId) {
  const symbol = symbols?.find((entry) => entry.id === symbolId);
  return symbol?.name ?? symbolId.toUpperCase();
}
