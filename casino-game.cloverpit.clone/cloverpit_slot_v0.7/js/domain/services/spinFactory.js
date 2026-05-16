import { weightedPick } from "../../shared/utils/core.js";

export function createSymbolPicker(symbols, random = Math.random) {
  return () => weightedPick(symbols, random);
}

export function buildSpinGrid(config, pickSymbol) {
  return Array.from({ length: config.reels.columns }, () =>
    Array.from({ length: config.reels.rows }, () => pickSymbol()),
  );
}
