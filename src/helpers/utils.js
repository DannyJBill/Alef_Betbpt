/** Fisher-Yates shuffle — statistically uniform, does not mutate original */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick n random items from arr (safe when n > arr.length) */
export function pick(arr, n) {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}
