export function getCurrentDeadline(state, config) {
  return config.deadlines[state.deadlineIndex];
}

export function depositCoins(state, config) {
  const deadline = getCurrentDeadline(state, config);
  const amount = Math.min(state.coins, deadline - state.paid);

  if (amount <= 0) {
    return { amount: 0 };
  }

  state.coins -= amount;
  state.paid += amount;
  state.coinDisplay = state.coins;

  return { amount };
}

export function advanceDeadline(state, config) {
  const deadline = getCurrentDeadline(state, config);

  if (state.paid < deadline) {
    const shortfall = deadline - state.paid;
    state.coins = 0;
    state.tickets = 0;
    state.coinDisplay = 0;

    return {
      status: "gameover",
      shortfall,
    };
  }

  state.deadlineIndex = Math.min(state.deadlineIndex + 1, config.deadlines.length - 1);
  state.paid = 0;
  state.coins += config.rewards.advanceCoins;
  state.tickets += config.rewards.advanceTickets;
  state.coinDisplay = state.coins;

  for (const symbol of config.symbols) {
    state.multipliers[symbol.id] = Math.floor(
      state.multipliers[symbol.id] * config.rewards.multiplierGrowth,
    );
  }

  return {
    status: "advanced",
  };
}
