export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function weightedPick(items, random = Math.random) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random() * totalWeight;

  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}
