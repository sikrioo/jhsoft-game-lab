import { clamp } from "../../shared/utils/core.js";

const COMBO_STAGES = [3, 5, 10, 20, 30];

export function getComboMultiplier(combo) {
  if (combo >= 20) return 3;
  if (combo >= 10) return 2;
  if (combo >= 5) return 1.5;
  if (combo >= 3) return 1.2;
  return 1;
}

export function getComboClassName(combo) {
  if (combo >= 20) return "c20";
  if (combo >= 10) return "c10";
  if (combo >= 5) return "c5";
  if (combo >= 3) return "c3";
  return "";
}

export function updateCombo(state, delta) {
  if (delta === "reset") {
    state.combo = 0;
    return state.combo;
  }

  state.combo = clamp(state.combo + delta, 0, 30);
  return state.combo;
}

export function describeCombo(combo) {
  const multiplier = getComboMultiplier(combo);
  const className = getComboClassName(combo);
  const nextStage = COMBO_STAGES.find((stage) => stage > combo) ?? 30;
  const previousStage = COMBO_STAGES[COMBO_STAGES.indexOf(nextStage) - 1] ?? 0;
  const percent = Math.min(
    100,
    Math.round(((combo - previousStage) / (nextStage - previousStage || 1)) * 100),
  );

  return {
    combo,
    multiplier,
    className,
    percent,
    bonusText:
      combo >= 20
        ? "OVERDRIVE!"
        : combo >= 10
          ? "HOT x2"
          : combo >= 5
            ? "WARM x1.5"
            : combo >= 3
              ? "LIT x1.2"
              : "NO BONUS",
  };
}
