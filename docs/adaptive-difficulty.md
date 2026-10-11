# V5 Adaptive Difficulty

Difficulty is adjusted from recent structured session scores, not from a generative model's opinion. Strong recent performance gradually raises the difficulty target; repeated underperformance lowers it and shifts the next scenario toward reinforcement conditions. The function is bounded and deterministic for the same history/current difficulty.

The next scenario is generated from Scenario DNA and a recorded seed. Each recommendation is a training suggestion for a synthetic environment, not an operational recommendation.
