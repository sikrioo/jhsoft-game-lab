import { weightedPick } from "../../shared/utils/core.js";

export function createSymbolPicker(symbolsSource, random = Math.random) {
  const getSymbols =
    typeof symbolsSource === "function"
      ? symbolsSource
      : () => symbolsSource;

  return () => weightedPick(getSymbols(), random);
}

export function buildSpinGrid(config, pickSymbol) {
  return Array.from({ length: config.reels.columns }, () =>
    Array.from({ length: config.reels.rows }, () => pickSymbol()),
  );
}
