// Quick debug script to test consensus calculation
// Simulate GuessSource enum
const GuessSource = { InApp: 'InApp' };

// Simulate 111 guesses with std dev of 9 around target 50
const target = 50;
const stdDev = 9;
const count = 111;

// Generate test guesses
const guesses = [];
for (let i = 0; i < count; i++) {
  // Box-Muller transform (same as dev tools)
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  const value = Math.max(0, Math.min(100, Math.round(target + z * stdDev)));
  
  guesses.push({
    guessId: `test_${i}`,
    gameId: 'test-game',
    userId: `user_${i}`,
    username: `user${i}`,
    value: value,
    createdAt: new Date().toISOString(),
    source: GuessSource.InApp
  });
}

console.log(`Generated ${guesses.length} guesses`);
console.log(`Sample values: ${guesses.slice(0, 10).map(g => g.value).join(', ')}`);

// Calculate standard deviation manually
const values = guesses.map(g => g.value);
const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
const calculatedStdDev = Math.sqrt(variance);

console.log(`Mean: ${mean.toFixed(2)}`);
console.log(`Calculated std dev: ${calculatedStdDev.toFixed(2)}`);
console.log(`Expected std dev: ${stdDev}`);
